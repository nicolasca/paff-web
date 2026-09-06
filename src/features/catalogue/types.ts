import type { UnitProfile } from '../../../shared/unitProfile'

export type PublicFaction = {
  stableId: string
  slug: string
  name: string
  themeKey: string
  entity: {
    stableId: string
    slug: string
    name: string
  }
}

export type PublicCard = {
  stableId: string
  name: string
  kind: 'unit' | 'action'
  cost?: number
  deckLimit?: number
  life?: number
  attack?: number
  unitType?: string
  abilities: string[]
  profile?: UnitProfile
  imagePath: string
  faction: {
    stableId: string
    name: string
    themeKey: string
  }
}
