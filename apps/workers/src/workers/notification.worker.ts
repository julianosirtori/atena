import { Worker, Queue } from 'bullmq'
import { env, QUEUE_NAMES } from '@atena/config'
import { db } from '@atena/database'
import { agents } from '@atena/database'
import { eq, and } from 'drizzle-orm'
import type { NotificationPayload } from '@atena/shared'
import type { TelegramBotService } from '../services/telegram/telegram.bot.js'
import type { AgentForNotification } from '../services/telegram/telegram.types.js'
import { moveToDlq } from '../lib/dlq.js'
import { logger } from '../lib/logger.js'

export function startNotificationWorker(
  telegramBot: TelegramBotService | null,
  dlqQueue?: Queue,
): Worker {
  const worker = new Worker<NotificationPayload>(
    QUEUE_NAMES.SEND_NOTIFICATION,
    async (job) => {
      logger.info({ jobId: job.id, data: job.data }, 'Processing notification job')

      const { tenantId, conversationId, leadId, leadName, leadScore, leadChannel, summary } = job.data

      // Load online agents with Telegram configured
      const agentRows = await db
        .select({
          id: agents.id,
          name: agents.name,
          telegramChatId: agents.telegramChatId,
          notificationPreferences: agents.notificationPreferences,
          isOnline: agents.isOnline,
        })
        .from(agents)
        .where(and(eq(agents.tenantId, tenantId), eq(agents.isActive, true)))

      const eligibleAgents: AgentForNotification[] = agentRows

      if (telegramBot) {
        await telegramBot.notifyNewLead(
          eligibleAgents,
          leadName,
          leadScore,
          leadChannel,
          conversationId,
          summary,
        )
      }
    },
    {
      connection: { url: env.REDIS_URL },
      concurrency: 3,
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 1000 },
    },
  )

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Notification job completed')
  })

  worker.on('failed', async (job, error) => {
    logger.error({ jobId: job?.id, error: error.message }, 'Notification job failed')

    if (dlqQueue && job && job.attemptsMade >= (job.opts?.attempts ?? 3)) {
      await moveToDlq(dlqQueue, job, error.message)
    }
  })

  worker.on('error', (error) => {
    logger.error({ error: error.message }, 'Notification worker error')
  })

  logger.info('Notification worker started')
  return worker
}
