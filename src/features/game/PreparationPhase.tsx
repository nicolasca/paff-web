import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { ACTION_RULES_VERSION } from '../../../shared/battleEngine'
import { armyBudget, preparationBudgetError } from '../../../shared/armyRules'
import { preparationCapacityError } from '../../../shared/board'
import { UnitCard } from '../catalogue/UnitCard'
import { QuantityControl } from '../decks/QuantityControl'
import { HiddenArmy } from './HiddenArmy'
import { gameErrorMessage } from './gameError'
import type { Game } from './types'

export function PreparationPhase({ game, busy, perform }: { game: Game; busy: boolean; perform: (action: () => Promise<unknown>) => Promise<void> }) {
  const update = useMutation(api.games.updatePreparation)
  const finish = useMutation(api.games.finishPreparation)
  const me = game.players.find((player) => player.isMe)!
  const opponent = game.players.find((player) => !player.isMe)!
  const live = game.rulesVersion === ACTION_RULES_VERSION
  const budget = armyBudget(me.cards)
  const capacityError = preparationCapacityError(me.cards) || (live ? preparationBudgetError(me.cards) : null)
  return <section aria-label="Choix des unités à déployer">
    <div className="game-section-heading"><div><p className="eyebrow">Avant l’initiative · {me.deckName}</p><h2>Choisissez vos unités à déployer</h2></div></div>
    <p className="game-intro">Préparez les exemplaires qui commenceront sur le plateau. Les autres unités restent dans votre réserve. Votre adversaire voit seulement le nombre d’unités choisies.</p>
    <div className="deployment-summary">
      <dl><div><dt>Unités choisies</dt><dd>{me.preparationCount}</dd></div><div><dt>{live ? 'Unités en réserve' : 'Cartes dans la pioche'}</dt><dd>{me.drawPileCount}</dd></div>{live && <><div><dt>Points déployés</dt><dd>{budget.deployed} / 21</dd></div><div><dt>Points en réserve</dt><dd>{budget.reserve} / 12</dd></div></>}</dl>
      <div><button type="button" className="ui-button ui-button--primary" disabled={busy || me.preparationReady || Boolean(capacityError)} onClick={() => void perform(() => finish({ gameId: game.id }))}>{me.preparationReady ? 'Sélection validée ✓' : 'Valider mes unités'}</button><p>{me.preparationReady ? 'En attente de la sélection de votre adversaire…' : 'Vos choix seront définitifs : toutes les unités choisies devront être placées.'}</p></div>
    </div>
    {capacityError && <p className="game-error" role="alert">{gameErrorMessage(capacityError)}</p>}
    <p className="game-intro">{live ? '21 points maximum au déploiement et 12 en réserve. ' : 'Aucune limite de coût. '}Votre camp dispose de 18 cases, dont 9 à l’arrière pour l’artillerie.</p>
    {me.preparationReady && <p className="game-waiting" role="status">Votre sélection est enregistrée. Le jet d’initiative s’ouvrira quand les deux joueurs auront validé.</p>}
    {me.cards.some((card) => card.kind === 'unit') ? <div className="deployment-grid">{me.cards.filter((card) => card.kind === 'unit').map((card) => <UnitCard key={card.stableId} card={card} footer={<div className="deployment-choice"><span>{card.selectedQuantity ?? 0} / {card.quantity} à déployer</span><QuantityControl name={card.name} quantity={card.selectedQuantity ?? 0} max={card.quantity} busy={busy || me.preparationReady}
      onAdjust={(delta) => void perform(() => update({ gameId: game.id, cardStableId: card.stableId, change: { delta } }))}
      onSet={(quantity) => void perform(() => update({ gameId: game.id, cardStableId: card.stableId, change: { quantity } }))} /></div>} />)}</div>
      : <div className="game-empty"><h3>Aucune unité dans ce deck.</h3><p>Validez pour continuer : toutes vos cartes resteront dans la pioche.</p></div>}
    <div className="preparation-opponent"><HiddenArmy name={opponent.displayName} count={opponent.preparationCount} /></div>
  </section>
}
