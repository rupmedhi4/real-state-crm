import { api } from './api'
import type {
  Activity,
  AgentStats,
  Campaign,
  Contact,
  CrmDocument,
  Dashboard,
  Deal,
  DealSummary,
  Meta,
  Paginated,
  Property,
  Settings,
  SourcePerf,
  Task,
  User,
  UserOption,
  Visit,
} from '../types'

export type Query = Record<string, string | number | boolean | undefined | null>

/** Drops empty filter values so they are not sent as `?stage=`. */
function clean(q?: Query) {
  if (!q) return undefined
  return Object.fromEntries(
    Object.entries(q).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  )
}

const get = <T>(url: string, params?: Query) =>
  api.get<T>(url, { params: clean(params) }).then((r) => r.data)
const post = <T>(url: string, body?: unknown) => api.post<T>(url, body).then((r) => r.data)
const patch = <T>(url: string, body?: unknown) => api.patch<T>(url, body).then((r) => r.data)
const put = <T>(url: string, body?: unknown) => api.put<T>(url, body).then((r) => r.data)
const del = (url: string) => api.delete(url).then(() => undefined)

/** Standard CRUD calls for a REST resource. */
function resource<T, Body = Partial<T>>(base: string) {
  return {
    list: (q?: Query) => get<Paginated<T>>(base, q),
    get: (id: string) => get<T>(`${base}/${id}`),
    create: (body: Body) => post<T>(base, body),
    update: (id: string, body: Partial<Body>) => patch<T>(`${base}/${id}`, body),
    remove: (id: string) => del(`${base}/${id}`),
  }
}

export const authApi = {
  login: (email: string, password: string) =>
    post<{ accessToken: string; user: User }>('/auth/login', { email, password }),
  register: (body: { name: string; email: string; phone?: string; password: string }) =>
    post<{ accessToken: string; user: User }>('/auth/register', body),
}

export const usersApi = {
  ...resource<User, Record<string, unknown>>('/users'),
  options: () => get<UserOption[]>('/users/options'),
  me: () => get<User>('/users/me'),
  updateMe: (body: { name?: string; phone?: string }) => patch<User>('/users/me', body),
  changePassword: (currentPassword: string, newPassword: string) =>
    post<void>('/users/me/password', { currentPassword, newPassword }),
}

export const contactsApi = {
  ...resource<Contact, Record<string, unknown>>('/contacts'),
  options: () => get<{ id: string; name: string; phone: string | null }[]>('/contacts/options'),
  duplicates: (q: { phone?: string; email?: string; excludeId?: string }) =>
    get<{ id: string; name: string; phone: string | null; email: string | null }[]>(
      '/contacts/duplicates',
      q,
    ),
  setStage: (id: string, stage: string) => patch<Contact>(`/contacts/${id}/stage`, { stage }),
  assign: (id: string, agentId: string | null) =>
    patch<Contact>(`/contacts/${id}/assign`, { agentId }),
  bulkAssign: (ids: string[], agentId: string | null) =>
    post<{ updated: number }>('/contacts/bulk-assign', { ids, agentId }),
  uploadPhoto: (id: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return post<Contact>(`/contacts/${id}/photo`, fd)
  },
  removePhoto: (id: string) => del(`/contacts/${id}/photo`),
}

export const propertiesApi = {
  ...resource<Property, Record<string, unknown>>('/properties'),
  options: () =>
    get<{ id: string; title: string; locality: string | null; status: string }[]>(
      '/properties/options',
    ),
  uploadImages: (id: string, files: File[]) => {
    const fd = new FormData()
    files.forEach((f) => fd.append('files', f))
    return post<Property>(`/properties/${id}/images`, fd)
  },
  removeImage: (id: string, imageId: string) =>
    api.delete<Property>(`/properties/${id}/images/${imageId}`).then((r) => r.data),
  reorderImages: (id: string, imageIds: string[]) =>
    put<Property>(`/properties/${id}/images/order`, { imageIds }),
}

export const dealsApi = {
  ...resource<Deal, Record<string, unknown>>('/deals'),
  summary: () => get<DealSummary>('/deals/summary'),
  setStage: (id: string, stage: string) => patch<Deal>(`/deals/${id}/stage`, { stage }),
}

export const visitsApi = resource<Visit, Record<string, unknown>>('/visits')

export const tasksApi = {
  ...resource<Task, Record<string, unknown>>('/tasks'),
  counts: (assigneeId?: string) =>
    get<Record<string, number>>('/tasks/counts', { assigneeId }),
  complete: (id: string) => patch<Task>(`/tasks/${id}/complete`),
}

export const activitiesApi = resource<Activity, Record<string, unknown>>('/activities')

export const marketingApi = {
  campaigns: resource<Campaign, Record<string, unknown>>('/marketing/campaigns'),
  campaignOptions: () =>
    get<{ id: string; name: string; source: string }[]>('/marketing/campaigns/options'),
  sources: () => get<SourcePerf[]>('/marketing/sources'),
}

export const agentsApi = { stats: () => get<AgentStats[]>('/agents') }

export const reportsApi = {
  dashboard: () => get<Dashboard>('/reports/dashboard'),
  leadStatus: () => get<{ stage: string; count: number }[]>('/reports/lead-status'),
  funnel: () => get<{ stage: string; count: number; percent: number }[]>('/reports/funnel'),
  revenue: (months = 12) =>
    get<{ month: string; deals: number; revenue: number; commission: number }[]>(
      '/reports/revenue',
      { months },
    ),
  visits: () => get<{ status: string; count: number }[]>('/reports/visits'),
  inventory: () =>
    get<{ status: string; listingType: string; count: number; value: number }[]>(
      '/reports/inventory',
    ),
}

export const documentsApi = {
  list: (q?: Query) => get<Paginated<CrmDocument>>('/documents', q),
  upload: (file: File, fields: Record<string, string>) => {
    const fd = new FormData()
    Object.entries(fields).forEach(([k, v]) => v && fd.append(k, v))
    fd.append('file', file)
    return post<CrmDocument>('/documents', fd)
  },
  remove: (id: string) => del(`/documents/${id}`),
}

export const settingsApi = {
  get: () => get<Settings>('/settings'),
  meta: () => get<Meta>('/settings/meta'),
  update: (body: Partial<Settings>) => put<Settings>('/settings', body),
}
