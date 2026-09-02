import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App routing', () => {
  it('displays the PAFF home page', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App convexConfigured={false} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'PAFF' })).toBeVisible()
    expect(screen.getByText('Jeu de stratégie multijoueur')).toBeVisible()
    expect(screen.getByText(/deux joueurs dirigent chacun une faction/i)).toBeVisible()
  })

  it('handles unknown URLs and lets the user return home', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/zone-inconnue']}>
        <App convexConfigured={false} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: /cette page a quitté les archives/i })).toBeVisible()

    await user.click(screen.getByRole('link', { name: /revenir au seuil/i }))

    expect(screen.getByRole('heading', { name: 'PAFF' })).toBeVisible()
  })
})
