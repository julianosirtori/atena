import { env } from '@atena/config'

async function main() {
  // Validate env early — will throw if invalid
  const port = env.PORT

  const { buildServer } = await import('./server.js')
  const server = await buildServer()

  try {
    await server.listen({ port, host: env.HOST })
    server.log.info(`Atena API running on http://${env.HOST}:${port}`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }

  const shutdown = async () => {
    server.log.info('Shutting down...')
    await server.close()
    process.exit(0)
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
