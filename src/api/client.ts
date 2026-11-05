import type { ApiError } from './types'
import { mockRequest } from './mock'
export const API_BASE = import.meta.env.VITE_API_BASE ?? ''
const MOCK_MODE = import.meta.env.VITE_MOCK ?? ''
export const USE_FIXTURES = MOCK_MODE === 'fixtures'
export const USE_MOCK = MOCK_MODE === '1' || USE_FIXTURES
export const TOKEN_KEY = 'emos_admin_token'
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
  }
}
let redirecting = false
function fail(status: number, message: string, payload?: unknown): ApiError {
  const err = new Error(message) as ApiError
  err.status = status
  err.payload = payload
  return err
}
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  query?: Record<string, unknown>
  body?: unknown
  signal?: AbortSignal
  silent401?: boolean
}
export function buildUrl(path: string, query?: Record<string, unknown>): string {
  if (!query) return API_BASE + path
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      for (const v of value) qs.append(`${key}[]`, String(v))
    } else if (typeof value === 'boolean') {
      // 后端把布尔参数按 1/0 解析，传 true/false 会返回 422
      qs.append(key, value ? '1' : '0')
    } else if (value === 'true' || value === 'false') {
      // 调用点写成字符串的布尔同样要转，否则筛选被静默忽略
      qs.append(key, value === 'true' ? '1' : '0')
    } else {
      qs.append(key, String(value))
    }
  }
  const s = qs.toString()
  return API_BASE + path + (s ? (path.includes('?') ? '&' : '?') + s : '')
}
async function withRetry<T>(fn: () => Promise<T>, attempts: number): Promise<T> {
  let lastError: unknown
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      const status = (error as { status?: number }).status
      if (status !== 0 || i === attempts - 1) throw error
      await new Promise((resolve) => setTimeout(resolve, 300 * (i + 1)))
    }
  }
  throw lastError
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET' } = options
  const attempts = method === 'GET' ? 3 : 1
  return withRetry(() => requestOnce<T>(path, options), attempts)
}

async function requestOnce<T>(path: string, options: RequestOptions): Promise<T> {
  const { method = 'GET', query, body, signal, silent401 } = options
  if (USE_MOCK) {
    return mockRequest<T>(path, { method, query, body })
  }
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  let res: Response
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (e) {
    throw fail(0, '网络不可用，请检查连接后重试', e)
  }
  if (res.status === 401 && !silent401) {
    setToken(null)
    if (!redirecting) {
      redirecting = true
      const next = encodeURIComponent(location.pathname + location.search)
      location.replace(`/login?next=${next}`)
      setTimeout(() => (redirecting = false), 3000)
    }
    throw fail(401, '登录已过期，请重新登录')
  }
  const text = await res.text()
  let payload: unknown = text
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
    }
  }
  if (!res.ok) {
    const msg =
      (payload && typeof payload === 'object' && ('message' in payload || 'msg' in payload)
        ? String((payload as Record<string, unknown>).message ?? (payload as Record<string, unknown>).msg)
        : '') || `请求失败（${res.status}）`
    throw fail(res.status, msg, payload)
  }
  return payload as T
}
