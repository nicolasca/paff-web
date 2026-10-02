import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { isEngaged } from '../../../shared/battleEngine'
import { isCombatPresent } from '../../../shared/autoCombat'
import { cellCoordinate } from '../../../shared/board'
import { MANUAL_RULES_VERSION } from '../../../shared/manualBattle'
import type { Game, GamePlayer } from './types'
import './AutoOrders.css'

export function AutoOrders({ game, locked = true, run }: { game: Game; locked?: boolean; run?: (action: () => Promise<unknown>) => void }) {
  const players = game.players.filter((player) => game.battle?.catalog.some((order) => order.id === 'forest-wrath' && order.seats.includes(player.seat)))
  return players.length > 0 && <div className="auto-orders">{players.map((player) => <ForestWrath key={player.seat} game={game} player={player} locked={locked} run={run} />)}</div>
}

function ForestWrath({ game, player, locked, run }: { game: Game; player: GamePlayer; locked: boolean; run?: (action: () => Promise<unknown>) => void }) {
  const activate = useMutation(api.combat.forestWrath)
  const [guardianId, setGuardian] = useState<string>()
  const battle = game.battle!
  const engine = battle.engine!
  const combat = battle.manual?.combat
  const active = Boolean(combat?.forestWrath?.some((effect) => effect.seat === player.seat && effect.turn === battle.turn))
  const editable = player.isMe && !game.isSpectator && Boolean(run)
  const guardians = engine.units.filter((unit) => unit.seat === player.seat && unit.cardStableId === 'gaeli-gardiens-des-cen' && unit.regiment > 0 && !isEngaged(engine, unit.id))
  const guardian = guardians.find((unit) => unit.id === guardianId)
  const remaining = battle.manual?.stocks.find((stock) => stock.seat === player.seat && stock.orderId === 'forest-wrath')?.remaining ?? 0
  const affected = engine.units.filter((unit) => unit.seat === player.seat && unit.cardStableId === 'gaeli-esprits-des-bois' && isCombatPresent(unit, combat, battle.turn))
  const card = player.deployedCards.find((item) => item.stableId === 'gaeli-gardiens-des-cen')
  if (!editable && !active) return null
  const unavailable = locked || game.rulesVersion !== MANUAL_RULES_VERSION || !guardian || remaining < 1 || active
  return <section className="auto-order forest-wrath-order" data-active={active} aria-label={`Colère de la Forêt · ${player.displayName}`}>
    <div className="auto-order-heading"><span className="auto-order-symbol" aria-hidden="true">❖</span><div><h3>Colère de la Forêt</h3><p>{active ? `Active jusqu’à la fin du tour ${battle.turn}` : `Dés de profil des Esprits des Bois ×2 au corps à corps · ${remaining} ordre restant`}</p></div>{active && <span className="auto-order-power">×2 D</span>}{editable && <button type="button" className="ui-button" aria-label="Lancer Colère de la Forêt" disabled={unavailable} onClick={() => { if (guardian) run?.(() => activate({ gameId: game.id, revision: combat?.revision ?? 0, guardianId: guardian.id })) }}>COLÈRE DE LA FORÊT</button>}</div>
    {editable && !active && remaining > 0 && <div className="auto-order-sources" role="group" aria-label="Gardien de la Colère de la Forêt"><span>Choisissez un Gardien des Cen’ non engagé.</span><div>{guardians.map((unit) => <button type="button" key={unit.id} disabled={locked} aria-label={`Choisir le Gardien en ${cellCoordinate(unit.cell)}`} aria-pressed={guardianId === unit.id} onClick={() => setGuardian(unit.id)}>{card && <img src={card.imagePath} alt="" />}<strong>{cellCoordinate(unit.cell)}</strong></button>)}</div>{!guardians.length && <p>Aucun Gardien des Cen’ non engagé disponible.</p>}</div>}
    {active && <p className="auto-order-status" role="status">{player.displayName} · {affected.length} unité{affected.length > 1 ? 's' : ''} d’Esprits renforcée{affected.length > 1 ? 's' : ''}. Les Esprits recrutés pendant ce tour gagnent aussi le bonus.</p>}
  </section>
}
