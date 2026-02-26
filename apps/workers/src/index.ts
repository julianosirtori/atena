import { env } from '@atena/config'
import { startMessageWorker, createQueues } from './worker.js'
import { startScheduledWorker } from './workers/scheduled.worker.js'
import { startNotificationWorker } from './workers/notification.worker.js'
import { TelegramBotService } from './services/telegram/telegram.bot.js'
import { logger } from './lib/logger.js'

// Create queues and wire them into the handoff service
const {
  notificationQueue,
  scheduledQueue,
  processMessageDlq,
  sendNotificationDlq,
  scheduledDlq,
} = createQueues()

// Start workers
const messageWorker = startMessageWorker(processMessageDlq, notificationQueue)
const scheduledWorker = startScheduledWorker(scheduledDlq)

// Conditionally start Telegram bot
let telegramBot: TelegramBotService | null = null
if (env.TELEGRAM_BOT_TOKEN) {
  telegramBot = new TelegramBotService(env.TELEGRAM_BOT_TOKEN, env.REDIS_URL)
  telegramBot.start().catch((error) => {
    logger.error({ error }, 'Failed to start Telegram bot')
  })
} else {
  logger.info('TELEGRAM_BOT_TOKEN not set, skipping Telegram bot')
}

// Start notification worker (works with or without Telegram bot)
const notificationWorker = startNotificationWorker(telegramBot, sendNotificationDlq)

async function shutdown() {
  logger.info('Shutting down workers...')
  await Promise.allSettled([
    messageWorker.close(),
    scheduledWorker.close(),
    notificationWorker.close(),
    notificationQueue.close(),
    scheduledQueue.close(),
    processMessageDlq.close(),
    sendNotificationDlq.close(),
    scheduledDlq.close(),
    telegramBot?.stop(),
  ])
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
