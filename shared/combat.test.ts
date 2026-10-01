import { describe, expect, it } from 'vitest'
import { resolveCombat, type AttackArrow, type AttackKind, type RainEffect } from './combat'
import type { BattleUnit, EngineState, UnitCard } from './battleEngine'
import { unitAbilities, type UnitAbility } from './unitAbilities'
import type { UnitProfile } from './unitProfile'
import type { InvocationEffect } from './greatInvocation'

function fixture() {
  const cards: UnitCard[] = []
  const engine: EngineState = { units: [], engagements: [], log: [] }
  const add = (id: string, seat: number, cell: number, dice = 2, kind: AttackKind | 'none' = 'melee', ability?: UnitAbility, regiment = 3) => {
    const profile: UnitProfile = { unitType: 'troop', regiment, dice, offense: { kind, score: kind === 'none' ? null : 3 }, defenseMelee: 3, defenseRanged: 3, source: 'defined', ...(ability ? { ability: unitAbilities[ability] } : {}) }
    cards.push({ stableId: id, seat, name: id, cost: 1, profile, quantity: 1, entered: 1 })
    const unit: BattleUnit = { id, seat, cell, cardStableId: id, regiment }
    engine.units.push(unit)
    return unit
  }
  const attack = (attackerId: string, targetId: string, kind: AttackKind = 'melee', allyId?: string): AttackArrow => ({ attackerId, targetId, kind, ...(allyId ? { allyId } : {}) })
  const run = (arrows: AttackArrow[], values: number[] = [], rain: RainEffect[] = [], invocations: InvocationEffect[] = []) => resolveCombat(engine, cards, arrows, rain, 1, arrows[0].kind, 0, 1, () => values.shift() ?? 6, invocations)
  return { cards, engine, add, attack, run }
}

describe('simultaneous attack resolution', () => {
  it('doubles only invocation profile dice before auras, Ethérés and rain, once and only for this turn', () => {
    const f = fixture()
    f.add('A', 0, 20, 3); f.add('chief', 0, 22, 2, 'melee', 'forGaeli'); f.add('B', 1, 21, 2, 'melee', 'ethereal')
    const invocation: InvocationEffect = { seat: 0, turn: 1, scope: 1, unitIds: ['A'] }
    const r = f.run([f.attack('A', 'B'), f.attack('B', 'A')], [], [{ unitId: 'A', turn: 1, penalty: 2 }], [invocation, invocation])
    // 3×2 + 1 chief −1 Ethérés −2 rain = 4, never (3+1)×2.
    expect(r.report.attacks.map((attack) => attack.dice.length)).toEqual([4, 2])
    expect(f.run([f.attack('A', 'B')], [], [], [{ ...invocation, turn: 2 }]).report.attacks[0].dice).toHaveLength(3)
  })
  it('keeps every planned attack when both attackers die and accumulates focused attacks', () => {
    const f = fixture()
    f.add('A', 0, 20, 3); f.add('B', 1, 21, 3); f.add('C', 0, 22, 2)
    const result = f.run([f.attack('A', 'B'), f.attack('B', 'A'), f.attack('C', 'B')])
    expect(result.report.attacks.map((a) => a.hits)).toEqual([3, 3, 2])
    expect(result.report.losses).toEqual(expect.arrayContaining([expect.objectContaining({ unit: expect.objectContaining({ id: 'B' }), before: 3, after: 0, damage: 5 })]))
    expect(result.engine.units.map((u) => u.id)).toEqual(['C'])
    expect(f.engine.units).toHaveLength(3)
  })
  it('applies Ethérés, then rain down to zero, and never grants a bonus for a charge', () => {
    const f = fixture()
    f.add('A', 0, 20, 3, 'melee', 'powerfulCharge'); f.add('B', 1, 21, 3, 'melee', 'ethereal')
    expect(f.run([f.attack('A', 'B')]).report.attacks[0].dice).toHaveLength(2)
    expect(f.run([f.attack('A', 'B')], [], [{ unitId: 'A', turn: 1, penalty: 2 }]).report.attacks[0].dice).toHaveLength(0)
    f.cards[0].profile.dice = 1
    expect(f.run([f.attack('A', 'B')]).report.attacks[0].dice).toHaveLength(1)
  })
  it('ignores Ethérés for magical shooting but does not add damage', () => {
    const f = fixture()
    f.add('A', 0, 20, 2, 'ranged', 'magicalShot'); f.add('B', 1, 21, 3, 'melee', 'ethereal')
    const attack = f.run([f.attack('A', 'B', 'ranged')]).report.attacks[0]
    expect(attack.dice).toHaveLength(2); expect(attack.damage).toBe(2)
  })
  it('redirects first, rolls against the actual defense, and reduces only the ethereal pool', () => {
    const f = fixture()
    f.add('archer', 0, 20, 4, 'ranged', 'meleeShooting'); f.add('ally', 0, 22); f.add('enemy', 1, 21, 3, 'melee', 'ethereal')
    f.cards[1].profile.defenseRanged = 5
    f.engine.engagements = [{ a: 'ally', b: 'enemy' }]
    const result = f.run([f.attack('archer', 'enemy', 'ranged')], [1, 3, 4, 6, 5, 6, 4])
    expect(result.report.diversions[0].values).toEqual([1, 3, 4, 6])
    expect(result.report.attacks.map((a) => [a.target.id, a.dice.length, a.threshold, a.hits])).toEqual([['ally', 2, 6, 1], ['enemy', 1, 4, 1]])
    const allFriendly = f.run([f.attack('archer', 'enemy', 'ranged')], [1, 1, 1, 1])
    expect(allFriendly.report.attacks[1].dice).toHaveLength(0)
  })
  it('requires choosing the exposed ally when several are engaged', () => {
    const f = fixture()
    f.add('archer', 0, 20, 1, 'ranged', 'meleeShooting'); f.add('ally', 0, 22); f.add('other', 0, 23); f.add('enemy', 1, 21)
    f.engine.engagements = [{ a: 'ally', b: 'enemy' }, { a: 'other', b: 'enemy' }]
    expect(() => f.run([f.attack('archer', 'enemy', 'ranged')])).toThrow('MISSING_EXPOSED_ALLY')
    expect(f.run([f.attack('archer', 'enemy', 'ranged', 'other')], [1, 6]).report.attacks[0].target.id).toBe('other')
  })
  it('stacks rain once per successful attack, without wounds or same-batch interference', () => {
    const f = fixture()
    f.add('cat1', 0, 20, 3, 'ranged', 'goblinRain'); f.add('cat2', 0, 22, 2, 'ranged', 'goblinRain'); f.add('enemy', 1, 21, 5, 'ranged')
    const r = f.run([f.attack('cat1', 'enemy', 'ranged'), f.attack('cat2', 'enemy', 'ranged'), f.attack('enemy', 'cat1', 'ranged')])
    expect(r.report.attacks.map((a) => [a.damage, a.rain, a.dice.length])).toEqual([[0, 2, 3], [0, 2, 2], [5, 0, 5]])
    expect(r.rain).toEqual([{ unitId: 'enemy', turn: 1, penalty: 4 }])
    expect(r.engine.units.find((u) => u.id === 'enemy')?.regiment).toBe(3)
    expect(f.run([f.attack('cat1', 'enemy', 'ranged')], [1, 1, 1]).rain).toEqual([])
  })
  it('freezes Gaeli auras, adds dice only in melee and rerolls different failed dice once', () => {
    const f = fixture()
    f.add('A', 0, 20, 2); f.add('chief', 0, 21, 2, 'melee', 'forGaeli', 1)
    f.add('g1', 0, 22, 0, 'none', 'ancestralSong'); f.add('g2', 0, 23, 0, 'none', 'ancestralSong')
    f.add('B', 1, 29, 1)
    // B kills the chief first in the list; A still benefits from the snapshot.
    const r = f.run([f.attack('B', 'chief'), f.attack('A', 'B')], [6, 1, 2, 6, 1, 6])
    expect(r.report.attacks[1].dice).toEqual([{ value: 1, rerolled: 1 }, { value: 2, rerolled: 6 }, { value: 6 }])
    expect(r.report.attacks[1].hits).toBe(2)
    f.cards[0].profile.offense.kind = 'ranged'
    expect(f.run([f.attack('A', 'B', 'ranged')], [1, 1]).report.attacks[0].dice).toEqual([{ value: 1 }, { value: 1 }])
  })
  it('ignores engaged or out-of-zone guardians and does not trigger Trollitude', () => {
    const f = fixture()
    f.add('A', 0, 20, 2, 'melee', 'trollitude'); f.add('g1', 0, 22, 0, 'none', 'ancestralSong'); f.add('g2', 0, 40, 0, 'none', 'ancestralSong'); f.add('B', 1, 21)
    f.engine.engagements = [{ a: 'g1', b: 'B' }]
    const r = f.run([f.attack('A', 'B')], [1, 2])
    expect(r.report.attacks[0].dice).toEqual([{ value: 1 }, { value: 2 }])
  })
})
