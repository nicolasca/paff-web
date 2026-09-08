import { describe, expect, it } from 'vitest'
import { initialBattle } from './battle'
import { adjacent, hitRule, legalMoves, type BattleUnit } from './battleEngine'
import { meleeProfile } from '../src/test/liveGame'
import { deckRuleIssues, preparationBudgetError } from './armyRules'

const unit = (id: string, cell: number, seat = 0): BattleUnit => ({ id, cell, seat, regiment: 4, cardStableId: 'unit' })
const state = (...units: BattleUnit[]) => ({ ...initialBattle([]).engine!, units })
describe('cell geometry and legal actions', () => {
  it('uses edge adjacency without wrapping rows or allowing diagonals', () => {
    expect(adjacent(8, 9)).toBe(false); expect(adjacent(40, 30)).toBe(false)
    expect(adjacent(40, 31)).toBe(true); expect(adjacent(-1, 0)).toBe(false)
  })
  it('restricts infantry to one free step within its axis, blocks artillery', () => {
    const u = unit('a', 38); const e = state(u, unit('b', 39))
    expect(legalMoves(e, u, meleeProfile).map((m) => m.cell).sort()).toEqual([29, 47])
    expect(legalMoves(e, u, { ...meleeProfile, unitType: 'artillery' })).toEqual([])
  })
  it('charges cavalry an extra movement point to cross axes and never traverses an occupied cell', () => {
    const u = unit('a', 37); const e = state(u)
    const moves = legalMoves(e, u, { ...meleeProfile, unitType: 'cavalry' })
    expect(moves.find((m) => m.cell === 38)?.cost).toBe(2)
    expect(moves.find((m) => m.cell === 39)?.cost).toBe(3)
    expect(moves.some((m) => m.cell === 40)).toBe(false)
    expect(moves.every((m) => !m.path.includes(37))).toBe(true)
    expect(legalMoves(state(u, unit('b', 38)), u, { ...meleeProfile, unitType: 'cavalry' }).some((m) => m.path.includes(38))).toBe(false)
  })
})
describe('hit-table advice and army preparation', () => {
  it('matches all 36 hit-table thresholds and reroll edges', () => {
    const rows = [[4, 3, 2, 2, 2, 2], [5, 4, 3, 2, 2, 2], [6, 5, 4, 3, 2, 2], [6, 6, 5, 4, 3, 2], [6, 6, 6, 5, 4, 3], [6, 6, 6, 6, 5, 4]]
    rows.forEach((row, d) => row.forEach((threshold, a) => expect(hitRule(a + 1, d + 1).threshold).toBe(threshold)))
    expect(hitRule(4, 1).reroll).toBe('fail'); expect(hitRule(1, 5).reroll).toBe('success')
  })
  it('enforces 33 / 21 / 12 budgets and type quotas', () => {
    const cards = [{ kind: 'unit' as const, cost: 2, quantity: 17, selectedQuantity: 11, profile: meleeProfile }]
    expect(deckRuleIssues(cards)).toHaveLength(1)
    expect(preparationBudgetError(cards)).toBe('DEPLOYMENT_BUDGET_EXCEEDED')
    expect(preparationBudgetError([{ ...cards[0], selectedQuantity: 10 }])).toBe('RESERVE_BUDGET_EXCEEDED')
    expect(deckRuleIssues([{ ...cards[0], cost: 1, quantity: 7, profile: { ...meleeProfile, unitType: 'cavalry' } }])[0]).toContain('7 / 6')
  })
})
