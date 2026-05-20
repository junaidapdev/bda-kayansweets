import { useContext } from 'react'
import type { User } from '@supabase/supabase-js'
import { AuthContext } from '../routes/AuthContext'
import { ROLES, type Role } from '../constants/roles'

export interface AuthState {
  role: Role
  canEdit: boolean
  setRole: (role: Role) => void
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return {
    role: ctx.role,
    canEdit: ctx.isAuthenticated && ctx.role === ROLES.ACCOUNTS,
    setRole: ctx.setRole,
    user: ctx.user,
    loading: ctx.loading,
    isAuthenticated: ctx.isAuthenticated,
    login: ctx.login,
    logout: ctx.logout,
  }
}
