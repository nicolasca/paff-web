import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { liveGame } from '../test/liveGame'
import { createFunctionalTransport, FunctionalClientContext } from '../test/functionalClient'

vi.mock('convex/react', async () => {
  const { useContext, useSyncExternalStore } = await import('react')
  const { getFunctionName } = await import('convex/server')
  const { FunctionalClientContext } = await import('../test/functionalClient')
  const skip = { subscribe: () => () => {}, snapshot: () => undefined }
  return {
    useAction: () => vi.fn(),
    useQuery(reference: Parameters<typeof getFunctionName>[0], args: Record<string, unknown> | 'skip' = {}) {
      const client = useContext(FunctionalClientContext)!
      const query = args === 'skip' ? skip : client.transport.query(client.user, getFunctionName(reference), args)
      return useSyncExternalStore(query.subscribe, query.snapshot)
    },
    useMutation(reference: Parameters<typeof getFunctionName>[0]) {
      const client = useContext(FunctionalClientContext)!
      return (args: Record<string, unknown>) => client.transport.mutate(client.user, getFunctionName(reference), args)
    },
    useConvexConnectionState: () => ({ isWebSocketConnected: true }),
  }
})
vi.mock('../auth/authSession', async () => {
  const { useContext } = await import('react')
  const { FunctionalClientContext } = await import('../test/functionalClient')
  return { useAuthSession: () => {
    const client = useContext(FunctionalClientContext)!
    return { status: 'authenticated', player: { userId: `user-${client.user}`, displayName: `Joueur ${client.user}` }, signOut: vi.fn() }
  } }
})

describe('recruitment points across players and spectators', () => {
  it('shows 3 plus current strategy, keeps manual spending independent and renews the budget each turn', async () => {
    const h = await liveGame()
    const transport = createFunctionalTransport(h)
    const mounted = render(<>{[1, 2, 3].map((user) => <div key={user} data-testid={`recruitment-client-${user}`}><FunctionalClientContext.Provider value={{ user, transport }}><MemoryRouter initialEntries={[`/lobby/${h.gameId}`]}><App /></MemoryRouter></FunctionalClientContext.Provider></div>)}</>)
    const p = (user: number) => within(screen.getByTestId(`recruitment-client-${user}`))
    const recruitment = (viewer: number, player: number) => p(viewer).getByLabelText(`Points de recrutement de Joueur ${player}`)
    const strategy = (viewer: number, player: number) => p(viewer).getByLabelText(`Points stratégiques de Joueur ${player}`)
    const click = async (user: number, name: string) => userEvent.click(await p(user).findByRole('button', { name }))
    await p(1).findByLabelText('Points de recrutement de Joueur 1')
    await p(2).findByLabelText('Points de recrutement de Joueur 2')
    await p(3).findByLabelText('Points de recrutement de Joueur 1')
    const initialStocks = structuredClone((await h.read()).battle!.manual.stocks)
    for (const viewer of [1, 2, 3]) {
      expect(recruitment(viewer, 1)).toHaveTextContent('3')
      expect(recruitment(viewer, 2)).toHaveTextContent('3')
    }
    for (const player of [1, 2]) {
      expect(p(player).getByRole('button', { name: `Diminuer Points de recrutement de Joueur ${player}` })).toBeDisabled()
      expect(p(player).getByRole('button', { name: `Augmenter Points de recrutement de Joueur ${player}` })).toBeDisabled()
      expect(p(player).getByRole('button', { name: 'Diminuer Recrutement restants' })).toBeDisabled()
    }
    expect(p(3).queryByRole('button', { name: /Augmenter|Diminuer Points de recrutement/ })).not.toBeInTheDocument()
    await click(1, 'Augmenter Points stratégiques de Joueur 1')
    await waitFor(() => {
      for (const viewer of [1, 2, 3]) {
        expect(strategy(viewer, 1)).toHaveTextContent('1')
        expect(recruitment(viewer, 1)).toHaveTextContent('4')
      }
    })
    await click(2, 'Augmenter Tour')
    await waitFor(() => expect(p(1).getByRole('button', { name: 'Diminuer Points de recrutement de Joueur 1' })).toBeEnabled())
    await click(1, 'Diminuer Points de recrutement de Joueur 1')
    await waitFor(() => {
      for (const viewer of [1, 2, 3]) {
        expect(recruitment(viewer, 1)).toHaveTextContent('3')
        expect(strategy(viewer, 1)).toHaveTextContent('1')
        expect(recruitment(viewer, 2)).toHaveTextContent('3')
      }
    })
    expect((await h.read()).battle!.manual.stocks).toEqual(initialStocks)
    await click(2, 'Diminuer Points de recrutement de Joueur 2')
    await waitFor(() => expect(recruitment(3, 2)).toHaveTextContent('2'))
    await click(1, 'Augmenter Tour')
    await waitFor(() => {
      for (const viewer of [1, 2, 3]) {
        expect(recruitment(viewer, 1)).toHaveTextContent('4')
        expect(recruitment(viewer, 2)).toHaveTextContent('3')
        expect(strategy(viewer, 1)).toHaveTextContent('1')
      }
    })
    expect((await h.read()).battle!.manual.stocks).toEqual(initialStocks)
    mounted.unmount()
  }, 30000)
})
