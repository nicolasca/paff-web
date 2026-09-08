import type { UnitProfile, UnitType } from './unitProfile'

export const CATALOGUE_VERSION = '2026-09-08-wip'
type Unit = { stableId: string; faction: 'gobelins' | 'sephosi'; name: string; cost: number; imagePath: string; profile: UnitProfile }

function unit(faction: Unit['faction'], slug: string, name: string, cost: number, type: UnitType, regiment: number, dice: number, kind: 'melee' | 'ranged', score: number | null, da: number, dt: number, threshold = false, ability?: string, art?: string): Unit {
  return { stableId: `${faction}-${slug}`, faction, name, cost, imagePath: art ? `/cards/${faction}/${faction}-${art}.webp` : '/cards/unit-placeholder.svg', profile: {
    unitType: type, regiment, dice, offense: { kind, score }, defenseMelee: da, defenseRanged: dt,
    ...(threshold ? { defenseRangedFormat: 'threshold' as const } : {}),
    ...(ability ? { ability: { name: ability, description: 'Capacité en cours de définition avec le créateur. Son effet n’est pas encore appliqué en jeu.' } } : {}),
    source: 'defined',
  } }
}

// Keep stable IDs for renamed cards so existing deck references remain valid.
// WIP interpretations are recorded in docs/regles-implementees.md.
// Only rows marked OK in the 2026-09-08 roster are updated; existing WIP profiles remain unchanged.
export const catalogue2026: Unit[] = [
  unit('gobelins', 'troupe-de-gobelins', 'Bande de Gobelins', 1, 'troop', 3, 3, 'melee', 2, 2, 1, false, undefined, 'troupe-de-gobelins'),
  unit('gobelins', 'archers-gobelins', 'Archers Gobelins', 1, 'ranged', 2, 3, 'ranged', 1, 1, 1, false, 'Tir en mêlée', 'archers-gobelins'),
  unit('gobelins', 'shaman-gobelin', 'Shamans Gobelins', 1, 'ranged', 1, 1, 'ranged', 3, 1, 1, false, 'Tir magique', 'shaman-gobelin'),
  unit('gobelins', 'chevaucheurs-de-skrans-gobelins', 'Chevaucheurs de Skrans Gobelins', 1, 'cavalry', 2, 2, 'melee', 2, 2, 1),
  unit('gobelins', 'katapult-a-gobs', 'Katapult à gobs', 2, 'artillery', 1, 1, 'ranged', 5, 1, 1, false, 'Pluie de gobs'),
  unit('gobelins', 'meneurs-de-troll', 'Trolls', 4, 'elite', 3, 2, 'melee', 6, 3, 2, true, 'Trollitude', 'meneurs-de-troll'),
  unit('gobelins', 'bande-du-chef', 'Bande du chef', 3, 'elite', 2, 3, 'melee', 3, 3, 5, true, undefined, 'bande-du-chef'),
  unit('sephosi', 'lanciers-sephosiens', 'Lanciers Sephosiens', 3, 'troop', 3, 2, 'melee', 3, 4, 3, false, 'Mur de lance', 'lanciers-sephosiens'),
  unit('sephosi', 'epeistes-sephosiens', 'Epéistes Sephosiens', 3, 'troop', 3, 3, 'melee', 4, 3, 2, false, undefined, 'epeistes'),
  unit('sephosi', 'arbaletriers-avec-pavois', 'Arbalétriers Sephosiens', 2, 'ranged', 2, 2, 'ranged', 3, 1, 2, false, undefined, 'arbaletriers-avec-pavois'),
  unit('sephosi', 'cavalerie-lourde-sephosienne', 'Cavalerie lourde Sephosienne', 3, 'cavalry', 2, 1, 'melee', 4, 3, 2, false, 'Charge puissante', 'cavalerie-lourde-sephosienne'),
  unit('sephosi', 'arbaletriers-montes-sephosiens', 'Arbalétriers Montés', 2, 'cavalry', 1, 1, 'ranged', 3, 1, 1, false, 'Tir en mouvement', 'arbaletriers-montes-sephosiens'),
  unit('sephosi', 'balistes-sephosiennes', 'Balistes Sephosiennes', 2, 'artillery', 1, 1, 'ranged', 6, 1, 1, false, undefined, 'tirs-de-balistes'),
  unit('sephosi', 'anges-protecteurs-de-la-sephosi', 'Anges Protecteurs de la Sephosi', 4, 'elite', 1, 3, 'melee', 4, 5, 3, true, 'Vol', 'anges-protecteurs-de-la-sephosi'),
  unit('sephosi', 'aides-de-camp-sephosiens', 'Aides de camp Sephosiens', 2, 'elite', 1, 0, 'melee', null, 1, 6, true, 'Appui stratégique', 'aides-de-camp-sephosiens'),
]
