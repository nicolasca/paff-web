import { useState } from 'react'
import { useMutation } from 'convex/react'
import { Link } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import { remainingStock } from '../../../shared/battle'
import { adjacent, combatGroups, enemiesOf, isEngaged, legalMoves, legalRecruitmentCells, legalTargets, RECRUITMENT_POINTS, strategyControl, type BattleUnit } from '../../../shared/battleEngine'
import { cellCoordinate, zoneOf } from '../../../shared/board'
import { getUnitProfile } from '../../../shared/unitProfile'
import { UnitCard } from '../catalogue/UnitCard'
import { TacticalBoard } from './TacticalBoard'
import type { BattleControls } from './BattleFlow'
import type { Game } from './types'
import './BattleFlow.css'
import './LiveBattle.css'

export function LiveBattle({ game, busy, perform }: { game: Game } & BattleControls) {
  const choose = useMutation(api.actions.chooseOrder)
  const finishOrder = useMutation(api.actions.finishOrder)
  const endOrders = useMutation(api.actions.endOrders)
  const move = useMutation(api.actions.moveUnit)
  const shoot = useMutation(api.actions.shoot)
  const recruit = useMutation(api.actions.recruit)
  const charge = useMutation(api.actions.charge)
  const finishCharges = useMutation(api.actions.finishCharges)
  const beginCombat = useMutation(api.actions.beginCombat)
  const setTarget = useMutation(api.actions.setCombatTarget)
  const confirmCombat = useMutation(api.actions.confirmCombat)
  const confirmEnd = useMutation(api.actions.confirmEndTurn)
  const [selection, setSelection] = useState<{ context: string; id: string } | null>(null)
  const battle = game.battle!
  const engine = battle.engine!
  const me = game.players.find((player) => player.isMe)!
  const name = (seat: number) => game.players.find((player) => player.seat === seat)!.displayName
  const card = (unit: BattleUnit) => game.players.find((player) => player.seat === unit.seat)!.deployedCards.find((card) => card.stableId === unit.cardStableId)!
  const unitLabel = (unit: BattleUnit) => `${card(unit).name} · ${cellCoordinate(unit.cell)} · ${unit.regiment} R`
  const order = engine.activeOrder
  const ownTurn = battle.actingSeat === me.seat
  const charges = battle.phase === 'combat' && engine.combatStep === 'charges'
  const fights = battle.phase === 'combat' && engine.combatStep === 'fights'
  const context = `${battle.turn}:${order?.chosenId ?? (charges ? 'charges' : engine.fight?.id ?? battle.phase)}`
  const selectedId = selection?.context === context ? selection.id : undefined
  const selected = engine.units.find((unit) => unit.id === selectedId)
  const mine = engine.units.filter((unit) => unit.seat === me.seat)
  const actionable = !busy && ownTurn && (charges || (battle.phase === 'orders' && order?.seat === me.seat))
  const eligible = mine.filter((unit) => charges ? !isEngaged(engine, unit.id) && unit.chargedTurn !== battle.turn && engine.units.some((target) => target.seat !== me.seat && adjacent(unit.cell, target.cell)) : order && !order.usedUnits.includes(unit.id) && (!order.zone || zoneOf(unit.cell) === order.zone) && (order.orderId === 'movement' ? legalMoves(engine, unit, getUnitProfile(card(unit))!, battle.turn).length > 0 : order.orderId === 'shooting' && legalTargets(engine, unit, getUnitProfile(card(unit))!, battle.turn).length > 0))
  const selectedUnit = selected && eligible.some((unit) => unit.id === selected.id) ? selected : undefined
  const reserves = me.cards.filter((card) => card.kind === 'unit' && card.quantity > (card.enteredQuantity ?? card.deploymentQuantity))
  const reserve = reserves.find((card) => card.stableId === selectedId)
  const recruitmentLeft = RECRUITMENT_POINTS + (order?.recruitmentBonus ?? 0) - (order?.recruitmentSpent ?? 0)
  const strategyCost = Math.max(0, (reserve?.cost ?? 0) - recruitmentLeft)
  const allowed = !actionable ? [] : order?.orderId === 'recruitment' && reserve && strategyCost <= battle.strategyPoints[me.seat]
    ? legalRecruitmentCells(engine, me.seat, getUnitProfile(reserve)!, order.zone)
    : selectedUnit ? charges ? engine.units.filter((target) => target.seat !== me.seat && adjacent(selectedUnit.cell, target.cell)).map((unit) => unit.cell)
      : order?.orderId === 'movement' ? legalMoves(engine, selectedUnit, getUnitProfile(card(selectedUnit))!, battle.turn).map((move) => move.cell)
        : legalTargets(engine, selectedUnit, getUnitProfile(card(selectedUnit))!, battle.turn).map((unit) => unit.cell) : []
  const args = { gameId: game.id, revision: battle.revision }
  const run = (action: () => Promise<unknown>) => void perform(action)
  const select = (id: string) => setSelection({ context, id })
  function act(cell: number) {
    if (!allowed.includes(cell)) return
    if (order?.orderId === 'recruitment' && reserve) run(() => recruit({ ...args, cardStableId: reserve.stableId, cell, strategy: strategyCost }))
    else if (selectedUnit) {
      if (order?.orderId === 'movement') run(() => move({ ...args, unitId: selectedUnit.id, to: cell }))
      else {
        const target = engine.units.find((unit) => unit.cell === cell)!
        run(() => (charges ? charge : shoot)({ ...args, unitId: selectedUnit.id, targetId: target.id }))
      }
    }
  }
  const phase = battle.phase === 'finished' ? 'Partie terminée' : battle.phase === 'end_turn' ? 'Fin du tour' : charges ? 'Charges' : fights ? 'Combats' : 'Ordres & actions'
  const fight = engine.fight
  const ownFighters = fight ? mine.filter((unit) => fight.unitIds.includes(unit.id) && getUnitProfile(card(unit))!.offense.kind === 'melee') : []
  const points = strategyControl(engine)
  const played = battle.orders.filter((item) => item.seat === me.seat).length

  return <section className="battle-arena live-battle" aria-label="Aire de jeu">
    <section className="battle-flow" aria-label="Déroulement du tour">
      <header className="battle-flow__heading"><div><p className="eyebrow">La bataille · Tour {battle.turn} / 8</p><h2>{phase}</h2></div><p>Initiative <strong>{name(battle.initiativeSeat)}</strong></p></header>
      <ol className="battle-flow__steps" aria-label="Phases du tour">{['Ordres & actions', 'Charges', 'Combats', 'Fin du tour'].map((label, index) => <li key={label} aria-current={phase === label ? 'step' : undefined}><span>{index + 1}</span>{label}</li>)}</ol>
      <div className="battle-orders">{game.players.map((player) => <section key={player.id} className={`battle-orders__player${player.seat === battle.actingSeat ? ' is-active' : ''}`}>
        <header><h3>{player.displayName}{player.isMe && <small>Vous</small>}</h3><span>{battle.strategyPoints[player.seat]} PS</span></header>
        <p>{player.deploymentCount} unités en jeu · {player.drawPileCount} en réserve</p>
        <ol>{battle.orders.filter((item) => item.seat === player.seat).map((item) => <li key={item.id}><span>{battle.catalog.find((order) => order.id === item.orderId)?.name}</span><small>{item.status === 'resolved' ? 'Résolu' : item.status === 'passed' ? 'Sans effet' : 'En cours'}</small></li>)}</ol>
      </section>)}</div>
      {battle.phase === 'orders' && !order && <>
        <p role="status" className="battle-flow__status">{ownTurn ? 'À vous de jouer un ordre, puis de l’exécuter sur le plateau.' : `${name(battle.actingSeat)} choisit un ordre…`}</p>
        <p>3 ordres par tour. Chaque ordre supplémentaire coûte 1 point stratégique conservé.</p>
        <div className="order-catalog">{battle.catalog.filter((item) => item.seats.includes(me.seat)).map((definition) => {
          const stock = remainingStock(battle, definition, me.seat)
          return <article className="order-card" key={definition.id}><div className="order-card__meta"><span>Commun</span><span>{stock === Infinity ? 'Illimité' : `${stock} restant(s)`}</span></div><h3>{definition.name}</h3><p>{definition.description}</p><button className="ui-button" disabled={busy || !ownTurn || stock === 0 || engine.endedSeats.includes(me.seat)} onClick={() => run(() => choose({ ...args, orderId: definition.id }))}>Jouer {definition.name}{played >= battle.allowance[me.seat] ? ' · 1 PS' : ''}</button></article>
        })}</div>
        {ownTurn && played >= 3 && <button className="ui-button" disabled={busy} onClick={() => run(() => endOrders(args))}>Terminer mes ordres et conserver mes points</button>}
      </>}
      {battle.phase === 'orders' && order && <div className="live-action-panel">
        <p className="eyebrow">{name(order.seat)} joue</p><h3>{battle.catalog.find((item) => item.id === order.orderId)?.name}</h3>
        {ownTurn ? <>
          <p>{order.orderId === 'movement' ? 'Sélectionnez une unité, puis une case éclairée. Vous pouvez activer une fois chacune des unités de la même zone de départ.' : order.orderId === 'shooting' ? 'Sélectionnez un tireur, puis une cible éclairée. Portée en cases ; T contre DT, 1 R perdu par touche.' : `Faites entrer vos réserves dans une même zone Arrière ou Base. Budget restant : ${recruitmentLeft} points. Un PS peut ajouter un point de recrutement.`}</p>
          {order.orderId === 'recruitment' && <p>Choisissez une carte dans votre réserve, sous le plateau.</p>}
          {reserve && order.orderId === 'recruitment' && <p>Choisissez une case éclairée pour recruter {reserve.name}{strategyCost > 0 ? ` et dépenser ${strategyCost} PS` : ''}.</p>}
          <button className="ui-button ui-button--primary" disabled={busy} onClick={() => run(() => finishOrder(args))}>Terminer cet ordre</button>
        </> : <p role="status">L’adversaire exécute son ordre. Le plateau se met à jour en direct.</p>}
      </div>}
      {charges && <div className="live-action-panel"><h3>Engagez l’adversaire</h3><p>Une unité libre peut charger un ennemi adjacent : +1 dé lors du combat. Les déclarations alternent entre les joueurs.</p><p role="status">{ownTurn ? 'À vous de déclarer une charge ou de terminer vos charges.' : `${name(battle.actingSeat)} prépare ses charges…`}</p><button className="ui-button" disabled={busy || !ownTurn} onClick={() => run(() => finishCharges(args))}>Terminer mes charges</button></div>}
      {actionable && (charges || order?.orderId !== 'recruitment') && <div className="live-unit-picker" aria-label="Unités disponibles pour cette action">
        {eligible.map((unit) => <button className="ui-button" key={unit.id} aria-pressed={selectedUnit?.id === unit.id} onClick={() => select(unit.id)}>{unitLabel(unit)}</button>)}
        {!eligible.length && <p>Aucune unité ne peut effectuer cette action. Vous pouvez la terminer.</p>}
      </div>}
      {selectedUnit && actionable && <p className="live-target-hint">{unitLabel(selectedUnit)} — {charges ? 'choisissez un ennemi adjacent éclairé.' : order?.orderId === 'shooting' ? 'choisissez une cible éclairée.' : `choisissez une destination éclairée.${isEngaged(engine, selectedUnit.id) ? ' Désengagement : chaque ennemi engagé attaque gratuitement avec +2 à ses jets avant le déplacement.' : ''}`}</p>}
      {fights && !fight && <div className="live-action-panel"><h3>Résoudre les combats</h3><p>{name(battle.initiativeSeat)} choisit le prochain groupe engagé. Les dégâts de ses unités sont simultanés.</p>{combatGroups(engine).map((group) => <button className="ui-button" key={group[0]} disabled={busy || me.seat !== battle.initiativeSeat} onClick={() => run(() => beginCombat({ ...args, unitId: group[0] }))}>Résoudre le combat {group.map((id) => cellCoordinate(engine.units.find((unit) => unit.id === id)!.cell)).join(' / ')}</button>)}</div>}
      {fights && fight && <div className="live-action-panel"><h3>Cibles du combat</h3><p>Chaque unité de corps à corps attaque un adversaire engagé. Les deux joueurs valident avant les jets.</p>
        {ownFighters.map((unit) => <label className="live-combat-target" key={unit.id}>{unitLabel(unit)}<select aria-label={`Cible de ${unitLabel(unit)}`} disabled={busy || fight.readySeats.includes(me.seat)} value={fight.targets.find((target) => target.unitId === unit.id)?.targetId ?? ''} onChange={(event) => run(() => setTarget({ ...args, unitId: unit.id, targetId: event.target.value }))}><option value="" disabled>Choisir une cible</option>{enemiesOf(engine, unit.id).map((id) => <option key={id} value={id}>{unitLabel(engine.units.find((unit) => unit.id === id)!)}</option>)}</select></label>)}
        {!ownFighters.length && <p>Vous n’avez pas d’attaque de corps à corps à attribuer dans ce combat.</p>}
        <button className="ui-button ui-button--primary" disabled={busy || fight.readySeats.includes(me.seat) || ownFighters.some((unit) => !fight.targets.some((target) => target.unitId === unit.id))} onClick={() => run(() => confirmCombat({ gameId: game.id, fightId: fight.id }))}>{fight.readySeats.includes(me.seat) ? 'Combat validé · en attente' : 'Valider mes cibles et lancer les dés'}</button>
      </div>}
      {battle.phase === 'end_turn' && <div className="live-action-panel"><h3>Contrôle des zones stratégiques</h3><p>Chaque zone centrale avec une de vos unités libres et aucun adversaire rapporte 1 PS. Les points non dépensés sont conservés.</p>{game.players.map((player) => <p key={player.id}>{player.displayName} : +{points[player.seat]} PS → {battle.strategyPoints[player.seat] + points[player.seat]} PS en réserve.</p>)}<button className="ui-button ui-button--primary" disabled={busy || battle.readySeats.includes(me.seat)} onClick={() => run(() => confirmEnd({ gameId: game.id, turn: battle.turn }))}>{battle.readySeats.includes(me.seat) ? 'Fin du tour validée · en attente' : 'Valider la fin du tour'}</button></div>}
      {battle.phase === 'finished' && engine.result && <div className="live-action-panel"><h3>{engine.result.winner === null ? 'Match nul' : `${name(engine.result.winner)} remporte la partie`}</h3><p>{{ annihilation: 'L’armée adverse et ses réserves sont éliminées.', base: 'La base centrale adverse est conquise.', strategy: 'Davantage de zones stratégiques contrôlées à la fin du huitième tour.', draw: 'Les deux camps sont à égalité.' }[engine.result.reason]}</p><Link className="ui-button" to="/lobby">Retour au lobby</Link></div>}
    </section>
    <TacticalBoard game={game} allowedCells={allowed} onPlace={act} selectedCell={selectedUnit?.cell} onUnit={actionable ? (cell) => { const unit = eligible.find((item) => item.cell === cell); if (unit) select(unit.id) } : undefined} placeLabel={charges ? 'Charger' : order?.orderId === 'shooting' ? 'Tirer' : order?.orderId === 'recruitment' ? 'Recruter ici' : 'Déplacer ici'} busy={busy} />
    <section className="live-reserve" aria-label="Votre réserve">
      <header><h3>Votre réserve</h3><span>{me.drawPileCount} unités · Cachée à l’adversaire</span></header>
      {reserves.length ? <div className="live-reserve__cards" aria-label={actionable && order?.orderId === 'recruitment' ? 'Unités de réserve' : undefined}>
        {reserves.map((card) => <UnitCard key={card.stableId} card={card} costPlacement="footer" footer={<>
          <span>×{card.quantity - (card.enteredQuantity ?? card.deploymentQuantity)}</span>
          <button type="button" className="ui-button" aria-label={`${card.name} · ${card.cost} pts · ×${card.quantity - (card.enteredQuantity ?? card.deploymentQuantity)}`} aria-pressed={selectedId === card.stableId}
            disabled={!actionable || order?.orderId !== 'recruitment' || (card.cost ?? 0) > recruitmentLeft + battle.strategyPoints[me.seat]}
            onClick={() => select(card.stableId)}>{selectedId === card.stableId ? 'Sélectionnée' : 'Recruter'}</button>
        </>} />)}
      </div> : <p>Votre réserve est vide.</p>}
    </section>
    <section className="live-log" aria-label="Journal de bataille"><h3>Journal de bataille</h3><ol>{[...engine.log].reverse().slice(0, 20).map((event) => <li key={event.id}><small>Tour {event.turn}</small><p>{event.text}</p>{event.rolls.map((roll, index) => <div className="live-dice" key={index} aria-label={`${roll.hits} touches, seuil ${roll.threshold}, modificateur ${roll.modifier}`}><span>{roll.threshold}+{roll.modifier !== 0 ? ` · mod. +${roll.modifier}` : ''}</span>{roll.dice.map((die, index) => { const reroll = roll.rerolls.find((item) => item.index === index); return <i key={index}>{die}{reroll && <>→{reroll.result}</>}</i> })}<strong>{roll.hits} touche(s)</strong></div>)}</li>)}</ol>{engine.log.length === 0 && <p>La bataille commence.</p>}</section>
  </section>
}
