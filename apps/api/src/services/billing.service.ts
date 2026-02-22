import { db } from '@atena/database'
import { leads, monthlyLeadCounts, tenants } from '@atena/database'
import { eq, and } from 'drizzle-orm'

export async function countLeadIfNew(
  tenantId: string,
  leadId: string,
): Promise<void> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Check if lead was already counted this month
  const [lead] = await db
    .select({ lastCountedMonth: leads.lastCountedMonth })
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)))
    .limit(1)

  if (!lead) return

  // Already counted this month — idempotent
  if (lead.lastCountedMonth === yearMonth) return

  // Update lead's last counted month
  await db
    .update(leads)
    .set({ lastCountedMonth: yearMonth, updatedAt: now })
    .where(and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)))

  // Upsert monthly lead count
  const [existing] = await db
    .select({
      id: monthlyLeadCounts.id,
      leadCount: monthlyLeadCounts.leadCount,
      notified80: monthlyLeadCounts.notified80,
      notified100: monthlyLeadCounts.notified100,
    })
    .from(monthlyLeadCounts)
    .where(
      and(
        eq(monthlyLeadCounts.tenantId, tenantId),
        eq(monthlyLeadCounts.yearMonth, yearMonth),
      ),
    )
    .limit(1)

  let newCount: number

  if (existing) {
    newCount = existing.leadCount + 1
    await db
      .update(monthlyLeadCounts)
      .set({ leadCount: newCount, updatedAt: now })
      .where(eq(monthlyLeadCounts.id, existing.id))
  } else {
    newCount = 1
    await db.insert(monthlyLeadCounts).values({
      tenantId,
      yearMonth,
      leadCount: 1,
    })
  }

  // Check thresholds
  const [tenant] = await db
    .select({ leadsLimit: tenants.leadsLimit })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1)

  if (!tenant) return

  const limit = tenant.leadsLimit
  const pct80 = Math.floor(limit * 0.8)

  // 80% threshold notification
  if (newCount >= pct80 && !(existing?.notified80)) {
    await db
      .update(monthlyLeadCounts)
      .set({ notified80: true, updatedAt: now })
      .where(
        and(
          eq(monthlyLeadCounts.tenantId, tenantId),
          eq(monthlyLeadCounts.yearMonth, yearMonth),
        ),
      )
    // TODO: Send 80% threshold notification (Telegram / email)
  }

  // 100% threshold notification
  if (newCount >= limit && !(existing?.notified100)) {
    await db
      .update(monthlyLeadCounts)
      .set({ notified100: true, updatedAt: now })
      .where(
        and(
          eq(monthlyLeadCounts.tenantId, tenantId),
          eq(monthlyLeadCounts.yearMonth, yearMonth),
        ),
      )
    // TODO: Send 100% threshold notification (Telegram / email)
  }
}
