import { describe, expect, it } from 'vitest'
import { initialBattle } from './battle'
import { adjacent, applyDamage, combatGroups, hitRule, inShootingRange, legalMoves, legalRecruitmentCells, legalTargets, outnumberBonus, rollAttack, strategyControl, victory, type BattleUnit, type UnitCard } from './battleEngine'
import { meleeProfile, rangedProfile } from '../src/test/liveGame'
import { deckRuleIssues, preparationBudgetError } from './armyRules'

const unit = (id: string, cell: number, seat = 0): BattleUnit => ({ id, cell, seat, regiment: 4, cardStableId: 'unit' })
const state = (...units: BattleUnit[]) => ({ ...initialBattle(0, [], true).engine!, units })
describe('cell geometry and legal actions', () => {
  it('uses edge adjacency without wrapping rows or allowing diagonals', () => {
    expect(adjacent(8, 9)).toBe(false); expect(adjacent(40, 30)).toBe(false)
    expect(adjacent(40, 31)).toBe(true); expect(adjacent(-1, 0)).toBe(false)
  })
  it('restricts infantry to one free step within its axis, blocks artillery and movement after firing', () => {
    const u = unit('a', 38); const e = state(u, unit('b', 39))
    expect(legalMoves(e, u, meleeProfile, 1).map((m) => m.cell).sort()).toEqual([29, 47])
    expect(legalMoves(e, u, { ...meleeProfile, unitType: 'artillery' }, 1)).toEqual([])
    expect(legalMoves(e, { ...u, shotTurn: 1 }, meleeProfile, 1)).toEqual([])
  })
  it('charges cavalry an extra movement point to cross axes and never traverses an occupied cell', () => {
    const u = unit('a', 37); const e = state(u)
    const moves = legalMoves(e, u, { ...meleeProfile, unitType: 'cavalry' }, 1)
    expect(moves.find((m) => m.cell === 38)?.cost).toBe(2)
    expect(moves.find((m) => m.cell === 39)?.cost).toBe(3)
    expect(moves.some((m) => m.cell === 40)).toBe(false)
    expect(moves.every((m) => !m.path.includes(37))).toBe(true)
    expect(legalMoves(state(u, unit('b', 38)), u, { ...meleeProfile, unitType: 'cavalry' }, 1).some((m) => m.path.includes(38))).toBe(false)
  })
  it.each([[40, 22, false, true], [41, 22, false, true], [42, 22, false, false], [49, 13, true, true], [49, 14, true, false], [40, 22, true, true], [38, 37, true, false]])('range %i → %i, artillery %s = %s', (a, b, artillery, expected) => {
    expect(inShootingRange(a, b, artillery)).toBe(expected)
  })
  it('rejects melee shooters, moving shooters and engaged shooters or targets', () => {
    const u = unit('a', 40); const target = unit('b', 22, 1); const e = state(u, target)
    expect(legalTargets(e, u, rangedProfile, 1)).toEqual([target])
    expect(legalTargets(e, u, meleeProfile, 1)).toEqual([])
    expect(legalTargets(e, { ...u, movedTurn: 1 }, rangedProfile, 1)).toEqual([])
    e.engagements = [{ a: 'a', b: 'b' }]
    expect(legalTargets(e, u, rangedProfile, 1)).toEqual([])
  })
  it('recruits only into free home cells, excluding whole enemy-occupied zones', () => {
    const e = state(unit('enemy', 40, 1))
    const cells = legalRecruitmentCells(e, 0, meleeProfile)
    expect(cells).not.toContain(41); expect(cells).not.toContain(31); expect(cells).toContain(49)
    expect(legalRecruitmentCells(e, 0, { ...meleeProfile, unitType: 'artillery' }).every((cell) => cell >= 45)).toBe(true)
  })
})
describe('hits, simultaneous damage and strategy', () => {
  it('matches all 36 hit-table thresholds and reroll edges', () => {
    const rows = [[4, 3, 2, 2, 2, 2], [5, 4, 3, 2, 2, 2], [6, 5, 4, 3, 2, 2], [6, 6, 5, 4, 3, 2], [6, 6, 6, 5, 4, 3], [6, 6, 6, 6, 5, 4]]
    rows.forEach((row, d) => row.forEach((threshold, a) => expect(hitRule(a + 1, d + 1).threshold).toBe(threshold)))
    expect(hitRule(4, 1).reroll).toBe('fail'); expect(hitRule(1, 5).reroll).toBe('success')
  })
  it('rerolls failures for advantage and confirms successes for disadvantage without stacking outnumber', () => {
    let values = [0, .9]
    let result = rollAttack(unit('a', 1), unit('b', 2), { ...meleeProfile, offense: { kind: 'melee', score: 6 } }, 1, () => values.shift()!, 0, 0, 3)
    expect(result.hits).toBe(1); expect(result.rerolls).toHaveLength(1)
    values = [.9, 0]
    result = rollAttack(unit('a', 1), unit('b', 2), { ...meleeProfile, offense: { kind: 'melee', score: 1 } }, 6, () => values.shift()!, 0, 0, 3)
    expect(result.hits).toBe(0); expect(result.rerolls).toHaveLength(1)
  })
  it('applies simultaneous wounds and prunes engagements after both lethal attacks', () => {
    const a = { ...unit('a', 22), regiment: 1 }; const b = { ...unit('b', 31, 1), regiment: 1 }
    const e = { ...state(a, b), engagements: [{ a: a.id, b: b.id }] }
    expect(applyDamage(e, [rollAttack(a, b, meleeProfile, 3, () => .9), rollAttack(b, a, meleeProfile, 3, () => .9)])).toMatchObject({ units: [], engagements: [] })
  })
  it('detects connected combats and exclusive outnumber without counting unrelated engagements', () => {
    const e = { ...state(unit('a', 22), unit('b', 31, 1), unit('c', 30)), engagements: [{ a: 'a', b: 'b' }, { a: 'c', b: 'b' }] }
    expect(combatGroups(e)).toHaveLength(1); expect(outnumberBonus(e, 'b')).toBe(1)
    e.units.push(unit('d', 21, 1)); e.engagements.push({ a: 'a', b: 'd' })
    expect(outnumberBonus(e, 'b')).toBe(0)
  })
  it('counts uncontested central zones, respects reserves for annihilation and handles final ties', () => {
    const e = state(unit('a', 22), unit('b', 19), unit('c', 34, 1))
    expect(strategyControl(e)).toEqual([2, 1])
    const cards: UnitCard[] = [0, 1].map((seat) => ({ seat, stableId: 'unit', name: 'Unit', cost: 1, profile: meleeProfile, quantity: 4, entered: 1 }))
    expect(victory(state(unit('a', 22)), cards, 1)).toBeUndefined()
    expect(victory(e, cards, 8)).toEqual({ winner: 0, reason: 'strategy' })
    expect(victory(state(unit('a', 40), unit('b', 13, 1)), cards, 8)).toEqual({ winner: null, reason: 'draw' })
  })
  it('enforces 33 / 21 / 12 budgets and type quotas', () => {
    const cards = [{ kind: 'unit' as const, cost: 2, quantity: 17, selectedQuantity: 11, profile: meleeProfile }]
    expect(deckRuleIssues(cards)).toHaveLength(1)
    expect(preparationBudgetError(cards)).toBe('DEPLOYMENT_BUDGET_EXCEEDED')
    expect(preparationBudgetError([{ ...cards[0], selectedQuantity: 10 }])).toBe('RESERVE_BUDGET_EXCEEDED')
    expect(deckRuleIssues([{ ...cards[0], cost: 1, quantity: 7, profile: { ...meleeProfile, unitType: 'cavalry' } }])[0]).toContain('7 / 6')
  })
})
