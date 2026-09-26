import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGameHarness } from '../src/test/gameHarness'
import { liveGame } from '../src/test/liveGame'
import { GOBLIN_BAND_CARD_ID, GOBLIN_REINFORCEMENTS_ORDER_ID, MANUAL_RULES_VERSION } from '../shared/manualBattle'
import { catalogue2026 } from '../shared/catalogue2026'
import { unitAbilities } from '../shared/unitAbilities'

const error = (code: string) => ({ data: { code } })
afterEach(() => vi.restoreAllMocks())
async function table() {
  const h = await liveGame(createGameHarness())
  const manual = (name: string, user = 1, args: Record<string, unknown> = {}) => h.invoke('manual', name, user, { gameId: h.gameId, ...args })
  return { ...h, manual }
}

async function goblinTable() {
  const h = await table()
  const band = catalogue2026.find((card) => card.stableId === GOBLIN_BAND_CARD_ID)!
  h.tables.cards.push({ _id: 'goblin-band', stableId: band.stableId, name: band.name, kind: 'unit', cost: band.cost, profile: structuredClone(band.profile), imagePath: band.imagePath, abilities: [], factionId: 'faction', status: 'published' })
  return h
}

describe('shared manual battle', () => {
  it('creates goblin bands outside the deck and reserve, freezes their profile and shares them through discard and restore', async () => {
    const h = await goblinTable()
    const decks = structuredClone({ decks: h.tables.decks, cards: h.tables.deckCards })
    const before = await h.read()
    expect(before.players[0].cards.some((card) => card.stableId === GOBLIN_BAND_CARD_ID)).toBe(false)
    await h.manual('summonGoblins', 1, { summoned: 0, cell: 0 })
    const first = (await h.read()).battle!.engine.units.find((unit) => unit.cardStableId === GOBLIN_BAND_CARD_ID)!
    expect(first).toMatchObject({ seat: 0, cell: 0, regiment: 2 })
    for (const user of [1, 2, 3]) {
      const view = await h.read(user)
      expect(view.battle!.engine.units).toContainEqual(first)
      expect(view.players[0].deployedCards.find((card) => card.stableId === GOBLIN_BAND_CARD_ID)).toMatchObject({ name: 'Bande de Gobelins', quantity: 1, profile: { regiment: 2 } })
      expect(view.players[0].drawPileCount).toBe(before.players[0].drawPileCount)
      if (user !== 1) expect(view.players[0].cards).toEqual([])
    }
    const row = h.tables.gameCards.find((card) => card.stableId === GOBLIN_BAND_CARD_ID)!
    expect(row).toMatchObject({ quantity: 0, selectedQuantity: 0, deploymentQuantity: 0, enteredQuantity: 0, summonedQuantity: 1 })
    const source = h.tables.cards.find((card) => card._id === 'goblin-band')!
    source.profile = { ...(source.profile as object), regiment: 9 }
    await h.manual('summonGoblins', 1, { summoned: 1, cell: 1 })
    const bands = (await h.read()).battle!.engine.units.filter((unit) => unit.cardStableId === GOBLIN_BAND_CARD_ID)
    expect(bands).toHaveLength(2)
    expect(new Set(bands.map((unit) => unit.id)).size).toBe(2)
    expect(bands.map((unit) => unit.regiment)).toEqual([2, 2])
    await expect(h.manual('recruit', 1, { cardStableId: GOBLIN_BAND_CARD_ID, entered: 0, cell: 2 })).rejects.toMatchObject(error('RESERVE_EMPTY'))
    await h.manual('adjustRegiment', 1, { unitId: first.id, delta: -1 })
    await h.manual('discardUnit', 1, { unitId: first.id })
    expect((await h.read(3)).players[0].deployedCards.find((card) => card.stableId === GOBLIN_BAND_CARD_ID)?.profile?.regiment).toBe(2)
    await h.manual('restoreUnit', 1, { unitId: first.id, cell: 2 })
    const after = await h.read(3)
    expect(after.battle!.engine.units.find((unit) => unit.id === first.id)).toMatchObject({ cell: 2, regiment: 1 })
    expect(after.players[0].drawPileCount).toBe(before.players[0].drawPileCount)
    expect(after.battle!.manual.stocks).toEqual(before.battle!.manual.stocks)
    expect(after.battle!.strategyPoints).toEqual(before.battle!.strategyPoints)
    expect({ decks: h.tables.decks, cards: h.tables.deckCards }).toEqual(decks)
  })
  it('uses a band already frozen in the army without consuming its reserve or reusing its discarded instance', async () => {
    const h = await goblinTable()
    const existing = h.tables.gameCards.find((card) => card.gamePlayerId === h.tables.gamePlayers[0]._id)!
    h.tables.gameCards.push({ ...existing, _id: 'frozen-band', stableId: GOBLIN_BAND_CARD_ID, name: 'Bande de Gobelins', quantity: 1, deploymentQuantity: 0, selectedQuantity: 0, enteredQuantity: 0, profile: { ...(existing.profile as object), regiment: 3 } })
    const reserve = (await h.read()).players[0].drawPileCount
    await h.manual('summonGoblins', 1, { summoned: 0, cell: 0 })
    const summoned = (await h.read()).battle!.engine.units.find((unit) => unit.cell === 0)!
    expect(summoned.regiment).toBe(3)
    expect((await h.read()).players[0].drawPileCount).toBe(reserve)
    await h.manual('recruit', 1, { cardStableId: GOBLIN_BAND_CARD_ID, entered: 0, cell: 1 })
    const recruited = (await h.read()).battle!.engine.units.find((unit) => unit.cell === 1)!
    expect(recruited.id).not.toBe(summoned.id)
    await h.manual('discardUnit', 1, { unitId: recruited.id })
    await h.manual('discardUnit', 1, { unitId: summoned.id })
    expect((await h.read(3)).players[0].deployedCards.find((card) => card.stableId === GOBLIN_BAND_CARD_ID)).toBeDefined()
    await h.manual('summonGoblins', 1, { summoned: 1, cell: 2 })
    const after = await h.read()
    expect(after.battle!.manual.discarded.map((unit) => unit.id)).toEqual([recruited.id, summoned.id])
    expect(after.players[0].drawPileCount).toBe(reserve! - 1)
    expect(h.tables.gameCards.find((card) => card._id === 'frozen-band')).toMatchObject({ quantity: 1, enteredQuantity: 1, summonedQuantity: 2 })
  })
  it('rejects duplicate, occupied or invalid summons and unauthorized users without changing the game', async () => {
    const h = await goblinTable()
    for (const cell of [-1, 54, 1.5, 40]) {
      const before = structuredClone(h.tables)
      await expect(h.manual('summonGoblins', 1, { summoned: 0, cell })).rejects.toMatchObject(error('CELL_OCCUPIED'))
      expect(h.tables).toEqual(before)
    }
    await expect(h.manual('summonGoblins', 3, { summoned: 0, cell: 0 })).rejects.toMatchObject(error('GAME_NOT_AVAILABLE'))
    await h.manual('summonGoblins', 1, { summoned: 0, cell: 0 })
    const before = structuredClone(h.tables)
    await expect(h.manual('summonGoblins', 1, { summoned: 0, cell: 1 })).rejects.toMatchObject(error('STALE_GAME_ACTION'))
    expect(h.tables).toEqual(before)
    await h.manual('summonGoblins', 2, { summoned: 0, cell: 1 })
    expect((await h.read()).battle!.engine.units.filter((unit) => unit.cardStableId === GOBLIN_BAND_CARD_ID).map((unit) => unit.seat)).toEqual([0, 1])
    h.tables.gamePlayers[1].factionStableId = 'sephosi'
    await expect(h.manual('summonGoblins', 2, { summoned: 1, cell: 2 })).rejects.toMatchObject(error('ORDER_NOT_AVAILABLE'))
    const battle = h.tables.games[0].battle as NonNullable<Awaited<ReturnType<typeof h.read>>['battle']>
    battle.catalog = battle.catalog.filter((order) => order.id !== GOBLIN_REINFORCEMENTS_ORDER_ID)
    await expect(h.manual('summonGoblins', 1, { summoned: 1, cell: 2 })).rejects.toMatchObject(error('ORDER_NOT_AVAILABLE'))
  })
  it('requires an available catalogue profile for a first summon and a battle already in progress', async () => {
    const h = await table()
    const before = structuredClone(h.tables)
    await expect(h.manual('summonGoblins', 1, { summoned: 0, cell: 0 })).rejects.toMatchObject(error('SUMMON_CARD_UNAVAILABLE'))
    expect(h.tables).toEqual(before)
    const setup = createGameHarness()
    const gameId = await setup.readyFor('preparation')
    await expect(setup.invoke('manual', 'summonGoblins', 1, { gameId, summoned: 0, cell: 0 })).rejects.toMatchObject(error('WRONG_BATTLE_PHASE'))
  })
  it('locks both recruitment counter corrections during turn one and unlocks them at turn two', async () => {
    const h = await table()
    const before = structuredClone(h.tables)
    for (const user of [1, 2]) for (const delta of [-1, 1]) await expect(h.manual('adjustOrderStock', user, { orderId: 'recruitment', delta })).rejects.toMatchObject(error('RECRUITMENT_NOT_YET_AVAILABLE'))
    expect(h.tables).toEqual(before)
    await h.manual('adjustTurn', 2, { delta: 1 })
    await h.manual('adjustOrderStock', 1, { orderId: 'recruitment', delta: -1 })
    expect((await h.read(2)).battle!.manual.stocks.find((stock) => stock.seat === 0 && stock.orderId === 'recruitment')?.remaining).toBe(2)
    await h.manual('adjustOrderStock', 1, { orderId: 'recruitment', delta: 1 })
    await h.manual('adjustTurn', 1, { delta: -1 })
    await expect(h.manual('adjustOrderStock', 1, { orderId: 'recruitment', delta: -1 })).rejects.toMatchObject(error('RECRUITMENT_NOT_YET_AVAILABLE'))
  })
  it('starts Sephosi battles with their own order stocks and synchronizes only the owner’s corrections', async () => {
    const setup = createGameHarness()
    setup.tables.factions[0].stableId = 'sephosi'
    setup.tables.factions[0].name = 'Sephosi'
    const h = await liveGame(setup)
    const battle = (await h.read()).battle!
    expect(battle.catalog.filter((order) => order.faction === 'sephosi').map((order) => order.name)).toEqual(['Repli stratégique', 'Tir concentré', 'Fureur divine', 'Protéger la Salamandre !'])
    expect(battle.catalog.some((order) => order.faction === 'gobelins')).toBe(false)
    await h.invoke('manual', 'adjustOrderStock', 1, { gameId: h.gameId, orderId: 'concentrated-fire', delta: -1 })
    const stocks = (await h.read(2)).battle!.manual.stocks
    expect(stocks.find((stock) => stock.seat === 0 && stock.orderId === 'concentrated-fire')?.remaining).toBe(3)
    expect(stocks.find((stock) => stock.seat === 1 && stock.orderId === 'concentrated-fire')?.remaining).toBe(4)
    await expect(h.invoke('manual', 'adjustOrderStock', 1, { gameId: h.gameId, orderId: 'shamanic-invocation', delta: -1 })).rejects.toMatchObject(error('ORDER_NOT_AVAILABLE'))
  })
  it('preserves the catalog and spent stocks of battles that started before the order revision', async () => {
    const h = await table()
    const battle = h.stored.battle as NonNullable<Awaited<ReturnType<typeof h.read>>['battle']>
    h.stored.rulesVersion = '2026-09-10-manual-1'
    battle.catalog = [{ id: 'waaagh', name: 'WAAAGGGHHH !', faction: 'gobelins', category: 'legendary', limit: 1, description: 'Ancienne définition figée.', seats: [0, 1] }]
    battle.manual.stocks = [{ seat: 0, orderId: 'waaagh', remaining: 0 }, { seat: 1, orderId: 'waaagh', remaining: 1 }]
    const frozen = structuredClone({ catalog: battle.catalog, stocks: battle.manual.stocks })
    await h.manual('adjustTurn', 2, { delta: 1 })
    const after = await h.read()
    expect(after.rulesVersion).toBe('2026-09-10-manual-1')
    expect(after.battle!.catalog).toEqual(frozen.catalog)
    expect(after.battle!.manual.stocks).toEqual(frozen.stocks)
    await h.manual('adjustOrderStock', 1, { orderId: 'waaagh', delta: 1 })
    expect((await h.read(2)).battle!.manual.stocks[0].remaining).toBe(1)
  })
  it('enforces Vol on the server using the frozen ability, without allowing occupied landings', async () => {
    const h = await table()
    const angel = await h.unit(0, 'lanciers')
    const ally = await h.unit(0, 'archers')
    const enemy = await h.unit(1, 'archers')
    const target = await h.unit(1, 'lanciers')
    const card = h.tables.gameCards.find((card) => card.gamePlayerId === h.tables.gamePlayers[0]._id && card.stableId === 'lanciers')!
    card.profile = { ...(card.profile as object), unitType: 'elite', ability: unitAbilities.flight }
    const engine = (h.tables.games[0].battle as NonNullable<Awaited<ReturnType<typeof h.read>>['battle']>).engine
    engine.units.find((unit) => unit.id === ally.id)!.cell = 31
    engine.units.find((unit) => unit.id === enemy.id)!.cell = 22
    await h.manual('moveUnit', 2, { unitId: target.id, from: 13, to: 12 })
    await expect(h.manual('moveUnit', 1, { unitId: angel.id, from: 40, to: 22 })).rejects.toMatchObject(error('INVALID_MOVEMENT'))
    await h.manual('moveUnit', 1, { unitId: angel.id, from: 40, to: 13 })
    expect(await h.unit(0, 'lanciers')).toMatchObject({ cell: 13 })
    expect(await h.unit(0, 'archers')).toMatchObject({ cell: 31 })
    expect(await h.unit(1, 'archers')).toMatchObject({ cell: 22 })
  })
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
