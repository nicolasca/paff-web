import { useState, type ReactNode } from 'react'
import type { PublicCard } from './types'
import { getUnitProfile, unitTypeNames } from '../../../shared/unitProfile'
import { SpecialAbility } from './SpecialAbility'
import { UnitProfileStats } from './UnitProfileStats'
import './UnitCard.css'

export function UnitCard({
  card,
  footer,
}: {
  card: PublicCard
  footer?: ReactNode
}) {
  const [failedImagePath, setFailedImagePath] = useState<string | null>(null)
  const imageAvailable = failedImagePath !== card.imagePath
  const profile = getUnitProfile(card)

  return (
    <article className={`unit-card unit-card--${card.faction.themeKey}`}>
      <header className="unit-card__header">
        <div>
          <span>{profile ? unitTypeNames[profile.unitType] : 'Action'}</span>
          <h2>{card.name}</h2>
        </div>
        <strong aria-label={`${profile ? 'Coût de recrutement' : 'Coût'} ${displayValue(card.cost)}`}>
          <span>{profile ? 'Recrut.' : 'Coût'}</span>
          {displayValue(card.cost)}
        </strong>
      </header>

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
        <span className="unit-card__faction">{card.faction.name}</span>
      </div>

      {profile && <UnitProfileStats profile={profile} />}

      <section className="unit-card__abilities" aria-label="Capacités">
        <h3>{profile ? 'Capacité spéciale' : 'Effet'}</h3>
        {profile ? profile.ability ? <SpecialAbility ability={profile.ability} /> : <p className="unit-card__no-ability">Aucune capacité</p> : card.abilities.length > 0 ? (
          card.abilities.map((ability) => <p key={ability}>{ability}</p>)
        ) : (
          <p aria-label="Aucune capacité renseignée">—</p>
        )}
      </section>

      {footer ? <footer className="unit-card__footer">{footer}</footer> : null}
    </article>
  )
}

function displayValue(value: string | number | undefined) {
  return value === undefined || value === '' ? '—' : value
}
