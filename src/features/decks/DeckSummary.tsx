import { formatNumber, getDeckStats, type Deck } from './deckStats'

export function DeckSummary({ deck, onRemoveCard, busyCards = new Set() }: {
  deck: Deck
  onRemoveCard?: (stableId: string) => void
  busyCards?: Set<string>
}) {
  const stats = getDeckStats(deck.cards)
  const costs = [...stats.costs.entries()].sort(([a], [b]) => a - b)
  const max = Math.max(1, ...stats.costs.values())

  return (
    <aside className="deck-summary" aria-label="Récapitulatif du deck">
      <header className="deck-summary__title">
        <span className="eyebrow">Votre composition</span>
        <h2>{deck.name}</h2>
      </header>
      <dl className="deck-summary__stats">
        <div><dt>Cartes</dt><dd>{formatNumber(stats.total)}</dd></div>
        <div><dt>Différentes</dt><dd>{formatNumber(stats.unique)}</dd></div>
        <div><dt>Coût total</dt><dd>{formatNumber(stats.totalCost)}{stats.unknownCostCount > 0 ? ' + ?' : ''}</dd></div>
        <div><dt>Coût moyen</dt><dd>{stats.knownCostCount ? formatNumber(stats.averageCost) : '—'}</dd></div>
      </dl>
      <div className="deck-summary__types">
        <span><i className="unit-dot" />{formatNumber(stats.units)} unités</span>
        <span><i className="action-dot" />{formatNumber(stats.actions)} actions</span>
      </div>
      {stats.unknownCostCount > 0 && <p className="deck-summary__note">{stats.unknownCostCount} carte(s) sans coût renseigné, exclues du coût moyen.</p>}
      {costs.length > 0 && (
        <section className="cost-curve" aria-label="Répartition par coût">
          <h3>Courbe de coût</h3>
          <div className="cost-curve__bars">
            {costs.map(([cost, count]) => (
              <div key={cost} aria-label={`Coût ${cost} : ${count} carte(s)`}>
                <span>{formatNumber(count)}</span>
                <i style={{ height: `${Math.max(4, count / max * 56)}px` }} />
                <strong>{cost}</strong>
              </div>
            ))}
          </div>
        </section>
      )}
      {stats.factions.size > 0 && (
        <div className="deck-summary__factions">
          {[...stats.factions].map(([name, count]) => <span key={name}>{name}<b>{formatNumber(count)}</b></span>)}
        </div>
      )}
      <section className="deck-composition" aria-label="Cartes du deck">
        <h3>Dans le deck <span>{stats.unique}</span></h3>
        {deck.cards.length === 0 ? (
          <p className="deck-summary__note">Votre deck est vide. Ajoutez des cartes pour composer votre armée.</p>
        ) : (
          <ul>
            {deck.cards.map((card) => (
              <li key={card.stableId}>
                <span className="deck-composition__cost" aria-label={`Coût ${card.cost ?? 'inconnu'}`}>{card.cost ?? '—'}</span>
                <span className="deck-composition__name">{card.name}</span>
                <b>×{card.quantity}</b>
                {onRemoveCard && <button type="button" disabled={busyCards.has(card.stableId)} onClick={() => onRemoveCard(card.stableId)} aria-label={`Retirer toutes les copies de ${card.name}`}>×</button>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  )
}
