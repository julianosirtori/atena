import { env } from './env.js'

export const QUEUE_NAMES = {
  PROCESS_MESSAGE: 'process-message',
  SEND_NOTIFICATION: 'send-notification',
  UPDATE_SCORE: 'update-score',
  SCHEDULED: 'scheduled',
} as const

export const queueConfig = {
  connection: {
    url: env.REDIS_URL,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 1000,
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
}
