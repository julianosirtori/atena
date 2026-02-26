import { Worker, Queue } from 'bullmq'
import { env, QUEUE_NAMES } from '@atena/config'
import { processMessage } from './services/message.pipeline.js'
import type { ProcessMessageJob } from './services/message.pipeline.js'
import { createAIService } from './services/ai.service.js'
import { setQueues } from './services/handoff.service.js'
import { moveToDlq } from './lib/dlq.js'
import { logger } from './lib/logger.js'

export function createQueues() {
  const connection = { url: env.REDIS_URL }

  const notificationQueue = new Queue(QUEUE_NAMES.SEND_NOTIFICATION, { connection })
  const scheduledQueue = new Queue(QUEUE_NAMES.SCHEDULED, { connection })

  // DLQ queues
  const processMessageDlq = new Queue(QUEUE_NAMES.PROCESS_MESSAGE_DLQ, { connection })
  const sendNotificationDlq = new Queue(QUEUE_NAMES.SEND_NOTIFICATION_DLQ, { connection })
  const scheduledDlq = new Queue(QUEUE_NAMES.SCHEDULED_DLQ, { connection })

  // Wire queues into handoff service
  setQueues(notificationQueue, scheduledQueue)

  return {
    notificationQueue,
    scheduledQueue,
    processMessageDlq,
    sendNotificationDlq,
    scheduledDlq,
  }
}

export function startMessageWorker(
  processMessageDlq: Queue,
  notificationQueue: Queue,
): Worker {
  const aiService = createAIService()

  const worker = new Worker<ProcessMessageJob>(
    QUEUE_NAMES.PROCESS_MESSAGE,
    async (job) => {
      logger.info({ jobId: job.id, correlationId: job.data.correlationId, data: job.data }, 'Processing message job')
      await processMessage(job.data, aiService, notificationQueue)
    },
    {
      connection: { url: env.REDIS_URL },
      concurrency: 5,
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  )

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Job completed')
  })

  worker.on('failed', async (job, error) => {
    logger.error({ jobId: job?.id, error: error.message }, 'Job failed')

    if (job && job.attemptsMade >= (job.opts?.attempts ?? 3)) {
      await moveToDlq(processMessageDlq, job, error.message)
    }
  })

  worker.on('error', (error) => {
    logger.error({ error: error.message }, 'Worker error')
  })

  logger.info('Message worker started')
  return worker
}
