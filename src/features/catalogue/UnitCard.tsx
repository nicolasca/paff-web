import { useState, type ReactNode } from 'react'
import type { PublicCard } from './types'
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

  return (
    <article className={`unit-card unit-card--${card.faction.themeKey}`}>
      <header className="unit-card__header">
        <div>
          <span>{card.kind === 'unit' ? 'Unité' : 'Action'}</span>
          <h2>{card.name}</h2>
        </div>
        <strong aria-label={`Coût ${displayValue(card.cost)}`}>
          <span>Coût</span>
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

      <dl className="unit-card__stats">
        <Stat label="Limite" value={card.deckLimit} />
        <Stat label="Vie" value={card.life} />
        <Stat label="Attaque" value={card.attack} />
        <Stat label="Type" value={card.unitType} />
      </dl>

      <section className="unit-card__abilities" aria-label="Capacités">
        <h3>Capacités</h3>
        {card.abilities.length > 0 ? (
          card.abilities.map((ability) => <p key={ability}>{ability}</p>)
        ) : (
          <p aria-label="Aucune capacité renseignée">—</p>
        )}
      </section>

      {footer ? <footer className="unit-card__footer">{footer}</footer> : null}
    </article>
  )
}

function Stat({ label, value }: { label: string; value?: string | number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{displayValue(value)}</dd>
    </div>
  )
}

function displayValue(value: string | number | undefined) {
  return value === undefined || value === '' ? '—' : value
}
