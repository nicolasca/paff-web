import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGameHarness } from '../src/test/gameHarness'
const RULES_VERSION = '2026-09-06-demo-1'

const code = (code: string) => ({ data: { code } })
afterEach(() => vi.restoreAllMocks())

async function battleGame() {
  const h = createGameHarness({ legacyDemo: true })
  h.tables.factions.push({ ...h.tables.factions[0], _id: 'sephosi', stableId: 'sephosi', name: 'Sephosi' })
  h.tables.decks[1].factionId = 'sephosi'
  h.tables.deckCards = h.tables.deckCards.filter((item) => item.deckId !== 'deck-2')
  const gameId = await h.run('create')
  await h.run('join', 2, { gameId })
  await h.run('start', 1, { gameId })
  for (const user of [1, 2]) await h.run('selectDeck', user, { gameId, deckId: `deck-${user}` })
  for (const user of [1, 2]) await h.run('finishPreparation', user, { gameId })
  vi.spyOn(Math, 'random').mockReturnValueOnce(.99).mockReturnValueOnce(0)
  for (const user of [1, 2]) await h.run('rollInitiative', user, { gameId, round: 1 })
  for (const user of [1, 2]) await h.run('confirmInitiative', user, { gameId })
  const read = async (user = 1) => (await h.run('get', user, { gameId }))!
  for (const user of [1, 2]) await h.run('finishDeployment', user, { gameId, revision: (await read()).setup!.revision })
  const battle = async () => (await read()).battle!
  const choose = async (user: number, orderId = 'movement') => h.run('chooseOrder', user, { gameId, orderId, revision: (await battle()).revision })
  const pass = async (user: number, chosenId?: string) => h.run('passOrder', user, { gameId, chosenId: chosenId ?? (await battle()).orders.find((item) => item.seat === user - 1 && item.status === 'selected')!.id, revision: (await battle()).revision })
  const confirm = async (user: number, phase: 'combat' | 'end_turn') => h.run('confirmBattlePhase', user, { gameId, phase, turn: (await battle()).turn })
  const points = async (user: number, value: number) => h.run('setStrategyPoints', user, { gameId, points: value, turn: (await battle()).turn })
  const allOrders = async () => { while ((await battle()).phase === 'orders') await choose((await battle()).actingSeat + 1) }
  const allActions = async () => { while ((await battle()).phase === 'actions') await pass((await battle()).actingSeat + 1) }
  return { ...h, gameId, read, battle, choose, pass, confirm, points, allOrders, allActions }
}

describe('synchronized demo turns', () => {
  it('starts after both deployments, snapshots faction orders, and exposes the same public draft to both players', async () => {
    const { read, battle, choose } = await battleGame()
    expect(await read()).toMatchObject({ rulesVersion: RULES_VERSION, phase: 'battle', battle: { turn: 1, phase: 'orders', initiativeSeat: 0, actingSeat: 0, allowance: [3, 3] } })
    expect((await battle()).catalog.find((item) => item.id === 'waaagh')?.seats).toEqual([0])
    await choose(1, 'waaagh')
    expect((await read(2)).battle).toEqual(await battle())
    expect((await read(2)).players[0].cards).toEqual([])
    await expect(choose(2, 'waaagh')).rejects.toMatchObject(code('ORDER_NOT_AVAILABLE'))
    await choose(2)
    await expect(choose(1, 'waaagh')).rejects.toMatchObject(code('ORDER_EXHAUSTED'))
  })
  it('rejects outsiders, wrong turns, stale retries and actions from another phase', async () => {
    const { run, gameId, battle, choose, pass, points } = await battleGame()
    for (const user of [0, 3]) await expect(choose(user)).rejects.toBeDefined()
    await expect(choose(2)).rejects.toMatchObject(code('NOT_YOUR_ORDER_TURN'))
    await expect(choose(1, 'unknown')).rejects.toMatchObject(code('ORDER_NOT_AVAILABLE'))
    await expect(pass(1, 'missing')).rejects.toMatchObject(code('WRONG_BATTLE_PHASE'))
    await expect(points(1, 2)).rejects.toMatchObject(code('WRONG_BATTLE_PHASE'))
    const revision = (await battle()).revision
    await choose(1)
    await expect(run('chooseOrder', 2, { gameId, orderId: 'movement', revision })).rejects.toMatchObject(code('STALE_GAME_ACTION'))
    expect((await battle()).orders).toHaveLength(1)
  })
  it('allows any selected own order to be passed, alternates, and leaves the board unchanged', async () => {
    const { read, battle, choose, pass, allOrders, allActions } = await battleGame()
    const setup = (await read()).setup
    await choose(1, 'waaagh')
    await allOrders()
    expect(await battle()).toMatchObject({ phase: 'actions', actingSeat: 0 })
    const selected = (await battle()).orders
    await expect(pass(2)).rejects.toMatchObject(code('NOT_YOUR_ORDER_TURN'))
    await expect(pass(1, selected[1].id)).rejects.toMatchObject(code('ORDER_NOT_AVAILABLE'))
    await pass(1, selected[4].id)
    expect((await battle()).orders[4].status).toBe('passed')
    await pass(2)
    await expect(pass(1, selected[4].id)).rejects.toMatchObject(code('ORDER_NOT_AVAILABLE'))
    await allActions()
    expect((await battle()).phase).toBe('combat')
    expect((await read()).setup).toEqual(setup)
  })
  it('waits for both confirmations, stores manual points and gives unequal quotas at the next turn', async () => {
    const { run, gameId, battle, choose, confirm, points, allOrders, allActions } = await battleGame()
    await choose(1, 'waaagh')
    await allOrders()
    await allActions()
    await confirm(1, 'combat')
    await confirm(1, 'combat')
    expect((await battle()).phase).toBe('combat')
    await confirm(2, 'combat')
    for (const invalid of [-1, 4, 1.5, NaN, Infinity]) await expect(points(1, invalid)).rejects.toMatchObject(code('INVALID_STRATEGY_POINTS'))
    await points(1, 3)
    await points(2, 1)
    await confirm(1, 'end_turn')
    await expect(points(1, 2)).rejects.toMatchObject(code('ROUND_ALREADY_CONFIRMED'))
    expect((await battle()).phase).toBe('end_turn')
    await confirm(2, 'end_turn')
    expect(await battle()).toMatchObject({ turn: 2, phase: 'orders', initiativeSeat: 1, actingSeat: 1, allowance: [6, 4], strategyPoints: [3, 1], draftPoints: [0, 0], orders: [], history: [{ turn: 1, strategyPoints: [3, 1] }] })
    await expect(run('confirmBattlePhase', 1, { gameId, phase: 'end_turn', turn: 1 })).rejects.toBeDefined()
    await choose(2)
    await expect(choose(1, 'waaagh')).rejects.toMatchObject(code('ORDER_EXHAUSTED'))
    await allOrders()
    const orders = (await battle()).orders
    expect(orders.map((order) => order.seat)).toEqual([1, 0, 1, 0, 1, 0, 1, 0, 0, 0])
    await allActions()
    await confirm(1, 'combat'); await confirm(2, 'combat')
    await expect(run('setStrategyPoints', 1, { gameId, turn: 1, points: 3 })).rejects.toMatchObject(code('STALE_GAME_ACTION'))
    await confirm(1, 'end_turn'); await confirm(2, 'end_turn')
    expect(await battle()).toMatchObject({ turn: 3, allowance: [3, 3], strategyPoints: [0, 0], initiativeSeat: 0 })
  })
  it('finishes exactly eight turns, preserves history, frees both players and keeps the result readable', async () => {
    const { run, read, battle, allOrders, allActions, confirm, choose } = await battleGame()
    for (let turn = 1; turn <= 8; turn++) {
      expect((await battle()).turn).toBe(turn)
      expect((await battle()).initiativeSeat).toBe((turn - 1) % 2)
      await allOrders(); await allActions()
      await confirm(1, 'combat'); await confirm(2, 'combat')
      await confirm(1, 'end_turn'); await confirm(2, 'end_turn')
    }
    expect((await battle()).phase).toBe('finished')
    expect((await battle()).history).toHaveLength(8)
    expect((await read(2)).battle).toEqual(await battle())
    expect((await run('listLobby', 1)).currentGame).toBeNull()
    expect((await run('listLobby', 2)).currentGame).toBeNull()
    await expect(choose(1)).rejects.toMatchObject(code('GAME_NOT_AVAILABLE'))
    await expect(run('create', 1)).resolves.toBeTruthy()
  })
})
