import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { env } from '@atena/config'
import type { AICallResult } from '@atena/shared'
import { withRetry, CircuitBreaker } from '@atena/shared'
import { classifyAIError } from '../lib/ai-error.classifier.js'
import { logger } from '../lib/logger.js'

export const aiCircuitBreaker = new CircuitBreaker({
  threshold: 10,
  resetTimeMs: 60_000,
  windowMs: 300_000,
})

export interface AIService {
  call(systemPrompt: string, userPrompt: string): Promise<AICallResult>
}

export function createAIService(): AIService {
  const model = new ChatOpenAI({
    model: env.AI_MODEL,
    apiKey: env.AI_PROVIDER === 'openai' ? env.OPENAI_API_KEY : env.CLAUDE_API_KEY,
    maxTokens: 1024,
    temperature: 0.3,
    timeout: 30_000,
    maxRetries: 0,
  })

  return {
    async call(systemPrompt: string, userPrompt: string): Promise<AICallResult> {
      const start = performance.now()

      const response = await aiCircuitBreaker.execute(() =>
        withRetry(
          () =>
            model.invoke([
              new SystemMessage(systemPrompt),
              new HumanMessage(userPrompt),
            ]),
          {
            maxRetries: 3,
            baseDelay: 1000,
            shouldRetry: (error, attempt) => {
              const classified = classifyAIError(error)
              logger.info(
                { category: classified.category, retryable: classified.retryable, attempt },
                'AI error classified',
              )
              return classified.retryable
            },
            onRetry: (error, attempt, delayMs) => {
              logger.warn(
                { error, attempt, delayMs },
                'AI call retry',
              )
            },
          },
        ),
      )

      const responseTimeMs = Math.round(performance.now() - start)
      const rawText = typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content)

      const tokensUsed = (response.usage_metadata?.total_tokens) ?? 0

      logger.info({
        responseTimeMs,
        tokensUsed,
        model: env.AI_MODEL,
      }, 'AI call completed')

      return { rawText, tokensUsed, responseTimeMs }
    },
  }
}
