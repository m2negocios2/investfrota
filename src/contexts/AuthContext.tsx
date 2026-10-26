import React, { createContext, useContext, useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { User, UserRole } from '@/types/database'

interface AuthContextType {
  user: User | null
  role: UserRole
  isAuthenticated: boolean
  isLoading: boolean
  isProprietario: boolean
  isAdministrador: boolean
  login: (email: string, pass: string) => Promise<void>
  logout: () => void
  requestPasswordReset: (email: string) => Promise<void>
  requestVerification: (email: string) => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const syncUserFromAuth = () => {
    if (pb.authStore.isValid && pb.authStore.record) {
      const record = pb.authStore.record
      const mappedUser: User = {
        id: record.id,
        email: record.email || '',
        name: record.name || (record.email ? record.email.split('@')[0] : 'Usuário'),
        role: (record.role as UserRole) || 'proprietario',
        avatar: record.avatar || '',
        created: record.created,
        updated: record.updated,
      }
      setUser(mappedUser)
    } else {
      setUser(null)
    }
  }

  useEffect(() => {
    syncUserFromAuth()
    setIsLoading(false)

    // Listen to pb authStore changes
    const unsub = pb.authStore.onChange(() => {
      syncUserFromAuth()
    })

    return () => {
      unsub()
    }
  }, [])

  const login = async (email: string, pass: string) => {
    await pb.collection('users').authWithPassword(email, pass)
    syncUserFromAuth()
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
  }

  const requestPasswordReset = async (email: string) => {
    await pb.collection('users').requestPasswordReset(email)
  }

  const requestVerification = async (email: string) => {
    await pb.collection('users').requestVerification(email)
  }

  const refreshUser = async () => {
    if (pb.authStore.isValid && pb.authStore.record) {
      try {
        const fresh = await pb.collection('users').getOne<User>(pb.authStore.record.id)
        setUser(fresh)
      } catch (err) {
        console.error('Erro ao atualizar usuário:', err)
      }
    }
  }

  const role: UserRole = user?.role || 'proprietario'
  const isProprietario = role === 'proprietario'
  const isAdministrador = role === 'administrador'

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: !!user,
        isLoading,
        isProprietario,
        isAdministrador,
        login,
        logout,
        requestPasswordReset,
        requestVerification,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
