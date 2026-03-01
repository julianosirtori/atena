import { env } from './env.js'

export const QUEUE_NAMES = {
  PROCESS_MESSAGE: 'process-message',
  SEND_NOTIFICATION: 'send-notification',
  UPDATE_SCORE: 'update-score',
  SCHEDULED: 'scheduled',
  CAMPAIGN_LIFECYCLE: 'campaign-lifecycle',
  BROADCAST: 'broadcast',
  AUTOMATION: 'automation',
  PROCESS_MESSAGE_DLQ: 'process-message-dlq',
  SEND_NOTIFICATION_DLQ: 'send-notification-dlq',
  SCHEDULED_DLQ: 'scheduled-dlq',
  CAMPAIGN_LIFECYCLE_DLQ: 'campaign-lifecycle-dlq',
  BROADCAST_DLQ: 'broadcast-dlq',
  AUTOMATION_DLQ: 'automation-dlq',
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
