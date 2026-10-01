import { afterEach, describe, expect, it, vi } from 'vitest'
import { liveGame } from '../src/test/liveGame'
import { unitAbilities } from '../shared/unitAbilities'
import type { BattleState } from '../shared/battle'
import type { UnitProfile } from '../shared/unitProfile'

afterEach(() => vi.restoreAllMocks())
const error = (code: string) => ({ data: { code } })
async function table() {
  const h = await liveGame()
  // Bring the shooters within three orthogonal steps of the opposing melee units.
  const battle = h.stored.battle as BattleState
  battle.engine!.units.filter((unit) => unit.cardStableId === 'archers').forEach((unit) => { unit.cell = unit.seat === 0 ? 32 : 23 })
  const action = (name: string, user = 1, args: Record<string, unknown> = {}) => h.invoke('combat', name, user, { gameId: h.gameId, ...args })
  const state = async () => (await h.read()).battle!.manual.combat!
  const ready = async () => { const revision = (await state()).revision; for (const user of [1, 2]) await action('setReady', user, { revision, ready: true }); return revision }
  const a = await h.unit(0, 'lanciers'), b = await h.unit(1, 'lanciers')
  return { ...h, action, state, ready, a, b }
}

describe('combat server authority and persistence', () => {
  it.each([4, 34])('rejects an out-of-range target at %i before storing an arrow or rolling', async (cell) => {
    const h = await table()
    const archer = await h.unit(0, 'archers')
    const battle = h.stored.battle as BattleState
    battle.engine!.units.find((unit) => unit.id === h.b.id)!.cell = cell
    const before = structuredClone(h.tables)
    const random = vi.spyOn(Math, 'random')
    await expect(h.action('setArrow', 1, { kind: 'ranged', attackerId: archer.id, targetId: h.b.id })).rejects.toMatchObject(error('OUT_OF_SHOOTING_RANGE'))
    expect(h.tables).toEqual(before)
    expect(random).not.toHaveBeenCalled()
  })

  it.each(['attacker', 'target'] as const)('rechecks range after the %s moves and rejects the entire batch without rolls or losses', async (moved) => {
    const h = await table()
    const archer = await h.unit(0, 'archers')
    // This second arrow stays valid, proving the whole batch is checked before any roll.
    await h.invoke('manual', 'recruit', 1, { gameId: h.gameId, cardStableId: 'archers', entered: 1, cell: 31 })
    const second = (await h.read()).battle!.engine.units.find((unit) => unit.cell === 31)!
    for (const attackerId of [second.id, archer.id]) await h.action('setArrow', 1, { kind: 'ranged', attackerId, targetId: h.b.id })
    if (moved === 'attacker') await h.invoke('manual', 'moveUnit', 1, { gameId: h.gameId, unitId: archer.id, from: 32, to: 41 })
    else await h.invoke('manual', 'moveUnit', 2, { gameId: h.gameId, unitId: h.b.id, from: 13, to: 4 })
    const before = structuredClone(h.tables)
    const random = vi.spyOn(Math, 'random')
    await expect(h.action('resolve', 1, { kind: 'ranged', revision: (await h.state()).revision })).rejects.toMatchObject(error('OUT_OF_SHOOTING_RANGE'))
    expect(h.tables).toEqual(before)
    expect(random).not.toHaveBeenCalled()
    expect((await h.state()).reports).toEqual([])
  })

  it.each([0, 1])('allows the fourth forward square for frozen long archers in seat %i, but not the fourth square behind', async (seat) => {
    const h = await table()
    const attacker = await h.unit(seat, 'archers')
    const target = seat === 0 ? h.b : h.a
    const battle = h.stored.battle as BattleState
    const storedAttacker = battle.engine!.units.find((unit) => unit.id === attacker.id)!
    const storedTarget = battle.engine!.units.find((unit) => unit.id === target.id)!
    const card = h.tables.gameCards.find((row) => row.stableId === 'archers' && row.gamePlayerId === h.tables.gamePlayers[seat]._id)!
    card.stableId = storedAttacker.cardStableId = 'gaeli-archers-longs-gaeliens'
    storedAttacker.cell = seat === 0 ? 50 : 5 // F6 / F1.
    storedTarget.cell = seat === 0 ? 14 : 41 // F2 / F5.
    expect((card.profile as UnitProfile).ability).toBeUndefined()
    await h.action('setArrow', seat + 1, { kind: 'ranged', attackerId: attacker.id, targetId: target.id })
    vi.spyOn(Math, 'random').mockReturnValue(.01)
    await h.action('resolve', seat + 1, { kind: 'ranged', revision: (await h.state()).revision })
    expect((await h.state()).reports[0].attacks).toHaveLength(1)
    const current = h.tables.games.find((game) => game._id === h.gameId)!.battle as BattleState
    current.engine!.units.find((unit) => unit.id === attacker.id)!.cell = seat === 0 ? 5 : 50
    current.engine!.units.find((unit) => unit.id === target.id)!.cell = seat === 0 ? 41 : 14
    await expect(h.action('setArrow', seat + 1, { kind: 'ranged', attackerId: attacker.id, targetId: target.id })).rejects.toMatchObject(error('OUT_OF_SHOOTING_RANGE'))
  })

  it('clears only the caller’s arrows and preserves the reciprocal attack and engagement', async () => {
    const h = await table()
    for (const [user, attackerId, targetId] of [[1, h.a.id, h.b.id], [2, h.b.id, h.a.id]] as const) await h.action('setArrow', user, { kind: 'melee', attackerId, targetId })
    await h.ready()
    await h.action('clearArrows', 1, { kind: 'melee' })
    expect((await h.state()).arrows).toEqual([{ kind: 'melee', attackerId: h.b.id, targetId: h.a.id }])
    expect((await h.state()).ready).toEqual([])
    expect((await h.read()).battle!.engine.engagements).toHaveLength(1)
    await h.action('clearArrows', 2, { kind: 'melee' })
    expect((await h.read()).battle!.engine.engagements).toEqual([])
  })
  it('requires a valid exposed ally before rolling and cleans that choice after disengagement', async () => {
    const h = await table()
    const archer = await h.unit(0, 'archers')
    const row = h.tables.gameCards.find((card) => card.stableId === 'archers' && card.gamePlayerId === h.tables.gamePlayers[0]._id)!
    row.profile = { ...row.profile as UnitProfile, ability: unitAbilities.meleeShooting }
    await h.invoke('manual', 'recruit', 1, { gameId: h.gameId, cardStableId: 'lanciers', entered: 1, cell: 31 })
    const c = (await h.read()).battle!.engine.units.find((u) => u.cell === 31)!
    for (const a of [h.a.id, c.id]) await h.invoke('manual', 'setEngagement', 1, { gameId: h.gameId, a, b: h.b.id, engaged: true })
    const arrow = { kind: 'ranged', attackerId: archer.id, targetId: h.b.id }
    await h.action('setArrow', 1, arrow)
    const before = structuredClone(h.tables)
    await expect(h.action('resolve', 1, { kind: 'ranged', revision: (await h.state()).revision })).rejects.toMatchObject(error('MISSING_EXPOSED_ALLY'))
    expect(h.tables).toEqual(before)
    await expect(h.action('setArrow', 1, { ...arrow, allyId: archer.id })).rejects.toMatchObject(error('INVALID_EXPOSED_ALLY'))
    await h.action('setArrow', 1, { ...arrow, allyId: c.id })
    await h.invoke('manual', 'setEngagement', 1, { gameId: h.gameId, a: c.id, b: h.b.id, engaged: false })
    expect((await h.state()).arrows[0].allyId).toBeUndefined()
    await h.action('resolve', 1, { kind: 'ranged', revision: (await h.state()).revision })
    expect((await h.state()).reports[0].diversions[0].ally.id).toBe(h.a.id)
  })
  it('shares arrows, preserves B → A when C joins, and waits for both players', async () => {
    const h = await table()
    const arrow = { kind: 'melee', attackerId: h.a.id, targetId: h.b.id }
    await h.action('setArrow', 1, arrow)
    await h.action('setArrow', 2, { ...arrow, attackerId: h.b.id, targetId: h.a.id })
    await h.invoke('manual', 'recruit', 1, { gameId: h.gameId, cardStableId: 'lanciers', entered: 1, cell: 31 })
    const c = (await h.read()).battle!.engine.units.find((u) => u.cell === 31)!
    await h.action('setArrow', 1, { ...arrow, attackerId: c.id })
    expect((await h.state()).arrows.find((a) => a.attackerId === h.b.id)?.targetId).toBe(h.a.id)
    for (const user of [1, 2, 3]) expect((await h.read(user)).battle!.manual.combat?.arrows).toHaveLength(3)
    await expect(h.action('resolve', 1, { kind: 'melee', revision: (await h.state()).revision })).rejects.toMatchObject(error('COMBAT_NOT_READY'))
    const revision = await h.ready()
    vi.spyOn(Math, 'random').mockReturnValue(.99)
    await h.action('resolve', 2, { kind: 'melee', revision })
    expect((await h.state()).reports[0].attacks).toHaveLength(3)
    expect((await h.state()).arrows).toHaveLength(3)
    expect((await h.state()).ready).toEqual([])
    await expect(h.action('resolve', 1, { kind: 'melee', revision })).rejects.toMatchObject(error('STALE_GAME_ACTION'))
  })
  it('discards simultaneous deaths, cleans arrows and engagements, and keeps reports for all viewers', async () => {
    const h = await table()
    const battle = h.stored.battle as BattleState
    battle.engine!.units.filter((u) => u.cardStableId === 'lanciers').forEach((u) => { u.regiment = 1 })
    for (const [user, attackerId, targetId] of [[1, h.a.id, h.b.id], [2, h.b.id, h.a.id]] as const) await h.action('setArrow', user, { kind: 'melee', attackerId, targetId })
    const revision = await h.ready()
    vi.spyOn(Math, 'random').mockReturnValue(.99)
    await h.action('resolve', 1, { kind: 'melee', revision })
    const result = (await h.read(3)).battle!
    expect(result.manual.discarded.map((u) => u.id)).toEqual(expect.arrayContaining([h.a.id, h.b.id]))
    expect(result.engine.engagements).toEqual([])
    expect(result.manual.combat!.arrows).toEqual([])
    expect(result.manual.combat!.reports[0].attacks).toHaveLength(2)
    expect((await h.read(2)).battle!.manual.combat!.reports).toEqual(result.manual.combat!.reports)
  })
  it('rejects opponent control, spectators, unavailable attacks, friendly targets and empty resolution', async () => {
    const h = await table()
    const arrow = { kind: 'melee', attackerId: h.a.id, targetId: h.b.id }
    const before = structuredClone(h.tables)
    await expect(h.action('setArrow', 2, arrow)).rejects.toMatchObject(error('UNIT_NOT_OWNED'))
    for (const [name, args] of [['setArrow', arrow], ['clearArrows', { kind: 'melee' }], ['setReady', { revision: 0, ready: true }], ['resolve', { kind: 'melee', revision: 0 }]] as const) await expect(h.action(name, 3, args)).rejects.toMatchObject(error('GAME_NOT_AVAILABLE'))
    await expect(h.action('setArrow', 1, { ...arrow, targetId: h.a.id })).rejects.toMatchObject(error('INVALID_ATTACK_TARGET'))
    await expect(h.action('setArrow', 1, { ...arrow, kind: 'ranged' })).rejects.toMatchObject(error('ATTACK_NOT_AVAILABLE'))
    await expect(h.action('resolve', 1, { kind: 'ranged', revision: 0 })).rejects.toMatchObject(error('NO_ATTACKS'))
    expect(h.tables).toEqual(before)
  })
  it('invalidates readiness on relevant edits, while manual dice and comparison remain independent', async () => {
    const h = await table()
    await h.action('setArrow', 1, { kind: 'melee', attackerId: h.a.id, targetId: h.b.id })
    const old = await h.ready()
    await h.invoke('manual', 'rollDice', 1, { gameId: h.gameId, count: 2 })
    expect((await h.state()).ready).toHaveLength(2)
    await h.invoke('manual', 'moveUnit', 1, { gameId: h.gameId, unitId: h.a.id, from: 40, to: 31 })
    expect((await h.state()).ready).toEqual([])
    await expect(h.action('setReady', 2, { revision: old, ready: true })).rejects.toMatchObject(error('STALE_GAME_ACTION'))
    await h.ready()
    await h.invoke('manual', 'adjustRegiment', 2, { gameId: h.gameId, unitId: h.b.id, delta: -1 })
    expect((await h.state()).ready).toEqual([])
    await h.ready()
    await h.invoke('manual', 'setEngagement', 1, { gameId: h.gameId, a: h.a.id, b: h.b.id, engaged: false })
    expect((await h.state()).arrows).toEqual([])
    expect((await h.state()).ready).toEqual([])
  })
  it('resolves only the caller’s shots without creating engagements and expires rain on turn changes', async () => {
    const h = await table()
    const archers = [await h.unit(0, 'archers'), await h.unit(1, 'archers')]
    const card = h.tables.gameCards.find((row) => row.stableId === 'archers' && row.gamePlayerId === h.tables.gamePlayers[0]._id)!
    card.profile = { ...card.profile as UnitProfile, ability: unitAbilities.goblinRain }
    await h.action('setArrow', 1, { kind: 'ranged', attackerId: archers[0].id, targetId: h.b.id })
    await h.action('setArrow', 2, { kind: 'ranged', attackerId: archers[1].id, targetId: h.a.id })
    vi.spyOn(Math, 'random').mockReturnValue(.99)
    await h.action('resolve', 1, { kind: 'ranged', revision: (await h.state()).revision })
    expect((await h.state()).reports[0].attacks).toHaveLength(1)
    expect((await h.state()).arrows.map((a) => a.attackerId)).toEqual([archers[1].id])
    expect((await h.read()).battle!.engine.engagements).toEqual([])
    expect((await h.state()).rain).toEqual([{ unitId: h.b.id, penalty: 2, turn: 1 }])
    await h.invoke('manual', 'adjustTurn', 1, { gameId: h.gameId, delta: 1 })
    expect((await h.state()).rain).toEqual([])
    await h.invoke('manual', 'adjustTurn', 1, { gameId: h.gameId, delta: -1 })
    expect((await h.state()).rain).toEqual([])
  })
})
