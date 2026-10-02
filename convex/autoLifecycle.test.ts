import { afterEach, describe, expect, it, vi } from 'vitest'
import { liveGame } from '../src/test/liveGame'
import { catalogue2026, catalogueFactions } from '../shared/catalogue2026'
import type { BattleState } from '../shared/battle'
import { emptyCombat } from '../shared/combat'
import { MANUAL_RULES_VERSION } from '../shared/manualBattle'

afterEach(() => vi.restoreAllMocks())
const error = (code: string) => ({ data: { code } })
type Entry = readonly [id: string, seat: number, stableId: string, cell: number, regiment?: number]

// Prepared table with the published AUTO profiles; no backend data is written.
async function table(entries: readonly Entry[]) {
  const h = await liveGame()
  const battle = h.stored.battle as BattleState
  battle.engine.units = []
  h.tables.gameCards = []
  for (const [id, seat, stableId, cell, regiment] of entries) {
    const source = catalogue2026.find((unit) => unit.stableId === stableId)!
    const gamePlayerId = h.tables.gamePlayers[seat]._id
    if (!h.tables.gameCards.some((card) => card.gamePlayerId === gamePlayerId && card.stableId === stableId)) {
      h.tables.gameCards.push({ ...structuredClone(source), _id: `auto-card-${id}`, gamePlayerId, kind: 'unit',
        abilities: source.profile.ability ? [source.profile.ability.name] : [],
        faction: { stableId: source.faction, name: catalogueFactions[source.faction], themeKey: source.faction },
        quantity: 1, deploymentQuantity: 1, selectedQuantity: 1, enteredQuantity: 1 })
    }
    battle.engine.units.push({ id, seat, cell, cardStableId: stableId, regiment: regiment ?? source.profile.regiment })
  }
  const current = () => h.tables.games.find((game) => game._id === h.gameId)!
  const state = () => current().battle as BattleState
  const manual = (name: string, user: number, args: Record<string, unknown>) => h.invoke('manual', name, user, { gameId: h.gameId, ...args })
  return { ...h, current, state, manual }
}

async function heldTable() {
  const h = await table([
    ['held-south', 0, 'gaeli-longues-lames', 30, 0],
    ['held-north', 1, 'gaeli-longues-lames', 21, 0],
    ['living-south', 0, 'gaeli-combattants-des-vlands', 32],
    ['living-north', 1, 'gaeli-combattants-des-vlands', 23],
  ])
  const battle = h.state()
  battle.turn = 2
  battle.manual.combat = { ...emptyCombat(), revision: 8, ready: [0, 1],
    held: [{ unitId: 'held-south', turn: 2 }, { unitId: 'held-north', turn: 2 }],
    forestWrath: [{ seat: 0, turn: 2 }, { seat: 1, turn: 2 }],
    arrows: [
      { kind: 'melee', attackerId: 'held-south', targetId: 'living-north' },
      { kind: 'melee', attackerId: 'living-north', targetId: 'held-south' },
      { kind: 'melee', attackerId: 'held-north', targetId: 'living-south' },
      { kind: 'melee', attackerId: 'living-south', targetId: 'held-north' },
      { kind: 'melee', attackerId: 'living-south', targetId: 'living-north' },
    ],
  }
  battle.engine.engagements = [
    { a: 'held-south', b: 'living-north' },
    { a: 'held-north', b: 'living-south' },
    { a: 'living-south', b: 'living-north' },
  ]
  battle.manual.duel = { attackerId: 'living-north', targetId: 'held-south' }
  return h
}

describe('AUTO units across manual actions and turn changes', () => {
  it.each([
    [1, 'held-south', 30, 39],
    [2, 'held-north', 21, 12],
  ] as const)('rejects movement and R corrections for the held unit owned by player %i without changing the table', async (user, unitId, from, to) => {
    const h = await heldTable()
    const before = structuredClone(h.tables)
    const random = vi.spyOn(Math, 'random')
    await expect(h.manual('moveUnit', user, { unitId, from, to })).rejects.toMatchObject(error('UNIT_ONLY_COMBAT'))
    expect(h.tables).toEqual(before)
    for (const delta of [-1, 1]) {
      await expect(h.manual('adjustRegiment', user, { unitId, delta })).rejects.toMatchObject(error('UNIT_ONLY_COMBAT'))
      expect(h.tables).toEqual(before)
    }
    expect(random).not.toHaveBeenCalled()
  })

  it('lets each owner decline the remaining combat by discarding their held unit', async () => {
    const h = await heldTable()
    await h.manual('discardUnit', 1, { unitId: 'held-south' })
    let battle = h.state()
    expect(battle.manual.discarded).toContainEqual(expect.objectContaining({ id: 'held-south', regiment: 0 }))
    expect(battle.engine.units.some((unit) => unit.id === 'held-south')).toBe(false)
    expect(battle.manual.combat!.held).toEqual([{ unitId: 'held-north', turn: 2 }])
    expect(battle.manual.duel).toBeUndefined()
    expect(battle.engine.engagements.some((edge) => [edge.a, edge.b].includes('held-south'))).toBe(false)
    expect(battle.manual.combat!.arrows.some((arrow) => [arrow.attackerId, arrow.targetId].includes('held-south'))).toBe(false)
    expect(battle.manual.combat!.ready).toEqual([])
    await h.manual('discardUnit', 2, { unitId: 'held-north' })
    battle = h.state()
    expect(battle.manual.discarded.map((unit) => unit.id).sort()).toEqual(['held-north', 'held-south'])
    expect(battle.manual.combat!.held).toEqual([])
    expect(battle.engine.units.map((unit) => unit.id).sort()).toEqual(['living-north', 'living-south'])
    expect(battle.manual.combat!.arrows).toEqual([{ kind: 'melee', attackerId: 'living-south', targetId: 'living-north' }])
  })

  it.each([[1, 1], [2, -1]] as const)('discards held units from both seats when player %i changes the turn by %i, without resurrecting them on rewind', async (user, delta) => {
    const h = await heldTable()
    const frozenCards = structuredClone(h.tables.gameCards)
    await h.manual('adjustTurn', user, { delta })
    const battle = h.state()
    expect(battle.turn).toBe(2 + delta)
    expect(battle.engine.units.map((unit) => unit.id).sort()).toEqual(['living-north', 'living-south'])
    expect(battle.manual.discarded.map((unit) => unit.id).sort()).toEqual(['held-north', 'held-south'])
    expect(battle.manual.discarded.every((unit) => unit.regiment === 0)).toBe(true)
    expect(battle.engine.engagements).toEqual([{ a: 'living-south', b: 'living-north' }])
    expect(battle.manual.duel).toBeUndefined()
    expect(battle.manual.combat).toMatchObject({ held: [], forestWrath: [], ready: [], arrows: [{ kind: 'melee', attackerId: 'living-south', targetId: 'living-north' }] })
    expect(battle.manual.combat!.revision).toBeGreaterThan(8)
    for (const viewer of [1, 2, 3]) expect((await h.read(viewer)).battle!.engine.units).toEqual(battle.engine.units)
    expect(h.tables.gameCards).toEqual(frozenCards)
    await h.manual('adjustTurn', user === 1 ? 2 : 1, { delta: -delta })
    expect(h.state().turn).toBe(2)
    expect(h.state().engine.units).toEqual(battle.engine.units)
    expect(h.state().manual.discarded).toEqual(battle.manual.discarded)
    expect(h.state().manual.combat!.held).toEqual([])
    expect(h.state().manual.combat!.forestWrath).toEqual([])
  })

  it('starts Trollitude only through the Troll owner and keeps the roll until that engagement ends', async () => {
    const h = await table([
      ['troll', 0, 'gobelins-meneurs-de-troll', 30],
      ['enemy', 1, 'gaeli-combattants-des-vlands', 21],
    ])
    const random = vi.spyOn(Math, 'random').mockReturnValueOnce(.6).mockReturnValueOnce(.95)
    const pair = { a: 'troll', b: 'enemy', engaged: true }
    await h.manual('setEngagement', 2, pair)
    expect(random).not.toHaveBeenCalled()
    expect(h.state().manual.combat?.trollRolls).toBeUndefined()
    await h.manual('setEngagement', 1, pair)
    const firstRoll = { unitId: 'troll', targetId: 'enemy', value: 4, turn: 1 }
    expect(h.state().manual.combat!.trollRolls).toEqual([firstRoll])
    expect(random).toHaveBeenCalledTimes(1)
    for (const user of [1, 2]) await h.manual('setEngagement', user, { a: 'enemy', b: 'troll', engaged: true })
    await h.manual('adjustTurn', 2, { delta: 1 })
    await h.manual('setEngagement', 1, pair)
    expect(h.state().manual.combat!.trollRolls).toEqual([firstRoll])
    expect(random).toHaveBeenCalledTimes(1)
    expect(h.state().engine.engagements).toHaveLength(1)
    await h.manual('setEngagement', 1, { ...pair, engaged: false })
    expect(h.state().engine.engagements).toEqual([])
    expect(h.state().manual.combat!.trollRolls).toEqual([])
    await h.manual('setEngagement', 1, pair)
    expect(random).toHaveBeenCalledTimes(2)
    expect(h.state().manual.combat!.trollRolls).toEqual([{ unitId: 'troll', targetId: 'enemy', value: 6, turn: 2 }])
  })

  it('keeps old tables manual without adding Trollitude rolls or applying the AUTO resolver', async () => {
    const h = await table([
      ['troll', 0, 'gobelins-meneurs-de-troll', 30],
      ['enemy', 1, 'gaeli-combattants-des-vlands', 21],
    ])
    h.current().rulesVersion = '2026-09-30-portee-1'
    const profiles = structuredClone(h.tables.gameCards)
    const random = vi.spyOn(Math, 'random')
    await h.manual('setEngagement', 1, { a: 'troll', b: 'enemy', engaged: true })
    await h.manual('adjustTurn', 2, { delta: 1 })
    await h.manual('setEngagement', 1, { a: 'enemy', b: 'troll', engaged: true })
    expect(h.current().rulesVersion).not.toBe(MANUAL_RULES_VERSION)
    expect(h.state().manual.combat).toBeUndefined()
    expect(h.state().engine.engagements).toHaveLength(1)
    expect(random).not.toHaveBeenCalled()
    await h.manual('moveUnit', 1, { unitId: 'troll', from: 30, to: 39 })
    await h.manual('adjustRegiment', 1, { unitId: 'troll', delta: -1 })
    expect(h.state().engine.units.find((unit) => unit.id === 'troll')).toMatchObject({ cell: 39, regiment: 1 })
    const before = structuredClone(h.tables)
    await expect(h.invoke('combat', 'setArrow', 1, { gameId: h.gameId, kind: 'melee', attackerId: 'troll', targetId: 'enemy' })).rejects.toMatchObject(error('AUTO_RULES_REQUIRED'))
    expect(h.tables).toEqual(before)
    expect(h.tables.gameCards).toEqual(profiles)
    expect(random).not.toHaveBeenCalled()
  })
})
