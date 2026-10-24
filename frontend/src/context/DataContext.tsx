import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { contactsApi, marketingApi, propertiesApi, settingsApi, usersApi } from '../services/crm'
import type { Meta, Settings, UserOption } from '../types'

type ContactOption = { id: string; name: string; phone: string | null }
type PropertyOption = { id: string; title: string; locality: string | null; status: string }
type CampaignOption = { id: string; name: string; source: string }

interface DataState {
  meta: Meta | null
  settings: Settings | null
  users: UserOption[]
  contacts: ContactOption[]
  properties: PropertyOption[]
  campaigns: CampaignOption[]
  /** Re-fetches dropdown option lists after records are created or deleted. */
  refresh: (what?: ('users' | 'contacts' | 'properties' | 'campaigns' | 'settings')[]) => void
}

const DataContext = createContext<DataState | null>(null)

/** Shared reference data for dropdowns, loaded once after login. */
export function DataProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<Meta | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [users, setUsers] = useState<UserOption[]>([])
  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([])

  const refresh = useCallback<DataState['refresh']>((what) => {
    const all = !what
    const has = (k: string) => all || what!.includes(k as never)
    if (has('users')) usersApi.options().then(setUsers).catch(() => {})
    if (has('contacts')) contactsApi.options().then(setContacts).catch(() => {})
    if (has('properties')) propertiesApi.options().then(setProperties).catch(() => {})
    if (has('campaigns')) marketingApi.campaignOptions().then(setCampaigns).catch(() => {})
    if (has('settings')) settingsApi.get().then(setSettings).catch(() => {})
  }, [])

  useEffect(() => {
    settingsApi.meta().then(setMeta).catch(() => {})
    refresh()
  }, [refresh])

  return (
    <DataContext.Provider
      value={{ meta, settings, users, contacts, properties, campaigns, refresh }}
    >
      {children}
    </DataContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside DataProvider')
  return ctx
}
