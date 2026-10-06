import type { UnitProfile, UnitType } from './unitProfile'
import { unitAbilities, type UnitAbility } from './unitAbilities'

export const CATALOGUE_VERSION = '2026-10-02-auto-1'
export const catalogueFactions = { gobelins: 'Gobelins', sephosi: 'Sephosi', gaeli: 'Gaeli' } as const
type Unit = { stableId: string; faction: keyof typeof catalogueFactions; name: string; cost: number; imagePath: string; profile: UnitProfile }

function unit(faction: Unit['faction'], slug: string, name: string, cost: number, type: UnitType, regiment: number, dice: number, kind: UnitProfile['offense']['kind'], score: number | null, dc: number, dt: number, ability?: UnitAbility, art?: string): Unit {
  return { stableId: `${faction}-${slug}`, faction, name, cost, imagePath: art ? `/cards/${faction}/${faction}-${art}.webp` : '/cards/unit-placeholder.svg', profile: {
    unitType: type, regiment, dice, offense: { kind, score }, defenseMelee: dc, defenseRanged: dt,
    ...(ability ? { ability: { ...unitAbilities[ability] } } : {}), source: 'defined',
  } }
}

// PAFF 2026 - Unités AUTO.pdf and Capacités AUTO.pdf, p. 1, received 2026-10-01.
// Nicolas's October 2 rulings are recorded in docs/regles-implementees.md §5.1.
// Keep IDs for renamed/reactivated cards so deck references remain valid.
// Nicolas confirmed on 2026-09-10 that Vallardi's x fields mean no dice or attack.
export const catalogue2026: Unit[] = [
  unit('gobelins', 'troupe-de-gobelins', 'Bande de Gobelins', 1, 'troop', 2, 2, 'melee', 2, 2, 1, undefined, 'troupe-de-gobelins'),
  unit('gobelins', 'archers-gobelins', 'Archers Gobelins', 1, 'ranged', 1, 2, 'ranged', 1, 1, 1, undefined, 'archers-gobelins'),
  unit('gobelins', 'shaman-gobelin', 'Shamans Gobelins', 1, 'ranged', 1, 0, 'none', null, 1, 1, undefined, 'shaman-gobelin'),
  unit('gobelins', 'chevaucheurs-de-skrans-gobelins', 'Chevaucheurs de Skrans Gobelins', 2, 'cavalry', 2, 2, 'melee', 2, 2, 1, undefined, 'chevaucheurs-de-skrans-gobelins'),
  unit('gobelins', 'katapult-a-gobs', 'Katapult à gobs', 2, 'artillery', 1, 2, 'ranged', 3, 1, 1, 'ammunition', 'katapult-a-gobs'),
  unit('gobelins', 'meneurs-de-troll', 'Trolls', 3, 'elite', 2, 2, 'melee', 4, 5, 5, 'trollitude', 'meneurs-de-troll'),
  unit('gobelins', 'bon-gros-tarre-de-gobelin', 'Gros tarrés de gobelins', 1, 'elite', 1, 1, 'melee', 5, 1, 1, undefined, 'bon-gros-tarre-de-gobelin'),
  // Djil is a Troll without Trollitude; artwork supplied by Nicolas on 2026-09-20.
  unit('gobelins', 'djil-meneur-de-trolls', 'Djil, meneur de Trolls', 4, 'unique', 3, 2, 'melee', 4, 5, 5, undefined, 'djil-meneur-de-trolls'),
  unit('gobelins', 'le-danzereu', 'Le Danzereu', 2, 'unique', 1, 2, 'ranged', 3, 1, 1, 'shamanicConcentration', 'le-danzereu'),
  // Nicolas's October 6 correction: Blop is cavalry, retaining his reserve-only ability.
  unit('gobelins', 'blop-le-meuteur', 'Blop, le Meuteur', 2, 'cavalry', 3, 2, 'melee', 3, 2, 1, 'packmaster'),
  unit('sephosi', 'lanciers-sephosiens', 'Lanciers Sephosiens', 3, 'troop', 3, 2, 'melee', 3, 4, 4, undefined, 'lanciers-sephosiens'),
  unit('sephosi', 'epeistes-sephosiens', 'Epéistes Sephosiens', 3, 'troop', 3, 3, 'melee', 4, 3, 3, undefined, 'epeistes'),
  unit('sephosi', 'arbaletriers-avec-pavois', 'Arbalétriers Sephosiens', 2, 'ranged', 2, 2, 'ranged', 3, 1, 2, undefined, 'arbaletriers-avec-pavois'),
  unit('sephosi', 'cavalerie-lourde-sephosienne', 'Cavalerie lourde Sephosienne', 3, 'cavalry', 2, 2, 'melee', 4, 3, 2, undefined, 'cavalerie-lourde-sephosienne'),
  unit('sephosi', 'arbaletriers-montes-sephosiens', 'Arbalétriers Montés', 2, 'cavalry', 1, 1, 'ranged', 3, 1, 1, 'movingShot', 'arbaletriers-montes-sephosiens'),
  unit('sephosi', 'balistes-sephosiennes', 'Balistes Sephosiennes', 2, 'artillery', 1, 1, 'ranged', 6, 1, 1, undefined, 'tirs-de-balistes'),
  unit('sephosi', 'anges-protecteurs-de-la-sephosi', 'Anges Protecteurs de la Sephosi', 4, 'elite', 2, 2, 'melee', 4, 3, 2, 'flight', 'anges-protecteurs-de-la-sephosi'),
  unit('sephosi', 'aides-de-camp-sephosiens', 'Porte-ordres Sephosiens', 2, 'elite', 1, 0, 'none', null, 1, 1, 'strategicSupport', 'aides-de-camp-sephosiens'),
  unit('sephosi', 'marechal-vallardi', 'Maréchal Vallardi', 2, 'unique', 1, 0, 'none', null, 1, 1, 'strategist'),
  unit('sephosi', 'regiment-de-la-salamandre', 'Régiment de la Salamandre', 4, 'unique', 3, 3, 'melee', 4, 4, 4, undefined, 'regiment-de-la-salamandre'),
  // Preserve the four historical Gaeli IDs and the existing illustrations.
  unit('gaeli', 'combattants-des-vlands', 'Combattants des Vlands', 2, 'troop', 2, 2, 'melee', 3, 2, 2, undefined, 'combattants-des-vlands-2026'),
  unit('gaeli', 'longues-lames', 'Longues Lames', 3, 'troop', 3, 4, 'melee', 4, 3, 2, undefined, 'longues-lames'),
  unit('gaeli', 'archers-longs-gaeliens', 'Archers longs Gaeliens', 2, 'ranged', 2, 3, 'ranged', 2, 1, 1, 'longRangeFire', 'archers-longs-gaeliens'),
  unit('gaeli', 'gardiens-des-cen', "Gardiens des Cen'", 1, 'ranged', 1, 0, 'none', null, 1, 1, undefined, 'gardiens-des-cen'),
  unit('gaeli', 'druide', 'Druides', 1, 'ranged', 1, 0, 'none', null, 1, 1, undefined, 'druides-2026'),
  unit('gaeli', 'eclaireurs-des-vlands', 'Eclaireurs des Vlands', 2, 'cavalry', 2, 2, 'melee', 2, 2, 1, undefined, 'eclaireurs-des-vlands'),
  unit('gaeli', 'servlanders', 'Servlanders', 4, 'elite', 3, 3, 'melee', 4, 3, 4, undefined, 'servlanders'),
  unit('gaeli', 'esprits-des-bois', 'Esprits des Bois', 3, 'elite', 3, 3, 'melee', 3, 3, 3, 'ethereal', 'esprits-des-bois-2026'),
  unit('gaeli', 'chefs-de-clan-de-gaeli', 'Chefs de Clan de la Gaeli', 3, 'unique', 2, 2, 'melee', 3, 3, 2, 'forGaeli', 'chefs-de-clan-de-gaeli-2026'),
  unit('gaeli', 'grand-gardien', 'Grand Gardien', 4, 'unique', 2, 2, 'melee', 5, 4, 2, 'guardianCharge', 'grand-gardien'),
]
