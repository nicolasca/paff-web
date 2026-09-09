import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGameHarness } from '../src/test/gameHarness'
import { liveGame } from '../src/test/liveGame'
import { MANUAL_RULES_VERSION } from '../shared/manualBattle'

const error = (code: string) => ({ data: { code } })
afterEach(() => vi.restoreAllMocks())
async function table() {
  const h = await liveGame(createGameHarness())
  const manual = (name: string, user = 1, args: Record<string, unknown> = {}) => h.invoke('manual', name, user, { gameId: h.gameId, ...args })
  return { ...h, manual }
}

describe('shared manual battle', () => {
  it('starts after the full setup and lets either player move, within movement range, without automated attacks', async () => {
    const h = await table()
    expect(await h.read()).toMatchObject({ phase: 'battle', rulesVersion: MANUAL_RULES_VERSION, battle: { manual: { dice: [], discarded: [] } } })
    const first = await h.unit(0, 'lanciers'); const second = await h.unit(1, 'lanciers')
    await h.manual('setEngagement', 2, { a: first.id, b: second.id, engaged: true })
    await h.manual('moveUnit', 2, { unitId: second.id, from: 13, to: 22 })
    await h.manual('moveUnit', 1, { unitId: first.id, from: 40, to: 31 })
    await h.manual('moveUnit', 1, { unitId: first.id, from: 31, to: 30 })
    expect(await h.unit(0, 'lanciers')).toMatchObject({ cell: 30, regiment: 4 })
    expect((await h.read()).battle!.engine!.engagements).toHaveLength(1)
    await expect(h.manual('moveUnit', 1, { unitId: first.id, from: 31, to: 32 })).rejects.toMatchObject(error('STALE_GAME_ACTION'))
    await expect(h.manual('moveUnit', 1, { unitId: first.id, from: 30, to: 12 })).rejects.toMatchObject(error('INVALID_MOVEMENT'))
  })
  it('keeps personal reserves private and refuses outsiders and control of opposing units', async () => {
    const h = await table()
    const first = await h.unit(0, 'lanciers')
    const row = h.tables.gameCards.find((row) => row.gamePlayerId === h.tables.gamePlayers[0]._id)!
    h.tables.gameCards.push({ ...row, _id: 'secret', stableId: 'secret-card', name: 'Réserve secrète', quantity: 7, deploymentQuantity: 0, selectedQuantity: 0, enteredQuantity: 0 })
    const enemyView = await h.read(2)
    expect(enemyView.players[0].cards).toEqual([])
    expect(enemyView.players[0].drawPileCount).toBe(9)
    expect(JSON.stringify(enemyView)).not.toContain('secret-card')
    expect(JSON.stringify(enemyView)).not.toContain('Réserve secrète')
    for (const [name, args] of [
      ['moveUnit', { unitId: first.id, from: 40, to: 31 }], ['adjustRegiment', { unitId: first.id, delta: -1 }], ['discardUnit', { unitId: first.id }],
    ] as const) await expect(h.manual(name, 2, args)).rejects.toMatchObject(error('UNIT_NOT_OWNED'))
    for (const [name, args] of [
      ['adjustTurn', { delta: 1 }], ['adjustStrategy', { delta: 1 }], ['rollDice', { count: 3 }], ['setDuel', {}], ['adjustOrderStock', { orderId: 'recruitment', delta: -1 }],
    ] as const) await expect(h.manual(name, 3, args)).rejects.toMatchObject(error('GAME_NOT_AVAILABLE'))
    await expect(h.manual('recruit', 2, { cardStableId: 'secret-card', entered: 0, cell: 0 })).rejects.toMatchObject(error('RESERVE_EMPTY'))
  })
  it('uses relative counters without phase transitions, stock consumption or automatic removal at zero R', async () => {
    const h = await table()
    const unit = await h.unit(0, 'lanciers')
    for (let index = 0; index < 9; index++) await h.manual('adjustTurn', index % 2 + 1, { delta: 1 })
    await h.manual('adjustTurn', 2, { delta: -1 })
    await h.manual('adjustStrategy', 1, { delta: 1 })
    await h.manual('adjustStrategy', 2, { delta: 1 })
    for (let index = 0; index < 4; index++) await h.manual('adjustRegiment', 1, { unitId: unit.id, delta: -1 })
    expect(await h.unit(0, 'lanciers')).toMatchObject({ regiment: 0 })
    await expect(h.manual('adjustRegiment', 1, { unitId: unit.id, delta: -1 })).rejects.toMatchObject(error('INVALID_MANUAL_COUNTER'))
    await h.manual('adjustRegiment', 1, { unitId: unit.id, delta: 1 })
    for (let index = 0; index < 3; index++) await h.manual('adjustOrderStock', 1, { orderId: 'recruitment', delta: -1 })
    await h.manual('recruit', 1, { cardStableId: 'lanciers', entered: 1, cell: 0 })
    const state = (await h.read()).battle!
    expect(state).toMatchObject({ turn: 9, strategyPoints: [1, 1] })
    expect(state.manual!.stocks.find((stock) => stock.seat === 0 && stock.orderId === 'recruitment')?.remaining).toBe(0)
    expect(state.engine!.units).toHaveLength(5)
  })
  it('rejects occupied, invalid and stale drops, then supports undoing a discard without duplicating reserves', async () => {
    const h = await table()
    const args = { cardStableId: 'archers', entered: 1, cell: 0 }
    await h.manual('recruit', 1, args)
    await expect(h.manual('recruit', 1, args)).rejects.toMatchObject(error('RESERVE_EMPTY'))
    await expect(h.manual('recruit', 2, args)).rejects.toMatchObject(error('CELL_OCCUPIED'))
    for (const cell of [-1, 54, 3.5]) await expect(h.manual('recruit', 2, { ...args, cell })).rejects.toMatchObject(error('CELL_OCCUPIED'))
    const deployed = (await h.read()).battle!.engine!.units.find((unit) => unit.cell === 0)!
    await h.manual('discardUnit', 1, { unitId: deployed.id })
    expect((await h.read(2)).players[0].drawPileCount).toBe(1)
    await expect(h.manual('restoreUnit', 2, { unitId: deployed.id, cell: 0 })).rejects.toMatchObject(error('UNIT_NOT_OWNED'))
    await h.manual('restoreUnit', 1, { unitId: deployed.id, cell: 0 })
    await expect(h.manual('restoreUnit', 1, { unitId: deployed.id, cell: 1 })).rejects.toMatchObject(error('UNIT_NOT_OWNED'))
    expect((await h.read()).battle!.engine!.units.filter((unit) => unit.id === deployed.id)).toHaveLength(1)
    expect((await h.read()).battle!.manual!.discarded).toEqual([])
  })
  it('shares unrestricted attack comparisons, explicit engagements and independent D6 rolls without applying wounds', async () => {
    const h = await table()
    const attacker = await h.unit(0, 'archers'); const target = await h.unit(1, 'lanciers')
    await h.manual('setDuel', 1, { attackerId: attacker.id, targetId: target.id })
    await h.manual('setEngagement', 1, { a: attacker.id, b: target.id, engaged: true })
    await h.manual('setEngagement', 2, { a: target.id, b: attacker.id, engaged: true })
    vi.spyOn(Math, 'random').mockReturnValue(.99)
    await h.manual('rollDice', 2, { count: 5 })
    const state = (await h.read(2)).battle!
    expect(state.manual).toMatchObject({ duel: { attackerId: attacker.id, targetId: target.id }, dice: [{ seat: 1, turn: 1, values: [6, 6, 6, 6, 6] }] })
    expect(state.engine!.engagements).toHaveLength(1)
    expect(await h.unit(1, 'lanciers')).toEqual(target)
    for (const count of [0, -1, 101, 1.5]) await expect(h.manual('rollDice', 1, { count })).rejects.toMatchObject(error('INVALID_DICE_COUNT'))
    await h.manual('setEngagement', 2, { a: attacker.id, b: target.id, engaged: false })
    await h.manual('setDuel', 2)
    expect((await h.read()).battle!.manual!.duel).toBeUndefined()
    expect((await h.read()).battle!.engine!.engagements).toEqual([])
  })
})
