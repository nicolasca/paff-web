import type { UnitProfile } from '../../../shared/unitProfile'

export function UnitProfileStats({ profile, compact = false }: { profile: UnitProfile; compact?: boolean }) {
  const unarmed = profile.offense.kind === 'none'
  const mode = profile.offense.kind === 'ranged' ? 'T' : 'C'
  const meaning = unarmed ? 'Aucune attaque' : mode === 'T' ? 'Tir' : 'Corps à corps'
  return <dl className={compact ? 'battle-card__stats' : 'unit-card__stats'} aria-label="Profil de l’unité">
    <Stat label="R" meaning="Points de Régiment" value={profile.regiment} />
    <Stat label="Dés" meaning="Nombre de dés" value={unarmed ? '—' : profile.dice} />
    <div className="unit-stat--offense">
      <dt><abbr title={meaning}>Attaque</abbr></dt>
      <dd aria-label={unarmed ? meaning : `${mode === 'T' ? 'Valeur d’attaque au tir' : 'Valeur d’attaque au corps à corps'} : ${profile.offense.score ?? '—'}`}>
        {profile.offense.score ?? '—'}{!unarmed && <span className="unit-stat__mode" aria-label={meaning} title={meaning}>{mode}</span>}
      </dd>
    </div>
    <Stat label="DC" meaning="Défense contre le corps à corps" value={profile.defenseMelee} />
    <Stat label="DT" meaning="Défense contre le tir" value={`${profile.defenseRanged}${profile.defenseRangedFormat === 'threshold' ? '+' : ''}`} />
  </dl>
}

function Stat({ label, meaning, value }: { label: string; meaning: string; value: number | string }) {
  return <div><dt><abbr title={meaning}>{label}</abbr></dt><dd aria-label={`${meaning} : ${value}`}>{value}</dd></div>
}
