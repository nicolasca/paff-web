import { useMutation } from 'convex/react'
import { Link } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import { BASE_ORDERS, MAX_STRATEGY_POINTS, MAX_TURNS, remainingStock } from '../../../shared/battle'
import type { Game } from './types'
import './BattleFlow.css'

const phases = { orders: 'Ordres', actions: 'Actions', combat: 'Combats', end_turn: 'Fin du tour' } as const
export type BattleControls = { busy: boolean; perform: (action: () => Promise<unknown>) => Promise<void> }

export function BattleFlow({ game, busy, perform }: { game: Game } & BattleControls) {
  const chooseOrder = useMutation(api.games.chooseOrder)
  const passOrder = useMutation(api.games.passOrder)
  const setPoints = useMutation(api.games.setStrategyPoints)
  const confirmPhase = useMutation(api.games.confirmBattlePhase)
  const battle = game.battle!
  const me = game.players.find((player) => player.isMe)!
  const playerName = (seat: number) => game.players.find((player) => player.seat === seat)!.displayName
  const orderName = (id: string) => battle.catalog.find((order) => order.id === id)?.name ?? id
  const myTurn = battle.actingSeat === me.seat
  const confirmed = battle.readySeats.includes(me.seat)
  const finished = battle.phase === 'finished'
  const confirm = (phase: 'combat' | 'end_turn') => void perform(() => confirmPhase({ gameId: game.id, turn: battle.turn, phase }))

  return <section className="battle-flow" aria-label="Déroulement du tour">
    <header className="battle-flow__heading">
      <div><p className="eyebrow">{finished ? 'Démo terminée' : 'La bataille'} · Tour {battle.turn} / {MAX_TURNS}</p><h2>{battle.phase === 'finished' ? 'Huit tours, deux stratèges.' : phases[battle.phase]}</h2></div>
      <p>Initiative <strong>{playerName(battle.initiativeSeat)}</strong></p>
    </header>
    {!finished && <ol className="battle-flow__steps" aria-label="Phases du tour">{Object.entries(phases).map(([id, name], index) => <li key={id} aria-current={battle.phase === id ? 'step' : undefined}><span>{index + 1}</span>{name}</li>)}</ol>}
    <p className="battle-flow__demo">Démo · Les ordres sont sélectionnés en temps réel. Leurs effets, les déplacements, les tirs et les combats ne sont pas encore simulés.</p>

    {!finished && <div className="battle-orders" aria-label="Ordres visibles des deux joueurs">{game.players.map((player) => {
      const orders = battle.orders.filter((order) => order.seat === player.seat)
      return <section key={player.id} className={`battle-orders__player${battle.actingSeat === player.seat && ['orders', 'actions'].includes(battle.phase) ? ' is-active' : ''}`} aria-label={`Ordres de ${player.displayName}`}>
        <header><h3>{player.displayName}{player.isMe && <small>Vous</small>}</h3><span>{orders.length} / {battle.allowance[player.seat]}</span></header>
        <p>{BASE_ORDERS} ordres + {battle.strategyPoints[player.seat]} point{battle.strategyPoints[player.seat] === 1 ? '' : 's'} du tour précédent</p>
        {orders.length ? <ol>{orders.map((order) => <li key={order.id} className={order.status === 'passed' ? 'is-passed' : ''}><span>{orderName(order.orderId)}</span>{order.status === 'passed' && <small>Passé · démo</small>}
          {battle.phase === 'actions' && player.isMe && order.status === 'selected' && <button className="ui-button ui-button--quiet" disabled={busy || !myTurn} onClick={() => void perform(() => passOrder({ gameId: game.id, chosenId: order.id, revision: battle.revision }))}>Passer {orderName(order.orderId)} (démo)</button>}
        </li>)}</ol> : <p className="battle-orders__empty">Aucun ordre choisi pour le moment.</p>}
      </section>
    })}</div>}

    {battle.phase === 'orders' && <>
      <p className="battle-flow__status" role="status">{myTurn ? 'À vous de choisir un ordre.' : `${playerName(battle.actingSeat)} choisit un ordre…`}</p>
      <p className="battle-flow__help">Les choix sont publics et alternés. Un ordre illimité peut être choisi plusieurs fois ; un exemplaire limité est consommé dès sa sélection.</p>
      <div className="order-catalog">{battle.catalog.filter((order) => order.seats.includes(me.seat)).map((order) => {
        const remaining = remainingStock(battle, order, me.seat)
        return <article key={order.id} className={`order-card${order.faction !== 'common' ? ' order-card--faction' : ''}`}>
          <div className="order-card__meta"><span>{order.faction === 'common' ? 'Commun' : me.factionName}</span><span>{remaining === Infinity ? 'Illimité' : `${remaining} / ${order.limit} restant`}</span></div>
          <h3>{order.name}</h3><p>{order.description}</p>
          <button className="ui-button ui-button--quiet" disabled={busy || !myTurn || remaining === 0} onClick={() => void perform(() => chooseOrder({ gameId: game.id, orderId: order.id, revision: battle.revision }))}>{remaining === 0 ? `${order.name} épuisé` : `Choisir ${order.name}`}</button>
        </article>
      })}</div>
    </>}
    {battle.phase === 'actions' && <p className="battle-flow__status" role="status">{myTurn ? 'À vous : passez un de vos ordres, dans l’ordre de votre choix.' : `${playerName(battle.actingSeat)} passe un ordre…`}</p>}
    {battle.phase === 'combat' && <div className="battle-phase-confirm"><h3>Les armées restent en place.</h3><p>Les combats seront jouables dans une prochaine version. Chacun confirme pour passer ensemble à la fin du tour.</p><button className="ui-button ui-button--primary" disabled={busy || confirmed} onClick={() => confirm('combat')}>{confirmed ? 'Combats passés ✓' : 'Passer les combats (démo)'}</button></div>}
    {battle.phase === 'end_turn' && <div className="battle-phase-confirm">
      <h3>Points stratégiques · déclaration manuelle</h3><p>Pour la démo, déclarez de 0 à {MAX_STRATEGY_POINTS} points. {battle.turn < MAX_TURNS ? 'Chaque point ajoute un ordre à votre prochain tour. Le contrôle des zones n’est pas encore calculé.' : 'Ce dernier décompte sera conservé dans l’historique. Aucun vainqueur n’est calculé.'}</p>
      <fieldset className="strategy-picker" disabled={busy || confirmed}><legend>Vos points stratégiques</legend>{Array.from({ length: MAX_STRATEGY_POINTS + 1 }, (_, points) => <label key={points}><input type="radio" name={`strategy-${game.id}-${me.seat}`} value={points} checked={battle.draftPoints[me.seat] === points} onChange={() => void perform(() => setPoints({ gameId: game.id, turn: battle.turn, points }))} /><span>{points}</span></label>)}</fieldset>
      <ul className="strategy-declarations">{game.players.map((player) => <li key={player.id}><span>{player.displayName}</span><strong>{battle.draftPoints[player.seat]} point{battle.draftPoints[player.seat] === 1 ? '' : 's'}</strong><small>{battle.readySeats.includes(player.seat) ? 'Validé ✓' : 'En cours'}</small></li>)}</ul>
      <button className="ui-button ui-button--primary" disabled={busy || confirmed} onClick={() => confirm('end_turn')}>{confirmed ? 'Fin du tour validée ✓' : battle.turn === MAX_TURNS ? 'Terminer la démo' : 'Valider la fin du tour'}</button>
    </div>}
    {!finished && confirmed && <p className="battle-flow__status" role="status">En attente de la validation de {playerName(1 - me.seat)}…</p>}
    {finished && <div className="battle-phase-confirm"><p>Les huit tours sont terminés. Les conditions de victoire seront ajoutées dans une prochaine version. Vous pouvez retrouver le détail de cette partie ci-dessous et créer une nouvelle table.</p><Link className="ui-button ui-button--primary" to="/lobby">Retour au lobby</Link></div>}
    {battle.history.length > 0 && <details className="battle-history"><summary>Historique · {battle.history.length} tour{battle.history.length > 1 ? 's' : ''} terminé{battle.history.length > 1 ? 's' : ''}</summary>{battle.history.map((round) => <section key={round.turn}><h3>Tour {round.turn} · Initiative : {playerName(round.initiativeSeat)}</h3>{game.players.map((player) => <p key={player.id}><strong>{player.displayName}</strong> : {round.orders.filter((order) => order.seat === player.seat).map((order) => orderName(order.orderId)).join(', ')}. <em>{round.strategyPoints[player.seat]} points déclarés.</em></p>)}</section>)}</details>}
  </section>
}
