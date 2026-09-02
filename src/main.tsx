import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { ConvexReactClient } from 'convex/react'
import { BrowserRouter } from 'react-router-dom'
import { App } from './app/App'
import { AuthSessionProvider } from './auth/AuthSessionContext'
import './styles/global.css'

const convexUrl = import.meta.env.VITE_CONVEX_URL?.trim()

function createConvexClient() {
  if (!convexUrl) {
    return null
  }

  try {
    return new ConvexReactClient(convexUrl)
  } catch {
    return null
  }
}

const convexClient = createConvexClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {convexClient ? (
      <ConvexAuthProvider client={convexClient}>
        <AuthSessionProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthSessionProvider>
      </ConvexAuthProvider>
    ) : (
      <main className="configuration-error">
        <h1>Configuration requise</h1>
        <p>La variable VITE_CONVEX_URL doit être configurée.</p>
      </main>
    )}
  </StrictMode>,
)
