import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { GOBLIN_SHAMAN_ID, GREAT_INVOCATION_ID, invocationScopeName, underInvocation } from '../../../shared/greatInvocation'
import { axisOf, isEngaged } from '../../../shared/battleEngine'
import { cellCoordinate } from '../../../shared/board'
import type { Game, GamePlayer } from './types'
import './InvocationOrders.css'

export function InvocationOrders({ game, locked = true, run }: { game: Game; locked?: boolean; run?: (action: () => Promise<unknown>) => void }) {
  const players = game.players.filter((player) => game.battle?.catalog.some((order) => order.id === GREAT_INVOCATION_ID && order.faction === 'gobelins' && order.seats.includes(player.seat)))
  return players.length > 0 && <div className="invocation-orders">{players.map((player) => <InvocationOrder key={player.seat} game={game} player={player} locked={locked} run={run} />)}</div>
}

function InvocationOrder({ game, player, locked, run }: { game: Game; player: GamePlayer; locked: boolean; run?: (action: () => Promise<unknown>) => void }) {
  const invoke = useMutation(api.combat.invoke)
  const [chosenShamanId, setShaman] = useState<string>()
  const [closedReport, setClosedReport] = useState<string>()
  const battle = game.battle!
  const engine = battle.engine!
  const combat = battle.manual?.combat
  const effect = combat?.invocations?.find((item) => item.seat === player.seat && item.turn === battle.turn)
  const lastRoll = combat?.invocationRolls?.findLast((item) => item.seat === player.seat)
  const reportKey = lastRoll && `${game.id}:${player.seat}:${lastRoll.id}`
  const editable = player.isMe && !game.isSpectator && Boolean(run)
  const shamans = engine.units.filter((unit) => unit.seat === player.seat && unit.regiment > 0 && unit.cardStableId === GOBLIN_SHAMAN_ID)
  const shaman = shamans.find((unit) => unit.id === chosenShamanId)
  const axis = shaman && axisOf(shaman.cell)
  const shamanCard = player.deployedCards.find((card) => card.stableId === GOBLIN_SHAMAN_ID)
  const remaining = battle.manual?.stocks.find((stock) => stock.seat === player.seat && stock.orderId === GREAT_INVOCATION_ID)?.remaining ?? 0
  if (!editable && !effect && !lastRoll) return null
  const affected = engine.units.filter((unit) => underInvocation(unit, effect ? [effect] : [], battle.turn))
  const engaged = affected.filter((unit) => isEngaged(engine, unit.id)).length
  const canInvoke = Boolean(shaman) && remaining > 0
  const closed = Boolean(reportKey && closedReport === reportKey)
  const destroyed = lastRoll?.units.filter((unit) => unit.after === 0).length ?? 0
  const result = lastRoll && (lastRoll.value >= 4
    ? `${lastRoll.units.length} unité${lastRoll.units.length > 1 ? 's' : ''} renforcée${lastRoll.units.length > 1 ? 's' : ''} · ×2 dés`
    : `${lastRoll.units.reduce((sum, unit) => sum + unit.before - unit.after, 0)} R perdus · ${destroyed} unité${destroyed > 1 ? 's' : ''} détruite${destroyed > 1 ? 's' : ''}`)
  const die = lastRoll && <span className="invocation-die" aria-label={`Dé d’invocation : ${lastRoll.value}`}><small>D6</small><strong>{lastRoll.value}</strong><span aria-hidden="true">{['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][lastRoll.value]}</span></span>
  return <section className="invocation-order" data-active={Boolean(effect)} data-collapsed={closed} aria-label={`La gross Invokation ! · ${player.displayName}`}>
    {closed && lastRoll ? <div className="invocation-compact" data-success={lastRoll.value >= 4}>
      <div className="invocation-compact-heading"><strong>La gross Invokation !</strong><button type="button" className="invocation-report-toggle" onClick={() => setClosedReport(undefined)} aria-label={`Voir les détails de La gross Invokation ! · ${player.displayName}`}>Détails</button></div>
      <div className="invocation-compact-result">{die}<div><strong>{result}</strong><small>{player.displayName} · tour {lastRoll.turn}{effect ? ' · bonus actif' : lastRoll.value >= 4 ? ' · bonus terminé' : ''}</small></div></div>
    </div> : <>
    <div className="invocation-order-main">
      {editable ? <button type="button" className="invocation-switch" aria-label="Lancer La gross Invokation !" disabled={locked || !canInvoke} onClick={() => { if (shaman) run?.(() => invoke({ gameId: game.id, revision: combat?.revision ?? 0, shamanId: shaman.id })) }}>
        <span className="invocation-sigil" aria-hidden="true">✦</span><span><strong>La gross Invokation !</strong><small>{effect ? 'Bonus actif' : remaining === 0 ? 'Ordre utilisé' : shamans.length === 0 ? 'Un Shaman doit être présent sur le plateau' : !shaman ? 'Choisissez le Shaman qui invoque' : 'Lancer 1D6 · consomme 1 ordre'}</small></span>{canInvoke && <span className="invocation-launch" aria-hidden="true">Lancer ↗</span>}
      </button> : <div className="invocation-switch"><span className="invocation-sigil" aria-hidden="true">✦</span><span><strong>La gross Invokation !</strong><small>{player.displayName} · {effect ? 'bonus actif' : 'ordre utilisé'}</small></span></div>}
      {lastRoll && <button type="button" className="invocation-report-toggle" onClick={() => setClosedReport(reportKey)} aria-label={`Fermer La gross Invokation ! · ${player.displayName}`}>Fermer</button>}
    </div>
    {lastRoll && <div className="invocation-result" data-success={lastRoll.value >= 4} aria-live="polite">
      <div className="invocation-result-main">{die}<div><strong>{lastRoll.value >= 4 ? 'Gobelins renforcés !' : 'Gobelins blessés !'}</strong><p className="invocation-consequences">{result}</p></div></div>
      <p>{invocationScopeName(lastRoll.scope)} · {lastRoll.value >= 4 ? 'dés de profil ×2' : '−1 R par unité'} · tour {lastRoll.turn}{lastRoll.value >= 4 && !effect && ' · bonus terminé'}</p>
      {lastRoll.shaman && <p className="invocation-source">Shaman invoquant : {lastRoll.shaman.name} · {cellCoordinate(lastRoll.shaman.cell)} · {invocationScopeName(lastRoll.axis)}</p>}
      <details><summary>{lastRoll.units.length} unités affectées</summary><ul>{lastRoll.units.map((unit) => <li key={unit.id}>{unit.name} · {cellCoordinate(unit.cell)} <b>{lastRoll.value >= 4 ? '×2 dés' : `${unit.before} → ${unit.after} R${unit.after === 0 ? ' · détruite' : ''}`}</b></li>)}</ul></details>
    </div>}
    {editable && remaining > 0 && shamans.length > 0 && <div className="invocation-shamans" role="group" aria-label="Shaman invoquant">
      <span>Shaman invoquant</span><div className="invocation-shaman-choices">{shamans.map((unit) => <button type="button" key={unit.id} disabled={locked} aria-label={`Choisir le Shaman en ${cellCoordinate(unit.cell)}`} aria-pressed={unit.id === shaman?.id} onClick={() => setShaman(unit.id)}>
        {shamanCard && <img src={shamanCard.imagePath} alt="" />}<span><strong>{cellCoordinate(unit.cell)}</strong><small>{invocationScopeName(axisOf(unit.cell))}</small></span>
      </button>)}</div><p role="status">{axis !== undefined ? <>Axe concerné : <strong>{invocationScopeName(axis)}</strong></> : 'Sélectionnez un de vos Shamans.'}</p>
    </div>}
    {effect ? <div className="invocation-order-foot" role="status"><span>{affected.length} unité{affected.length > 1 ? 's' : ''} renforcée{affected.length > 1 ? 's' : ''} · {engaged} au corps à corps · jusqu’à la fin du tour {battle.turn}</span><small>Les unités renforcées brillent en vert.</small></div> : !lastRoll && <details className="invocation-order-foot invocation-rules"><summary>Résultats du D6 · {remaining} ordre disponible</summary><p>1 : −1 R partout<br />2–3 : −1 R dans l’axe<br />4–5 : ×2 dés dans l’axe<br />6 : ×2 dés partout</p><small>Hors Trolls et Djil</small></details>}
    </>}
  </section>
}
