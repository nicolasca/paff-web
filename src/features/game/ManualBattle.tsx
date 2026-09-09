import { useEffect, useId, useState, type DragEvent } from 'react'
import { useConvexConnectionState, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { cells, cellCoordinate } from '../../../shared/board'
import { hitRule, type BattleUnit } from '../../../shared/battleEngine'
import { manualMoves } from '../../../shared/manualBattle'
import { getUnitProfile } from '../../../shared/unitProfile'
import { UnitCard } from '../catalogue/UnitCard'
import { TacticalBoard } from './TacticalBoard'
import type { BattleControls } from './types'
import type { Game } from './types'
import './ManualBattle.css'

type Source = { kind: 'unit'; id: string; from: number } | { kind: 'reserve'; id: string; entered: number } | { kind: 'discard'; id: string }

export function ManualBattle({ game, busy, perform }: { game: Game } & BattleControls) {
  const move = useMutation(api.manual.moveUnit)
  const recruit = useMutation(api.manual.recruit)
  const turn = useMutation(api.manual.adjustTurn)
  const strategy = useMutation(api.manual.adjustStrategy)
  const stock = useMutation(api.manual.adjustOrderStock)
  const regiment = useMutation(api.manual.adjustRegiment)
  const duel = useMutation(api.manual.setDuel)
  const engage = useMutation(api.manual.setEngagement)
  const roll = useMutation(api.manual.rollDice)
  const discard = useMutation(api.manual.discardUnit)
  const restore = useMutation(api.manual.restoreUnit)
  const connected = useConvexConnectionState().isWebSocketConnected
  const locked = busy || !connected
  const [selectedId, setSelectedId] = useState<string>()
  const [source, setSource] = useState<Source | null>(null)
  const [dragging, setDragging] = useState(false)
  const [diceCount, setDiceCount] = useState(3)
  const battle = game.battle!
  const engine = battle.engine!
  const manual = battle.manual!
  const me = game.players.find((player) => player.isMe)!
  const opponent = game.players.find((player) => !player.isMe)!
  const cardFor = (unit: BattleUnit) => game.players.find((player) => player.seat === unit.seat)!.deployedCards.find((card) => card.stableId === unit.cardStableId)!
  const unitName = (unit: BattleUnit) => `${cardFor(unit).name} · ${cellCoordinate(unit.cell)}`
  const selected = engine.units.find((unit) => unit.id === selectedId && unit.seat === me.seat)
  const moving = source?.kind === 'unit' ? engine.units.find((unit) => unit.id === source.id && unit.cell === source.from && unit.seat === me.seat) : undefined
  const free = cells.filter((cell) => !engine.units.some((unit) => unit.cell === cell))
  const allowed = locked || !source ? [] : source.kind === 'unit' ? moving ? manualMoves(engine, moving, getUnitProfile(cardFor(moving))!) : [] : free
  const reserves = me.cards.filter((card) => card.kind === 'unit' && card.quantity > (card.enteredQuantity ?? card.deploymentQuantity))
  const attacker = engine.units.find((unit) => unit.id === manual.duel?.attackerId)
  const target = engine.units.find((unit) => unit.id === manual.duel?.targetId)
  const attackProfile = attacker && getUnitProfile(cardFor(attacker))
  const targetProfile = target && getUnitProfile(cardFor(target))
  const ranged = attackProfile?.offense.kind === 'ranged'
  const defense = targetProfile && (ranged ? targetProfile.defenseRanged : targetProfile.defenseMelee)
  const rule = attackProfile && attackProfile.offense.score !== null && defense !== undefined ? hitRule(attackProfile.offense.score, defense) : undefined
  const engaged = attacker && target && engine.engagements.some((edge) => [edge.a, edge.b].includes(attacker.id) && [edge.a, edge.b].includes(target.id))
  const lastRoll = manual.dice.at(-1)
  const run = (action: () => Promise<unknown>) => { if (!locked) void perform(action) }
  const cancelDrag = () => { setDragging(false); setSource(null) }
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => { if (event.key === 'Escape') { setDragging(false); setSource(null) } }
    window.addEventListener('keydown', cancel)
    return () => window.removeEventListener('keydown', cancel)
  }, [])
  function beginDrag(next: Source, event: DragEvent<HTMLElement>) {
    if (locked) { event.preventDefault(); return }
    event.dataTransfer.setData('text/plain', next.id)
    event.dataTransfer.effectAllowed = 'move'
    setSource(next); setDragging(true)
  }
  function drop(cell: number) {
    if (!source || !allowed.includes(cell) || locked) return
    const current = source
    cancelDrag()
    if (current.kind === 'unit') run(() => move({ gameId: game.id, unitId: current.id, from: current.from, to: cell }))
    else if (current.kind === 'reserve') run(() => recruit({ gameId: game.id, cardStableId: current.id, entered: current.entered, cell }))
    else run(() => restore({ gameId: game.id, unitId: current.id, cell }))
  }
  function compare(cell: number) {
    const unit = engine.units.find((unit) => unit.cell === cell)
    if (!unit) return
    setSource(null)
    if (attacker?.id === unit.id) run(() => duel({ gameId: game.id }))
    else if (attacker && !target && attacker.seat !== unit.seat) run(() => duel({ gameId: game.id, attackerId: attacker.id, targetId: unit.id }))
    else run(() => duel({ gameId: game.id, attackerId: unit.id }))
  }
  const orderList = (seat: number, editable: boolean) => <ul className="manual-orders">{battle.catalog.filter((order) => order.seats.includes(seat)).map((order) => {
    const remaining = manual.stocks.find((item) => item.seat === seat && item.orderId === order.id)?.remaining
    return <li key={order.id}><OrderInfo name={order.name} description={order.description} />{remaining === undefined ? <span className="manual-unlimited" aria-label="Illimité">∞</span> : editable ? <Counter label={`${order.name} restants`} value={remaining} busy={locked} onChange={(delta) => run(() => stock({ gameId: game.id, orderId: order.id, delta }))} /> : <span>{remaining}</span>}</li>
  })}</ul>

  return <section className="manual-battle" aria-label="Plateau manuel">
    <header className="manual-toolbar">
      <div><p className="eyebrow">La bataille</p><h2>À vous de jouer</h2></div>
      <div className="manual-turn"><span>Tour</span><Counter label="Tour" value={battle.turn} minimum={1} busy={locked} onChange={(delta) => run(() => turn({ gameId: game.id, delta }))} /></div>
      <div className="manual-strategy"><span>{me.displayName}<small>Points stratégiques</small></span><Counter label={`Points stratégiques de ${me.displayName}`} value={battle.strategyPoints[me.seat]} busy={locked} onChange={(delta) => run(() => strategy({ gameId: game.id, delta }))} /></div>
      <div className="manual-strategy manual-strategy--opponent"><span>{opponent.displayName}<small>Points stratégiques</small></span><output aria-label={`Points stratégiques de ${opponent.displayName}`}>{battle.strategyPoints[opponent.seat]}</output></div>
    </header>
    <div className="manual-main">
      <p className="manual-instructions">Glissez une unité pour la déplacer. Clic droit : attaquant, puis défenseur. <span>Au clavier : sélectionnez une unité puis une case ; C pour comparer. Échap pour annuler le déplacement.</span></p>
      {source && !dragging && <div className="manual-placement" role="status">Choisissez une case éclairée.<button type="button" onClick={cancelDrag}>Annuler</button></div>}
      <TacticalBoard game={game} busy={locked} selectedCell={selected?.cell} allowedCells={allowed} onPlace={drop} placeLabel={source?.kind === 'reserve' ? 'Recruter ici' : source?.kind === 'discard' ? 'Remettre ici' : 'Déplacer ici'} onUnit={(cell) => {
        const unit = engine.units.find((unit) => unit.cell === cell && unit.seat === me.seat)
        setSelectedId(unit?.id)
        setSource(unit ? { kind: 'unit', id: unit.id, from: unit.cell } : null)
      }} interaction={{ dragging, onDragEnd: cancelDrag, onDrop: drop, onCompare: compare,
        canDrag: (cell) => { const unit = engine.units.find((unit) => unit.cell === cell && unit.seat === me.seat); return Boolean(unit && manualMoves(engine, unit, getUnitProfile(cardFor(unit))!).length) },
        onDrag: (cell, event) => { const unit = engine.units.find((unit) => unit.cell === cell && unit.seat === me.seat); if (unit) { setSelectedId(unit.id); beginDrag({ kind: 'unit', id: unit.id, from: cell }, event) } else event.preventDefault() },
      }} />
      <section className="manual-reserve" aria-label="Votre réserve">
        <header><h3>Votre réserve <span>{me.drawPileCount}</span></h3><p>Vous seul voyez ces cartes · Glissez pour recruter</p></header>
        <div className="manual-reserve-cards">{reserves.map((card) => {
          const entered = card.enteredQuantity ?? card.deploymentQuantity
          const next = { kind: 'reserve' as const, id: card.stableId, entered }
          return <div key={card.stableId} className="manual-reserve-card" draggable={!locked} onDragStart={(event) => beginDrag(next, event)} onDragEnd={cancelDrag} data-reserve-id={card.stableId}>
            <UnitCard card={card} costPlacement="footer" footer={<><span>×{card.quantity - entered}</span><button type="button" className="ui-button" disabled={locked} aria-label={`Recruter ${card.name}`} aria-pressed={source?.kind === 'reserve' && source.id === card.stableId} onClick={() => setSource(next)}>Recruter</button></>} />
          </div>
        })}{!reserves.length && <p className="manual-empty">Toutes vos unités sont entrées en jeu.</p>}</div>
        <p className="manual-enemy-reserve">Réserve de {opponent.displayName} : <strong>{opponent.drawPileCount} unités</strong> <span aria-hidden="true">▰ ▰ ▰</span></p>
      </section>
      {manual.discarded.some((unit) => unit.seat === me.seat) && <details className="manual-discard"><summary>Votre défausse · {manual.discarded.filter((unit) => unit.seat === me.seat).length}</summary><p>Une erreur ? Remettez une unité sur une case libre.</p>{manual.discarded.filter((unit) => unit.seat === me.seat).map((unit) => <button type="button" key={unit.id} disabled={locked} className="ui-button" draggable={!locked} onDragStart={(event) => beginDrag({ kind: 'discard', id: unit.id }, event)} onDragEnd={cancelDrag} onClick={() => setSource({ kind: 'discard', id: unit.id })}>Remettre {cardFor(unit).name} · {unit.regiment} R</button>)}</details>}
      <details className="manual-journal"><summary>Journal des déplacements et engagements</summary><ol>{engine.log.slice(-20).reverse().map((item) => <li key={item.id}><small>Tour {item.turn}</small> {item.text}</li>)}</ol></details>
    </div>
    <aside className="manual-sidebar" aria-label="Outils de bataille">
      {selected && <section className="manual-panel manual-selected" aria-label="Unité sélectionnée"><header><h3>{unitName(selected)}</h3><button type="button" className="manual-icon-button" aria-label="Fermer la sélection" onClick={() => { setSelectedId(undefined); setSource(null) }}>×</button></header><div className="manual-selected-r"><span>Points de régiment</span><Counter label={`R de ${unitName(selected)}`} value={selected.regiment} busy={locked} onChange={(delta) => run(() => regiment({ gameId: game.id, unitId: selected.id, delta }))} /></div><button type="button" className="manual-text-button" disabled={locked} onClick={() => { setSource(null); run(() => discard({ gameId: game.id, unitId: selected.id })) }}>Retirer du plateau</button></section>}
      <section className="manual-panel manual-duel" aria-label="Aide au combat">
        <header><h3>Aide au combat</h3>{attacker && <button type="button" className="manual-icon-button" aria-label="Effacer la comparaison" disabled={locked} onClick={() => run(() => duel({ gameId: game.id }))}>×</button>}</header>
        <label>Attaquant<select aria-label="Attaquant" disabled={locked} value={attacker?.id ?? ''} onChange={(event) => run(() => duel({ gameId: game.id, ...(event.target.value ? { attackerId: event.target.value } : {}) }))}><option value="">Clic droit sur une unité</option>{engine.units.map((unit) => <option key={unit.id} value={unit.id}>{unitName(unit)}</option>)}</select></label>
        <label>Défenseur<select aria-label="Défenseur" disabled={locked || !attacker} value={target?.id ?? ''} onChange={(event) => run(() => duel({ gameId: game.id, attackerId: attacker!.id, ...(event.target.value ? { targetId: event.target.value } : {}) }))}><option value="">Puis sur l’autre unité</option>{engine.units.filter((unit) => attacker && unit.seat !== attacker.seat).map((unit) => <option key={unit.id} value={unit.id}>{unitName(unit)}</option>)}</select></label>
        {attacker && target && attackProfile && <>
          <div className="manual-hit"><div><span>{ranged ? 'Tir' : 'Corps à corps'}</span><strong>{attackProfile.dice}<small> D6</small></strong></div><div><span>{attackProfile.offense.score ?? '—'}{ranged ? 'T' : 'C'} contre {defense} {ranged ? 'DT' : 'DC'}</span><strong>{rule ? `${rule.threshold}+` : '—'}</strong></div></div>
          {rule && rule.reroll !== 'none' && <p className="manual-reroll">{rule.reroll === 'fail' ? 'Relance possible des échecs, une fois.' : 'Chaque réussite doit être confirmée par une relance.'}</p>}
          <p className="manual-note">Profil de base. Vous gérez les bonus, les jets et les pertes de R.</p>
          <button type="button" className={`ui-button${engaged ? ' manual-engaged-button' : ''}`} disabled={locked} onClick={() => run(() => engage({ gameId: game.id, a: attacker.id, b: target.id, engaged: !engaged }))}>{engaged ? 'Retirer l’engagement' : 'Marquer un engagement'}</button>
        </>}
        {!attacker && <p className="manual-note">Deux clics droits affichent les dés et le seuil à atteindre.</p>}
      </section>
      <section className="manual-panel manual-dice-panel" aria-label="Lanceur de dés">
        <header><h3>Les dés</h3><span>D6</span></header>
        <div className="manual-dice-controls"><label>Nombre<input aria-label="Nombre de D6" type="number" min={1} max={100} value={diceCount} onChange={(event) => setDiceCount(Number(event.target.value))} /></label><button type="button" className="ui-button ui-button--primary" disabled={locked || !Number.isInteger(diceCount) || diceCount < 1 || diceCount > 100} onClick={() => run(() => roll({ gameId: game.id, count: diceCount }))}>Lancer</button></div>
        {attackProfile && attackProfile.dice > 0 && <button type="button" className="manual-text-button" onClick={() => setDiceCount(attackProfile.dice)}>Utiliser les {attackProfile.dice} dés de l’attaquant</button>}
        <div aria-live="polite" aria-atomic="true">{lastRoll ? <div key={lastRoll.id} className="manual-roll"><p>{game.players.find((player) => player.seat === lastRoll.seat)?.displayName} · {lastRoll.values.length} D6 · Tour {lastRoll.turn}</p><div className="manual-dice" aria-label={`Résultats : ${lastRoll.values.join(', ')}`}>{lastRoll.values.map((value, index) => <span key={index} className="manual-die" aria-hidden="true">{['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][value]}</span>)}</div></div> : <p className="manual-note">Les résultats seront visibles des deux joueurs.</p>}</div>
        {manual.dice.length > 1 && <details className="manual-dice-history"><summary>Jets précédents</summary><ol>{manual.dice.slice(0, -1).reverse().map((item) => <li key={item.id}>{game.players.find((player) => player.seat === item.seat)?.displayName} · T{item.turn} : {item.values.join(' · ')}</li>)}</ol></details>}
      </section>
      <section className="manual-panel" aria-label="Ordres de référence"><header><h3>Vos ordres</h3><span>{me.factionName}</span></header>{orderList(me.seat, true)}<details className="manual-opponent-orders"><summary>Ordres de {opponent.displayName}</summary>{orderList(opponent.seat, false)}</details></section>
    </aside>
  </section>
}

function Counter({ label, value, onChange, busy, minimum = 0 }: { label: string; value: number; onChange: (delta: -1 | 1) => void; busy: boolean; minimum?: number }) {
  return <div className="manual-counter"><button type="button" aria-label={`Diminuer ${label}`} disabled={busy || value <= minimum} onClick={() => onChange(-1)}>−</button><output aria-label={label}>{value}</output><button type="button" aria-label={`Augmenter ${label}`} disabled={busy || value >= 999} onClick={() => onChange(1)}>+</button></div>
}
function OrderInfo({ name, description }: { name: string; description: string }) {
  const id = useId()
  return <span className="manual-order-info" tabIndex={0} aria-describedby={id}>{name}<span id={id} role="tooltip">{description}</span></span>
}
