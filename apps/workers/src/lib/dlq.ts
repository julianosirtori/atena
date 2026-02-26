import type { Queue, Job } from 'bullmq'
import { logger } from './logger.js'

export async function moveToDlq(
  dlqQueue: Queue,
  job: Job,
  errorMessage: string,
): Promise<void> {
  try {
    await dlqQueue.add('dlq-entry', {
      originalJobId: job.id,
      sourceQueue: job.queueName,
      data: job.data,
      failedAt: new Date().toISOString(),
      error: errorMessage,
      attemptsMade: job.attemptsMade,
    })

    logger.info(
      {
        originalJobId: job.id,
        sourceQueue: job.queueName,
        dlqQueue: dlqQueue.name,
      },
      'Job moved to DLQ',
    )
  } catch (err) {
    logger.error(
      { err, originalJobId: job.id, sourceQueue: job.queueName },
      'Failed to move job to DLQ',
    )
  }
}
