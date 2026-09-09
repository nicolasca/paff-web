import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

describe('functional two-player journey with real game handlers', () => {
  it('keeps private preparation, corrects deployment, and opens the shared manual board', async () => {
    const transport = createFunctionalTransport(createGameHarness())
    const { tables } = transport.harness
    tables.cards[0].cost = 1
    tables.cards.push({ ...tables.cards[0], _id: 'lancers', stableId: 'lanciers', name: 'Lanciers' })
    tables.deckCards.push({ _id: 'lancers-1', deckId: 'deck-1', cardId: 'lancers', quantity: 4 })
    const paths = new Map<number, string>()
    function Location({ user }: { user: number }) {
      const { pathname } = useLocation()
      useEffect(() => { paths.set(user, pathname) }, [user, pathname])
      return null
    }
    function Clients() {
      return <>{[1, 2].map((user) => <div key={user} data-testid={`player-${user}`}><FunctionalClientContext.Provider value={{ user, transport }}><MemoryRouter initialEntries={[paths.get(user) ?? '/lobby']}><Location user={user} /><App /></MemoryRouter></FunctionalClientContext.Provider></div>)}</>
    }
    let mounted = render(<Clients />)
    const p = (user: number) => within(screen.getByTestId(`player-${user}`))
    const click = async (user: number, name: string | RegExp) => userEvent.click(await p(user).findByRole('button', { name }))
    const stage = async (heading: string) => {
      for (const user of [1, 2]) expect(await p(user).findByRole('heading', { name: heading })).toBeVisible()
    }
    async function reload() {
      mounted.unmount()
      await transport.reconnect()
      mounted = render(<Clients />)
    }

    await waitFor(() => expect(p(1).getByRole('button', { name: /Créer une partie/ })).toBeEnabled())
    await click(1, /Créer une partie/)
    await click(2, /Rejoindre/)
    await waitFor(() => expect(p(1).getByRole('button', { name: /Lancer la partie/ })).toBeEnabled())
    await click(1, /Lancer la partie/)
    await stage('Choisissez votre deck')
    await click(1, 'Choisir Armée 1')
    expect(p(1).queryByRole('button', { name: 'Lancer mon dé' })).not.toBeInTheDocument()
    await click(2, 'Choisir Armée 2')

    // This assertion catches the original regression: neither the UI nor the
    // backend may jump directly from deck selection to initiative.
    await stage('Choisissez vos unités à déployer')
    expect(p(1).getByRole('spinbutton', { name: 'Quantité de Archers' })).toHaveValue(0)
    await click(1, 'Ajouter Archers')
    await click(1, 'Ajouter Archers')
    await click(2, 'Ajouter Archers')
    expect(p(2).getByLabelText('Réserve de Joueur 1 : 2 unités face cachée')).toBeVisible()
    expect(p(2).queryByText('Lanciers')).not.toBeInTheDocument()
    expect(p(1).queryByRole('heading', { name: 'Piège' })).not.toBeInTheDocument()
    await click(1, 'Valider mes unités')
    await reload()
    await stage('Choisissez vos unités à déployer')
    expect(p(1).getByRole('spinbutton', { name: 'Quantité de Archers' })).toHaveValue(2)
    expect(p(1).getByRole('spinbutton', { name: 'Quantité de Archers' })).toBeDisabled()
    expect(p(1).getByRole('spinbutton', { name: 'Quantité de Lanciers' })).toHaveValue(0)
    expect(p(1).queryByRole('button', { name: 'Lancer mon dé' })).not.toBeInTheDocument()
    expect(p(2).getByRole('spinbutton', { name: 'Quantité de Archers' })).toBeEnabled()
    await click(2, 'Valider mes unités')

    await stage('À qui le premier mouvement ?')
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.99).mockReturnValueOnce(0)
    await click(1, 'Lancer mon dé')
    await click(2, 'Lancer mon dé')
    await click(1, 'Passer au déploiement')
    expect(p(1).queryByRole('heading', { name: 'Prenez position' })).not.toBeInTheDocument()
    await click(2, 'Passer au déploiement')
    await stage('Prenez position')
    for (const user of [1, 2]) {
      expect(p(user).getByText('Flanc coco')).toBeVisible()
      expect(p(user).getByText('Flanc aux pommes')).toBeVisible()
    }
    expect(p(1).queryByRole('button', { name: /Sélectionner Lanciers/ })).not.toBeInTheDocument()
    expect(p(1).getByRole('button', { name: 'Terminer mon déploiement' })).toBeDisabled()
    await click(1, 'Sélectionner Archers, 2 disponibles')
    await click(1, 'E5 · Déployer ici')
    expect(p(2).getByRole('button', { name: 'E5 · Archers · Joueur 1' })).toBeVisible()
    expect(p(2).getByLabelText('Réserve de Joueur 1 : 1 unité face cachée')).toBeVisible()
    // Correct a placed unit while the opponent owns the deployment turn.
    await click(1, 'E5 · Archers · Joueur 1')
    await click(1, 'Changer de case')
    await click(1, 'F5 · Déplacer ici')
    expect(p(2).getByRole('button', { name: 'F5 · Archers · Joueur 1' })).toBeVisible()
    expect(p(2).getByLabelText('Réserve de Joueur 1 : 1 unité face cachée')).toBeVisible()
    expect(p(1).queryByRole('button', { name: 'E5 · Archers · Joueur 1' })).not.toBeInTheDocument()
    await click(2, 'Sélectionner Archers, 1 disponibles')
    await click(2, 'E2 · Déployer ici')
    await reload()
    await stage('Prenez position')
    expect(p(1).getByRole('button', { name: 'Terminer mon déploiement' })).toBeDisabled()
    expect(p(1).getByRole('button', { name: 'F5 · Archers · Joueur 1' })).toBeVisible()
    await click(1, 'Sélectionner Archers, 1 disponibles')
    await click(1, 'A6 · Déployer ici')
    await click(2, 'Terminer mon déploiement')
    await click(2, 'Confirmer le déploiement')
    expect(p(1).queryByRole('region', { name: 'Aire de jeu' })).not.toBeInTheDocument()
    expect(p(1).getByRole('button', { name: 'Sélectionner Archers, 0 disponibles' })).toBeDisabled()
    await click(1, 'Terminer mon déploiement')
    await click(1, 'Confirmer le déploiement')
    for (const user of [1, 2]) {
      expect(await p(user).findByRole('region', { name: 'Plateau manuel' })).toBeVisible()
      for (const name of ['F5 · Archers · Joueur 1', 'A6 · Archers · Joueur 1', 'E2 · Archers · Joueur 2']) expect(p(user).getByRole('button', { name })).toBeVisible()
      expect(p(user).getByRole('button', { name: 'Augmenter Tour' })).toBeEnabled()
      expect(p(user).queryByRole('button', { name: 'Choisir Mouvement' })).not.toBeInTheDocument()
    }
    await reload()
    for (const user of [1, 2]) expect(await p(user).findByRole('region', { name: 'Plateau manuel' })).toBeVisible()
  }, 30000)
})
