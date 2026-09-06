import { describe, expect, it } from 'vitest'
import { getDeckStats, type DeckCard } from './deckStats'

const unit: DeckCard = { stableId: 'archers', name: 'Archers', kind: 'unit', cost: 2, quantity: 3, abilities: [], imagePath: '', faction: { stableId: 'gobelins', name: 'Gobelins', themeKey: 'gobelins' } }

describe('deck statistics', () => {
  it('counts copies and weights costs across factions and card types', () => {
    const stats = getDeckStats([unit, { ...unit, stableId: 'action', kind: 'action', cost: 5, quantity: 2, faction: { stableId: 'orcs', name: 'Orcs', themeKey: 'orcs' } }])
    expect(stats).toMatchObject({ total: 5, unique: 2, units: 3, actions: 2, totalCost: 16, averageCost: 3.2 })
    expect([...stats.costs]).toEqual([[2, 3], [5, 2]])
    expect([...stats.factions]).toEqual([['Gobelins', 3], ['Orcs', 2]])
  })
  it('distinguishes unknown costs from free cards', () => {
    const stats = getDeckStats([{ ...unit, cost: 0 }, { ...unit, stableId: 'unknown', cost: undefined, quantity: 2 }, { ...unit, stableId: 'paid', cost: 4, quantity: 1 }])
    expect(stats).toMatchObject({ total: 6, totalCost: 4, knownCostCount: 4, unknownCostCount: 2, averageCost: 1 })
    expect([...stats.costs]).toEqual([[0, 3], [4, 1]])
  })
  it('supports a deck with no cards', () => {
    expect(getDeckStats([])).toMatchObject({ total: 0, unique: 0, totalCost: 0, averageCost: 0, units: 0, actions: 0 })
  })
  it('counts copies by unit type without including action cards', () => {
    const stats = getDeckStats([unit, { ...unit, stableId: 'cavalry', name: 'Chevaucheurs', unitType: 'C', quantity: 2 }, { ...unit, stableId: 'action', kind: 'action', quantity: 8 }])
    expect([...stats.unitTypes]).toEqual([['ranged', 3], ['cavalry', 2]])
  })
})
