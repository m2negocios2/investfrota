import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export const ProtectedRoute: React.FC<{
  children: React.ReactNode
  requireProprietario?: boolean
}> = ({ children, requireProprietario = false }) => {
  const { isAuthenticated, isLoading, isProprietario } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireProprietario && !isProprietario) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
