export const unitTypeNames = {
  troop: 'Troupe',
  ranged: 'Tir',
  cavalry: 'Cavalerie',
  artillery: 'Artillerie',
  elite: 'Élite',
  unique: 'Unique',
} as const

export type UnitType = keyof typeof unitTypeNames

export type UnitProfile = {
  unitType: UnitType
  regiment: number
  dice: number
  offense: { kind: 'melee' | 'ranged' | 'none'; score: number | null }
  defenseMelee: number
  defenseRanged: number
  defenseRangedFormat?: 'threshold'
  ability?: { id?: string; name: string; description: string }
  source: 'estimated' | 'defined'
}

type ProfileCard = {
  kind: 'unit' | 'action'
  stableId: string
  name: string
  profile?: UnitProfile
  deckLimit?: number
  life?: number
  attack?: number
  unitType?: string
  abilities: string[]
}

const abilityNames: Record<string, string> = {
  'sephosi-lanciers-sephosiens': 'Mur de lances',
  'sephosi-arbaletriers-avec-pavois': 'Pavois protecteur',
  'sephosi-cavalerie-lourde-sephosienne': 'Charge lourde',
  'orcs-orcs-de-sang': 'Assaut soudain',
  'gaeli-druide': 'Protection druidique',
  'gobelins-bon-gros-tarre-de-gobelin': 'Dernier éclat',
}
const uniqueCards = new Set([
  'sephosi-regiment-de-la-salamandre', 'orcs-chef-orc-et-sa-bande',
  'gaeli-chefs-de-clan-de-gaeli', 'gobelins-meneurs-de-troll',
])

/** Published profiles take precedence; legacy cards and frozen games have a fallback. */
export function getUnitProfile(card: ProfileCard): UnitProfile | undefined {
  if (card.kind !== 'unit') return undefined
  return card.profile ?? estimateUnitProfile(card)
}

/** Temporary balancing assumptions, not official card values. See data/catalog/unit-profiles-2026.md. */
export function estimateUnitProfile(card: Omit<ProfileCard, 'profile'>): UnitProfile {
  const name = card.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const regiment = Math.max(1, nonnegativeInteger(card.life, 1))
  const dice = nonnegativeInteger(card.attack, 1)
  const artillery = /baliste|catapulte|canon|artillerie/.test(name)
  const ranged = artillery || card.unitType === 'T' || /archer|arbaletrier/.test(name)
  const cavalry = card.unitType === 'C' || /cavalerie|chevaucheur|monte/.test(name)
  const unitType: UnitType = card.deckLimit === 1 || uniqueCards.has(card.stableId) ? 'unique'
    : artillery ? 'artillery' : cavalry ? 'cavalry' : ranged ? 'ranged'
      : regiment >= 3 && dice >= 2 ? 'elite' : 'troop'
  const description = card.abilities.map((text) => text.trim()).filter(Boolean).join('\n')
  const ability = description ? {
    name: abilityNames[card.stableId] ?? (description.split(/\s+/).length <= 3 ? description.replace(/[.!?]+$/, '') : 'Capacité spéciale'),
    description,
  } : undefined

  return {
    unitType, regiment, dice,
    offense: { kind: ranged ? 'ranged' : 'melee', score: rating(dice + 2) },
    defenseMelee: rating(Math.ceil(regiment / 2) + 1 + (card.unitType === 'D' ? 1 : 0)),
    defenseRanged: rating(Math.ceil(regiment / 2) + 1 + (/pavois/.test(name) ? 1 : 0)),
    ...(ability ? { ability } : {}),
    source: 'estimated',
  }
}

function nonnegativeInteger(value: number | undefined, fallback: number) {
  return value !== undefined && Number.isSafeInteger(value) && value >= 0 ? value : fallback
}
function rating(value: number) { return Math.min(6, Math.max(1, value)) }
