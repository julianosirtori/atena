import { describe, it, expect, vi } from 'vitest'
import { withRetry } from '../src/retry.js'

describe('withRetry', () => {
  it('returns result on first successful attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success')

    const result = await withRetry(fn, { maxRetries: 3, baseDelay: 1, jitter: false })

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledOnce()
  })

  it('retries up to maxRetries and throws the last error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'))

    await expect(
      withRetry(fn, { maxRetries: 2, baseDelay: 1, jitter: false }),
    ).rejects.toThrow('fail')

    expect(fn).toHaveBeenCalledTimes(3) // initial + 2 retries
  })

  it('succeeds on a retry after initial failure', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok')

    const result = await withRetry(fn, { maxRetries: 2, baseDelay: 1, jitter: false })

    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('throws immediately when shouldRetry returns false', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('auth error'))

    await expect(
      withRetry(fn, {
        maxRetries: 3,
        baseDelay: 1,
        shouldRetry: () => false,
      }),
    ).rejects.toThrow('auth error')

    expect(fn).toHaveBeenCalledOnce()
  })

  it('calls onRetry callback with error, attempt, and delay', async () => {
    const onRetry = vi.fn()
    const error = new Error('transient')
    const fn = vi.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue('ok')

    await withRetry(fn, {
      maxRetries: 2,
      baseDelay: 1,
      jitter: false,
      onRetry,
    })

    expect(onRetry).toHaveBeenCalledOnce()
    expect(onRetry).toHaveBeenCalledWith(error, 0, 1)
  })

  it('respects maxDelay cap', async () => {
    const onRetry = vi.fn()
    const fn = vi.fn().mockRejectedValue(new Error('fail'))

    await expect(
      withRetry(fn, {
        maxRetries: 5,
        baseDelay: 10,
        maxDelay: 20,
        jitter: false,
        onRetry,
      }),
    ).rejects.toThrow('fail')

    // Check that delays are capped at maxDelay
    for (const call of onRetry.mock.calls) {
      expect(call[2]).toBeLessThanOrEqual(20)
    }
    expect(onRetry).toHaveBeenCalledTimes(5)
  })

  it('adds jitter variation when enabled', async () => {
    const onRetry = vi.fn()
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok')

    await withRetry(fn, {
      maxRetries: 1,
      baseDelay: 100,
      jitter: true,
      onRetry,
    })

    expect(onRetry).toHaveBeenCalledOnce()
    const delay = onRetry.mock.calls[0][2]
    // With jitter: delay = 100 * 2^0 + random(0, 50) = 100 to 150
    expect(delay).toBeGreaterThanOrEqual(100)
    expect(delay).toBeLessThanOrEqual(150)
  })

  it('passes attempt index and error to shouldRetry', async () => {
    const shouldRetry = vi.fn().mockReturnValue(true)
    const error1 = new Error('first')
    const error2 = new Error('second')
    const fn = vi.fn()
      .mockRejectedValueOnce(error1)
      .mockRejectedValueOnce(error2)
      .mockResolvedValue('ok')

    await withRetry(fn, {
      maxRetries: 3,
      baseDelay: 1,
      jitter: false,
      shouldRetry,
    })

    expect(shouldRetry).toHaveBeenCalledWith(error1, 0)
    expect(shouldRetry).toHaveBeenCalledWith(error2, 1)
  })
})
