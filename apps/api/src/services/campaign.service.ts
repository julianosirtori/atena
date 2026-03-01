import { eq, and } from 'drizzle-orm'
import { db, campaigns, leads, leadCampaigns, leadEvents } from '@atena/database'
import type { UtmRule } from '@atena/database'

interface LeadForMatching {
  id: string
  tenantId: string
  activeCampaignId: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
}

function matchesUtmRule(lead: LeadForMatching, rule: UtmRule): boolean {
  if (rule.utm_source && lead.utmSource !== rule.utm_source) return false
  if (rule.utm_medium && lead.utmMedium !== rule.utm_medium) return false
  if (rule.utm_campaign && lead.utmCampaign !== rule.utm_campaign) return false
  // At least one field must be specified in the rule
  return !!(rule.utm_source || rule.utm_medium || rule.utm_campaign)
}

export async function matchLeadToCampaign(
  lead: LeadForMatching,
): Promise<string | null> {
  // 1. If lead already has an active campaign that's still active, keep it
  if (lead.activeCampaignId) {
    const [existing] = await db
      .select({ id: campaigns.id, status: campaigns.status })
      .from(campaigns)
      .where(eq(campaigns.id, lead.activeCampaignId))
      .limit(1)

    if (existing && existing.status === 'active') {
      return existing.id
    }
    // Campaign no longer active — clear and try to find new match
  }

  // 2. Load all active campaigns for this tenant
  const activeCampaigns = await db
    .select()
    .from(campaigns)
    .where(
      and(eq(campaigns.tenantId, lead.tenantId), eq(campaigns.status, 'active')),
    )

  if (activeCampaigns.length === 0) return null

  // 3. Try UTM matching
  const hasUtm = lead.utmSource || lead.utmMedium || lead.utmCampaign
  if (hasUtm) {
    for (const campaign of activeCampaigns) {
      const rules = (campaign.utmRules ?? []) as UtmRule[]
      for (const rule of rules) {
        if (matchesUtmRule(lead, rule)) {
          await associateLeadToCampaign(lead, campaign.id, 'utm')
          return campaign.id
        }
      }
    }
  }

  // 4. Fallback to default campaign
  const defaultCampaign = activeCampaigns.find((c) => c.isDefault)
  if (defaultCampaign) {
    await associateLeadToCampaign(lead, defaultCampaign.id, 'default')
    return defaultCampaign.id
  }

  return null
}

async function associateLeadToCampaign(
  lead: LeadForMatching,
  campaignId: string,
  matchedBy: 'utm' | 'manual' | 'default',
): Promise<void> {
  const now = new Date()

  // Insert into lead_campaigns (ignore conflict if already associated)
  await db
    .insert(leadCampaigns)
    .values({
      tenantId: lead.tenantId,
      leadId: lead.id,
      campaignId,
      matchedBy,
      matchedAt: now,
    })
    .onConflictDoNothing({ target: [leadCampaigns.leadId, leadCampaigns.campaignId] })

  // Update lead's active campaign
  await db
    .update(leads)
    .set({ activeCampaignId: campaignId, updatedAt: now })
    .where(eq(leads.id, lead.id))

  // Create lead event
  await db.insert(leadEvents).values({
    tenantId: lead.tenantId,
    leadId: lead.id,
    eventType: 'campaign_joined',
    toValue: campaignId,
    createdBy: 'system',
    metadata: { matchedBy },
  })
}

export async function manualAssociateLeadToCampaign(
  tenantId: string,
  leadId: string,
  campaignId: string,
): Promise<void> {
  // Verify campaign exists and belongs to tenant
  const [campaign] = await db
    .select({ id: campaigns.id, status: campaigns.status })
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.tenantId, tenantId)))
    .limit(1)

  if (!campaign) throw new Error('Campaign not found')

  const lead: LeadForMatching = {
    id: leadId,
    tenantId,
    activeCampaignId: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
  }

  await associateLeadToCampaign(lead, campaignId, 'manual')
}
