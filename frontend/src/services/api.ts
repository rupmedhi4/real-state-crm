import axios, { AxiosError } from 'axios'

const TOKEN_KEY = 'estateflow_token'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

// The JWT is the only thing kept in browser storage; all CRM data lives in
// PostgreSQL behind the API.
export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set: (t: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, t)
    } catch {
      /* storage unavailable */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* storage unavailable */
    }
  },
}

api.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/** Called when the API rejects our token (expired, revoked, user disabled). */
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn
}

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    const isAuthCall = err.config?.url?.startsWith('/auth/')
    if (err.response?.status === 401 && !isAuthCall && tokenStore.get()) {
      tokenStore.clear()
      onUnauthorized?.()
    }
    return Promise.reject(err)
  },
)

/** Extracts a readable message from an API error. */
export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) return 'Cannot reach the server. Is the backend running?'
    const msg = (err.response.data as { message?: string | string[] } | undefined)?.message
    if (Array.isArray(msg)) return msg.join('; ')
    if (msg) return msg
  }
  return err instanceof Error ? err.message : fallback
}

/** Field-level validation messages, keyed by the property name they start with. */
export function fieldErrors(err: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (axios.isAxiosError(err) && err.response?.status === 400) {
    const msg = (err.response.data as { message?: string | string[] } | undefined)?.message
    for (const m of Array.isArray(msg) ? msg : msg ? [msg] : []) {
      const field = m.split(' ')[0]
      if (field && !out[field]) out[field] = m
    }
  }
  return out
}

/** Downloads a protected file through the API (adds the auth header). */
export async function downloadFile(url: string, filename: string) {
  const res = await api.get(url, { responseType: 'blob' })
  const href = URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}

/** Absolute URL for public files such as property images. */
export function fileUrl(path: string) {
  const base = import.meta.env.VITE_API_URL || '/api'
  return path.startsWith('/api/') ? base.replace(/\/api\/?$/, '') + path : path
}
