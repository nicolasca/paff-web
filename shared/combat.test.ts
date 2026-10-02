import { describe, expect, it, vi } from 'vitest'
import { emptyCombat, invalidateCombat, resolveCombat, type AttackArrow, type AttackKind, type CombatState } from './combat'
import { ammoEligible, beginTrollEngagement, concentrationShamans, danzereuShotCount, FOREST_SPIRITS_ID, isHeld } from './autoCombat'
import type { BattleUnit, EngineState, UnitCard } from './battleEngine'
import { unitAbilities, type UnitAbility } from './unitAbilities'
import type { UnitProfile } from './unitProfile'
import type { InvocationEffect } from './greatInvocation'

function fixture() {
  const cards: UnitCard[] = []
  const engine: EngineState = { units: [], engagements: [], log: [] }
  const combat = emptyCombat()
  const add = (id: string, seat: number, cell: number, dice = 2, kind: AttackKind | 'none' = 'melee', ability?: UnitAbility, regiment = 3, stableId = id) => {
    const profile: UnitProfile = { unitType: 'troop', regiment, dice, offense: { kind, score: kind === 'none' ? null : 3 }, defenseMelee: 3, defenseRanged: 3, source: 'defined', ...(ability ? { ability: unitAbilities[ability] } : {}) }
    cards.push({ stableId, seat, name: id, cost: 1, profile, quantity: 1, entered: 1 })
    const unit: BattleUnit = { id, seat, cell, cardStableId: stableId, regiment }
    engine.units.push(unit)
    return unit
  }
  const attack = (attackerId: string, targetId: string, kind: AttackKind = 'melee', slot?: number, sacrificeId?: string): AttackArrow => ({ attackerId, targetId, kind, ...(slot !== undefined ? { slot } : {}), ...(sacrificeId ? { sacrificeId } : {}) })
  const run = (arrows: AttackArrow[], values: number[] = [], invocations: InvocationEffect[] = [], state: CombatState = combat, orderId?: 'concentrated-fire') => resolveCombat(engine, cards, arrows, [], 1, arrows[0].kind, 0, 1, () => values.shift() ?? 6, invocations, state, orderId)
  return { cards, engine, combat, add, attack, run }
}

describe('AUTO simultaneous attack resolution', () => {
  it('keeps every planned attack when attackers die and accumulates focused damage', () => {
    const f = fixture()
    f.add('A', 0, 20, 3); f.add('B', 1, 21, 3); f.add('C', 0, 22, 2)
    const result = f.run([f.attack('A', 'B'), f.attack('B', 'A'), f.attack('C', 'B')])
    expect(result.report.attacks.map((attack) => attack.hits)).toEqual([3, 3, 2])
    expect(result.report.losses).toContainEqual(expect.objectContaining({ unit: expect.objectContaining({ id: 'B' }), before: 3, after: 0, damage: 5 }))
    expect(result.engine.units.map((unit) => unit.id)).toEqual(['C'])
    expect(f.engine.units).toHaveLength(3)
  })

  it('doubles profile dice only, then adds concentrated fire and subtracts Ethérés', () => {
    const f = fixture()
    f.add('A', 0, 20, 3, 'ranged'); f.add('chief', 0, 22, 2, 'melee', 'forGaeli'); f.add('B', 1, 21, 2, 'melee', 'ethereal', 20)
    const invocation: InvocationEffect = { seat: 0, turn: 1, scope: 1, unitIds: ['A'] }
    expect(f.run([f.attack('A', 'B', 'ranged')], [], [invocation, invocation], f.combat, 'concentrated-fire').report.attacks[0].dice).toHaveLength(6)
    expect(f.run([f.attack('A', 'B', 'ranged')], [], [{ ...invocation, turn: 2 }]).report.attacks[0].dice).toHaveLength(2)
  })

  it.each(['ranged', 'melee'] as const)('applies Ethérés to %s with a minimum of one', (kind) => {
    const f = fixture()
    f.add('A', 0, 20, 1, kind); f.add('B', 1, 21, 3, 'melee', 'ethereal')
    expect(f.run([f.attack('A', 'B', kind)]).report.attacks[0].dice).toHaveLength(1)
  })

  it('does not execute removed effects from historical profile descriptions or old rain', () => {
    const f = fixture()
    f.add('A', 0, 20, 2, 'ranged'); f.add('B', 1, 21, 3, 'melee', 'ethereal')
    f.cards[0].profile.ability = { id: 'magical-shot', name: 'Tir magique', description: 'historique' }
    f.combat.rain = [{ unitId: 'A', turn: 1, penalty: 2 }]
    const result = f.run([f.attack('A', 'B', 'ranged')], [6])
    expect(result.report.attacks[0].dice).toEqual([{ value: 6 }])
    expect(result.report.attacks[0].damage).toBe(1)
    expect(result.report.diversions).toEqual([])
    expect(result.rain).toEqual([])
  })

  it('rolls all Danzereu shots before shaman risks and never cancels a shot after a target dies', () => {
    const f = fixture()
    const danzereu = f.add('D', 0, 40, 2, 'ranged', 'shamanicConcentration')
    f.add('s1', 0, 39, 0, 'none', undefined, 1, 'gobelins-shaman-gobelin')
    f.add('s2', 0, 41, 0, 'none', undefined, 1, 'gobelins-shaman-gobelin')
    f.add('engaged', 0, 42, 0, 'none', undefined, 1, 'gobelins-shaman-gobelin')
    f.add('other-axis', 0, 36, 0, 'none', undefined, 1, 'gobelins-shaman-gobelin')
    f.add('enemy-shaman', 1, 23, 0, 'none', undefined, 1, 'gobelins-shaman-gobelin')
    f.add('B', 1, 22, 2, 'melee', undefined, 1)
    f.add('C', 1, 21, 2, 'melee', undefined, 1)
    f.engine.engagements.push({ a: 'engaged', b: 'B' })
    expect(concentrationShamans(f.engine, danzereu).map((unit) => unit.id)).toEqual(['s1', 's2'])
    expect(danzereuShotCount(f.engine, danzereu, f.cards)).toBe(3)
    const result = f.run([f.attack('D', 'B', 'ranged', 0), f.attack('D', 'B', 'ranged', 1), f.attack('D', 'C', 'ranged', 2)], [6, 6, 6, 6, 6, 6, 1, 4])
    expect(result.report.attacks).toHaveLength(3)
    expect(result.report.shamanRisks).toEqual([expect.objectContaining({ unit: expect.objectContaining({ id: 's1' }), value: 1, discarded: true }), expect.objectContaining({ unit: expect.objectContaining({ id: 's2' }), value: 4, discarded: false })])
    expect(result.dead.map((unit) => unit.id)).toEqual(expect.arrayContaining(['s1', 'B', 'C']))
    expect(result.engine.units.some((unit) => unit.id === 's2')).toBe(true)
  })

  it('keeps the normal Danzereu shot without a shaman', () => {
    const f = fixture()
    const attacker = f.add('D', 0, 40, 2, 'ranged', 'shamanicConcentration')
    f.add('B', 1, 22)
    expect(danzereuShotCount(f.engine, attacker, f.cards)).toBe(1)
    expect(f.run([f.attack('D', 'B', 'ranged', 0)]).report.shamanRisks).toBeUndefined()
  })

  it('consumes ammunition before the snapshot, including a shaman who cannot support this batch', () => {
    const f = fixture()
    f.add('D', 0, 40, 2, 'ranged', 'shamanicConcentration')
    const cat = f.add('cat', 0, 31, 2, 'ranged', 'ammunition')
    const shaman = f.add('s', 0, 32, 0, 'none', undefined, 1, 'gobelins-shaman-gobelin')
    f.add('B', 1, 22, 2, 'melee', undefined, 20)
    expect(ammoEligible(f.engine, cat, shaman)).toBe(true)
    const result = f.run([f.attack('cat', 'B', 'ranged', 0, 's'), f.attack('D', 'B', 'ranged', 0)])
    expect(result.report.sacrifices?.map((unit) => unit.id)).toEqual(['s'])
    expect(result.report.shamanRisks).toBeUndefined()
    expect(result.dead.map((unit) => unit.id)).toEqual(['s'])
    expect(result.report.attacks.map((attack) => attack.damage)).toEqual([2, 2])
  })

  it('allows an adjacent sacrifice across a zone boundary but excludes Trolls, Djil and Katapults', () => {
    const f = fixture()
    const cat = f.add('cat', 0, 31, 2, 'ranged', 'ammunition')
    const candidate = f.add('a', 0, 40)
    expect(ammoEligible(f.engine, cat, candidate)).toBe(true)
    for (const stableId of ['gobelins-meneurs-de-troll', 'gobelins-djil-meneur-de-trolls', 'gobelins-katapult-a-gobs']) expect(ammoEligible(f.engine, cat, { ...candidate, cardStableId: stableId })).toBe(false)
    expect(ammoEligible(f.engine, cat, { ...candidate, seat: 1 })).toBe(false)
    expect(ammoEligible(f.engine, cat, { ...candidate, cell: 41 })).toBe(false)
  })

  it('protects other units killed by a salve even when its chief is killed in the same salve', () => {
    const f = fixture()
    f.add('shooter', 1, 13, 2, 'ranged')
    f.add('A', 0, 20, 2, 'melee', undefined, 1)
    f.add('chief', 0, 21, 2, 'melee', 'forGaeli', 1)
    f.engine.engagements = [{ a: 'A', b: 'shooter' }]
    const result = f.run([f.attack('shooter', 'chief', 'ranged'), f.attack('shooter', 'A', 'ranged', 1)])
    expect(result.dead.map((unit) => unit.id)).toEqual(['chief'])
    expect(result.held).toEqual([{ unitId: 'A', turn: 1 }])
    expect(result.engine.units.find((unit) => unit.id === 'A')?.regiment).toBe(0)
    expect(result.engine.engagements).toEqual([{ a: 'A', b: 'shooter' }])
    f.engine.units = result.engine.units
    f.combat.held = result.held
    f.combat.arrows = [f.attack('A', 'shooter')]
    invalidateCombat(f.combat, f.engine, 1)
    expect(f.combat.arrows).toHaveLength(1)
    expect(f.run(f.combat.arrows).report.attacks[0].dice).toHaveLength(2)
    expect(isHeld(f.engine.units.find((unit) => unit.id === 'A')!, f.combat, 2)).toBe(false)
  })

  it('does not protect units in another zone or units destroyed in melee', () => {
    const f = fixture()
    f.add('A', 0, 40, 2, 'melee', undefined, 1)
    f.add('chief', 0, 20, 2, 'melee', 'forGaeli')
    f.add('B', 1, 21, 2, 'ranged')
    expect(f.run([f.attack('B', 'A', 'ranged')]).held).toEqual([])
    f.engine.units[0].cell = 22
    f.cards[2].profile.offense.kind = 'melee'
    expect(f.run([f.attack('B', 'A')]).held).toEqual([])
  })

  it('applies forest wrath dynamically to new spirits of the owner only, and only in melee this turn', () => {
    const f = fixture()
    f.add('new-spirit', 0, 20, 3, 'melee', 'ethereal', 3, FOREST_SPIRITS_ID)
    f.add('enemy', 1, 21, 3, 'melee', 'ethereal', 20)
    f.combat.forestWrath = [{ seat: 0, turn: 1 }]
    expect(f.run([f.attack('new-spirit', 'enemy')]).report.attacks[0].dice).toHaveLength(5)
    expect(f.run([f.attack('enemy', 'new-spirit')]).report.attacks[0].dice).toHaveLength(2)
    f.cards[0].profile.offense.kind = 'ranged'
    expect(f.run([f.attack('new-spirit', 'enemy', 'ranged')]).report.attacks[0].dice).toHaveLength(2)
    f.combat.forestWrath[0].turn = 2
    f.cards[0].profile.offense.kind = 'melee'
    expect(f.run([f.attack('new-spirit', 'enemy')]).report.attacks[0].dice).toHaveLength(2)
  })

  it.each([2, 3, 4, 5, 6])('keeps Trollitude %i during repeated combats without a bonus on six', (value) => {
    const f = fixture()
    f.add('T', 0, 20, 2, 'melee', 'trollitude'); f.add('B', 1, 21, 2, 'melee', undefined, 20)
    f.engine.engagements = [{ a: 'T', b: 'B' }]
    const die = vi.fn(() => value)
    const roll = beginTrollEngagement(f.engine, f.cards, f.combat, 1, 'T', 'B', die)
    expect(beginTrollEngagement(f.engine, f.cards, f.combat, 2, 'T', 'B', die)).toBe(roll)
    expect(die).toHaveBeenCalledTimes(1)
    expect(f.run([f.attack('T', 'B')]).report.attacks[0].dice).toHaveLength(value <= 3 ? 0 : 2)
    expect(f.run([f.attack('T', 'B')]).report.attacks[0].dice).toHaveLength(value <= 3 ? 0 : 2)
  })
})
