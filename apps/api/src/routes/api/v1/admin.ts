import type { FastifyPluginAsync } from 'fastify'
import { Queue } from 'bullmq'
import { env, QUEUE_NAMES, queueConfig } from '@atena/config'

const DLQ_NAMES = [
  QUEUE_NAMES.PROCESS_MESSAGE_DLQ,
  QUEUE_NAMES.SEND_NOTIFICATION_DLQ,
  QUEUE_NAMES.SCHEDULED_DLQ,
] as const

const ALL_QUEUE_NAMES = [
  QUEUE_NAMES.PROCESS_MESSAGE,
  QUEUE_NAMES.SEND_NOTIFICATION,
  QUEUE_NAMES.SCHEDULED,
  ...DLQ_NAMES,
] as const

function getQueue(name: string): Queue {
  return new Queue(name, { connection: queueConfig.connection })
}

export const adminRoutes: FastifyPluginAsync = async (server) => {
  // Auth hook for all admin routes
  server.addHook('onRequest', async (request, reply) => {
    const token = request.headers['x-admin-token'] as string | undefined
    if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or missing X-Admin-Token' })
    }
  })

  // GET /admin/queues/status — Queue stats
  server.get('/admin/queues/status', async (_request, reply) => {
    const results: Record<string, Record<string, number>> = {}

    for (const name of ALL_QUEUE_NAMES) {
      const queue = getQueue(name)
      try {
        const counts = await queue.getJobCounts(
          'active',
          'completed',
          'delayed',
          'failed',
          'paused',
          'waiting',
        )
        results[name] = counts
      } finally {
        await queue.close()
      }
    }

    return reply.send({ data: results })
  })

  // GET /admin/dlq — List DLQ jobs
  server.get<{
    Querystring: { queue?: string; limit?: string }
  }>('/admin/dlq', async (request, reply) => {
    const queueName = request.query.queue
    const limit = Math.min(parseInt(request.query.limit || '20', 10), 100)

    const queuesToScan = queueName
      ? DLQ_NAMES.filter((n) => n === queueName)
      : [...DLQ_NAMES]

    if (queueName && queuesToScan.length === 0) {
      return reply.status(400).send({ error: 'Invalid queue name' })
    }

    const jobs: Array<{
      jobId: string | undefined
      queue: string
      data: unknown
      failedOn: number | undefined
    }> = []

    for (const name of queuesToScan) {
      const queue = getQueue(name)
      try {
        const waiting = await queue.getJobs(['waiting', 'delayed', 'failed'], 0, limit)
        for (const job of waiting) {
          jobs.push({
            jobId: job.id,
            queue: name,
            data: job.data,
            failedOn: job.processedOn,
          })
        }
      } finally {
        await queue.close()
      }
    }

    return reply.send({ data: jobs.slice(0, limit) })
  })

  // POST /admin/dlq/:jobId/retry — Reprocess DLQ job
  server.post<{
    Params: { jobId: string }
    Body: { queue: string }
  }>('/admin/dlq/:jobId/retry', async (request, reply) => {
    const { jobId } = request.params
    const { queue: queueName } = request.body as { queue: string }

    if (!DLQ_NAMES.includes(queueName as typeof DLQ_NAMES[number])) {
      return reply.status(400).send({ error: 'Invalid DLQ queue name' })
    }

    const dlqQueue = getQueue(queueName)
    try {
      const job = await dlqQueue.getJob(jobId)
      if (!job) {
        return reply.status(404).send({ error: 'Job not found' })
      }

      // Re-enqueue to the original source queue
      const sourceQueue = job.data?.sourceQueue as string | undefined
      if (!sourceQueue) {
        return reply.status(400).send({ error: 'Job data missing sourceQueue' })
      }

      const targetQueue = getQueue(sourceQueue)
      try {
        await targetQueue.add('retry-from-dlq', job.data?.data ?? job.data, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        })
      } finally {
        await targetQueue.close()
      }

      await job.remove()

      return reply.send({ data: { status: 'retried', jobId, sourceQueue } })
    } finally {
      await dlqQueue.close()
    }
  })

  // DELETE /admin/dlq/:jobId — Remove DLQ job
  server.delete<{
    Params: { jobId: string }
    Querystring: { queue: string }
  }>('/admin/dlq/:jobId', async (request, reply) => {
    const { jobId } = request.params
    const queueName = request.query.queue

    if (!DLQ_NAMES.includes(queueName as typeof DLQ_NAMES[number])) {
      return reply.status(400).send({ error: 'Invalid DLQ queue name' })
    }

    const dlqQueue = getQueue(queueName)
    try {
      const job = await dlqQueue.getJob(jobId)
      if (!job) {
        return reply.status(404).send({ error: 'Job not found' })
      }

      await job.remove()

      return reply.send({ data: { status: 'removed', jobId } })
    } finally {
      await dlqQueue.close()
    }
  })
}
