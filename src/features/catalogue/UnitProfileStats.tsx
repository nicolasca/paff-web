import type { UnitProfile } from '../../../shared/unitProfile'

export function UnitProfileStats({ profile, compact = false }: { profile: UnitProfile; compact?: boolean }) {
  return <dl className={compact ? 'battle-card__stats' : 'unit-card__stats'} aria-label="Profil de l’unité">
    <Stat label="R" meaning="Points de Régiment" value={profile.regiment} />
    <Stat label="Dés" meaning="Nombre de dés" value={profile.dice} />
    <Stat label={profile.offense.kind === 'ranged' ? 'T' : 'A'} meaning={profile.offense.kind === 'ranged' ? 'Valeur d’attaque au tir' : 'Valeur d’attaque au corps à corps'} value={profile.offense.score ?? '—'} />
    <Stat label="DA" meaning="Défense contre le corps à corps" value={profile.defenseMelee} />
    <Stat label="DT" meaning="Défense contre le tir" value={`${profile.defenseRanged}${profile.defenseRangedFormat === 'threshold' ? '+' : ''}`} />
  </dl>
}

function Stat({ label, meaning, value }: { label: string; meaning: string; value: number | string }) {
  return <div><dt><abbr title={meaning}>{label}</abbr></dt><dd aria-label={`${meaning} : ${value}`}>{value}</dd></div>
}
