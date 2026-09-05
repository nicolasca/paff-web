import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { failed: boolean }

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Les détails restent dans les outils de développement, jamais dans l’UI.
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="route-error" role="alert">
          <h1>Impossible de charger cette page.</h1>
          <p>Réessayez dans quelques instants.</p>
          <button type="button" onClick={() => this.setState({ failed: false })}>
            Réessayer
          </button>
        </main>
      )
    }

    return this.props.children
  }
}
