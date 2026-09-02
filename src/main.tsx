import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { BrowserRouter } from 'react-router-dom'
import { App } from './app/App'
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
const application = (
  <BrowserRouter>
    <App convexConfigured={convexClient !== null} />
  </BrowserRouter>
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {convexClient ? (
      <ConvexProvider client={convexClient}>{application}</ConvexProvider>
    ) : (
      application
    )}
  </StrictMode>,
)
