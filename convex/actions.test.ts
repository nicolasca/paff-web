import { afterEach, describe, expect, it, vi } from 'vitest'
import { liveGame } from '../src/test/liveGame'
import type { BattleState } from '../shared/battle'
import { createGameHarness } from '../src/test/gameHarness'
import { rangedProfile } from '../src/test/liveGame'
const code = (code: string) => ({ data: { code } })
afterEach(() => vi.restoreAllMocks())

describe('live battle transactions', () => {
  it('refuses over-budget or over-quota decks before copying cards into a new game', async () => {
    const h = createGameHarness()
    h.tables.deckCards = h.tables.deckCards.filter((row) => row.cardId === 'unit')
    h.tables.cards[0].profile = rangedProfile
    h.tables.deckCards[0].quantity = 17
    const gameId = await h.run('create'); await h.run('join', 2, { gameId }); await h.run('start', 1, { gameId })
    await expect(h.run('selectDeck', 1, { gameId, deckId: 'deck-1' })).rejects.toMatchObject(code('DECK_RULES_VIOLATION'))
    expect(h.tables.gameCards).toEqual([])
    h.tables.deckCards[0].quantity = 7; h.tables.cards[0].profile = { ...rangedProfile, unitType: 'cavalry' }
    await expect(h.run('selectDeck', 1, { gameId, deckId: 'deck-1' })).rejects.toMatchObject(code('DECK_RULES_VIOLATION'))
  })
  it('enforces deployment and reserve budgets on the server before locking preparation', async () => {
    const h = createGameHarness()
    h.tables.deckCards = h.tables.deckCards.filter((row) => row.cardId === 'unit')
    h.tables.cards[0].profile = rangedProfile; h.tables.deckCards[0].quantity = 12
    const gameId = await h.run('create'); await h.run('join', 2, { gameId }); await h.run('start', 1, { gameId })
    for (const user of [1, 2]) await h.run('selectDeck', user, { gameId, deckId: `deck-${user}` })
    await expect(h.run('finishPreparation', 1, { gameId })).rejects.toMatchObject(code('RESERVE_BUDGET_EXCEEDED'))
    await h.run('updatePreparation', 1, { gameId, cardStableId: 'archers', change: { quantity: 11 } })
    await expect(h.run('finishPreparation', 1, { gameId })).rejects.toMatchObject(code('DEPLOYMENT_BUDGET_EXCEEDED'))
    await h.run('updatePreparation', 1, { gameId, cardStableId: 'archers', change: { quantity: 10 } })
    await h.run('finishPreparation', 1, { gameId })
    expect((await h.run('get', 1, { gameId }))!.players[0].preparationReady).toBe(true)
  })
  it('initializes independent units, keeps unentered copies private and freezes profiles', async () => {
    const h = await liveGame()
    const game = await h.read(2)
    expect(game.rulesVersion).toBe('2026-09-06-actions-1')
    expect(game.battle!.engine!.units).toHaveLength(4)
    expect(new Set(game.battle!.engine!.units.map((unit) => unit.id)).size).toBe(4)
    expect(game.players[0].cards).toEqual([])
    expect(game.players[0].drawPileCount).toBe(2)
    expect(game.players[0].deployedCards.every((card) => !('enteredQuantity' in card) && !('selectedQuantity' in card) && card.quantity === 1)).toBe(true)
    h.tables.cards[0].profile = undefined
    expect((await h.read()).players[0].cards[0].profile).toBeDefined()
  })
  it('executes before passing initiative and rejects unauthorized, stale and legacy calls', async () => {
    const h = await liveGame(); const unit = await h.unit(0, 'lanciers')
    await expect(h.act('chooseOrder', 3, { orderId: 'movement' })).rejects.toMatchObject(code('GAME_NOT_AVAILABLE'))
    await expect(h.act('chooseOrder', 2, { orderId: 'movement' })).rejects.toMatchObject(code('NOT_YOUR_ORDER_TURN'))
    await h.act('chooseOrder', 1, { orderId: 'movement' })
    await expect(h.act('chooseOrder', 2, { orderId: 'shooting' })).rejects.toMatchObject(code('WRONG_BATTLE_PHASE'))
    await expect(h.act('moveUnit', 2, { unitId: unit.id, to: 31 })).rejects.toMatchObject(code('NOT_YOUR_ORDER_TURN'))
    const revision = (await h.read()).battle!.revision
    await h.act('moveUnit', 1, { unitId: unit.id, to: 31 })
    await expect(h.act('moveUnit', 1, { unitId: unit.id, to: 22, revision })).rejects.toMatchObject(code('STALE_GAME_ACTION'))
    await expect(h.act('moveUnit', 1, { unitId: unit.id, to: 22 })).rejects.toMatchObject(code('UNIT_ALREADY_ACTED'))
    expect((await h.read(2)).battle!.engine!.units.find((item) => item.id === unit.id)?.cell).toBe(31)
    await expect(h.run('chooseOrder', 1, { gameId: h.gameId, orderId: 'movement', revision: (await h.read()).battle!.revision })).rejects.toMatchObject(code('WRONG_BATTLE_PHASE'))
    await h.act('finishOrder')
    expect((await h.read()).battle).toMatchObject({ phase: 'orders', actingSeat: 1, orders: [{ status: 'resolved' }] })
  })
  it('shoots T against DT, persists wounds and blocks another action by the same shooter', async () => {
    const h = await liveGame(); const target = await h.unit(1, 'lanciers'); const shooter = await h.unit(0, 'archers')
    await h.act('chooseOrder', 1, { orderId: 'movement' }); await h.act('finishOrder')
    await h.act('chooseOrder', 2, { orderId: 'movement' }); await h.act('moveUnit', 2, { unitId: target.id, to: 22 }); await h.act('finishOrder', 2)
    // Distinguish DA from DT: T3 vs DT3 hits on 4+, against DA6 it would miss.
    const defender = h.tables.gameCards.find((row) => row.stableId === 'lanciers' && row.gamePlayerId === h.tables.gamePlayers[1]._id)!
    defender.profile = { ...(defender.profile as object), defenseMelee: 6, defenseRanged: 3 }
    vi.spyOn(Math, 'random').mockReturnValue(.5)
    await h.act('chooseOrder', 1, { orderId: 'shooting' })
    await h.act('shoot', 1, { unitId: shooter.id, targetId: target.id })
    expect((await h.unit(1, 'lanciers')).regiment).toBe(3)
    expect((await h.read(2)).battle!.engine!.log.at(-1)?.rolls[0]).toMatchObject({ dice: [4], threshold: 4, hits: 1 })
    await expect(h.act('shoot', 1, { unitId: shooter.id, targetId: target.id })).rejects.toMatchObject(code('UNIT_ALREADY_ACTED'))
  })
  it('recruits from the private reserve without duplicating destroyed or already entered copies', async () => {
    const h = await liveGame()
    await h.act('chooseOrder', 1, { orderId: 'recruitment' })
    await h.act('recruit', 1, { cardStableId: 'archers', cell: 49, strategy: 0 })
    expect((await h.read(2)).players[0].drawPileCount).toBe(1)
    expect((await h.read()).players[0].cards.find((card) => card.stableId === 'archers')?.enteredQuantity).toBe(2)
    await expect(h.act('recruit', 1, { cardStableId: 'archers', cell: 50, strategy: 0 })).rejects.toMatchObject(code('RESERVE_EMPTY'))
    await expect(h.act('recruit', 1, { cardStableId: 'lanciers', cell: 45, strategy: 0 })).rejects.toMatchObject(code('INVALID_RECRUITMENT_CELL'))
    await h.act('recruit', 1, { cardStableId: 'lanciers', cell: 50, strategy: 0 })
    expect((await h.read()).battle!.engine!.units).toHaveLength(6)
    expect((await h.read(2)).players[0].cards).toEqual([])
    expect((await h.read(2)).players[0].drawPileCount).toBe(0)
  })
  it('bounds recruitment spend, strategy spend and the three-use stock server-side', async () => {
    const h = await liveGame(); const battle = h.stored.battle as BattleState
    battle.strategyPoints[0] = 1
    battle.used = [{ seat: 0, orderId: 'recruitment', count: 2 }]
    await h.act('chooseOrder', 1, { orderId: 'recruitment' })
    for (const strategy of [-1, 2, 0.5, Infinity]) await expect(h.act('recruit', 1, { cardStableId: 'archers', cell: 49, strategy })).rejects.toMatchObject(code('NOT_ENOUGH_STRATEGY'))
    // A changed reserve cost is a fixture for a card above the base allowance.
    h.tables.gameCards.find((row) => row.stableId === 'archers')!.cost = 5
    await expect(h.act('recruit', 1, { cardStableId: 'archers', cell: 49, strategy: 0 })).rejects.toMatchObject(code('NOT_ENOUGH_RECRUITMENT'))
    await h.act('recruit', 1, { cardStableId: 'archers', cell: 49, strategy: 1 })
    expect((await h.read()).battle!.strategyPoints[0]).toBe(0)
    await h.act('finishOrder'); await h.act('chooseOrder', 2, { orderId: 'movement' }); await h.act('finishOrder', 2)
    await expect(h.act('chooseOrder', 1, { orderId: 'recruitment' })).rejects.toMatchObject(code('ORDER_EXHAUSTED'))
  })
  it('alternates charges, targets simultaneous combat and starts the next turn only after both confirmations', async () => {
    const h = await liveGame(); const a = await h.unit(0, 'lanciers'); const b = await h.unit(1, 'lanciers')
    await h.act('chooseOrder', 1, { orderId: 'movement' }); await h.act('moveUnit', 1, { unitId: a.id, to: 31 }); await h.act('finishOrder')
    await h.act('chooseOrder', 2, { orderId: 'movement' }); await h.act('moveUnit', 2, { unitId: b.id, to: 22 }); await h.act('finishOrder', 2)
    await h.skipOrders()
    await expect(h.act('charge', 2, { unitId: b.id, targetId: a.id })).rejects.toMatchObject(code('NOT_YOUR_ORDER_TURN'))
    await h.act('charge', 1, { unitId: a.id, targetId: b.id })
    await expect(h.act('charge', 2, { unitId: b.id, targetId: a.id })).rejects.toMatchObject(code('INVALID_CHARGE'))
    await h.act('finishCharges', 2); await h.act('finishCharges', 1)
    await expect(h.act('beginCombat', 2, { unitId: b.id })).rejects.toMatchObject(code('INITIATIVE_PLAYER_ONLY'))
    await h.act('beginCombat', 1, { unitId: a.id })
    vi.spyOn(Math, 'random').mockReturnValue(.99)
    const fightId = (await h.read()).battle!.engine!.fight!.id
    await h.act('confirmCombat', 1, { fightId }); await h.act('confirmCombat', 1, { fightId })
    expect((await h.unit(1, 'lanciers')).regiment).toBe(4)
    await h.act('confirmCombat', 2, { fightId })
    expect((await h.unit(0, 'lanciers')).regiment).toBe(3)
    expect((await h.unit(1, 'lanciers')).regiment).toBe(2)
    expect((await h.read()).battle!.phase).toBe('end_turn')
    await expect(h.run('setStrategyPoints', 1, { gameId: h.gameId, turn: 1, points: 3 })).rejects.toMatchObject(code('WRONG_BATTLE_PHASE'))
    await h.act('confirmEndTurn', 1, { turn: 1 })
    expect((await h.read()).battle!.turn).toBe(1)
    await h.act('confirmEndTurn', 2, { turn: 1 })
    expect((await h.read()).battle).toMatchObject({ turn: 2, phase: 'orders', initiativeSeat: 1, strategyPoints: [0, 0], allowance: [3, 3] })
    expect((await h.read()).battle!.engine!.engagements).toHaveLength(1)
    await expect(h.act('confirmEndTurn', 1, { turn: 1 })).rejects.toMatchObject(code('STALE_GAME_ACTION'))
  })
  it('attacks a withdrawing unit with +2 and removes its engagement only after applying damage', async () => {
    const h = await liveGame(); const battle = h.stored.battle as BattleState
    const a = battle.engine!.units.find((u) => u.seat === 0 && u.cardStableId === 'lanciers')!
    const b = battle.engine!.units.find((u) => u.seat === 1 && u.cardStableId === 'lanciers')!
    a.cell = 31; b.cell = 22; a.regiment = 1; battle.engine!.engagements = [{ a: a.id, b: b.id }]
    vi.spyOn(Math, 'random').mockReturnValue(.2) // 2 + 2 hits on 4+.
    await h.act('chooseOrder', 1, { orderId: 'movement' }); await h.act('moveUnit', 1, { unitId: a.id, to: 40 })
    const e = (await h.read()).battle!.engine!
    expect(e.units.some((u) => u.id === a.id)).toBe(false); expect(e.engagements).toEqual([])
    expect(e.log.at(-1)?.rolls[0]).toMatchObject({ modifier: 2, hits: 1 })
  })
  it('banks strategy automatically and spends one point for an additional order', async () => {
    const h = await liveGame(); const battle = h.stored.battle as BattleState
    battle.engine!.units.find((u) => u.seat === 0)!.cell = 19
    await h.skipOrders(); await h.act('finishCharges', 1); await h.act('finishCharges', 2)
    await h.act('confirmEndTurn', 1, { turn: 1 }); await h.act('confirmEndTurn', 2, { turn: 1 })
    expect((await h.read()).battle!.strategyPoints).toEqual([1, 0])
    for (let i = 0; i < 6; i++) {
      const user = (await h.read()).battle!.actingSeat + 1
      await h.act('chooseOrder', user, { orderId: 'movement' }); await h.act('finishOrder', user)
    }
    expect((await h.read()).battle!.phase).toBe('orders')
    await h.act('chooseOrder', 1, { orderId: 'movement' })
    expect((await h.read()).battle).toMatchObject({ strategyPoints: [0, 0], allowance: [4, 3] })
    await h.act('finishOrder', 1)
    expect((await h.read()).battle!.phase).toBe('combat')
  })
  it('records a final result, frees both lobby seats and preserves read access', async () => {
    const h = await liveGame()
    // Fixture: both armies, including reserves, have just been eliminated.
    ;(h.stored.battle as BattleState).engine!.units = []
    for (const row of h.tables.gameCards) row.enteredQuantity = row.quantity
    await h.skipOrders(); await h.act('finishCharges', 1); await h.act('finishCharges', 2)
    await h.act('confirmEndTurn', 1, { turn: 1 }); await h.act('confirmEndTurn', 2, { turn: 1 })
    expect((await h.read(2)).battle).toMatchObject({ phase: 'finished', engine: { result: { winner: null, reason: 'draw' } } })
    for (const user of [1, 2]) expect((await h.run('listLobby', user)).currentGame).toBeNull()
    await expect(h.act('chooseOrder', 1, { orderId: 'movement' })).rejects.toMatchObject(code('GAME_NOT_AVAILABLE'))
  })
})
