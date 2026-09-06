import { useMutation, useQuery } from 'convex/react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { SiteHeader } from '../components/SiteHeader'
import { UnitCard } from '../features/catalogue/UnitCard'
import { QuantityControl } from '../features/decks/QuantityControl'
import { getDeckStats, type Deck } from '../features/decks/deckStats'
import { BattleBoard } from '../features/game/BattleBoard'
import { SetupPhases } from '../features/game/SetupPhases'
import { PreparationPhase } from '../features/game/PreparationPhase'
import { GameConnection } from '../features/game/GameConnection'
import { gameError } from '../features/game/gameError'
import { phaseNames, type Game, type GamePlayer } from '../features/game/types'
import './GamePage.css'

const newSteps = ['waiting', 'deck_selection', 'preparation', 'initiative', 'deployment', 'battle'] as const
const v2Steps = ['waiting', 'deck_selection', 'initiative', 'deployment', 'battle'] as const
const legacySteps = ['waiting', 'deck_selection', 'deployment', 'battle'] as const

export function GamePage() {
  const { gameId } = useParams()
  const game = useQuery(api.games.get, { gameId: gameId as Id<'games'> })
  const decks = useQuery(api.decks.listMine, game?.phase === 'deck_selection' ? {} : 'skip')
  const navigate = useNavigate()
  return <><SiteHeader /><main className="game-page"><div className="game-shell">
    <div className="game-topline"><Link to="/lobby">← Toutes les tables</Link><GameConnection /></div>
    {game === undefined ? <div className="game-empty" role="status">Chargement de la partie…</div>
      : game === null || game.phase === 'cancelled' ? <div className="game-empty"><h1>{game ? 'La table a été fermée' : 'Partie indisponible'}</h1><p>{game ? 'Un joueur a quitté la partie. Vous pouvez vous retrouver à une nouvelle table.' : 'Retrouvez les parties disponibles dans le lobby.'}</p><Link className="ui-button" to="/lobby">Retour au lobby</Link></div>
        : <GameRoom key={game.id} game={game} decks={decks} onLeave={() => navigate('/lobby')} />}
  </div></main></>
}

export function GameRoom({ game, decks, onLeave }: { game: Game; decks?: Deck[]; onLeave: () => void }) {
  const start = useMutation(api.games.start)
  const selectDeck = useMutation(api.games.selectDeck)
  const updateDeployment = useMutation(api.games.updateDeployment)
  const finishDeployment = useMutation(api.games.finishDeployment)
  const leave = useMutation(api.games.leave)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const stepHeading = useRef<HTMLOListElement>(null)
  const previousPhase = useRef(game.phase)
  const [error, setError] = useState('')
  const [confirmLeave, setConfirmLeave] = useState(false)
  const me = game.players.find((player) => player.isMe)!
  const opponent = game.players.find((player) => !player.isMe)
  const steps: readonly Game['phase'][] = game.setup?.version === 3 || game.phase === 'waiting' ? newSteps : game.setup ? v2Steps : legacySteps
  useEffect(() => {
    if (previousPhase.current !== game.phase) {
      stepHeading.current?.scrollIntoView?.({ block: 'start' })
      previousPhase.current = game.phase
    }
  }, [game.phase])

  async function perform(action: () => Promise<unknown>) {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    try { await action() }
    catch (cause) { setError(gameError(cause)) }
    finally { pending.current = false; setBusy(false) }
  }

  return <>
    <header className="game-page-heading game-page-heading--room"><div><p className="eyebrow">Table à deux joueurs</p><h1>{game.name}</h1></div>
      <button type="button" className="ui-button ui-button--quiet" disabled={busy} onClick={() => setConfirmLeave(true)}>Quitter la table</button>
    </header>
    {confirmLeave && <section className="game-confirm" aria-label="Quitter la table">
      <p>{game.phase === 'waiting' && !game.isHost ? 'Libérer votre place à cette table ?' : 'Quitter fermera cette partie pour les deux joueurs.'}</p>
      <button type="button" className="ui-button ui-button--danger" disabled={busy} onClick={() => void perform(async () => { await leave({ gameId: game.id }); onLeave() })}>Confirmer le départ</button>
      <button type="button" className="ui-button ui-button--quiet" onClick={() => setConfirmLeave(false)}>Rester</button>
    </section>}
    <ol ref={stepHeading} className="game-steps" style={{ '--step-count': steps.length } as CSSProperties} aria-label="Étapes de la partie">{steps.map((step, index) => <li key={step} aria-current={game.phase === step ? 'step' : undefined} className={index < steps.indexOf(game.phase) ? 'is-complete' : ''}><span>{String(index + 1).padStart(2, '0')}</span>{phaseNames[step]}</li>)}</ol>
    {error && <p className="game-error" role="alert">{error}</p>}
    {game.phase !== 'battle' && <div className="game-seats" aria-label="Joueurs à la table">
      <PlayerSeat player={game.players[0]} phase={game.phase} />
      <span className="game-versus" aria-hidden="true">VS</span>
      <PlayerSeat player={game.players[1]} phase={game.phase} />
    </div>}
    {game.phase === 'waiting' && <section className="game-welcome">
      <span className="game-empty__sigil" aria-hidden="true">✦</span>
      <h2>{opponent ? 'Les stratèges sont réunis.' : 'Votre adversaire se fait attendre.'}</h2>
      <p>{opponent ? 'Choisissez vos decks, préparez vos unités et rejoignez le champ de bataille.' : 'L’autre joueur peut rejoindre votre table depuis le lobby. Elle apparaîtra ici automatiquement.'}</p>
      {game.isHost ? <button className="ui-button ui-button--primary" type="button" disabled={busy || !opponent} onClick={() => void perform(() => start({ gameId: game.id }))}>Lancer la partie <span aria-hidden="true">→</span></button> : <p className="game-waiting" role="status">En attente du lancement par l’hôte…</p>}
    </section>}
    {game.phase === 'deck_selection' && <section>
      <div className="game-section-heading"><div><p className="eyebrow">Votre armée</p><h2>Choisissez votre deck</h2></div><Link className="ui-button ui-button--quiet" to="/decks">Gérer mes decks</Link></div>
      <p className="game-intro">La préparation commence dès que vous avez tous les deux choisi.</p>
      {me.deckChosen && <p className="game-waiting" role="status">« {me.deckName} » est prêt. En attente du choix de l’adversaire…</p>}
      {decks === undefined ? <p role="status">Chargement de vos decks…</p> : !decks.length ? <div className="game-empty"><h3>Il vous faut un deck.</h3><p>Créez-en un, puis revenez à cette table depuis le lobby.</p><Link className="ui-button ui-button--primary" to="/decks">Créer mon premier deck</Link></div> : <div className="game-deck-grid">{decks.map((deck) => {
        const stats = getDeckStats(deck.cards)
        const selected = me.deckId === deck.id
        return <article key={deck.id} className={`game-deck${selected ? ' game-deck--selected' : ''}`}>
          <div className="game-deck__art" aria-hidden="true">{deck.cards[0] ? <img src={deck.cards[0].imagePath} alt="" /> : <span>✦</span>}<span>{deck.faction?.name ?? 'Faction à définir'}</span></div>
          <div className="game-deck__body"><h3>{deck.name}</h3><p>{stats.total} cartes <span>·</span> {stats.units} unités</p><button className={`ui-button${selected ? '' : ' ui-button--primary'}`} type="button" aria-pressed={selected} disabled={busy || selected} onClick={() => void perform(() => selectDeck({ gameId: game.id, deckId: deck.id }))}>{selected ? 'Deck choisi ✓' : `Choisir ${deck.name}`}</button></div>
        </article>
      })}</div>}
    </section>}
    {game.phase === 'preparation' && <PreparationPhase game={game} busy={busy} perform={perform} />}
    {game.setup && (game.phase === 'initiative' || game.phase === 'deployment') && <SetupPhases key={game.phase} game={game} busy={busy} perform={perform} />}
    {game.phase === 'deployment' && !game.setup && <section>
      <div className="game-section-heading"><div><p className="eyebrow">Avant la bataille · {me.deckName}</p><h2>Préparez vos unités</h2></div></div>
      <p className="game-intro">Choisissez les exemplaires qui seront prêts à être déployés. Toutes les autres cartes, y compris les actions, restent dans la pioche.</p>
      <div className="deployment-summary">
        <dl><div><dt>Unités préparées</dt><dd>{me.deploymentCount}</dd></div><div><dt>Cartes dans la pioche</dt><dd>{me.drawPileCount}</dd></div></dl>
        <div><button type="button" className="ui-button ui-button--primary" disabled={busy || me.deploymentReady} onClick={() => void perform(() => finishDeployment({ gameId: game.id }))}>{me.deploymentReady ? 'Préparation terminée ✓' : 'J’ai fini'}</button><p>{me.deploymentReady ? 'En attente de votre adversaire…' : 'Aucune limite de coût. Vous pouvez aussi ne rien déployer.'}</p></div>
      </div>
      {me.deploymentReady && <p className="game-waiting" role="status">Vos choix sont validés. Le plateau s’ouvrira quand votre adversaire aura terminé.</p>}
      {me.cards.some((card) => card.kind === 'unit') ? <div className="deployment-grid">{me.cards.filter((card) => card.kind === 'unit').map((card) => <UnitCard key={card.stableId} card={card} footer={<div className="deployment-choice"><span>{card.deploymentQuantity} / {card.quantity} à déployer</span><QuantityControl name={card.name} quantity={card.deploymentQuantity} max={card.quantity} busy={busy || me.deploymentReady}
        onAdjust={(delta) => void perform(() => updateDeployment({ gameId: game.id, cardStableId: card.stableId, change: { delta } }))}
        onSet={(quantity) => void perform(() => updateDeployment({ gameId: game.id, cardStableId: card.stableId, change: { quantity } }))} /></div>} />)}</div> : <div className="game-empty"><h3>Aucune unité dans ce deck.</h3><p>Vous pouvez valider la préparation : vos cartes resteront dans la pioche.</p></div>}
    </section>}
    {game.phase === 'battle' && <BattleBoard game={game} />}
  </>
}

function PlayerSeat({ player, phase }: { player?: GamePlayer; phase: Game['phase'] }) {
  const ready = phase === 'deck_selection' ? player?.deckChosen : phase === 'preparation' ? player?.preparationReady : phase === 'deployment' ? player?.deploymentReady : Boolean(player)
  const status = !player ? 'En attente d’un joueur' : phase === 'deck_selection' ? ready ? 'Deck choisi' : 'Choisit son deck…' : phase === 'preparation' ? ready ? 'Unités choisies' : 'Choisit ses unités…' : phase === 'initiative' ? 'Jet d’initiative' : phase === 'deployment' ? ready ? 'Déploiement terminé' : 'Déploiement en cours' : player.seat === 0 ? 'Hôte de la table' : 'A rejoint la table'
  return <article className={`game-seat${player ? '' : ' game-seat--empty'}`}><div className="game-avatar" aria-hidden="true">{player?.displayName.slice(0, 1) ?? '+'}</div><div><h2>{player?.displayName ?? 'Place libre'}{player?.isMe && <span>Vous</span>}</h2><p className={ready ? 'is-ready' : ''} role="status">{ready && <span aria-hidden="true">✓ </span>}{status}</p></div></article>
}
