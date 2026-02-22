import { Queue } from 'bullmq'
import { QUEUE_NAMES, queueConfig } from '@atena/config'

let messageQueue: Queue | undefined

export function getMessageQueue(): Queue {
  if (!messageQueue) {
    messageQueue = new Queue(QUEUE_NAMES.PROCESS_MESSAGE, {
      connection: queueConfig.connection,
      defaultJobOptions: queueConfig.defaultJobOptions,
    })
  }
  return messageQueue
}

export async function closeQueues(): Promise<void> {
  if (messageQueue) {
    await messageQueue.close()
    messageQueue = undefined
  }
}
