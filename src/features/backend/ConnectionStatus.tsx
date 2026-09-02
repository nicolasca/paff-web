import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

type ConnectionStatusProps = {
  configured: boolean
}

type StatusBoundaryProps = {
  children: ReactNode
}

type StatusBoundaryState = {
  hasError: boolean
}

class StatusBoundary extends Component<StatusBoundaryProps, StatusBoundaryState> {
  state: StatusBoundaryState = { hasError: false }

  static getDerivedStateFromError(): StatusBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Convex already reports the underlying error in development.
  }

  render() {
    if (this.state.hasError) {
      return (
        <StatusContent
          tone="error"
          eyebrow="Backend indisponible"
          message="La configuration est présente, mais Convex ne répond pas."
        />
      )
    }

    return this.props.children
  }
}

type StatusContentProps = {
  tone: 'idle' | 'loading' | 'success' | 'error'
  eyebrow: string
  message: string
}

function StatusContent({ tone, eyebrow, message }: StatusContentProps) {
  return (
    <div className="status-content" role="status" aria-live="polite">
      <span className={`status-dot status-dot--${tone}`} aria-hidden="true" />
      <div>
        <p className="status-eyebrow">{eyebrow}</p>
        <p className="status-message">{message}</p>
      </div>
    </div>
  )
}

function LiveConnectionStatus() {
  const status = useQuery(api.health.check)

  if (status === undefined) {
    return (
      <StatusContent
        tone="loading"
        eyebrow="Connexion en cours"
        message="Interrogation du backend Convex…"
      />
    )
  }

  return (
    <StatusContent
      tone="success"
      eyebrow={`${status.service} connecté`}
      message={status.message}
    />
  )
}

export function ConnectionStatus({ configured }: ConnectionStatusProps) {
  if (!configured) {
    return (
      <StatusContent
        tone="idle"
        eyebrow="Configuration requise"
        message="Ajoutez VITE_CONVEX_URL pour activer la connexion au backend."
      />
    )
  }

  return (
    <StatusBoundary>
      <LiveConnectionStatus />
    </StatusBoundary>
  )
}
