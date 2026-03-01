import type { TenantForPrompt, CampaignForPrompt } from '@atena/shared'

/**
 * Merges campaign config into tenant config for prompt building.
 *
 * Merge strategy:
 * - productsInfo, pricingInfo, faq, fallbackMessage: REPLACE (campaign overrides tenant if non-null)
 * - customInstructions: APPEND (campaign adds to tenant — preserves security rules)
 * - handoffRules: SHALLOW MERGE (campaign fields override tenant defaults)
 */
export function mergeCampaignConfig(
  tenant: TenantForPrompt,
  campaign: CampaignForPrompt | null,
): TenantForPrompt {
  if (!campaign) return tenant

  const merged: TenantForPrompt = { ...tenant }

  // Replace fields (campaign overrides tenant when non-null)
  if (campaign.productsInfo != null) merged.productsInfo = campaign.productsInfo
  if (campaign.pricingInfo != null) merged.pricingInfo = campaign.pricingInfo
  if (campaign.faq != null) merged.faq = campaign.faq
  if (campaign.fallbackMessage != null) merged.fallbackMessage = campaign.fallbackMessage

  // Append custom instructions (preserves tenant security rules)
  if (campaign.customInstructions) {
    const tenantInstructions = tenant.customInstructions ?? ''
    merged.customInstructions = tenantInstructions
      ? `${tenantInstructions}\n\n--- Instruções da campanha "${campaign.name}" ---\n${campaign.customInstructions}`
      : campaign.customInstructions
  }

  // Shallow merge handoff rules
  if (campaign.handoffRules) {
    merged.handoffRules = { ...tenant.handoffRules, ...campaign.handoffRules }
  }

  return merged
}
