import { useState, type ReactNode } from 'react'
import type { PublicCard } from './types'
import { getUnitProfile, unitTypeNames, type UnitType } from '../../../shared/unitProfile'
import { SpecialAbility } from './SpecialAbility'
import { UnitProfileStats } from './UnitProfileStats'
import './UnitCard.css'

const typeLetters: Record<UnitType, string> = { troop: 'B', ranged: 'T', cavalry: 'C', artillery: 'A', elite: 'E', unique: 'U' }

export function UnitCard({
  card,
  footer,
  costPlacement = 'art',
  interactiveAbilities = true,
}: {
  card: PublicCard
  footer?: ReactNode
  costPlacement?: 'art' | 'footer' | 'hidden'
  interactiveAbilities?: boolean
}) {
  const [failedImagePath, setFailedImagePath] = useState<string | null>(null)
  const imageAvailable = failedImagePath !== card.imagePath
  const profile = getUnitProfile(card)

  return (
    <article className={`unit-card unit-card--${card.faction.themeKey}`} data-faction={card.faction.themeKey}>
      <div className="unit-card__art">
        {imageAvailable ? (
          <img
            src={card.imagePath}
            alt={`Illustration de ${card.name}`}
            loading="lazy"
            onError={() => setFailedImagePath(card.imagePath)}
          />
        ) : (
          <div className="unit-card__missing" role="img" aria-label="Illustration absente">
            <span aria-hidden="true">✦</span>
            Illustration absente
          </div>
        )}
        {costPlacement === 'art' && <strong className="unit-card__cost" aria-label={`${profile ? 'Coût de recrutement' : 'Coût'} ${displayValue(card.cost)}`} title={profile ? 'Coût de recrutement' : 'Coût'}>{displayValue(card.cost)}</strong>}
      </div>

      <div className="unit-card__body">
      <header className="unit-card__header">
        <h2>{card.name}</h2>
        {profile ? <abbr className="unit-card__type" title={unitTypeNames[profile.unitType]} aria-label={unitTypeNames[profile.unitType]}>{typeLetters[profile.unitType]}</abbr> : <span className="unit-card__type unit-card__type--action">Action</span>}
      </header>
      {profile && <UnitProfileStats profile={profile} />}

      <section className="unit-card__abilities" aria-label="Capacités">
        {profile ? profile.ability ? interactiveAbilities ? <SpecialAbility ability={profile.ability} /> : <p>{profile.ability.name}</p> : <p className="unit-card__no-ability" aria-label="Aucune capacité">—</p> : card.abilities.length > 0 ? (
          card.abilities.map((ability) => <p key={ability}>{ability}</p>)
        ) : (
          <p aria-label="Aucune capacité renseignée">—</p>
        )}
      </section>
      </div>
      {costPlacement === 'footer' && <div className="unit-card__recruitment" aria-label={`${profile ? 'Coût de recrutement' : 'Coût'} ${displayValue(card.cost)}`}><span>{profile ? 'Recrutement' : 'Coût'}</span><strong>{displayValue(card.cost)} pts</strong></div>}
      {footer ? <footer className="unit-card__footer">{footer}</footer> : null}
    </article>
  )
}

function displayValue(value: string | number | undefined) {
  return value === undefined || value === '' ? '—' : value
}
