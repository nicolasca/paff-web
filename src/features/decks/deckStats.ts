import type { PublicCard } from '../catalogue/types'
import type { Id } from '../../../convex/_generated/dataModel'
import { getUnitProfile, type UnitType } from '../../../shared/unitProfile'

export type DeckCard = PublicCard & { quantity: number; available?: boolean }
export type Deck = {
  id: Id<'decks'>
  name: string
  faction: { stableId: string; name: string } | null
  cards: DeckCard[]
  updatedAt: number
}

export function getDeckStats(cards: DeckCard[]) {
  const stats = {
    total: 0, unique: cards.length, units: 0, actions: 0, totalCost: 0,
    knownCostCount: 0, unknownCostCount: 0, averageCost: 0,
    costs: new Map<number, number>(), factions: new Map<string, number>(),
    unitTypes: new Map<UnitType, number>(),
  }
  for (const card of cards) {
    stats.total += card.quantity
    stats[card.kind === 'unit' ? 'units' : 'actions'] += card.quantity
    const profile = getUnitProfile(card)
    if (profile) stats.unitTypes.set(profile.unitType, (stats.unitTypes.get(profile.unitType) ?? 0) + card.quantity)
    stats.factions.set(card.faction.name, (stats.factions.get(card.faction.name) ?? 0) + card.quantity)
    if (card.cost === undefined) {
      stats.unknownCostCount += card.quantity
    } else {
      stats.totalCost += card.cost * card.quantity
      stats.knownCostCount += card.quantity
      stats.costs.set(card.cost, (stats.costs.get(card.cost) ?? 0) + card.quantity)
    }
  }
  stats.averageCost = stats.knownCostCount ? stats.totalCost / stats.knownCostCount : 0
  return stats
}

export const formatNumber = (value: number) => value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
