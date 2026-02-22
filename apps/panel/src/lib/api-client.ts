const BASE_URL = '/api/v1'

class ApiClient {
  private tenantId: string | null = null

  setTenantId(id: string) {
    this.tenantId = id
  }

  private url(path: string): string {
    if (path.startsWith('/tenants')) {
      return `${BASE_URL}${path}`
    }
    if (!this.tenantId) throw new Error('Tenant not selected')
    return `${BASE_URL}/tenants/${this.tenantId}${path}`
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(this.url(path), window.location.origin)
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== '') url.searchParams.set(k, v)
      }
    }
    const res = await fetch(url.toString())
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new ApiError(res.status, body.error?.message || res.statusText, body.error)
    }
    return res.json()
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(this.url(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new ApiError(res.status, data.error?.message || res.statusText, data.error)
    }
    return res.json()
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(this.url(path), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new ApiError(res.status, data.error?.message || res.statusText, data.error)
    }
    return res.json()
  }

  async del(path: string): Promise<void> {
    const res = await fetch(this.url(path), { method: 'DELETE' })
    if (!res.ok && res.status !== 204) {
      const data = await res.json().catch(() => ({}))
      throw new ApiError(res.status, data.error?.message || res.statusText, data.error)
    }
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public error?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const api = new ApiClient()
