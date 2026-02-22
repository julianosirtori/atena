import { startMessageWorker } from './worker.js'
import { logger } from './lib/logger.js'

const worker = startMessageWorker()

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down worker...')
  await worker.close()
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down worker...')
  await worker.close()
  process.exit(0)
})
