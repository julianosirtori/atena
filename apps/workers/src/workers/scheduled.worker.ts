import { Worker } from 'bullmq'
import { env, QUEUE_NAMES } from '@atena/config'
import { handleTimeout } from '../services/handoff.service.js'
import { logger } from '../lib/logger.js'

interface HandoffTimeoutJob {
  conversationId: string
  tenantId: string
}

export function startScheduledWorker(): Worker {
  const worker = new Worker<HandoffTimeoutJob>(
    QUEUE_NAMES.SCHEDULED,
    async (job) => {
      logger.info({ jobId: job.id, name: job.name, data: job.data }, 'Processing scheduled job')

      switch (job.name) {
        case 'handoff-timeout':
          await handleTimeout(job.data.conversationId, job.data.tenantId)
          break
        default:
          logger.warn({ jobName: job.name }, 'Unknown scheduled job type')
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
    logger.info({ jobId: job.id }, 'Scheduled job completed')
  })

  worker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, error: error.message }, 'Scheduled job failed')
  })

  worker.on('error', (error) => {
    logger.error({ error: error.message }, 'Scheduled worker error')
  })

  logger.info('Scheduled worker started')
  return worker
}
