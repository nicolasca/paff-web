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
  it('rejects engaged shooting targets before any roll, including historical melee-shooting profiles', async () => {
    const h = await table()
    const archer = await h.unit(0, 'archers')
    const row = h.tables.gameCards.find((card) => card.stableId === 'archers' && card.gamePlayerId === h.tables.gamePlayers[0]._id)!
    row.profile = { ...row.profile as UnitProfile, ability: { id: 'melee-shooting', name: 'Tir en mêlée', description: 'historique' } }
    await h.invoke('manual', 'setEngagement', 1, { gameId: h.gameId, a: h.a.id, b: h.b.id, engaged: true })
    const before = structuredClone(h.tables)
    const random = vi.spyOn(Math, 'random')
    await expect(h.action('setArrow', 1, { kind: 'ranged', attackerId: archer.id, targetId: h.b.id })).rejects.toMatchObject(error('ENGAGED_SHOOTING_TARGET'))
    expect(h.tables).toEqual(before)
    expect(random).not.toHaveBeenCalled()
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
  it('resolves only the caller’s shots and keeps an opponent’s prepared salve', async () => {
    const h = await table()
    const archers = [await h.unit(0, 'archers'), await h.unit(1, 'archers')]
    await h.action('setArrow', 1, { kind: 'ranged', attackerId: archers[0].id, targetId: h.b.id })
    await h.action('setArrow', 2, { kind: 'ranged', attackerId: archers[1].id, targetId: h.a.id })
    vi.spyOn(Math, 'random').mockReturnValue(.99)
    await h.action('resolve', 1, { kind: 'ranged', revision: (await h.state()).revision })
    expect((await h.state()).reports[0].attacks).toHaveLength(1)
    expect((await h.state()).arrows.map((arrow) => arrow.attackerId)).toEqual([archers[1].id])
    expect((await h.read()).battle!.engine.engagements).toEqual([])
    expect((await h.state()).rain).toEqual([])
  })
})

function currentBattle(h: Awaited<ReturnType<typeof table>>) {
  return h.tables.games.find((game) => game._id === h.gameId)!.battle as BattleState
}
function addUnit(h: Awaited<ReturnType<typeof table>>, seat: number, stableId: string, cell: number, profile: UnitProfile) {
  const source = h.tables.gameCards.find((row) => row.gamePlayerId === h.tables.gamePlayers[seat]._id)!
  const id = `extra:${seat}:${stableId}:${h.tables.gameCards.length}`
  h.tables.gameCards.push({ ...source, _id: id, stableId, name: stableId, profile, quantity: 1, selectedQuantity: 0, deploymentQuantity: 0, enteredQuantity: 1 })
  const unit = { id, seat, cardStableId: stableId, cell, regiment: profile.regiment }
  currentBattle(h).engine.units.push(unit)
  return unit
}
const profile = (kind: 'ranged' | 'melee' | 'none', ability?: keyof typeof unitAbilities, dice = 2, regiment = 10): UnitProfile => ({
  unitType: ability === 'ammunition' ? 'artillery' : kind === 'ranged' ? 'ranged' : 'troop', regiment, dice, offense: { kind, score: kind === 'none' ? null : 3 },
  defenseMelee: 3, defenseRanged: 3, source: 'defined', ...(ability ? { ability: unitAbilities[ability] } : {}),
})

describe('AUTO server mechanics', () => {
  it('keeps old tables read-only for these rules, without rolling or editing a profile', async () => {
    const h = await table()
    h.tables.games.find((game) => game._id === h.gameId)!.rulesVersion = '2026-09-30-portee-1'
    const before = structuredClone(h.tables)
    const random = vi.spyOn(Math, 'random')
    await expect(h.action('setArrow', 1, { kind: 'melee', attackerId: h.a.id, targetId: h.b.id })).rejects.toMatchObject(error('AUTO_RULES_REQUIRED'))
    expect(h.tables).toEqual(before)
    expect(random).not.toHaveBeenCalled()
  })

  it('requires every Danzereu slot, validates them before rolls, and reuses surviving shamans', async () => {
    const h = await table()
    const danzereu = addUnit(h, 0, 'gobelins-le-danzereu', 22, profile('ranged', 'shamanicConcentration'))
    const shaman = addUnit(h, 0, 'gobelins-shaman-gobelin', 42, profile('none', undefined, 0, 1))
    await h.action('setArrow', 1, { kind: 'ranged', attackerId: danzereu.id, targetId: h.b.id, slot: 0 })
    const random = vi.spyOn(Math, 'random')
    const before = structuredClone(h.tables)
    await expect(h.action('resolve', 1, { kind: 'ranged', revision: (await h.state()).revision })).rejects.toMatchObject(error('INCOMPLETE_SHAMANIC_SHOTS'))
    expect(random).not.toHaveBeenCalled()
    expect(h.tables).toEqual(before)
    await expect(h.action('setArrow', 1, { kind: 'ranged', attackerId: danzereu.id, targetId: h.b.id, slot: 2 })).rejects.toMatchObject(error('INVALID_ATTACK_SLOT'))
    await h.action('setArrow', 1, { kind: 'ranged', attackerId: danzereu.id, targetId: h.b.id, slot: 1 })
    random.mockReturnValue(.01).mockReturnValueOnce(.01).mockReturnValueOnce(.01).mockReturnValueOnce(.01).mockReturnValueOnce(.01).mockReturnValueOnce(.99)
    await h.action('resolve', 1, { kind: 'ranged', revision: (await h.state()).revision })
    expect((await h.state()).reports[0].attacks.map((attack) => attack.slot)).toEqual([0, 1])
    expect((await h.state()).reports[0].shamanRisks).toEqual([expect.objectContaining({ unit: expect.objectContaining({ id: shaman.id }), value: 6, discarded: false })])
    for (const slot of [0, 1]) await h.action('setArrow', 1, { kind: 'ranged', attackerId: danzereu.id, targetId: h.b.id, slot })
    random.mockReturnValue(.01)
    await h.action('resolve', 1, { kind: 'ranged', revision: (await h.state()).revision })
    expect((await h.state()).reports[1].attacks).toHaveLength(2)
    expect((await h.read()).battle!.manual.discarded.map((unit) => unit.id)).toContain(shaman.id)
  })

  it('rechecks shaman availability when a supporter becomes engaged', async () => {
    const h = await table()
    const danzereu = addUnit(h, 0, 'gobelins-le-danzereu', 22, profile('ranged', 'shamanicConcentration'))
    const shaman = addUnit(h, 0, 'gobelins-shaman-gobelin', 42, profile('none', undefined, 0, 1))
    for (const slot of [0, 1]) await h.action('setArrow', 1, { kind: 'ranged', attackerId: danzereu.id, targetId: h.b.id, slot })
    // Use the stored enemy archer to avoid engaging the shooting target itself.
    currentBattle(h).engine.engagements.push({ a: shaman.id, b: (await h.unit(1, 'archers')).id })
    const random = vi.spyOn(Math, 'random')
    await expect(h.action('resolve', 1, { kind: 'ranged', revision: (await h.state()).revision })).rejects.toMatchObject(error('INVALID_ATTACK_SLOT'))
    expect(random).not.toHaveBeenCalled()
  })

  it('requires legal ammunition, prevents double sacrifice, and reports a consumed unit', async () => {
    const h = await table()
    const cat = addUnit(h, 0, 'gobelins-katapult-a-gobs', 31, profile('ranged', 'ammunition'))
    await h.action('setArrow', 1, { kind: 'ranged', attackerId: cat.id, targetId: h.b.id })
    const random = vi.spyOn(Math, 'random')
    const before = structuredClone(h.tables)
    await expect(h.action('resolve', 1, { kind: 'ranged', revision: (await h.state()).revision })).rejects.toMatchObject(error('INVALID_AMMUNITION'))
    expect(random).not.toHaveBeenCalled()
    expect(h.tables).toEqual(before)
    await expect(h.action('setArrow', 1, { kind: 'ranged', attackerId: cat.id, targetId: h.b.id, sacrificeId: h.b.id })).rejects.toMatchObject(error('INVALID_AMMUNITION'))
    const troll = addUnit(h, 0, 'gobelins-meneurs-de-troll', 30, profile('melee', 'trollitude'))
    await expect(h.action('setArrow', 1, { kind: 'ranged', attackerId: cat.id, targetId: h.b.id, sacrificeId: troll.id })).rejects.toMatchObject(error('INVALID_AMMUNITION'))
    const ammo = addUnit(h, 0, 'gobelins-troupe-de-gobelins', 40, profile('melee'))
    const second = addUnit(h, 0, 'gobelins-katapult-a-gobs', 39, profile('ranged', 'ammunition'))
    for (const attackerId of [cat.id, second.id]) await h.action('setArrow', 1, { kind: 'ranged', attackerId, targetId: h.b.id, sacrificeId: ammo.id })
    await expect(h.action('resolve', 1, { kind: 'ranged', revision: (await h.state()).revision })).rejects.toMatchObject(error('DUPLICATE_AMMUNITION'))
    await h.action('setArrow', 1, { kind: 'ranged', attackerId: second.id })
    random.mockReturnValue(.01)
    await h.action('resolve', 1, { kind: 'ranged', revision: (await h.state()).revision })
    expect((await h.read()).battle!.manual.discarded.map((unit) => unit.id)).toContain(ammo.id)
    expect((await h.state()).reports[0].sacrifices?.[0].id).toBe(ammo.id)
    expect((await h.state()).reports[0].attacks[0].damage).toBe(0)
  })

  it('freezes ammunition before concentration and excludes that shaman from the required slots', async () => {
    const h = await table()
    const danzereu = addUnit(h, 0, 'gobelins-le-danzereu', 22, profile('ranged', 'shamanicConcentration'))
    const cat = addUnit(h, 0, 'gobelins-katapult-a-gobs', 31, profile('ranged', 'ammunition'))
    const shaman = addUnit(h, 0, 'gobelins-shaman-gobelin', 40, profile('none', undefined, 0, 1))
    await h.action('setArrow', 1, { kind: 'ranged', attackerId: cat.id, targetId: h.b.id, sacrificeId: shaman.id })
    await h.action('setArrow', 1, { kind: 'ranged', attackerId: danzereu.id, targetId: h.b.id, slot: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(.01)
    await h.action('resolve', 1, { kind: 'ranged', revision: (await h.state()).revision })
    expect((await h.state()).reports[0].attacks).toHaveLength(2)
    expect((await h.state()).reports[0].shamanRisks).toBeUndefined()
  })

  it('holds Gaeli units killed by shooting, allows melee only, and preserves the choice after the chief dies', async () => {
    const h = await table()
    const victim = addUnit(h, 0, 'gaeli-combattants-des-vlands', 30, profile('melee', undefined, 2, 1))
    const chief = addUnit(h, 0, 'gaeli-chefs-de-clan-de-gaeli', 31, profile('melee', 'forGaeli', 2, 1))
    const shooter = await h.unit(1, 'archers')
    await h.action('setArrow', 2, { kind: 'ranged', attackerId: shooter.id, targetId: victim.id })
    vi.spyOn(Math, 'random').mockReturnValue(.99)
    await h.action('resolve', 2, { kind: 'ranged', revision: (await h.state()).revision })
    expect((await h.state()).held).toEqual([{ unitId: victim.id, turn: 1 }])
    const beforeRetry = structuredClone(h.tables)
    const randomCalls = vi.mocked(Math.random).mock.calls.length
    await expect(h.action('setArrow', 2, { kind: 'ranged', attackerId: shooter.id, targetId: victim.id })).rejects.toMatchObject(error('INVALID_ATTACK_TARGET'))
    expect(h.tables).toEqual(beforeRetry)
    expect(vi.mocked(Math.random).mock.calls.length).toBe(randomCalls)
    await h.invoke('manual', 'discardUnit', 1, { gameId: h.gameId, unitId: chief.id })
    await expect(h.action('setArrow', 1, { kind: 'ranged', attackerId: victim.id, targetId: h.b.id })).rejects.toMatchObject(error('ATTACK_NOT_AVAILABLE'))
    await h.action('setArrow', 1, { kind: 'melee', attackerId: victim.id, targetId: h.b.id })
    await h.ready()
    await h.action('resolve', 1, { kind: 'melee', revision: (await h.state()).revision })
    expect((await h.state()).reports[1].attacks[0].dice).toHaveLength(2)
    expect((await h.read()).battle!.engine.units.find((unit) => unit.id === victim.id)?.regiment).toBe(0)
  })

  it('activates forest wrath atomically and keeps it after its guardian dies', async () => {
    const h = await table()
    const battle = currentBattle(h)
    battle.catalog.push({ id: 'forest-wrath', name: 'Colère de la Forêt', faction: 'gaeli', category: 'legendary', limit: 1, description: '', seats: [0] })
    battle.manual.stocks.push({ seat: 0, orderId: 'forest-wrath', remaining: 1 })
    const guardian = addUnit(h, 0, 'gaeli-gardiens-des-cen', 39, profile('none', undefined, 0, 1))
    const random = vi.spyOn(Math, 'random')
    await expect(h.action('forestWrath', 2, { revision: 0, guardianId: guardian.id })).rejects.toMatchObject(error('ORDER_NOT_AVAILABLE'))
    await h.action('forestWrath', 1, { revision: 0, guardianId: guardian.id })
    expect(random).not.toHaveBeenCalled()
    expect((await h.state()).forestWrath).toEqual([{ seat: 0, turn: 1 }])
    await expect(h.action('forestWrath', 1, { revision: 0, guardianId: guardian.id })).rejects.toMatchObject(error('STALE_GAME_ACTION'))
    await expect(h.action('forestWrath', 1, { revision: (await h.state()).revision, guardianId: guardian.id })).rejects.toMatchObject(error('ORDER_EXHAUSTED'))
    await h.invoke('manual', 'discardUnit', 1, { gameId: h.gameId, unitId: guardian.id })
    const spirit = addUnit(h, 0, 'gaeli-esprits-des-bois', 31, profile('melee', 'ethereal', 3))
    await h.action('setArrow', 1, { kind: 'melee', attackerId: spirit.id, targetId: h.b.id })
    await h.ready()
    random.mockReturnValue(.01)
    await h.action('resolve', 1, { kind: 'melee', revision: (await h.state()).revision })
    expect((await h.state()).reports[0].attacks[0].dice).toHaveLength(6)
    expect((await h.read()).battle!.manual.stocks.find((stock) => stock.orderId === 'forest-wrath')?.remaining).toBe(0)
  })

  it('requires an available non-engaged guardian before activating forest wrath', async () => {
    const h = await table()
    const battle = currentBattle(h)
    battle.catalog.push({ id: 'forest-wrath', name: 'Colère', faction: 'gaeli', category: 'legendary', limit: 1, description: '', seats: [0] })
    battle.manual.stocks.push({ seat: 0, orderId: 'forest-wrath', remaining: 1 })
    const guardian = addUnit(h, 0, 'gaeli-gardiens-des-cen', 39, profile('none', undefined, 0, 1))
    battle.engine.engagements.push({ a: guardian.id, b: h.b.id })
    const before = structuredClone(h.tables)
    await expect(h.action('forestWrath', 1, { revision: 0, guardianId: guardian.id })).rejects.toMatchObject(error('FOREST_WRATH_NEEDS_GUARDIAN'))
    expect(h.tables).toEqual(before)
  })

  it('uses one troll roll per engagement and permits an explicitly selected adjacent ally after one', async () => {
    const h = await table()
    const troll = addUnit(h, 0, 'gobelins-meneurs-de-troll', 31, profile('melee', 'trollitude', 2))
    const random = vi.spyOn(Math, 'random').mockReturnValue(.01)
    await h.action('setArrow', 1, { kind: 'melee', attackerId: troll.id, targetId: h.b.id })
    expect((await h.state()).trollRolls?.[0].value).toBe(1)
    await h.ready()
    await expect(h.action('resolve', 1, { kind: 'melee', revision: (await h.state()).revision })).rejects.toMatchObject(error('TROLL_NEEDS_ALLY'))
    const distant = addUnit(h, 0, 'gobelins-lointain', 49, profile('melee'))
    await expect(h.action('setArrow', 1, { kind: 'melee', attackerId: troll.id, targetId: distant.id })).rejects.toMatchObject(error('INVALID_ATTACK_TARGET'))
    const randomCalls = random.mock.calls.length
    await h.action('setArrow', 1, { kind: 'melee', attackerId: troll.id, targetId: h.a.id })
    expect(random.mock.calls.length).toBe(randomCalls)
    expect((await h.state()).trollRolls?.[0].targetId).toBe(h.a.id)
    await h.ready()
    await h.action('resolve', 1, { kind: 'melee', revision: (await h.state()).revision })
    expect((await h.state()).reports[0].attacks[0].target.id).toBe(h.a.id)
    await h.ready()
    await h.action('resolve', 1, { kind: 'melee', revision: (await h.state()).revision })
    expect((await h.state()).trollRolls).toHaveLength(1)
    expect((await h.state()).reports).toHaveLength(2)
  })

  it.each([2, 3, 6])('persists troll result %i without additional behavior rolls', async (value) => {
    const h = await table()
    const troll = addUnit(h, 0, 'gobelins-meneurs-de-troll', 31, profile('melee', 'trollitude', 2))
    const random = vi.spyOn(Math, 'random').mockReturnValue((value - .5) / 6)
    await h.action('setArrow', 1, { kind: 'melee', attackerId: troll.id, targetId: h.b.id })
    random.mockReturnValue(.01)
    for (let combat = 0; combat < 2; combat++) {
      await h.ready()
      await h.action('resolve', 1, { kind: 'melee', revision: (await h.state()).revision })
      expect((await h.state()).reports[combat].attacks[0].dice).toHaveLength(value === 6 ? 2 : 0)
    }
    expect(random).toHaveBeenCalledTimes(value === 6 ? 5 : 1)
  })

  it('requires two concentrated shooters in one zone, adds one die each and consumes stock', async () => {
    const h = await table()
    const battle = currentBattle(h)
    battle.catalog.push({ id: 'concentrated-fire', name: 'Tir concentré', faction: 'sephosi', category: 'advanced', limit: 4, description: '', seats: [0] })
    battle.manual.stocks.push({ seat: 0, orderId: 'concentrated-fire', remaining: 4 })
    const shooter = await h.unit(0, 'archers')
    await h.action('setArrow', 1, { kind: 'ranged', attackerId: shooter.id, targetId: h.b.id })
    const random = vi.spyOn(Math, 'random')
    await expect(h.action('resolve', 1, { kind: 'ranged', revision: (await h.state()).revision, orderId: 'concentrated-fire' })).rejects.toMatchObject(error('INVALID_CONCENTRATED_FIRE'))
    expect(random).not.toHaveBeenCalled()
    const second = addUnit(h, 0, 'sephosi-arbaletriers', 31, profile('ranged'))
    await h.action('setArrow', 1, { kind: 'ranged', attackerId: second.id, targetId: h.b.id })
    random.mockReturnValue(.01)
    await h.action('resolve', 1, { kind: 'ranged', revision: (await h.state()).revision, orderId: 'concentrated-fire' })
    expect((await h.state()).reports[0].attacks.map((attack) => attack.dice.length)).toEqual([2, 3])
    expect((await h.state()).reports[0].orderId).toBe('concentrated-fire')
    expect((await h.read()).battle!.manual.stocks.find((stock) => stock.orderId === 'concentrated-fire')?.remaining).toBe(3)
  })
  it('redirects the roll of the prepared troll attack when another engagement was added later', async () => {
    const h = await table()
    const troll = addUnit(h, 0, 'gobelins-meneurs-de-troll', 31, profile('melee', 'trollitude', 2))
    const random = vi.spyOn(Math, 'random').mockReturnValue(.01)
    await h.action('setArrow', 1, { kind: 'melee', attackerId: troll.id, targetId: h.b.id })
    const otherEnemy = (await h.unit(1, 'archers')).id
    random.mockReturnValue(.6)
    await h.invoke('manual', 'setEngagement', 1, { gameId: h.gameId, a: troll.id, b: otherEnemy, engaged: true })
    expect((await h.state()).trollRolls?.map((roll) => roll.value)).toEqual([1, 4])
    const calls = random.mock.calls.length
    await h.action('setArrow', 1, { kind: 'melee', attackerId: troll.id, targetId: h.a.id })
    expect(random.mock.calls.length).toBe(calls)
    expect((await h.state()).trollRolls).toEqual(expect.arrayContaining([
      expect.objectContaining({ unitId: troll.id, targetId: h.a.id, value: 1 }),
      expect.objectContaining({ unitId: troll.id, targetId: otherEnemy, value: 4 }),
    ]))
    expect((await h.state()).trollRolls).toHaveLength(2)
  })

  it('retains the original troll roll when an opponent arrow keeps that engagement alive', async () => {
    const h = await table()
    const troll = addUnit(h, 0, 'gobelins-meneurs-de-troll', 31, profile('melee', 'trollitude', 2))
    const random = vi.spyOn(Math, 'random').mockReturnValue(.01)
    await h.action('setArrow', 1, { kind: 'melee', attackerId: troll.id, targetId: h.b.id })
    await h.action('setArrow', 2, { kind: 'melee', attackerId: h.b.id, targetId: troll.id })
    await h.action('setArrow', 1, { kind: 'melee', attackerId: troll.id, targetId: h.a.id })
    expect((await h.state()).trollRolls?.map((roll) => roll.targetId)).toEqual([h.b.id, h.a.id])
    await h.action('setArrow', 1, { kind: 'melee', attackerId: troll.id })
    expect((await h.state()).trollRolls?.map((roll) => roll.targetId)).toEqual([h.b.id])
    const calls = random.mock.calls.length
    await h.action('setArrow', 1, { kind: 'melee', attackerId: troll.id, targetId: h.b.id })
    expect(random.mock.calls.length).toBe(calls)
    expect((await h.state()).trollRolls?.[0].value).toBe(1)
  })

  it('rolls independently for a new Troll target while preserving the one on an existing pair', async () => {
    const h = await table()
    const troll = addUnit(h, 0, 'gobelins-meneurs-de-troll', 31, profile('melee', 'trollitude', 2))
    const otherEnemy = addUnit(h, 1, 'sephosi-autre-lancier', 22, profile('melee'))
    const random = vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValue(.6)
    await h.action('setArrow', 1, { kind: 'melee', attackerId: troll.id, targetId: h.b.id })
    await h.action('setArrow', 2, { kind: 'melee', attackerId: h.b.id, targetId: troll.id })
    await h.action('setArrow', 1, { kind: 'melee', attackerId: troll.id, targetId: otherEnemy.id })
    expect((await h.state()).trollRolls).toEqual([
      { unitId: troll.id, targetId: h.b.id, value: 1, turn: 1 },
      { unitId: troll.id, targetId: otherEnemy.id, value: 4, turn: 1 },
    ])
    expect(random).toHaveBeenCalledTimes(2)
    await h.action('setArrow', 1, { kind: 'melee', attackerId: troll.id, targetId: otherEnemy.id })
    expect(random).toHaveBeenCalledTimes(2)
    await h.ready()
    random.mockReturnValue(0)
    await h.action('resolve', 1, { kind: 'melee', revision: (await h.state()).revision })
    const attack = (await h.state()).reports[0].attacks.find((item) => item.attacker.id === troll.id)!
    expect(attack).toMatchObject({ target: { id: otherEnemy.id }, effects: ['Trollitude : dé 4, attaque normale'] })
    expect(attack.dice).toHaveLength(2)
  })

  it('rejects using a shooter as ammunition before the entire salve rolls', async () => {
    const h = await table()
    const cat = addUnit(h, 0, 'gobelins-katapult-a-gobs', 31, profile('ranged', 'ammunition'))
    const shooter = await h.unit(0, 'archers')
    await h.action('setArrow', 1, { kind: 'ranged', attackerId: shooter.id, targetId: h.b.id })
    await h.action('setArrow', 1, { kind: 'ranged', attackerId: cat.id, targetId: h.b.id, sacrificeId: shooter.id })
    const before = structuredClone(h.tables)
    const random = vi.spyOn(Math, 'random')
    await expect(h.action('resolve', 1, { kind: 'ranged', revision: (await h.state()).revision })).rejects.toMatchObject(error('AMMUNITION_IS_ATTACKING'))
    expect(h.tables).toEqual(before)
    expect(random).not.toHaveBeenCalled()
  })

})
