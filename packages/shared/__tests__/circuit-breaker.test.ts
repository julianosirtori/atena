import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CircuitBreaker, CircuitBreakerOpenError } from '../src/circuit-breaker.js'

describe('CircuitBreaker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts in closed state', () => {
    const cb = new CircuitBreaker()
    expect(cb.getState()).toBe('closed')
  })

  it('executes function successfully when closed', async () => {
    const cb = new CircuitBreaker()
    const result = await cb.execute(() => Promise.resolve('ok'))
    expect(result).toBe('ok')
    expect(cb.getState()).toBe('closed')
  })

  it('opens after threshold failures within window', async () => {
    const cb = new CircuitBreaker({ threshold: 3, windowMs: 60_000 })

    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail')
    }

    expect(cb.getState()).toBe('open')
  })

  it('throws CircuitBreakerOpenError when open', async () => {
    const cb = new CircuitBreaker({ threshold: 2 })

    // Trip the breaker
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow()
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow()

    expect(cb.getState()).toBe('open')

    await expect(cb.execute(() => Promise.resolve('ok'))).rejects.toThrow(CircuitBreakerOpenError)
  })

  it('transitions to half-open after resetTimeMs', async () => {
    const cb = new CircuitBreaker({ threshold: 2, resetTimeMs: 5000 })

    // Trip the breaker
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow()
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow()
    expect(cb.getState()).toBe('open')

    // Advance past reset time
    vi.advanceTimersByTime(5001)

    // Next call should be allowed (half-open test)
    const result = await cb.execute(() => Promise.resolve('recovered'))
    expect(result).toBe('recovered')
    expect(cb.getState()).toBe('closed')
  })

  it('closes on successful half-open call', async () => {
    const cb = new CircuitBreaker({ threshold: 2, resetTimeMs: 1000 })

    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow()
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow()

    vi.advanceTimersByTime(1001)

    await cb.execute(() => Promise.resolve('ok'))
    expect(cb.getState()).toBe('closed')
  })

  it('reopens on failed half-open call', async () => {
    const cb = new CircuitBreaker({ threshold: 2, resetTimeMs: 1000 })

    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow()
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow()

    vi.advanceTimersByTime(1001)

    await expect(cb.execute(() => Promise.reject(new Error('still failing')))).rejects.toThrow()
    expect(cb.getState()).toBe('open')
  })

  it('reset() returns to closed state', async () => {
    const cb = new CircuitBreaker({ threshold: 2 })

    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow()
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow()
    expect(cb.getState()).toBe('open')

    cb.reset()
    expect(cb.getState()).toBe('closed')

    // Should be able to execute again
    const result = await cb.execute(() => Promise.resolve('ok'))
    expect(result).toBe('ok')
  })

  it('prunes failures outside the sliding window', async () => {
    const cb = new CircuitBreaker({ threshold: 3, windowMs: 5000 })

    // Two failures
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow()
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow()
    expect(cb.getState()).toBe('closed')

    // Advance past the window
    vi.advanceTimersByTime(5001)

    // Third failure should not trip because old failures are pruned
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow()
    expect(cb.getState()).toBe('closed')
  })

  it('does not open for failures below threshold', async () => {
    const cb = new CircuitBreaker({ threshold: 5 })

    for (let i = 0; i < 4; i++) {
      await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow()
    }

    expect(cb.getState()).toBe('closed')
  })
})
