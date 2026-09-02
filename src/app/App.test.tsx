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

const player = {
  loginId: 'joueur.un',
  displayName: 'Joueur Un',
  role: 'player' as const,
}

function renderApp(
  path: string,
  overrides: Partial<AuthSessionValue> = {},
) {
  const value: AuthSessionValue = {
    status: 'unauthenticated',
    player: null,
    signIn: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }

  return {
    ...render(
      <AuthSessionContext.Provider value={value}>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </AuthSessionContext.Provider>,
    ),
    value,
  }
}

function StatefulSession({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthSessionValue['status']>(
    'authenticated',
  )
  const value: AuthSessionValue = {
    status,
    player: status === 'authenticated' ? player : null,
    signIn: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn(async () => setStatus('unauthenticated')),
  }

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  )
}

describe('private routing', () => {
  it('redirects a visitor from the root to login', () => {
    renderApp('/')

    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeVisible()
  })

  it('prevents a visitor from accessing the home page', () => {
    renderApp('/home')

    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'PAFF' })).not.toBeInTheDocument()
  })

  it('displays the home page for an authenticated player', () => {
    renderApp('/home', { status: 'authenticated', player })

    expect(screen.getByRole('heading', { name: 'PAFF' })).toBeVisible()
  })

  it('redirects an authenticated player away from login', () => {
    renderApp('/login', { status: 'authenticated', player })

    expect(screen.getByRole('heading', { name: 'PAFF' })).toBeVisible()
  })

  it('does not flash login or home while restoring the session', () => {
    renderApp('/home', { status: 'loading' })

    expect(screen.getByText('Chargement…')).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Connexion' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'PAFF' })).not.toBeInTheDocument()
  })

  it('restores an authenticated route after a remount', () => {
    const firstRender = renderApp('/home', {
      status: 'authenticated',
      player,
    })
    expect(screen.getByRole('heading', { name: 'PAFF' })).toBeVisible()
    firstRender.unmount()

    renderApp('/home', { status: 'authenticated', player })
    expect(screen.getByRole('heading', { name: 'PAFF' })).toBeVisible()
  })

  it('refuses the protected page to a disabled account', () => {
    renderApp('/home', { status: 'disabled' })

    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeVisible()
  })

  it('invalidates the local session and redirects on logout', async () => {
    const user = userEvent.setup()
    render(
      <StatefulSession>
        <MemoryRouter initialEntries={['/home']}>
          <App />
        </MemoryRouter>
      </StatefulSession>,
    )

    await user.click(screen.getByRole('button', { name: 'Se déconnecter' }))

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Connexion' })).toBeVisible(),
    )
  })
})

describe('login form', () => {
  it('displays only the private login controls', () => {
    renderApp('/login')

    expect(screen.getByLabelText('Identifiant')).toBeVisible()
    expect(screen.getByLabelText('Mot de passe')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeVisible()
    expect(screen.queryByText(/inscription|mot de passe oublié/i)).not.toBeInTheDocument()
  })

  it('validates required fields without calling the backend', async () => {
    const user = userEvent.setup()
    const signIn = vi.fn().mockResolvedValue(undefined)
    renderApp('/login', { signIn })

    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(signIn).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Identifiant ou mot de passe incorrect.',
    )
  })

  it('shows the same generic error when authentication fails', async () => {
    const user = userEvent.setup()
    const signIn = vi.fn().mockRejectedValue(new Error('Account not found'))
    renderApp('/login', { signIn })

    await user.type(screen.getByLabelText('Identifiant'), 'INCONNU')
    await user.type(screen.getByLabelText('Mot de passe'), 'mauvais-secret')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(signIn).toHaveBeenCalledWith('inconnu', 'mauvais-secret')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Identifiant ou mot de passe incorrect.',
    )
  })
})
