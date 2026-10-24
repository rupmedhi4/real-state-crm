import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { setUnauthorizedHandler, tokenStore } from '../services/api'
import { authApi, usersApi } from '../services/crm'
import type { Role, User } from '../types'

interface AuthState {
  user: User | null
  /** True until the stored token has been checked against the API. */
  loading: boolean
  sessionExpired: boolean
  login: (email: string, password: string) => Promise<void>
  register: (body: { name: string; email: string; phone?: string; password: string }) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  hasRole: (...roles: Role[]) => boolean
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      setSessionExpired(true)
    })
    if (!tokenStore.get()) {
      setLoading(false)
      return
    }
    usersApi
      .me()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    tokenStore.set(res.accessToken)
    setSessionExpired(false)
    setUser(res.user)
  }, [])

  const register = useCallback(
    async (body: { name: string; email: string; phone?: string; password: string }) => {
      const res = await authApi.register(body)
      tokenStore.set(res.accessToken)
      setSessionExpired(false)
      setUser(res.user)
    },
    [],
  )

  const refreshUser = useCallback(async () => {
    setUser(await usersApi.me())
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      sessionExpired,
      login,
      register,
      logout,
      refreshUser,
      hasRole: (...roles) => !!user && roles.includes(user.role),
    }),
    [user, loading, sessionExpired, login, register, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

/** Admins and managers can delete records and manage the team. */
// eslint-disable-next-line react-refresh/only-export-components
export function useIsManager() {
  return useAuth().hasRole('ADMIN', 'MANAGER')
}
