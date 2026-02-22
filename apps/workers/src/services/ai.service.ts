import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { env } from '@atena/config'
import type { AICallResult } from '@atena/shared'
import { logger } from '../lib/logger.js'

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
    maxRetries: 2,
  })

  return {
    async call(systemPrompt: string, userPrompt: string): Promise<AICallResult> {
      const start = performance.now()

      const response = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ])

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
