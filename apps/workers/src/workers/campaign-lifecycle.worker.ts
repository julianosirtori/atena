import { Worker, Queue } from 'bullmq'
import { eq, and, lte, sql } from 'drizzle-orm'
import { db, campaigns, leads } from '@atena/database'
import { env, QUEUE_NAMES } from '@atena/config'
import { moveToDlq } from '../lib/dlq.js'
import { logger } from '../lib/logger.js'

export async function processCampaignLifecycle(): Promise<{
  activated: number
  completed: number
  cleaned: number
}> {
  const now = new Date()
  let activated = 0
  let completed = 0
  let cleaned = 0

  // 1. Auto-activate: draft campaigns with autoActivate=true and startDate <= now
  const toActivate = await db
    .select({ id: campaigns.id, name: campaigns.name })
    .from(campaigns)
    .where(
      and(
        eq(campaigns.status, 'draft'),
        eq(campaigns.autoActivate, true),
        lte(campaigns.startDate, now),
      ),
    )

  for (const campaign of toActivate) {
    await db
      .update(campaigns)
      .set({ status: 'active', updatedAt: now })
      .where(eq(campaigns.id, campaign.id))
    logger.info({ campaignId: campaign.id, campaignName: campaign.name }, 'Campaign auto-activated')
    activated++
  }

  // 2. Auto-complete: active campaigns with endDate < now
  const toComplete = await db
    .select({ id: campaigns.id, name: campaigns.name })
    .from(campaigns)
    .where(
      and(
        eq(campaigns.status, 'active'),
        lte(campaigns.endDate, now),
      ),
    )

  for (const campaign of toComplete) {
    await db
      .update(campaigns)
      .set({ status: 'completed', updatedAt: now })
      .where(eq(campaigns.id, campaign.id))
    logger.info({ campaignId: campaign.id, campaignName: campaign.name }, 'Campaign auto-completed')
    completed++
  }

  // 3. Clean up: clear activeCampaignId for leads pointing to completed campaigns
  if (toComplete.length > 0) {
    const completedIds = toComplete.map((c) => c.id)
    const result = await db
      .update(leads)
      .set({ activeCampaignId: null, updatedAt: now })
      .where(
        sql`${leads.activeCampaignId} IN (${sql.join(completedIds.map((id) => sql`${id}`), sql`, `)})`,
      )

    cleaned = result.rowCount ?? 0
    if (cleaned > 0) {
      logger.info({ cleaned }, 'Leads cleared from completed campaigns')
    }
  }

  return { activated, completed, cleaned }
}

export function startCampaignLifecycleWorker(dlqQueue?: Queue): Worker {
  const worker = new Worker(
    QUEUE_NAMES.CAMPAIGN_LIFECYCLE,
    async (job) => {
      logger.info({ jobId: job.id }, 'Processing campaign lifecycle job')
      const result = await processCampaignLifecycle()
      logger.info(result, 'Campaign lifecycle job complete')
    },
    {
      connection: { url: env.REDIS_URL },
      concurrency: 1,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  )

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Campaign lifecycle job completed')
  })

  worker.on('failed', async (job, error) => {
    logger.error({ jobId: job?.id, error: error.message }, 'Campaign lifecycle job failed')

    if (dlqQueue && job && job.attemptsMade >= (job.opts?.attempts ?? 3)) {
      await moveToDlq(dlqQueue, job, error.message)
    }
  })

  worker.on('error', (error) => {
    logger.error({ error: error.message }, 'Campaign lifecycle worker error')
  })

  logger.info('Campaign lifecycle worker started')
  return worker
}
