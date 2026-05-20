import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { ENV } from '../constants/env'
import { ROLES, type Role } from '../constants/roles'
import supabase from '../lib/supabaseClient'

interface AuthContextValue {
  role: Role
  setRole: (role: Role) => void
  session: Session | null
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

const ADMIN_ROLE = ROLES.ACCOUNTS
const INVALID_LOGIN_MESSAGE = 'Invalid username or password.'

function isAdminSession(session: Session | null): boolean {
  return session?.user.email?.toLowerCase() === ENV.ADMIN_AUTH_EMAIL.toLowerCase()
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const applySession = useCallback(async (nextSession: Session | null) => {
    if (nextSession && !isAdminSession(nextSession)) {
      await supabase.auth.signOut()
      setSession(null)
      return
    }
    setSession(nextSession)
  }, [])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      applySession(data.session).finally(() => {
        if (mounted) setLoading(false)
      })
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [applySession])

  const login = useCallback(async (username: string, password: string) => {
    if (username.trim().toLowerCase() !== ENV.ADMIN_USERNAME.toLowerCase()) {
      return { success: false, error: INVALID_LOGIN_MESSAGE }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: ENV.ADMIN_AUTH_EMAIL,
      password,
    })

    if (error || !data.session || !isAdminSession(data.session)) {
      await supabase.auth.signOut()
      return { success: false, error: INVALID_LOGIN_MESSAGE }
    }

    setSession(data.session)
    return { success: true }
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
  }, [])

  const setRole = useCallback((role: Role) => {
    void role
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    role: ADMIN_ROLE,
    setRole,
    session,
    user: session?.user ?? null,
    loading,
    isAuthenticated: !!session,
    login,
    logout,
  }), [loading, login, logout, session, setRole])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
