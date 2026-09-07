import { getUnitProfile, type UnitType } from '../../../shared/unitProfile'
import type { PublicCard } from './types'

const typeOrder: Record<UnitType, number> = { troop: 0, ranged: 1, cavalry: 2, artillery: 3, elite: 4, unique: 5 }

export function sortCards<T extends PublicCard>(cards: readonly T[]): T[] {
  const rank = (card: PublicCard) => {
    const profile = getUnitProfile(card)
    return profile ? typeOrder[profile.unitType] : 6
  }
  return [...cards].sort((left, right) => rank(left) - rank(right) || left.name.localeCompare(right.name, 'fr'))
}
