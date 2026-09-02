import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthSession } from '../auth/authSession'
import { HomePage } from '../pages/HomePage'
import { LoginPage } from '../pages/LoginPage'
import { NotFoundPage } from '../pages/NotFoundPage'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<EntryRedirect />} />
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

function EntryRedirect() {
  const { status } = useAuthSession()

  if (status === 'loading') {
    return <AuthLoading />
  }

  return <Navigate replace to={status === 'authenticated' ? '/home' : '/login'} />
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuthSession()

  if (status === 'loading') {
    return <AuthLoading />
  }

  if (status !== 'authenticated') {
    return <Navigate replace to="/login" />
  }

  return children
}

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { status } = useAuthSession()

  if (status === 'loading') {
    return <AuthLoading />
  }

  if (status === 'authenticated') {
    return <Navigate replace to="/home" />
  }

  return children
}

function AuthLoading() {
  return (
    <main className="auth-loading" aria-live="polite">
      <span>Chargement…</span>
    </main>
  )
}
