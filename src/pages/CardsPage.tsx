import { useQuery } from 'convex/react'
import { useMemo, useState } from 'react'
import { api } from '../../convex/_generated/api'
import { SiteHeader } from '../components/SiteHeader'
import { UnitCard } from '../features/catalogue/UnitCard'
import type { PublicCard, PublicFaction } from '../features/catalogue/types'
import './CardsPage.css'
import { getUnitProfile } from '../../shared/unitProfile'

export function CardsPage() {
  const factions = useQuery(api.catalogue.listFactions) as
    | PublicFaction[]
    | undefined
  const [selectedFactionId, setSelectedFactionId] = useState('')
  const activeFactionId = useMemo(() => {
    if (factions?.some((faction) => faction.stableId === selectedFactionId)) {
      return selectedFactionId
    }

    return factions?.[0]?.stableId ?? ''
  }, [factions, selectedFactionId])
  const cards = useQuery(
    api.catalogue.listCards,
    activeFactionId ? { factionStableId: activeFactionId } : 'skip',
  ) as PublicCard[] | undefined

  return (
    <>
      <SiteHeader />
      <CardsCatalogue
        factions={factions}
        cards={cards}
        selectedFactionId={activeFactionId}
        onSelectFaction={setSelectedFactionId}
      />
    </>
  )
}

export function CardsCatalogue({
  factions,
  cards,
  selectedFactionId,
  onSelectFaction,
}: {
  factions: PublicFaction[] | undefined
  cards: PublicCard[] | undefined
  selectedFactionId: string
  onSelectFaction: (stableId: string) => void
}) {
  const activeFaction = factions?.find(
    (faction) => faction.stableId === selectedFactionId,
  )

  return (
    <main className={`cards-page cards-page--${activeFaction?.themeKey ?? 'neutral'}`}>
      <header className="cards-page__intro">
        <p className="cards-page__eyebrow">Le codex</p>
        <h1>Les cartes de PAFF</h1>
        <p>Unités, actions et capacités. Découvrez les forces de chaque faction.</p>
        {cards?.some((card) => getUnitProfile(card)?.source === 'estimated') && <p className="cards-page__balancing">Profils 2026 : valeurs provisoires, en cours d’équilibrage.</p>}
      </header>

      {factions === undefined ? (
        <CatalogueState>Chargement des factions…</CatalogueState>
      ) : factions.length === 0 ? (
        <CatalogueState>Aucune faction publiée.</CatalogueState>
      ) : (
        <>
          <section className="faction-picker" aria-labelledby="faction-picker-title">
            <div>
              <label id="faction-picker-title" htmlFor="faction-select">
                Faction
              </label>
              <select
                id="faction-select"
                value={selectedFactionId}
                onChange={(event) => onSelectFaction(event.target.value)}
              >
                {factions.map((faction) => (
                  <option key={faction.stableId} value={faction.stableId}>
                    {faction.name}
                  </option>
                ))}
              </select>
            </div>
            {activeFaction ? (
              <p>
                Entité <strong>{activeFaction.entity.name}</strong>
              </p>
            ) : null}
          </section>

          <div className="catalogue-heading">
            <h2>{activeFaction?.name}</h2>
            <span>{cards === undefined ? 'Chargement…' : `${cards.length} cartes disponibles`}</span>
          </div>
          {cards === undefined ? (
            <CatalogueState>Chargement des cartes…</CatalogueState>
          ) : cards.length === 0 ? (
            <CatalogueState>Aucune carte publiée pour cette faction.</CatalogueState>
          ) : (
            <section className="cards-grid" aria-label={`Cartes ${activeFaction?.name ?? ''}`}>
              {cards.map((card) => (
                <UnitCard key={card.stableId} card={card} />
              ))}
            </section>
          )}
        </>
      )}
    </main>
  )
}

function CatalogueState({ children }: { children: string }) {
  return (
    <section className="catalogue-state" aria-live="polite">
      <span aria-hidden="true">✦</span>
      <p>{children}</p>
    </section>
  )
}
