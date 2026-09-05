import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthSession } from '../auth/authSession'
import { RouteErrorBoundary } from '../components/RouteErrorBoundary'
import { CardsPage } from '../pages/CardsPage'
import { DecksPage } from '../pages/DecksPage'
import { HomePage } from '../pages/HomePage'
import { LoginPage } from '../pages/LoginPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { LobbyPage } from '../pages/LobbyPage'
import { GamePage } from '../pages/GamePage'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate replace to="/home" />} />
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
        element={<HomePage />}
      />
      <Route
        path="/cards"
        element={
          <RouteErrorBoundary>
            <CardsPage />
          </RouteErrorBoundary>
        }
      />
      <Route
        path="/decks"
        element={
          <ProtectedRoute>
            <RouteErrorBoundary>
              <DecksPage />
            </RouteErrorBoundary>
          </ProtectedRoute>
        }
      />
      <Route
        path="/decks/:deckId"
        element={<ProtectedRoute><RouteErrorBoundary><DecksPage mode="view" /></RouteErrorBoundary></ProtectedRoute>}
      />
      <Route
        path="/decks/:deckId/edit"
        element={<ProtectedRoute><RouteErrorBoundary><DecksPage mode="edit" /></RouteErrorBoundary></ProtectedRoute>}
      />
      <Route path="/lobby" element={<ProtectedRoute><RouteErrorBoundary><LobbyPage /></RouteErrorBoundary></ProtectedRoute>} />
      <Route path="/lobby/:gameId" element={<ProtectedRoute><RouteErrorBoundary><GamePage /></RouteErrorBoundary></ProtectedRoute>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
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
