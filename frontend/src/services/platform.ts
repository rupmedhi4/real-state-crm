import axios from 'axios'
import { api } from './api'

export interface ClientAccount {
  id: string; name: string; slug: string; ownerEmail: string; isActive: boolean;
  features: Record<string, boolean>; maxImages: number; createdAt: string
}
export interface AuditEntry { id: string; action: string; createdAt: string; clientName: string | null; adminEmail: string }
const KEY = 'estateflow_master_token'
export const masterStore = {
  get: () => { try { return localStorage.getItem(KEY) } catch { return null } },
  set: (token: string) => localStorage.setItem(KEY, token),
  clear: () => localStorage.removeItem(KEY),
}
const master = axios.create({ baseURL: api.defaults.baseURL })
master.interceptors.request.use((request) => {
  const token = masterStore.get()
  if (token) request.headers.Authorization = `Bearer ${token}`
  return request
})
export const platformApi = {
  login: (email: string, password: string) => master.post<{ accessToken: string }>('/platform/auth/login', { email, password }).then((r) => r.data),
  me: () => master.get<{ name: string; email: string }>('/platform/me').then((r) => r.data),
  clients: () => master.get<ClientAccount[]>('/platform/clients').then((r) => r.data),
  features: () => master.get<string[]>('/platform/features').then((r) => r.data),
  audit: () => master.get<AuditEntry[]>('/platform/audit').then((r) => r.data),
  create: (body: Record<string, unknown>) => master.post<ClientAccount>('/platform/clients', body).then((r) => r.data),
  update: (id: string, body: Record<string, unknown>) => master.patch<ClientAccount>(`/platform/clients/${id}`, body).then((r) => r.data),
  password: (id: string, password: string) => master.post(`/platform/clients/${id}/password`, { password }),
  open: (id: string) => master.post<{ accessToken: string }>(`/platform/clients/${id}/open`).then((r) => r.data),
}
export const FEATURE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard', leads: 'Leads & clients', properties: 'Property inventory', photos: 'Photo gallery',
  deals: 'Deals & commission', visits: 'Site visits', tasks: 'Tasks & follow-ups', communications: 'Communications',
  marketing: 'Marketing', team: 'Team management', reports: 'Reports', documents: 'Documents', brochures: 'Brochures & sharing',
}
