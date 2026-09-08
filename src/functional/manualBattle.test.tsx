import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { liveGame } from '../test/liveGame'
import { createGameHarness } from '../test/gameHarness'
import { App } from '../app/App'
import { createFunctionalTransport, FunctionalClientContext } from '../test/functionalClient'

vi.mock('convex/react', async () => {
  const { useContext, useSyncExternalStore } = await import('react')
  const { getFunctionName } = await import('convex/server')
  const { FunctionalClientContext } = await import('../test/functionalClient')
  const skip = { subscribe: () => () => {}, snapshot: () => undefined }
  return {
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
    return { status: 'authenticated', player: { displayName: `Joueur ${client.user}` }, signOut: vi.fn() }
  } }
})

afterEach(() => vi.restoreAllMocks())

describe('manual tabletop across two real clients', () => {
  it('drags, recruits, compares, marks engagements and synchronizes counters and dice through a reconnect', async () => {
    const h = await liveGame(createGameHarness())
    const transport = createFunctionalTransport(h)
    function Clients() {
      return <>{[1, 2].map((user) => <div key={user} data-testid={`player-${user}`}><FunctionalClientContext.Provider value={{ user, transport }}><MemoryRouter initialEntries={[`/lobby/${h.gameId}`]}><App /></MemoryRouter></FunctionalClientContext.Provider></div>)}</>
    }
    let mounted = render(<Clients />)
    const p = (user: number) => within(screen.getByTestId(`player-${user}`))
    const click = async (user: number, name: string) => userEvent.click(await p(user).findByRole('button', { name }))
    async function drag(element: Element, user: number, destination: string) {
      const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' }
      fireEvent.dragStart(element, { dataTransfer })
      const target = await p(user).findByRole('button', { name: destination })
      // Native browsers may enter and drop before sending a dragover.
      expect(fireEvent.dragEnter(target, { dataTransfer })).toBe(false)
      fireEvent.dragOver(target, { dataTransfer })
      fireEvent.drop(target, { dataTransfer })
      fireEvent.dragEnd(element)
    }
    for (const user of [1, 2]) expect(await p(user).findByRole('heading', { name: 'À vous de jouer' })).toBeVisible()
    expect(p(1).queryByRole('button', { name: 'Jouer Mouvement' })).not.toBeInTheDocument()
    expect(p(1).queryByLabelText('Étapes de la partie')).not.toBeInTheDocument()

    await drag(p(2).getByRole('button', { name: 'E2 · Lanciers · Joueur 2' }), 2, 'E3 · Déplacer ici')
    await waitFor(() => expect(p(1).getByRole('button', { name: 'E3 · Lanciers · Joueur 2' })).toBeVisible())
    await drag(p(1).getByRole('button', { name: 'E5 · Lanciers · Joueur 1' }), 1, 'E4 · Déplacer ici')
    await waitFor(() => expect(p(2).getByRole('button', { name: 'E4 · Lanciers · Joueur 1' })).toBeVisible())

    fireEvent.contextMenu(p(1).getByRole('button', { name: 'F5 · Archers · Joueur 1' }))
    await waitFor(() => expect(p(2).getByRole('combobox', { name: 'Attaquant' })).not.toHaveValue(''))
    fireEvent.contextMenu(p(1).getByRole('button', { name: 'E3 · Lanciers · Joueur 2' }))
    for (const user of [1, 2]) await waitFor(() => expect(within(p(user).getByLabelText('Aide au combat')).getByText('4+')).toBeVisible())
    expect(p(1).getByText('3T contre 3 DT')).toBeVisible()
    await click(1, 'Marquer un engagement')
    for (const user of [1, 2]) await waitFor(() => expect(p(user).getByRole('button', { name: 'F5 · Archers · Joueur 1' })).toHaveClass('board-unit--engaged'))

    await click(1, 'Diminuer R de Lanciers · E4')
    await waitFor(() => expect(p(2).getByRole('button', { name: 'E4 · Lanciers · Joueur 1' })).toHaveTextContent('3R'))
    await click(2, 'Augmenter Tour')
    await click(1, 'Augmenter Points stratégiques de Joueur 1')
    await click(1, 'Diminuer Recrutement restants')
    await waitFor(() => expect(p(2).getByLabelText('Tour')).toHaveTextContent('2'))
    await waitFor(() => expect(p(2).getByLabelText('Points stratégiques de Joueur 1')).toHaveTextContent('1'))

    vi.spyOn(Math, 'random').mockReturnValue(.99)
    await click(2, 'Lancer')
    for (const user of [1, 2]) expect(await p(user).findByLabelText('Résultats : 6, 6, 6')).toBeVisible()
    expect(p(1).getByRole('button', { name: 'E3 · Lanciers · Joueur 2' })).toHaveTextContent('4R')

    const reserve = p(1).getByRole('button', { name: 'Recruter Lanciers' }).closest('[data-reserve-id]')!
    await drag(reserve, 1, 'A6 · Recruter ici')
    await waitFor(() => expect(p(2).getByRole('button', { name: 'A6 · Lanciers · Joueur 1' })).toBeVisible())
    expect(p(1).queryByRole('button', { name: 'Recruter Lanciers' })).not.toBeInTheDocument()
    expect(p(2).getByRole('button', { name: 'Recruter Lanciers' })).toBeVisible()
    expect(p(1).getByLabelText('Recrutement restants')).toHaveTextContent('2')
    await click(1, 'A6 · Lanciers · Joueur 1')
    await click(1, 'Retirer du plateau')
    await waitFor(() => expect(p(2).queryByRole('button', { name: 'A6 · Lanciers · Joueur 1' })).not.toBeInTheDocument())
    await userEvent.click(p(1).getByText('Votre défausse · 1'))
    await click(1, 'Remettre Lanciers · 4 R')
    await click(1, 'B6 · Remettre ici')
    await waitFor(() => expect(p(2).getByRole('button', { name: 'B6 · Lanciers · Joueur 1' })).toBeVisible())

    mounted.unmount(); await transport.reconnect(); mounted = render(<Clients />)
    for (const user of [1, 2]) {
      expect(await p(user).findByRole('heading', { name: 'À vous de jouer' })).toBeVisible()
      expect(p(user).getByLabelText('Tour')).toHaveTextContent('2')
      expect(p(user).getByRole('button', { name: 'E4 · Lanciers · Joueur 1' })).toHaveTextContent('3R')
      expect(p(user).getByRole('button', { name: 'F5 · Archers · Joueur 1' })).toHaveClass('board-unit--attacker', 'board-unit--engaged')
      expect(p(user).getByLabelText('Résultats : 6, 6, 6')).toBeVisible()
    }
    await click(2, 'Retirer l’engagement')
    await waitFor(() => expect(p(1).getByRole('button', { name: 'F5 · Archers · Joueur 1' })).not.toHaveClass('board-unit--engaged'))
    mounted.unmount()
  }, 30000)
})
