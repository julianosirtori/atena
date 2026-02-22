import { z } from 'zod'
import { config } from 'dotenv'
import { existsSync } from 'node:fs'
import { resolve, parse } from 'node:path'

// In a monorepo, .env lives at the root. Walk up from cwd to find it.
function findEnvFile(): string | undefined {
  let dir = process.cwd()
  const { root } = parse(dir)
  while (dir !== root) {
    const envPath = resolve(dir, '.env')
    if (existsSync(envPath)) return envPath
    dir = resolve(dir, '..')
  }
  return undefined
}

config({ path: findEnvFile() })

export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine((url) => url.startsWith('postgres://') || url.startsWith('postgresql://'), {
      message: 'DATABASE_URL must start with postgres:// or postgresql://',
    }),

  REDIS_URL: z.string().min(1, 'REDIS_URL is required').default('redis://localhost:6379'),

  CLAUDE_API_KEY: z.string().optional(),

  OPENAI_API_KEY: z.string().optional(),
  AI_PROVIDER: z.enum(['openai', 'anthropic']).default('openai'),
  AI_MODEL: z.string().default('gpt-4o'),

  ZAPI_INSTANCE_ID: z.string().optional(),
  ZAPI_TOKEN: z.string().optional(),
  ZAPI_WEBHOOK_SECRET: z.string().optional(),

  META_WHATSAPP_TOKEN: z.string().optional(),
  META_WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  META_APP_SECRET: z.string().optional(),

  TELEGRAM_BOT_TOKEN: z.string().optional(),
  PANEL_URL: z.string().url().optional().default('http://localhost:5173'),
})

export type Env = z.infer<typeof envSchema>

let _env: Env | undefined

export function parseEnv(): Env {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const formatted = result.error.format()
    const errors = Object.entries(formatted)
      .filter(([key]) => key !== '_errors')
      .map(([key, value]) => {
        const messages = (value as { _errors: string[] })._errors
        return `  ${key}: ${messages.join(', ')}`
      })
      .join('\n')

    throw new Error(`Invalid environment variables:\n${errors}`)
  }

  return result.data
}

export const env = new Proxy({} as Env, {
  get(_target, prop: string) {
    if (!_env) {
      _env = parseEnv()
    }
    return _env[prop as keyof Env]
  },
})
