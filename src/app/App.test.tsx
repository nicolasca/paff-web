import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import {
  AuthSessionContext,
  type AuthSessionValue,
} from '../auth/authSession'
import { App } from './App'

vi.mock('../pages/CardsPage', () => ({
  CardsPage: () => <main><h1>Les cartes de PAFF</h1></main>,
}))

vi.mock('../pages/DecksPage', () => ({
  DecksPage: () => <main><h1>Mes decks</h1></main>,
}))

const player = {
  loginId: 'joueur.un',
  displayName: 'Joueur Un',
  role: 'player' as const,
}

function renderApp(path: string, overrides: Partial<AuthSessionValue> = {}) {
  const value: AuthSessionValue = {
    status: 'unauthenticated',
    player: null,
    signIn: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }

  return render(
    <AuthSessionContext.Provider value={value}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </AuthSessionContext.Provider>,
  )
}

function StatefulSession({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthSessionValue['status']>('authenticated')
  const value: AuthSessionValue = {
    status,
    player: status === 'authenticated' ? player : null,
    signIn: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn(async () => setStatus('unauthenticated')),
  }

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
}

describe('public and private routing', () => {
  it('redirects the root to the public home page', () => {
    renderApp('/')
    expect(screen.getByRole('heading', { name: 'PAFF' })).toBeVisible()
  })

  it('allows a visitor to open home without a login redirect', () => {
    renderApp('/home')
    expect(screen.getByRole('heading', { name: 'PAFF' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Connexion' })).not.toBeInTheDocument()
  })

  it('allows a visitor to open the card catalogue', () => {
    renderApp('/cards')
    expect(screen.getByRole('heading', { name: 'Les cartes de PAFF' })).toBeVisible()
  })

  it('keeps the card catalogue available to a player', () => {
    renderApp('/cards', { status: 'authenticated', player })
    expect(screen.getByRole('heading', { name: 'Les cartes de PAFF' })).toBeVisible()
  })

  it('keeps login public for visitors', () => {
    renderApp('/login')
    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeVisible()
  })

  it('redirects an authenticated player away from login', () => {
    renderApp('/login', { status: 'authenticated', player })
    expect(screen.getByRole('heading', { name: 'PAFF' })).toBeVisible()
  })

  it('keeps future personal routes protected', () => {
    renderApp('/decks')
    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeVisible()
  })

  it.each(['/decks/deck-1', '/decks/deck-1/edit'])('protects the personal route %s', (path) => {
    renderApp(path)
    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeVisible()
  })

  it.each(['/decks/deck-1', '/decks/deck-1/edit'])('opens the personal route %s for its player', (path) => {
    renderApp(path, { status: 'authenticated', player })
    expect(screen.getByRole('heading', { name: 'Mes decks' })).toBeVisible()
  })

  it('opens decks for an authenticated player', () => {
    renderApp('/decks', { status: 'authenticated', player })
    expect(screen.getByRole('heading', { name: 'Mes decks' })).toBeVisible()
  })

  it('does not flash a protected page while restoring the session', () => {
    renderApp('/decks', { status: 'loading' })
    expect(screen.getByText('Chargement…')).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Mes decks' })).not.toBeInTheDocument()
  })
})

describe('public navigation and session', () => {
  it('offers home, cards and login to a visitor', () => {
    renderApp('/home')
    expect(screen.getByRole('link', { name: 'Accueil' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Cartes' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Se connecter' })).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Mes decks' })).not.toBeInTheDocument()
  })

  it('offers decks and logout to an authenticated player', () => {
    renderApp('/home', { status: 'authenticated', player })
    expect(screen.getByText('Joueur Un')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Mes decks' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Cartes' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Se déconnecter' })).toBeVisible()
  })

  it('keeps the public home visible after logout', async () => {
    const user = userEvent.setup()
    render(
      <StatefulSession>
        <MemoryRouter initialEntries={['/home']}>
          <App />
        </MemoryRouter>
      </StatefulSession>,
    )

    await user.click(screen.getByRole('button', { name: 'Se déconnecter' }))
    await waitFor(() => expect(screen.getByRole('link', { name: 'Se connecter' })).toBeVisible())
    expect(screen.getByRole('heading', { name: 'PAFF' })).toBeVisible()
  })
})

describe('login form', () => {
  it('validates required fields without calling the backend', async () => {
    const user = userEvent.setup()
    const signIn = vi.fn().mockResolvedValue(undefined)
    renderApp('/login', { signIn })

    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(signIn).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Identifiant ou mot de passe incorrect.')
  })

  it('shows the same generic error when authentication fails', async () => {
    const user = userEvent.setup()
    const signIn = vi.fn().mockRejectedValue(new Error('Account not found'))
    renderApp('/login', { signIn })

    await user.type(screen.getByLabelText('Identifiant'), 'INCONNU')
    await user.type(screen.getByLabelText('Mot de passe'), 'mauvais-secret')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(signIn).toHaveBeenCalledWith('inconnu', 'mauvais-secret')
    expect(screen.getByRole('alert')).toHaveTextContent('Identifiant ou mot de passe incorrect.')
  })
})
