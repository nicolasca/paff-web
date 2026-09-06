import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { liveGame } from '../test/liveGame'
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

describe('playable actions across two real clients', () => {
  it('moves, fires, recruits, charges and resolves a combat in sync, including a reconnect', async () => {
    const h = await liveGame()
    const transport = createFunctionalTransport(h)
    function Clients() {
      return <>{[1, 2].map((user) => <div key={user} data-testid={`player-${user}`}><FunctionalClientContext.Provider value={{ user, transport }}><MemoryRouter initialEntries={[`/lobby/${h.gameId}`]}><App /></MemoryRouter></FunctionalClientContext.Provider></div>)}</>
    }
    let mounted = render(<Clients />)
    const p = (user: number) => within(screen.getByTestId(`player-${user}`))
    const click = async (user: number, name: string | RegExp) => userEvent.click(await p(user).findByRole('button', { name }))
    const stage = async (name: string) => { for (const user of [1, 2]) expect(await p(user).findByRole('heading', { name })).toBeVisible() }
    await stage('Ordres & actions')
    expect(p(2).getByRole('button', { name: 'Jouer Mouvement' })).toBeDisabled()
    await click(1, 'Jouer Mouvement')
    await click(1, 'Lanciers · E5 · 4 R')
    await click(1, 'E4 · Déplacer ici')
    await waitFor(() => expect(p(2).getByRole('button', { name: 'E4 · Lanciers · Joueur 1' })).toBeVisible())
    expect(p(1).queryByRole('button', { name: 'Lanciers · E4 · 4 R' })).not.toBeInTheDocument()
    await click(1, 'Terminer cet ordre')
    await click(2, 'Jouer Mouvement')
    await click(2, 'Lanciers · E2 · 4 R')
    await click(2, 'E3 · Déplacer ici')
    await click(2, 'Terminer cet ordre')
    vi.spyOn(Math, 'random').mockReturnValue(.99)
    await click(1, 'Jouer Tir')
    await click(1, 'Archers · F5 · 2 R')
    await click(1, 'E3 · Tirer · Lanciers · Joueur 2')
    for (const user of [1, 2]) await waitFor(() => expect(p(user).getByRole('button', { name: 'E3 · Lanciers · Joueur 2' })).toHaveTextContent('3R'))
    expect(p(2).getByLabelText('1 touches, seuil 4, modificateur 0')).toBeVisible()
    mounted.unmount(); await transport.reconnect(); mounted = render(<Clients />)
    await stage('Ordres & actions')
    expect(p(1).getByRole('button', { name: 'E3 · Lanciers · Joueur 2' })).toHaveTextContent('3R')
    await click(1, 'Terminer cet ordre')
    await click(2, 'Jouer Tir'); await click(2, 'Terminer cet ordre')
    await click(1, 'Jouer Recrutement')
    await click(1, 'Lanciers · 2 pts · ×1')
    await click(1, 'A6 · Recruter ici')
    await waitFor(() => expect(p(2).getByRole('button', { name: 'A6 · Lanciers · Joueur 1' })).toBeVisible())
    expect(p(2).queryByLabelText('Unités de réserve')).not.toBeInTheDocument()
    await click(1, 'Terminer cet ordre')
    await click(2, 'Jouer Mouvement'); await click(2, 'Terminer cet ordre')
    await stage('Charges')
    await click(1, 'Lanciers · E4 · 4 R')
    await click(1, 'E3 · Charger · Lanciers · Joueur 2')
    await click(2, 'Terminer mes charges'); await click(1, 'Terminer mes charges')
    await stage('Combats')
    await click(1, /Résoudre le combat E4 \/ E3/)
    await click(1, 'Valider mes cibles et lancer les dés')
    expect(p(1).getByRole('button', { name: 'Combat validé · en attente' })).toBeDisabled()
    await click(2, 'Valider mes cibles et lancer les dés')
    await stage('Fin du tour')
    expect(p(1).getByRole('button', { name: 'E3 · Lanciers · Joueur 2' })).toHaveTextContent('1R')
    expect(p(1).getByRole('button', { name: 'E4 · Lanciers · Joueur 1' })).toHaveTextContent('3R')
    expect(p(1).queryByRole('radio')).not.toBeInTheDocument()
    await click(1, 'Valider la fin du tour'); await click(2, 'Valider la fin du tour')
    await stage('Ordres & actions')
    expect(p(2).getByRole('button', { name: 'Jouer Mouvement' })).toBeEnabled()
    expect((await h.read()).battle!.turn).toBe(2)
  }, 30000)
})
