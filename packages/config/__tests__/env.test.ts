import { describe, it, expect } from 'vitest'
import { envSchema } from '../src/env.js'

describe('env validation', () => {
  const validEnv = {
    PORT: '3000',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/atena',
    REDIS_URL: 'redis://localhost:6379',
  }

  it('rejects PORT as non-numeric string', () => {
    const result = envSchema.safeParse({ ...validEnv, PORT: 'abc' })
    expect(result.success).toBe(false)
  })

  it('rejects DATABASE_URL without postgres:// protocol', () => {
    const result = envSchema.safeParse({ ...validEnv, DATABASE_URL: 'mysql://localhost/db' })
    expect(result.success).toBe(false)
  })

  it('accepts complete valid env and returns typed object', () => {
    const result = envSchema.safeParse(validEnv)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.PORT).toBe(3000)
      expect(result.data.DATABASE_URL).toBe('postgres://user:pass@localhost:5432/atena')
      expect(result.data.NODE_ENV).toBe('development')
    }
  })

  it('uses default values when not defined', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/atena',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.PORT).toBe(3000)
      expect(result.data.HOST).toBe('0.0.0.0')
      expect(result.data.NODE_ENV).toBe('development')
      expect(result.data.LOG_LEVEL).toBe('info')
      expect(result.data.REDIS_URL).toBe('redis://localhost:6379')
    }
  })

  it('accepts postgresql:// protocol', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/atena',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing DATABASE_URL', () => {
    const result = envSchema.safeParse({ PORT: '3000' })
    expect(result.success).toBe(false)
  })
})
