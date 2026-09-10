import type { UnitProfile, UnitType } from './unitProfile'
import { unitAbilities, type UnitAbility } from './unitAbilities'

export const CATALOGUE_VERSION = '2026-09-10'
type Unit = { stableId: string; faction: 'gobelins' | 'sephosi'; name: string; cost: number; imagePath: string; profile: UnitProfile }

function unit(faction: Unit['faction'], slug: string, name: string, cost: number, type: UnitType, regiment: number, dice: number, kind: UnitProfile['offense']['kind'], score: number | null, dc: number, dt: number, ability?: UnitAbility, art?: string): Unit {
  return { stableId: `${faction}-${slug}`, faction, name, cost, imagePath: art ? `/cards/${faction}/${faction}-${art}.webp` : '/cards/unit-placeholder.svg', profile: {
    unitType: type, regiment, dice, offense: { kind, score }, defenseMelee: dc, defenseRanged: dt,
    ...(ability ? { ability: { ...unitAbilities[ability] } } : {}), source: 'defined',
  } }
}

// PAFF 2026.pdf received 2026-09-10, p. 8 (profiles) and p. 10 (abilities).
// Keep IDs for renamed/reactivated cards so deck references remain valid.
// Nicolas confirmed on 2026-09-10 that Vallardi's x fields mean no dice or attack.
export const catalogue2026: Unit[] = [
  unit('gobelins', 'troupe-de-gobelins', 'Bande de Gobelins', 1, 'troop', 2, 3, 'melee', 2, 2, 1, undefined, 'troupe-de-gobelins'),
  unit('gobelins', 'archers-gobelins', 'Archers Gobelins', 1, 'ranged', 2, 3, 'ranged', 1, 1, 1, 'meleeShooting', 'archers-gobelins'),
  unit('gobelins', 'shaman-gobelin', 'Shamans Gobelins', 1, 'ranged', 1, 1, 'ranged', 3, 1, 1, 'magicalShot', 'shaman-gobelin'),
  unit('gobelins', 'chevaucheurs-de-skrans-gobelins', 'Chevaucheurs de Skrans Gobelins', 1, 'cavalry', 2, 2, 'melee', 2, 2, 1, undefined, 'chevaucheurs-de-skrans-gobelins'),
  unit('gobelins', 'katapult-a-gobs', 'Katapult à gobs', 2, 'artillery', 1, 1, 'ranged', 5, 1, 1, 'goblinRain', 'katapult-a-gobs'),
  unit('gobelins', 'meneurs-de-troll', 'Trolls', 3, 'elite', 2, 2, 'melee', 4, 5, 5, 'trollitude', 'meneurs-de-troll'),
  unit('gobelins', 'bon-gros-tarre-de-gobelin', 'Gros tarrés de gobelins', 2, 'elite', 1, 1, 'melee', 5, 1, 1, undefined, 'bon-gros-tarre-de-gobelin'),
  unit('gobelins', 'bande-du-chef', 'Bande du chef', 3, 'elite', 5, 4, 'melee', 3, 3, 2, undefined, 'bande-du-chef'),
  unit('gobelins', 'le-danzereu', 'Le Danzereu', 2, 'unique', 1, 2, 'ranged', 3, 1, 1, 'greenLine', 'le-danzereu'),
  unit('gobelins', 'blop-le-meuteur', 'Blop, le Meuteur', 2, 'unique', 3, 2, 'melee', 3, 2, 1, 'packmaster'),
  unit('sephosi', 'lanciers-sephosiens', 'Lanciers Sephosiens', 3, 'troop', 3, 2, 'melee', 3, 4, 3, 'spearWall', 'lanciers-sephosiens'),
  unit('sephosi', 'epeistes-sephosiens', 'Epéistes Sephosiens', 3, 'troop', 3, 3, 'melee', 4, 3, 2, undefined, 'epeistes'),
  unit('sephosi', 'arbaletriers-avec-pavois', 'Arbalétriers Sephosiens', 2, 'ranged', 2, 2, 'ranged', 3, 1, 2, undefined, 'arbaletriers-avec-pavois'),
  unit('sephosi', 'cavalerie-lourde-sephosienne', 'Cavalerie lourde Sephosienne', 3, 'cavalry', 2, 1, 'melee', 4, 3, 2, 'powerfulCharge', 'cavalerie-lourde-sephosienne'),
  unit('sephosi', 'arbaletriers-montes-sephosiens', 'Arbalétriers Montés', 2, 'cavalry', 1, 1, 'ranged', 3, 1, 1, 'movingShot', 'arbaletriers-montes-sephosiens'),
  unit('sephosi', 'balistes-sephosiennes', 'Balistes Sephosiennes', 2, 'artillery', 1, 1, 'ranged', 6, 1, 1, undefined, 'tirs-de-balistes'),
  unit('sephosi', 'anges-protecteurs-de-la-sephosi', 'Anges Protecteurs de la Sephosi', 4, 'elite', 2, 2, 'melee', 4, 3, 2, 'flight', 'anges-protecteurs-de-la-sephosi'),
  unit('sephosi', 'aides-de-camp-sephosiens', 'Porte-ordres Sephosiens', 2, 'elite', 1, 0, 'none', null, 1, 1, 'strategicSupport', 'aides-de-camp-sephosiens'),
  unit('sephosi', 'marechal-vallardi', 'Maréchal Vallardi', 2, 'unique', 1, 0, 'none', null, 1, 1, 'strategist'),
  unit('sephosi', 'regiment-de-la-salamandre', 'Régiment de la Salamandre', 4, 'unique', 3, 3, 'melee', 4, 4, 4, undefined, 'regiment-de-la-salamandre'),
]
