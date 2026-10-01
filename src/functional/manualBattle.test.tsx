import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { liveGame } from '../test/liveGame'
import { createGameHarness } from '../test/gameHarness'
import { App } from '../app/App'
import { createFunctionalTransport, FunctionalClientContext } from '../test/functionalClient'
import { catalogue2026, catalogueFactions } from '../../shared/catalogue2026'
import { GOBLIN_BAND_CARD_ID } from '../../shared/manualBattle'
import { invocationGame } from '../test/invocationGame'
import type { BattleState } from '../../shared/battle'

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

afterEach(() => vi.restoreAllMocks())

// Real profiles and handlers, with positions prepared only in the in-memory table.
async function shootingTable(entries: { id: string; seat: number; stableId: string; cell: number }[], frozenLongArchers = false) {
  const h = await liveGame()
  const battle = h.stored.battle as BattleState
  battle.engine = { units: [], engagements: [], log: [] }
  h.tables.gameCards = []
  for (const { id, seat, stableId, cell } of entries) {
    const source = catalogue2026.find((card) => card.stableId === stableId)!
    const playerId = h.tables.gamePlayers[seat]._id
    const existing = h.tables.gameCards.find((card) => card.gamePlayerId === playerId && card.stableId === stableId)
    if (existing) for (const key of ['quantity', 'deploymentQuantity', 'selectedQuantity', 'enteredQuantity']) existing[key] = Number(existing[key]) + 1
    else {
      const profile = structuredClone(source.profile)
      if (frozenLongArchers && stableId === 'gaeli-archers-longs-gaeliens') delete profile.ability
      h.tables.gameCards.push({ ...source, profile, _id: `shooting-card-${id}`, gamePlayerId: playerId, kind: 'unit', abilities: [], faction: { stableId: source.faction, name: catalogueFactions[source.faction], themeKey: source.faction }, quantity: 1, deploymentQuantity: 1, selectedQuantity: 1, enteredQuantity: 1 })
    }
    battle.engine.units.push({ id, seat, cell, cardStableId: stableId, regiment: source.profile.regiment })
  }
  return h
}

describe('manual tabletop across two real clients', () => {
  it('highlights only targets within three steps in the Goblin shooter’s axis, keeps invalid choices local and rechecks arrows after movement', async () => {
    const h = await shootingTable([
      { id: 'archer', seat: 0, stableId: 'gobelins-archers-gobelins', cell: 40 }, // E5
      { id: 'shaman', seat: 0, stableId: 'gobelins-shaman-gobelin', cell: 33 }, // G4
      { id: 'straight', seat: 1, stableId: GOBLIN_BAND_CARD_ID, cell: 13 }, // E2: 3
      { id: 'diagonal', seat: 1, stableId: GOBLIN_BAND_CARD_ID, cell: 21 }, // D3: 2 + 1
      { id: 'far', seat: 1, stableId: GOBLIN_BAND_CARD_ID, cell: 14 }, // F2: 3 + 1
      { id: 'other-axis', seat: 1, stableId: GOBLIN_BAND_CARD_ID, cell: 43 }, // H5: 3, another axis
    ])
    const transport = createFunctionalTransport(h)
    const mutate = vi.spyOn(transport, 'mutate')
    const mounted = render(<>{[1, 2, 3].map((user) => <div key={user} data-testid={`player-${user}`}><FunctionalClientContext.Provider value={{ user, transport }}><MemoryRouter initialEntries={[`/lobby/${h.gameId}`]}><App /></MemoryRouter></FunctionalClientContext.Provider></div>)}</>)
    const p = (user: number) => within(screen.getByTestId(`player-${user}`))
    const root = screen.getByTestId('player-1')
    const tile = (id: string) => root.querySelector(`[data-unit-id="${id}"]`)!
    await userEvent.click(await p(1).findByRole('button', { name: 'Tir' }))
    await userEvent.click(p(1).getByRole('button', { name: 'E5 · Archers Gobelins · Joueur 1' }))
    expect(tile('archer')).toHaveClass('board-unit--shooting-source')
    expect(root.querySelectorAll('.board-unit--shooting-target')).toHaveLength(2)
    for (const id of ['straight', 'diagonal']) {
      expect(tile(id)).toHaveClass('board-unit--shooting-target')
      expect(tile(id)).toHaveAttribute('aria-description', 'Cible à portée : 3 cases')
      fireEvent.focus(tile(id))
      expect(tile(id)).toHaveAccessibleDescription(expect.stringContaining('Cible à portée : 3 cases'))
    }
    for (const id of ['far', 'other-axis']) expect(tile(id)).toHaveClass('board-unit--outside-range')
    expect(p(1).getByText('Portée 3 · même axe', { exact: false })).toHaveTextContent('2 cibles à portée')
    for (const user of [2, 3]) expect(screen.getByTestId(`player-${user}`).querySelector('.board-unit--shooting-target')).toBeNull()

    await userEvent.click(p(1).getByRole('button', { name: 'F2 · Bande de Gobelins · Joueur 2' }))
    expect(mutate).not.toHaveBeenCalled()
    expect(tile('archer')).toHaveClass('board-unit--shooting-source')
    expect(p(1).getByText('Cette cible est hors de portée ou dans un autre axe. Choisissez une unité éclairée.')).toBeVisible()
    expect((await h.read()).battle!.manual.combat?.arrows ?? []).toHaveLength(0)

    await userEvent.click(p(1).getByRole('button', { name: 'G4 · Shamans Gobelins · Joueur 1' }))
    expect(tile('archer')).not.toHaveClass('board-unit--shooting-source')
    expect(tile('shaman')).toHaveClass('board-unit--shooting-source')
    expect(tile('far')).toHaveClass('board-unit--shooting-target')
    expect(tile('straight')).toHaveClass('board-unit--outside-range')
    expect(root.querySelectorAll('.board-unit--shooting-target')).toHaveLength(1)
    await userEvent.keyboard('{Escape}')
    expect(root.querySelector('.board-unit--shooting-source, .board-unit--shooting-target, .board-unit--outside-range')).toBeNull()
    await userEvent.click(p(1).getByRole('button', { name: 'G4 · Shamans Gobelins · Joueur 1' }))
    await userEvent.click(p(1).getByRole('button', { name: 'Corps à corps' }))
    expect(root.querySelector('.board-unit--shooting-source, .board-unit--shooting-target, .board-unit--outside-range')).toBeNull()

    await userEvent.click(p(1).getByRole('button', { name: 'Tir' }))
    await userEvent.click(p(1).getByRole('button', { name: 'E5 · Archers Gobelins · Joueur 1' }))
    await userEvent.click(p(1).getByRole('button', { name: 'E2 · Bande de Gobelins · Joueur 2' }))
    await waitFor(() => expect(p(1).getByRole('button', { name: /TIR 1 attaque/ })).toBeEnabled())
    expect(mutate).toHaveBeenCalledWith(1, 'combat:setArrow', { gameId: h.gameId, kind: 'ranged', attackerId: 'archer', targetId: 'straight' })
    expect(root.querySelector('.board-unit--shooting-source, .board-unit--shooting-target, .board-unit--outside-range')).toBeNull()
    await userEvent.click(p(2).getByRole('button', { name: 'E2 · Bande de Gobelins · Joueur 2' }))
    await userEvent.click(p(2).getByRole('button', { name: 'E1 · Déplacer ici' }))
    await waitFor(() => expect(p(1).getByRole('button', { name: /TIR 1 attaque/ })).toBeDisabled())
    expect(p(1).getByText('Une cible a quitté la portée : modifiez ou retirez sa flèche.')).toBeVisible()
    expect(p(1).getByText('Hors de portée · cette flèche doit être modifiée.')).toBeVisible()
    const combat = (await h.read()).battle!.manual.combat!
    expect(combat.arrows).toHaveLength(1)
    expect(combat.reports).toHaveLength(0)
    mounted.unmount()
  }, 30000)

  it('gives north-side frozen Gaeli Archers their normal range plus four straight ahead, while hiding the former order for players and spectators', async () => {
    const h = await shootingTable([
      { id: 'long-archer', seat: 1, stableId: 'gaeli-archers-longs-gaeliens', cell: 4 }, // E1
      { id: 'long-target', seat: 0, stableId: GOBLIN_BAND_CARD_ID, cell: 40 }, // E5: 4 ahead
      { id: 'normal-target', seat: 0, stableId: GOBLIN_BAND_CARD_ID, cell: 23 }, // F3: 2 + 1
      { id: 'off-column', seat: 0, stableId: GOBLIN_BAND_CARD_ID, cell: 32 }, // F4: 3 + 1
      { id: 'other-axis', seat: 0, stableId: GOBLIN_BAND_CARD_ID, cell: 7 }, // H1: 3, another axis
    ], true)
    const battle = h.stored.battle as BattleState
    battle.catalog.push({ id: 'long-range-fire', name: 'Tir longue portée', faction: 'gaeli', category: 'common', description: 'Ancien ordre figé', seats: [1] })
    const frozenProfile = structuredClone(h.tables.gameCards.find(card => card.stableId === 'gaeli-archers-longs-gaeliens')!.profile)
    const transport = createFunctionalTransport(h)
    const mutate = vi.spyOn(transport, 'mutate')
    const mounted = render(<>{[1, 2, 3].map((user) => <div key={user} data-testid={`player-${user}`}><FunctionalClientContext.Provider value={{ user, transport }}><MemoryRouter initialEntries={[`/lobby/${h.gameId}`]}><App /></MemoryRouter></FunctionalClientContext.Provider></div>)}</>)
    const p = (user: number) => within(screen.getByTestId(`player-${user}`))
    const root = screen.getByTestId('player-2')
    const tile = (id: string) => root.querySelector(`[data-unit-id="${id}"]`)!
    await userEvent.click(await p(2).findByRole('button', { name: 'Tir' }))
    fireEvent.contextMenu(p(2).getByRole('button', { name: 'E1 · Archers longs Gaeliens · Joueur 2' }))
    expect(tile('long-archer')).toHaveClass('board-unit--shooting-source')
    expect(root.querySelectorAll('.board-unit--shooting-target')).toHaveLength(2)
    expect(tile('long-target')).toHaveClass('board-unit--shooting-target')
    expect(tile('long-target')).toHaveAttribute('aria-description', 'Cible à portée : 4 cases')
    expect(tile('normal-target')).toHaveClass('board-unit--shooting-target')
    expect(tile('normal-target')).toHaveAttribute('aria-description', 'Cible à portée : 3 cases')
    for (const id of ['off-column', 'other-axis']) expect(tile(id)).toHaveClass('board-unit--outside-range')
    expect(p(2).getByText('Portée 3 · 4 droit devant', { exact: false })).toHaveTextContent('2 cibles à portée')
    for (const user of [1, 2, 3]) expect(screen.getByTestId(`player-${user}`).querySelector('.manual-orders')).not.toHaveTextContent('Tir longue portée')
    expect(p(3).getByRole('region', { name: 'Ordres de Joueur 2' })).not.toHaveTextContent('Tir longue portée')

    fireEvent.keyDown(p(2).getByRole('button', { name: 'F4 · Bande de Gobelins · Joueur 1' }), { key: 'c' })
    expect(mutate).not.toHaveBeenCalled()
    expect(tile('long-archer')).toHaveClass('board-unit--shooting-source')
    await userEvent.click(p(2).getByRole('button', { name: 'F3 · Bande de Gobelins · Joueur 1' }))
    await waitFor(() => expect(p(2).getByRole('button', { name: /TIR 1 attaque/ })).toBeEnabled())
    expect((await h.read()).battle!.manual.combat!.arrows).toMatchObject([{ attackerId: 'long-archer', targetId: 'normal-target' }])
    await userEvent.click(p(2).getByRole('button', { name: 'E1 · Archers longs Gaeliens · Joueur 2' }))
    await userEvent.click(p(2).getByRole('button', { name: 'E5 · Bande de Gobelins · Joueur 1' }))
    await waitFor(() => expect(mutate).toHaveBeenCalledWith(2, 'combat:setArrow', { gameId: h.gameId, kind: 'ranged', attackerId: 'long-archer', targetId: 'long-target' }))
    expect((await h.read()).battle!.manual.combat!.arrows).toMatchObject([{ attackerId: 'long-archer', targetId: 'long-target' }])
    expect(h.tables.gameCards.find(card => card.stableId === 'gaeli-archers-longs-gaeliens')!.profile).toEqual(frozenProfile)
    expect(battle.catalog.some(order => order.id === 'long-range-fire')).toBe(true)
    mounted.unmount()
  }, 30000)

  it('keeps one faction die in every mode, rolls one random die per click and shares the history without changing combat', async () => {
    const h = await liveGame()
    const a = await h.unit(0, 'lanciers'), b = await h.unit(1, 'lanciers')
    await h.invoke('combat', 'setArrow', 1, { gameId: h.gameId, kind: 'melee', attackerId: a.id, targetId: b.id })
    const revision = (await h.read()).battle!.manual.combat!.revision
    for (const user of [1, 2]) await h.invoke('combat', 'setReady', user, { gameId: h.gameId, revision, ready: true })
    const combatBefore = (await h.read()).battle!.manual.combat
    for (const card of h.tables.gameCards.filter((card) => card.gamePlayerId === h.tables.gamePlayers[1]._id)) card.faction = { stableId: 'sephosi', name: 'Sephosi', themeKey: 'sephosi' }
    const transport = createFunctionalTransport(h)
    function Clients() {
      return <>{[1, 2, 3].map((user) => <div key={user} data-testid={`player-${user}`}><FunctionalClientContext.Provider value={{ user, transport }}><MemoryRouter initialEntries={[`/lobby/${h.gameId}`]}><App /></MemoryRouter></FunctionalClientContext.Provider></div>)}</>
    }
    let mounted = render(<Clients />)
    const p = (user: number) => within(screen.getByTestId(`player-${user}`))
    await p(1).findByRole('region', { name: 'Lanceur de dés' })
    expect(p(1).getByRole('region', { name: 'Lanceur de dés' })).toHaveAttribute('data-faction', 'gobelins')
    expect(p(2).getByRole('region', { name: 'Lanceur de dés' })).toHaveAttribute('data-faction', 'sephosi')
    expect(p(3).queryByRole('button', { name: /Lancer un dé/ })).not.toBeInTheDocument()
    const random = vi.spyOn(Math, 'random').mockReturnValue(0)
    for (const mode of ['Déplacer', 'Tir', 'Corps à corps']) {
      await userEvent.click(p(1).getByRole('button', { name: mode }))
      const panel = within(p(1).getByRole('region', { name: 'Lanceur de dés' }))
      expect(panel.getAllByRole('button')).toHaveLength(1)
      expect(panel.queryByRole('spinbutton')).not.toBeInTheDocument()
      expect(panel.queryByRole('combobox')).not.toBeInTheDocument()
      await userEvent.click(panel.getByRole('button', { name: 'Lancer un dé' }))
      await userEvent.click(panel.getByRole('button', { name: 'Lancer un dé' }))
    }
    // The decorative face does not determine the random result.
    expect((await h.read()).battle!.manual.dice.map((roll) => roll.values)).toEqual(Array.from({ length: 6 }, () => [1]))
    random.mockReturnValue(.99)
    await userEvent.click(p(2).getByRole('button', { name: 'Tir' }))
    p(2).getByRole('button', { name: 'Lancer un dé' }).focus()
    await userEvent.keyboard('{Enter}')
    for (const user of [1, 2, 3]) expect(await p(user).findByLabelText('Résultats : 6')).toBeVisible()
    expect((await h.read()).battle!.manual.combat).toEqual(combatBefore)
    expect(p(1).getByLabelText('Résultats : 6').closest('[data-faction]')).toHaveAttribute('data-faction', 'sephosi')
    mounted.unmount(); await transport.reconnect(); mounted = render(<Clients />)
    expect(await p(3).findByLabelText('Résultats : 6')).toBeVisible()
    await userEvent.click(p(3).getByText('Jets précédents', { exact: false }))
    expect(screen.getByTestId('player-3').querySelectorAll('.free-dice-history li')).toHaveLength(6)
    mounted.unmount()
  }, 30000)

  it('invokes through the UI, lights up eligible units for all viewers, resolves boosted dice and persists on reconnect', async () => {
    const h = await invocationGame()
    const transport = createFunctionalTransport(h)
    function Clients() {
      return <>{[1, 2, 3].map((user) => <div key={user} data-testid={`player-${user}`}><FunctionalClientContext.Provider value={{ user, transport }}><MemoryRouter initialEntries={[`/lobby/${h.gameId}`]}><App /></MemoryRouter></FunctionalClientContext.Provider></div>)}</>
    }
    let mounted = render(<Clients />)
    const p = (user: number) => within(screen.getByTestId(`player-${user}`))
    await p(1).findByRole('button', { name: 'Lancer La gross Invokation !' })
    expect(p(1).getByRole('button', { name: 'Lancer La gross Invokation !' })).toBeDisabled()
    await userEvent.click(p(1).getByRole('button', { name: 'Choisir le Shaman en E5' }))
    expect(p(1).getByRole('group', { name: 'Shaman invoquant' })).toHaveTextContent('Axe concerné : Centre')
    expect(p(2).getByRole('group', { name: 'Votre base · Flanc coco' }).querySelector('[data-cell="9"]')).not.toBeNull()
    expect(p(2).getByRole('button', { name: 'Lancer La gross Invokation !' })).toBeDisabled()
    expect(p(3).queryByRole('button', { name: 'Lancer La gross Invokation !' })).not.toBeInTheDocument()
    for (const user of [1, 2]) await userEvent.click(p(user).getByRole('button', { name: 'Corps à corps' }))
    await userEvent.click(p(1).getByRole('button', { name: 'D4 · Bande de Gobelins · Joueur 1' }))
    await userEvent.click(p(1).getByRole('button', { name: 'D3 · Bande de Gobelins · Joueur 2' }))
    await userEvent.click(p(1).getByRole('button', { name: 'Je suis prêt' }))
    vi.spyOn(Math, 'random').mockReturnValue(.99)
    await userEvent.click(p(1).getByRole('button', { name: 'Lancer La gross Invokation !' }))
    for (const user of [1, 2, 3]) {
      expect(await p(user).findByLabelText('Dé d’invocation : 6')).toBeVisible()
      expect(p(user).getByText('Shaman invoquant : Shamans Gobelins · E5 · Centre')).toBeVisible()
      const root = screen.getByTestId(`player-${user}`)
      expect(root.querySelectorAll('.board-unit--invoked')).toHaveLength(3)
      for (const id of ['troll', 'djil', 'enemy']) expect(root.querySelector(`[data-unit-id="${id}"]`)).not.toHaveClass('board-unit--invoked')
    }
    expect(p(1).getByRole('button', { name: 'Lancer La gross Invokation !' })).toBeDisabled()
    expect(p(1).getByText('✦ La gross Invokation ! · 2 → 4 dés de profil')).toBeVisible()
    expect(p(1).getByRole('button', { name: 'Je suis prêt' })).toBeVisible()
    mounted.unmount(); await transport.reconnect(); mounted = render(<Clients />)
    expect(await p(3).findByLabelText('Dé d’invocation : 6')).toBeVisible()
    expect(screen.getByTestId('player-3').querySelectorAll('.board-unit--invoked')).toHaveLength(3)
    for (const user of [1, 2]) {
      await userEvent.click(p(user).getByRole('button', { name: 'Corps à corps' }))
      await userEvent.click(p(user).getByRole('button', { name: 'Je suis prêt' }))
    }
    await userEvent.click(p(1).getByRole('button', { name: /COMBAT/ }))
    expect((await h.read()).battle!.manual.combat!.reports[0].attacks[0].dice).toHaveLength(4)
    await userEvent.click(p(1).getByRole('button', { name: 'Augmenter Tour' }))
    await waitFor(() => expect(screen.getByTestId('player-3').querySelectorAll('.board-unit--invoked')).toHaveLength(0))
    expect(p(3).getByLabelText('Dé d’invocation : 6')).toBeVisible()
    mounted.unmount()
  }, 30000)

  it('chooses an individual Shaman and applies the local bonus only in its axis for every viewer', async () => {
    const h = await invocationGame()
    const battle = h.stored.battle as BattleState
    battle.engine!.units.push({ ...battle.engine!.units.find(unit => unit.id === 'shaman')!, id: 'left-shaman', cell: 37 })
    const transport = createFunctionalTransport(h)
    const mutate = vi.spyOn(transport, 'mutate')
    function Clients() {
      return <>{[1, 2, 3].map((user) => <div key={user} data-testid={`player-${user}`}><FunctionalClientContext.Provider value={{ user, transport }}><MemoryRouter initialEntries={[`/lobby/${h.gameId}`]}><App /></MemoryRouter></FunctionalClientContext.Provider></div>)}</>
    }
    const mounted = render(<Clients />)
    const p = (user: number) => within(screen.getByTestId(`player-${user}`))
    await p(1).findByRole('button', { name: 'Choisir le Shaman en B5' })
    const launch = p(1).getByRole('button', { name: 'Lancer La gross Invokation !' })
    expect(launch).toBeDisabled()
    expect(p(1).getByRole('group', { name: 'Shaman invoquant' }).querySelector('select')).toBeNull()
    await userEvent.click(p(1).getByRole('button', { name: 'Choisir le Shaman en E5' }))
    await userEvent.click(p(1).getByRole('button', { name: 'Choisir le Shaman en B5' }))
    expect(p(1).getByRole('button', { name: 'Choisir le Shaman en B5' })).toHaveAttribute('aria-pressed', 'true')
    expect(p(1).getByRole('button', { name: 'Choisir le Shaman en E5' })).toHaveAttribute('aria-pressed', 'false')
    expect(p(1).getByRole('group', { name: 'Shaman invoquant' })).toHaveTextContent('Axe concerné : Flanc coco')
    vi.spyOn(Math, 'random').mockReturnValue(.55)
    await userEvent.click(launch)
    expect(mutate).toHaveBeenCalledWith(1, 'combat:invoke', { gameId: h.gameId, revision: 0, shamanId: 'left-shaman' })
    for (const user of [1, 2, 3]) {
      expect(await p(user).findByLabelText('Dé d’invocation : 4')).toBeVisible()
      expect(p(user).getByText('Shaman invoquant : Shamans Gobelins · B5 · Flanc coco')).toBeVisible()
      const root = screen.getByTestId(`player-${user}`)
      expect(root.querySelectorAll('.board-unit--invoked')).toHaveLength(2)
      for (const id of ['left-shaman', 'archer']) expect(root.querySelector(`[data-unit-id="${id}"]`)).toHaveClass('board-unit--invoked')
      for (const id of ['band', 'shaman', 'troll', 'djil', 'enemy']) expect(root.querySelector(`[data-unit-id="${id}"]`)).not.toHaveClass('board-unit--invoked')
    }
    mounted.unmount()
  }, 30000)

  it('prepares independent arrows for both players, resolves together and shares a durable report with spectators', async () => {
    const h = await liveGame(createGameHarness())
    const transport = createFunctionalTransport(h)
    function Clients() {
      return <>{[1, 2, 3].map((user) => <div key={user} data-testid={`player-${user}`}><FunctionalClientContext.Provider value={{ user, transport }}><MemoryRouter initialEntries={[`/lobby/${h.gameId}`]}><App /></MemoryRouter></FunctionalClientContext.Provider></div>)}</>
    }
    let mounted = render(<Clients />)
    const p = (user: number) => within(screen.getByTestId(`player-${user}`))
    for (const user of [1, 2]) await userEvent.click(await p(user).findByRole('button', { name: 'Corps à corps' }))
    // Each local first click survives the opponent's independent selection.
    await userEvent.click(p(1).getByRole('button', { name: 'E5 · Lanciers · Joueur 1' }))
    await userEvent.click(p(2).getByRole('button', { name: 'E2 · Lanciers · Joueur 2' }))
    await userEvent.click(p(1).getByRole('button', { name: 'E2 · Lanciers · Joueur 2' }))
    fireEvent.keyDown(p(2).getByRole('button', { name: 'E5 · Lanciers · Joueur 1' }), { key: 'c' })
    await waitFor(() => expect((screen.getByTestId('player-3')).querySelectorAll('.combat-arrow')).toHaveLength(2))
    expect(p(1).getByRole('button', { name: /COMBAT/ })).toBeDisabled()
    expect(p(1).getAllByRole('button', { name: /Retirer la flèche/ })).toHaveLength(1)
    await userEvent.click(p(1).getByRole('button', { name: 'Je suis prêt' }))
    expect(p(1).getByRole('button', { name: /COMBAT/ })).toBeDisabled()
    await userEvent.click(p(2).getByRole('button', { name: 'Je suis prêt' }))
    await waitFor(() => expect(p(1).getByRole('button', { name: /COMBAT/ })).toBeEnabled())
    vi.spyOn(Math, 'random').mockReturnValue(.99)
    await userEvent.click(p(1).getByRole('button', { name: /COMBAT/ }))
    for (const user of [1, 2, 3]) {
      expect(await p(user).findByRole('region', { name: 'Compte rendu des attaques' })).toHaveTextContent('4 → 3 R')
      expect(p(user).getByText('Combat n°1 résolu · résultats partagés')).toBeVisible()
    }
    expect((await h.read()).battle!.manual.combat!.arrows).toHaveLength(2)
    await userEvent.click(p(1).getByRole('button', { name: 'Tir' }))
    fireEvent.contextMenu(p(1).getByRole('button', { name: 'F5 · Archers · Joueur 1' }))
    fireEvent.contextMenu(p(1).getByRole('button', { name: 'F2 · Archers · Joueur 2' }))
    await waitFor(() => expect(p(1).getByRole('button', { name: /TIR 1 attaque/ })).toBeEnabled())
    await userEvent.click(p(1).getByRole('button', { name: /TIR 1 attaque/ }))
    expect(await p(3).findByText('Tir n°2 résolu · résultats partagés')).toBeVisible()
    expect((await h.read()).battle!.manual.combat!.arrows.every((arrow) => arrow.kind === 'melee')).toBe(true)
    mounted.unmount()
    await transport.reconnect()
    mounted = render(<Clients />)
    expect(await p(3).findByText('Tir n°2 résolu · résultats partagés')).toBeVisible()
    expect(p(3).queryByRole('button', { name: /COMBAT|Je suis prêt|TIR/ })).not.toBeInTheDocument()
    mounted.unmount()
  }, 30000)

  it('adds a goblin band without a reserve copy, shares it with spectators and keeps it after reconnecting', async () => {
    const h = await liveGame(createGameHarness())
    const band = catalogue2026.find((card) => card.stableId === GOBLIN_BAND_CARD_ID)!
    h.tables.cards.push({ _id: 'goblin-band', stableId: band.stableId, name: band.name, kind: 'unit', cost: band.cost, profile: band.profile, imagePath: band.imagePath, abilities: [], factionId: 'faction', status: 'published' })
    const transport = createFunctionalTransport(h)
    function Clients() {
      return <>{[1, 2, 3].map((user) => <div key={user} data-testid={`player-${user}`}><FunctionalClientContext.Provider value={{ user, transport }}><MemoryRouter initialEntries={[`/lobby/${h.gameId}`]}><App /></MemoryRouter></FunctionalClientContext.Provider></div>)}</>
    }
    let mounted = render(<Clients />)
    const p = (user: number) => within(screen.getByTestId(`player-${user}`))
    const reserveBefore = (await h.read()).players[0].drawPileCount
    const add = await p(1).findByRole('button', { name: 'Ajouter une Bande de Gobelins' })
    expect(p(3).queryByRole('button', { name: 'Ajouter une Bande de Gobelins' })).not.toBeInTheDocument()
    expect(p(1).queryByRole('button', { name: 'Recruter Bande de Gobelins' })).not.toBeInTheDocument()
    await userEvent.click(add)
    expect(p(1).getByRole('button', { name: 'A1 · Ajouter la Bande ici' })).toBeEnabled()
    await userEvent.click(p(1).getByRole('button', { name: 'Annuler' }))
    expect((await h.read()).battle!.engine.units.some((unit) => unit.cardStableId === GOBLIN_BAND_CARD_ID)).toBe(false)
    await userEvent.click(add)
    await userEvent.click(p(1).getByRole('button', { name: 'A1 · Ajouter la Bande ici' }))
    for (const user of [1, 2]) expect(await p(user).findByRole('button', { name: 'A1 · Bande de Gobelins · Joueur 1' })).toHaveTextContent('2R')
    expect(await p(3).findByRole('img', { name: 'A1 · Bande de Gobelins · Joueur 1 · 2 R' })).toBeVisible()
    expect((await h.read()).players[0].drawPileCount).toBe(reserveBefore)
    expect(p(1).queryByRole('button', { name: 'Recruter Bande de Gobelins' })).not.toBeInTheDocument()
    await userEvent.click(p(1).getByRole('button', { name: 'A1 · Bande de Gobelins · Joueur 1' }))
    await userEvent.click(p(1).getByRole('button', { name: 'Diminuer R de Bande de Gobelins · A1' }))
    await userEvent.click(p(1).getByRole('button', { name: 'Retirer du plateau' }))
    await waitFor(() => expect(p(3).queryByRole('img', { name: /A1 · Bande de Gobelins/ })).not.toBeInTheDocument())
    await userEvent.click(p(1).getByText('Votre défausse · 1'))
    await userEvent.click(p(1).getByRole('button', { name: 'Remettre Bande de Gobelins · 1 R' }))
    await userEvent.click(p(1).getByRole('button', { name: 'B1 · Remettre ici' }))
    expect(await p(3).findByRole('img', { name: 'B1 · Bande de Gobelins · Joueur 1 · 1 R' })).toBeVisible()
    mounted.unmount()
    await transport.reconnect()
    mounted = render(<Clients />)
    expect(await p(3).findByRole('img', { name: 'B1 · Bande de Gobelins · Joueur 1 · 1 R' })).toBeVisible()
    await userEvent.click(await p(1).findByRole('button', { name: 'Ajouter une Bande de Gobelins' }))
    await userEvent.click(p(1).getByRole('button', { name: 'A1 · Ajouter la Bande ici' }))
    expect(await p(3).findByRole('img', { name: 'A1 · Bande de Gobelins · Joueur 1 · 2 R' })).toBeVisible()
    const bands = (await h.read()).battle!.engine.units.filter((unit) => unit.cardStableId === GOBLIN_BAND_CARD_ID)
    expect(bands).toHaveLength(2)
    expect(new Set(bands.map((unit) => unit.id)).size).toBe(2)
    expect((await h.read()).players[0].drawPileCount).toBe(reserveBefore)
    mounted.unmount()
  }, 30000)

  it('lets a third client watch live without selecting, mutating, taking a seat or closing the battle', async () => {
    const h = await liveGame(createGameHarness())
    const transport = createFunctionalTransport(h)
    const mutate = vi.spyOn(transport, 'mutate')
    function Clients({ direct = false }: { direct?: boolean }) {
      return <>{[1, 2, 3].map((user) => <div key={user} data-testid={`player-${user}`}><FunctionalClientContext.Provider value={{ user, transport }}><MemoryRouter initialEntries={[user === 3 && !direct ? '/lobby' : `/lobby/${h.gameId}`]}><App /></MemoryRouter></FunctionalClientContext.Provider></div>)}</>
    }
    let mounted = render(<Clients />)
    const p = (user: number) => within(screen.getByTestId(`player-${user}`))
    await userEvent.click(await p(3).findByRole('link', { name: 'Regarder Partie de Joueur 1' }))
    const spectator = await p(3).findByRole('region', { name: 'Bataille en mode spectateur' })
    expect(p(3).getByRole('heading', { name: 'Mode spectateur' })).toBeVisible()
    expect(within(spectator).queryByRole('button')).not.toBeInTheDocument()
    expect(within(spectator).queryByRole('spinbutton')).not.toBeInTheDocument()
    expect(within(spectator).queryByRole('combobox')).not.toBeInTheDocument()
    expect(p(3).queryByRole('button', { name: 'Quitter la table' })).not.toBeInTheDocument()
    expect(p(3).queryByLabelText('Votre réserve')).not.toBeInTheDocument()
    expect(p(3).getByText('Joueur 1 · Camp sud')).toBeVisible()
    expect(p(3).getByText('Joueur 2 · Camp nord')).toBeVisible()

    const unit = p(3).getByRole('img', { name: 'E5 · Lanciers · Joueur 1 · 4 R' })
    const before = await h.read(3)
    await userEvent.click(unit)
    fireEvent.contextMenu(unit)
    fireEvent.keyDown(unit, { key: 'c' })
    fireEvent.keyDown(unit, { key: 'Enter' })
    fireEvent.keyDown(unit, { key: ' ' })
    fireEvent.dragStart(unit, { dataTransfer: { setData: vi.fn() } })
    fireEvent.drop(spectator.querySelector('[data-cell="31"]')!)
    expect(unit).not.toHaveAttribute('draggable', 'true')
    expect(unit).not.toHaveAttribute('aria-pressed')
    expect(spectator.querySelector('.board-cell--selected')).toBeNull()
    expect(await h.read(3)).toEqual(before)
    expect(mutate).not.toHaveBeenCalled()

    await userEvent.click(await p(1).findByRole('button', { name: 'E5 · Lanciers · Joueur 1' }))
    await userEvent.click(p(1).getByRole('button', { name: 'Diminuer R de Lanciers · E5' }))
    expect(await p(3).findByRole('img', { name: 'E5 · Lanciers · Joueur 1 · 3 R' })).toBeVisible()
    await userEvent.click(p(1).getByRole('button', { name: 'E4 · Déplacer ici' }))
    expect(await p(3).findByRole('img', { name: 'E4 · Lanciers · Joueur 1 · 3 R' })).toBeVisible()
    fireEvent.contextMenu(p(1).getByRole('button', { name: 'F5 · Archers · Joueur 1' }))
    await waitFor(() => expect(p(1).getByRole('combobox', { name: 'Attaquant' })).not.toHaveValue(''))
    fireEvent.contextMenu(p(1).getByRole('button', { name: 'E2 · Lanciers · Joueur 2' }))
    expect(await within(p(3).getByLabelText('Combat suivi')).findByText('4+')).toBeVisible()
    await userEvent.click(p(1).getByRole('button', { name: 'Marquer un engagement' }))
    await waitFor(() => expect(spectator.querySelectorAll('.manual-engagement-lines line')).toHaveLength(1))
    await userEvent.click(p(1).getByRole('button', { name: 'Augmenter Tour' }))
    await userEvent.click(p(2).getByRole('button', { name: 'Augmenter Points stratégiques de Joueur 2' }))
    await userEvent.click(p(1).getByRole('button', { name: 'Diminuer Recrutement restants' }))
    expect(p(3).getByLabelText('Tour')).toHaveTextContent('2')
    expect(p(3).getByLabelText('Points stratégiques de Joueur 2')).toHaveTextContent('1')
    expect(p(3).getByLabelText('Recrutement restants pour Joueur 1')).toHaveTextContent('2')
    vi.spyOn(Math, 'random').mockReturnValue(.99)
    await userEvent.click(p(2).getByRole('button', { name: 'Lancer un dé' }))
    expect(await p(3).findByLabelText('Résultats : 6')).toBeVisible()
    expect(mutate.mock.calls.filter(([user]) => user === 3)).toEqual([])

    await userEvent.click(p(3).getByRole('link', { name: 'Quitter la vue spectateur' }))
    expect(await p(3).findByRole('link', { name: 'Regarder Partie de Joueur 1' })).toBeVisible()
    expect((await h.read()).phase).toBe('battle')
    expect(h.tables.gamePlayers).toHaveLength(2)
    mounted.unmount()
    await transport.reconnect()
    mounted = render(<Clients direct />)
    expect(await p(3).findByRole('heading', { name: 'Mode spectateur' })).toBeVisible()
    expect(p(3).getByLabelText('Tour')).toHaveTextContent('2')
    expect(p(3).getByRole('img', { name: 'E4 · Lanciers · Joueur 1 · 3 R' })).toBeVisible()
    expect(p(3).getByLabelText('Résultats : 6')).toBeVisible()
    await userEvent.click(await p(1).findByRole('button', { name: 'Quitter la table' }))
    await userEvent.click(p(1).getByRole('button', { name: 'Confirmer le départ' }))
    expect(await p(3).findByRole('heading', { name: 'Partie indisponible' })).toBeVisible()
    mounted.unmount()
  }, 30000)

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
    for (const user of [1, 2]) {
      expect(p(user).getByRole('button', { name: 'Diminuer Recrutement restants' })).toBeDisabled()
      expect(p(user).getByRole('button', { name: 'Augmenter Recrutement restants' })).toBeDisabled()
      expect(p(user).getByRole('button', { name: 'Diminuer Invokation shamanique restants' })).toBeEnabled()
    }
    expect(p(1).queryByRole('button', { name: 'Jouer Mouvement' })).not.toBeInTheDocument()
    expect(p(1).queryByLabelText('Étapes de la partie')).not.toBeInTheDocument()

    // R can change with only one unit selected, before any combat comparison.
    await click(1, 'E5 · Lanciers · Joueur 1')
    expect(p(1).getByRole('combobox', { name: 'Attaquant' })).toHaveValue('')
    await click(1, 'Diminuer R de Lanciers · E5')
    await waitFor(() => expect(p(2).getByRole('button', { name: 'E5 · Lanciers · Joueur 1' })).toHaveTextContent('3R'))
    expect(p(1).getByRole('combobox', { name: 'Attaquant' })).toHaveValue('')

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

    await click(2, 'Augmenter Tour')
    await click(1, 'Augmenter Points stratégiques de Joueur 1')
    await click(1, 'Diminuer Recrutement restants')
    expect(p(1).getByLabelText('Invokation shamanique restants')).toHaveTextContent('4')
    expect(p(1).getByLabelText('Pause-déjeuner restants')).toHaveTextContent('2')
    expect(p(1).getByLabelText('La gross Invokation ! restants')).toHaveTextContent('1')
    expect(p(1).getAllByText('Invokation shamanique', { exact: true })[0]).toHaveAccessibleDescription(expect.stringContaining('Après le tir, lancez 1D6'))
    await click(1, 'Diminuer Invokation shamanique restants')
    await waitFor(() => expect(p(1).getByLabelText('Invokation shamanique restants')).toHaveTextContent('3'))
    expect(p(2).getByLabelText('Invokation shamanique restants')).toHaveTextContent('4')
    await waitFor(() => expect(p(2).getByLabelText('Tour')).toHaveTextContent('2'))
    await waitFor(() => expect(p(2).getByLabelText('Points stratégiques de Joueur 1')).toHaveTextContent('1'))

    vi.spyOn(Math, 'random').mockReturnValue(.99)
    await click(2, 'Lancer un dé')
    for (const user of [1, 2]) expect(await p(user).findByLabelText('Résultats : 6')).toBeVisible()
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
      expect(p(user).getByLabelText('Invokation shamanique restants')).toHaveTextContent(user === 1 ? '3' : '4')
      expect(p(user).getByRole('button', { name: 'E4 · Lanciers · Joueur 1' })).toHaveTextContent('3R')
      expect(p(user).getByRole('button', { name: 'F5 · Archers · Joueur 1' })).toHaveClass('board-unit--attacker', 'board-unit--engaged')
      await waitFor(() => expect(screen.getByTestId(`player-${user}`).querySelectorAll('.manual-engagement-lines line')).toHaveLength(1))
      expect(p(user).getByLabelText('Résultats : 6')).toBeVisible()
    }
    await click(2, 'Retirer l’engagement')
    await waitFor(() => expect(p(1).getByRole('button', { name: 'F5 · Archers · Joueur 1' })).not.toHaveClass('board-unit--engaged'))
    await waitFor(() => expect(screen.getByTestId('player-1').querySelectorAll('.manual-engagement-lines line')).toHaveLength(0))
    mounted.unmount()
  }, 30000)
})
