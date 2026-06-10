import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import type { UserInfo } from "~/lib/types"
import * as authApi from "~/lib/auth"

interface AuthState {
  user: UserInfo | null
  loading: boolean
  login: (identifier: string, credential: string) => Promise<void>
  register: (account: string, password: string, displayName?: string, avatarUrl?: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = authApi.getToken()
    if (!token) {
      setLoading(false)
      return
    }
    authApi.fetchMe()
      .then(setUser)
      .catch(() => authApi.clearToken())
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (identifier: string, credential: string) => {
    const result = await authApi.login(identifier, credential)
    authApi.setToken(result.access_token)
    setUser(result.user)
  }, [])

  const register = useCallback(async (account: string, password: string, displayName?: string, avatarUrl?: string) => {
    const result = await authApi.registerAccount(account, password, displayName, avatarUrl)
    authApi.setToken(result.access_token)
    setUser(result.user)
  }, [])

  const logout = useCallback(() => {
    authApi.clearToken()
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const updated = await authApi.fetchMe()
    setUser(updated)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
