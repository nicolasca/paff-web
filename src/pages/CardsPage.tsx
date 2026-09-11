import { useQuery } from 'convex/react'
import { useMemo, useState } from 'react'
import { api } from '../../convex/_generated/api'
import { SiteHeader } from '../components/SiteHeader'
import { FactionBanner } from '../features/catalogue/FactionBanner'
import { UnitCard } from '../features/catalogue/UnitCard'
import type { PublicCard, PublicFaction } from '../features/catalogue/types'
import './CardsPage.css'
import { getUnitProfile } from '../../shared/unitProfile'
import { sortCards } from '../features/catalogue/sortCards'
import { CatalogueViewPicker, OrderCatalogue, type CatalogueView } from '../features/catalogue/OrderCatalogue'
import { ordersForFaction } from '../../shared/orders'

export function CardsPage() {
  const factions = useQuery(api.catalogue.listFactions) as
    | PublicFaction[]
    | undefined
  const [selectedFactionId, setSelectedFactionId] = useState('')
  const activeFactionId = useMemo(() => {
    if (factions?.some((faction) => faction.stableId === selectedFactionId)) {
      return selectedFactionId
    }

    return (factions?.find((faction) => faction.themeKey === 'sephosi') ?? factions?.[0])?.stableId ?? ''
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
  const [view, setView] = useState<CatalogueView>('units')
  const activeFaction = factions?.find(
    (faction) => faction.stableId === selectedFactionId,
  )

  return (
    <main className="cards-page" data-faction={activeFaction?.themeKey ?? 'neutral'}>
      <FactionBanner faction={activeFaction}>
        {factions && factions.length > 0 && <label className="faction-picker" htmlFor="faction-select">
          Faction
          <select id="faction-select" value={selectedFactionId} onChange={(event) => onSelectFaction(event.target.value)}>
            {factions.map((faction) => <option key={faction.stableId} value={faction.stableId}>{faction.name}</option>)}
          </select>
        </label>}
      </FactionBanner>
      <div className="cards-page__collection">
      {factions === undefined ? (
        <CatalogueState>Chargement des factions…</CatalogueState>
      ) : factions.length === 0 ? (
        <CatalogueState>Aucune faction publiée.</CatalogueState>
      ) : (
        <>
          <CatalogueViewPicker value={view} onChange={setView} unitCount={cards?.length} orderCount={activeFaction ? ordersForFaction(activeFaction.stableId).length : 0} />
          {view === 'orders' && activeFaction ? <>
            <div className="catalogue-heading"><h2>Les ordres</h2><span>{ordersForFaction(activeFaction.stableId).length} ordres disponibles</span></div>
            <OrderCatalogue faction={activeFaction} />
          </> : <>
          <div className="catalogue-heading">
            <h2>{cards?.some((card) => card.kind === 'action') ? 'Les cartes' : 'Les unités'}</h2>
            <span>{cards === undefined ? 'Chargement…' : `${cards.length} cartes disponibles`}</span>
          </div>
          {cards?.some((card) => getUnitProfile(card)?.source === 'estimated') && <p className="cards-page__balancing">Profils provisoires, en cours d’équilibrage.</p>}

          {cards === undefined ? (
            <CatalogueState>Chargement des cartes…</CatalogueState>
          ) : cards.length === 0 ? (
            <CatalogueState>Aucune carte publiée pour cette faction.</CatalogueState>
          ) : (
            <section className="cards-grid" aria-label={`Cartes ${activeFaction?.name ?? ''}`}>
              {sortCards(cards).map((card) => (
                <UnitCard key={card.stableId} card={card} />
              ))}
            </section>
          )}
          </>}
        </>
      )}
      {activeFaction && <footer className="catalogue-footer"><span>{activeFaction.entity.name}</span><span>PAFF · Collection 2026</span></footer>}
      </div>
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
