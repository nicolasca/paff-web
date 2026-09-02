import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useQuery } from 'convex/react'
import { ConnectionStatus } from './ConnectionStatus'

vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
}))

const useQueryMock = vi.mocked(useQuery)

describe('ConnectionStatus', () => {
  beforeEach(() => {
    useQueryMock.mockReset()
  })

  it('shows a loading state while Convex is answering', () => {
    useQueryMock.mockReturnValue(undefined)

    render(<ConnectionStatus configured />)

    expect(screen.getByText('Connexion en cours')).toBeVisible()
  })

  it('shows the response returned by Convex', () => {
    useQueryMock.mockReturnValue({
      service: 'Convex',
      status: 'operational',
      message: 'Le frontend reçoit bien une réponse du backend.',
    })

    render(<ConnectionStatus configured />)

    expect(screen.getByText('Convex connecté')).toBeVisible()
    expect(screen.getByText(/le frontend reçoit bien une réponse/i)).toBeVisible()
  })
})
