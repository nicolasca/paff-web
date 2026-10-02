import { isEngaged } from '../../../shared/battleEngine'
import { useEffect, useId, useRef, useState, type DragEvent } from 'react'
import { cellCoordinate, displayCell } from '../../../shared/board'
import { getUnitProfile } from '../../../shared/unitProfile'
import { CardPreview } from '../catalogue/CardPreview'
import type { Game, GamePlayer } from './types'
import '../catalogue/factionTheme.css'
import './TacticalBoard.css'
import { EngagementLines } from './EngagementLines'
import type { AttackKind } from '../../../shared/combat'
import { INVOCATION_AXES, underInvocation } from '../../../shared/greatInvocation'
import { FactionEmblem } from '../catalogue/FactionEmblem'
import { battlefieldAppearance } from './battlefieldAppearance'
import { BattlefieldScenery } from './BattlefieldScenery'
import { isCombatPresent, isHeld, FOREST_SPIRITS_ID } from '../../../shared/autoCombat'

const bands = [[0], [1], [2, 3], [4], [5]]
const axes = [[0, 1], [2, 3, 4, 5, 6], [7, 8]]
const bandNames = ['Arrière adverse', 'Base adverse', 'Centre stratégique', 'Votre base', 'Votre arrière']
const factionKey = (player: GamePlayer) => player.deployedCards[0]?.faction.stableId ?? player.cards[0]?.faction.stableId ?? player.factionName?.toLowerCase()

export function TacticalBoard({ game, allowedCells = [], onPlace, onReposition, placeLabel = 'Déployer ici', busy = false, onUnit, selectedCell, interaction, aiming = false, activeAttackKind, shootingTargets = [], shootingSourceCell }: {
  aiming?: boolean; activeAttackKind?: AttackKind
  shootingTargets?: { cell: number; distance: number }[]; shootingSourceCell?: number
  onUnit?: (cell: number) => void; selectedCell?: number; game: Game; allowedCells?: number[]; onPlace?: (cell: number) => void; onReposition?: (cell: number) => void; placeLabel?: string; busy?: boolean
  interaction?: { canDrag: (cell: number) => boolean; onDrag: (cell: number, event: DragEvent<HTMLButtonElement>) => void; onDragEnd: () => void; onDrop: (cell: number) => void; onCompare: (cell: number) => void; dragging: boolean }
}) {
  const readOnly = game.isSpectator
  const me = game.players.find((player) => player.isMe) ?? game.players.find((player) => player.seat === 0)!
  const axisNames = me.seat === 1 ? [...INVOCATION_AXES].reverse() : INVOCATION_AXES
  const opponent = game.players.find((player) => player.seat !== me.seat)!
  const battlefield = battlefieldAppearance(game.battlefield)
  const zoneNames = readOnly ? ['Arrière nord', 'Base nord', 'Centre stratégique', 'Base sud', 'Arrière sud'] : bandNames
  const [inspected, setInspected] = useState<number | null>(null)
  const previewId = useId()
  const surface = useRef<HTMLDivElement>(null)
  const previewTrigger = useRef<HTMLElement | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [hovered, setHovered] = useState<{ cell: number; x: number; y: number } | null>(null)
  function keepPreview() { clearTimeout(closeTimer.current) }
  function hidePreviewSoon() {
    keepPreview()
    closeTimer.current = setTimeout(() => setHovered(null), 300)
  }
  function showPreview(cell: number, element: HTMLElement) {
    keepPreview()
    previewTrigger.current = element
    const rect = element.getBoundingClientRect()
    setHovered({ cell, x: rect.right, y: rect.top })
  }
  useEffect(() => {
    const dismiss = () => setHovered(null)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (document.getElementById(previewId)?.contains(document.activeElement)) previewTrigger.current?.focus()
        dismiss()
      }
      if (event.key === 'Tab' && !event.shiftKey && document.activeElement === previewTrigger.current) {
        const ability = document.getElementById(previewId)?.querySelector('button')
        if (ability) { event.preventDefault(); ability.focus() }
      }
    }
    const onScroll = (event: Event) => {
      if (!(event.target instanceof Element) || !event.target.closest('.card-preview, .ability-tooltip')) dismiss()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', dismiss)
    return () => { clearTimeout(closeTimer.current); window.removeEventListener('keydown', onKey); window.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', dismiss) }
  }, [previewId])
  function unitAt(cell: number) {
    const unit = (game.battle?.engine?.units ?? game.setup?.units)?.find((item) => item.cell === cell)
    const owner = game.players.find((player) => player.seat === unit?.seat)
    const card = owner?.deployedCards.find((item) => item.stableId === unit?.cardStableId)
    const runtime = game.battle?.engine?.units.find((item) => item.cell === cell)
    return card && owner ? { card, owner, runtime } : undefined
  }
  const detail = inspected === null ? undefined : unitAt(inspected)
  const previewUnit = hovered && unitAt(hovered.cell)
  return <div className="tactical-board" data-battlefield={battlefield.theme}>
    <header className="battlefield-heading" aria-label="Champ de bataille">
      <span className="battlefield-heading__crest"><FactionEmblem theme={battlefield.theme} /></span>
      <div><span>Champ de bataille · {battlefield.faction}</span><strong>{battlefield.name}</strong></div>
      <span className="battlefield-heading__ornament" aria-hidden="true"><i />◆<i /></span>
    </header>
    <div className="board-camp-label" data-faction={factionKey(opponent)}><span className="board-army-sigil" aria-hidden="true">◆</span><strong>{opponent.factionName ?? 'Armée adverse'}</strong><span>{opponent.displayName} · {readOnly ? 'Camp nord' : 'Adversaire'}</span></div>
    <p className="board-mobile-hint">↔ Faites défiler le plateau horizontalement</p>
    <div className="board-scroll" tabIndex={0} role="region" aria-label="Plateau de 54 cases et 15 zones, défilement horizontal sur petit écran">
      <div className="board-surface" ref={surface}>
        <BattlefieldScenery theme={battlefield.theme} />
        {game.battle?.manual && <EngagementLines surface={surface} units={game.battle.engine!.units} engagements={game.battle.engine!.engagements} arrows={game.battle.manual.combat?.arrows} activeKind={activeAttackKind} />}
        <div className="board-axis">{axisNames.map((name) => <span key={name}>{name}</span>)}</div>
        <div className="board-zones">{bands.flatMap((rows, band) => axes.map((columns, axis) => <div
          key={`${band}-${axis}`} className={`board-zone board-zone--${band < 2 ? 'opponent' : band === 2 ? 'strategic' : 'you'}`}
          role="group" aria-label={`${zoneNames[band]} · ${axisNames[axis]}`}>
          <span className="board-zone__label">{axis === 1 ? zoneNames[band] : band === 2 ? '✦' : band === 0 || band === 4 ? 'Arrière' : 'Base'}</span>
          <div className="board-zone__cells" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>{rows.flatMap((row) => columns.map((column) => {
            const cell = displayCell(row * 9 + column, me.seat)
            const unit = unitAt(cell)
            const allowed = !readOnly && allowedCells.includes(cell)
            const engaged = Boolean(unit?.runtime && isEngaged(game.battle!.engine!, unit.runtime.id))
            const battleRole = unit?.runtime && game.battle?.manual?.duel ? unit.runtime.id === game.battle.manual.duel.attackerId ? 'attacker' : unit.runtime.id === game.battle.manual.duel.targetId ? 'defender' : undefined : undefined
            const rain = unit?.runtime && game.battle?.manual?.combat?.rain.find((effect) => effect.unitId === unit.runtime!.id && effect.turn === game.battle!.turn)
            const invoked = unit?.runtime && underInvocation(unit.runtime, game.battle?.manual?.combat?.invocations, game.battle!.turn)
            const combat = game.battle?.manual?.combat
            const forest = unit?.runtime && unit.runtime.cardStableId === FOREST_SPIRITS_ID && isCombatPresent(unit.runtime, combat, game.battle!.turn) && combat?.forestWrath?.some((effect) => effect.seat === unit.runtime!.seat && effect.turn === game.battle!.turn)
            const held = unit?.runtime && isHeld(unit.runtime, combat, game.battle!.turn)
            const meleeArrow = unit?.runtime && combat?.arrows.find((arrow) => arrow.kind === 'melee' && arrow.attackerId === unit.runtime!.id)
            const troll = unit?.runtime && (combat?.trollRolls?.find((roll) => roll.unitId === unit.runtime!.id && roll.targetId === meleeArrow?.targetId) ?? combat?.trollRolls?.findLast((roll) => roll.unitId === unit.runtime!.id))
            const boosted = invoked || forest
            const choosingShot = !readOnly && shootingSourceCell !== undefined
            const shootingTarget = choosingShot ? shootingTargets.find((target) => target.cell === cell) : undefined
            const outsideRange = choosingShot && unit && unit.owner.seat !== me.seat && !shootingTarget
            const rangeDescription = shootingTarget ? `Cible à portée : ${shootingTarget.distance} case${shootingTarget.distance > 1 ? 's' : ''}` : outsideRange ? 'Cible indisponible pour ce tir' : undefined
            const descriptionIds = [hovered?.cell === cell ? previewId : undefined, rangeDescription ? `${previewId}-shot-${cell}` : undefined].filter(Boolean).join(' ') || undefined
            const content = <>{unit ? <><img src={unit.card.imagePath} alt="" /><span className="board-unit__regiment" title={interaction && unit.owner.isMe && !aiming && !held ? 'Cliquez cette unité pour modifier ses R' : 'Points de régiment'}>{unit.runtime?.regiment ?? getUnitProfile(unit.card)?.regiment}<small>R</small></span><strong>{unit.card.name}</strong>{boosted && <><span className="board-unit__invocation-aura" aria-hidden="true" /><span className="board-unit__invocation" title={forest ? 'Colère de la Forêt : dés de profil doublés au corps à corps jusqu’à la fin du tour' : 'La gross Invokation ! : dés du profil doublés jusqu’à la fin du tour'}>×2 D</span></>}{held && <span className="board-unit__held" title="Pour la Gaeli ! : à 0 R, peut seulement combattre jusqu’à la fin du tour">Dernier combat</span>}{troll && <span className="board-unit__troll" title={`Trollitude : ${troll.value === 1 ? 'attaque un allié adjacent' : troll.value <= 3 ? 'aucune attaque' : 'attaque normalement'}`}>D6 {troll.value}</span>}{rain && <span className="board-unit__rain" title={`Pluie de gobs : −${rain.penalty} dés ce tour`}>−{rain.penalty} D</span>}{engaged && <span className="board-unit__engaged" title="Unité engagée">⚔</span>}</> : <span className="board-cell__mark" aria-hidden="true">{allowed ? '+' : '·'}</span>}<span className="board-cell__coordinate" aria-hidden="true">{cellCoordinate(cell)}</span></>
            const className = `board-cell${unit ? ` board-unit board-unit--${unit.owner.seat === me.seat ? 'you' : 'opponent'}` : ''}${allowed ? ' board-cell--allowed' : ''}${!readOnly && cell === (selectedCell ?? inspected) ? ' board-cell--selected' : ''}${engaged && (interaction || readOnly) ? ' board-unit--engaged' : ''}${battleRole ? ` board-unit--${battleRole}` : ''}${boosted ? ' board-unit--invoked' : ''}${held ? ' board-unit--held' : ''}${shootingTarget ? ' board-unit--shooting-target' : ''}${outsideRange ? ' board-unit--outside-range' : ''}${choosingShot && cell === shootingSourceCell ? ' board-unit--shooting-source' : ''}`
            const label = `${cellCoordinate(cell)}${allowed ? ` · ${placeLabel}` : ''}${unit ? ` · ${unit.card.name} · ${unit.owner.displayName}${invoked ? ' · La gross Invokation !, dés de profil ×2' : ''}${forest ? ' · Colère de la Forêt, dés de profil ×2 en combat' : ''}${held ? ' · Dernier combat, 0 R' : ''}${troll ? ` · Trollitude, dé ${troll.value}` : ''}` : allowed ? '' : ' · Case vide'}`
            if (readOnly && unit) return <div key={cell} role="img" tabIndex={0} data-cell={cell} data-unit-id={unit.runtime?.id} data-faction={unit.card.faction.stableId} data-battle-role={battleRole} className={`${className} board-unit--spectator`} aria-label={`${label} · ${unit.runtime?.regiment ?? getUnitProfile(unit.card)?.regiment} R`} aria-describedby={hovered?.cell === cell ? previewId : undefined}
              onMouseEnter={(event) => showPreview(cell, event.currentTarget)}
              onMouseLeave={hidePreviewSoon}
              onFocus={(event) => showPreview(cell, event.currentTarget)}
              onBlur={hidePreviewSoon}
            >{content}{battleRole && <span className="board-unit__role">{battleRole === 'attacker' ? 'Att.' : 'Déf.'}</span>}</div>
            return unit || allowed ? <button key={cell} type="button" data-cell={cell} data-unit-id={unit?.runtime?.id} data-faction={unit?.card.faction.stableId} data-battle-role={battleRole} data-shooting-target={choosingShot && unit?.owner.seat !== me.seat ? Boolean(shootingTarget) : undefined} className={className} aria-label={label} aria-description={rangeDescription} aria-describedby={descriptionIds} aria-pressed={unit ? cell === (selectedCell ?? inspected) : undefined} disabled={busy && (allowed || Boolean(onUnit))}
              draggable={!busy && Boolean(interaction?.canDrag(cell))}
              onDragStart={(event) => { setHovered(null); interaction?.onDrag(cell, event) }}
              onDragEnd={() => interaction?.onDragEnd()}
              onDragEnter={(event) => { if (allowed && !busy && interaction) event.preventDefault() }}
              onDragOver={(event) => { if (allowed && !busy && interaction) { event.preventDefault(); event.dataTransfer.dropEffect = 'move' } }}
              onDrop={(event) => { event.preventDefault(); if (allowed && !busy) interaction?.onDrop(cell) }}
              onContextMenu={(event) => { if (unit && interaction) { event.preventDefault(); setHovered(null); if (!busy) interaction.onCompare(cell) } }}
              onKeyDown={(event) => { if (interaction && unit && (event.key === 'c' || event.key === 'C')) { event.preventDefault(); if (!busy) interaction.onCompare(cell) } }}
              onMouseEnter={(event) => unit && !interaction?.dragging && showPreview(cell, event.currentTarget)}
              onMouseLeave={hidePreviewSoon}
              onFocus={(event) => { if (unit) showPreview(cell, event.currentTarget) }}
              onBlur={hidePreviewSoon}
              onClick={(event) => {
                if (allowed) { setHovered(null); onPlace?.(cell) }
                else if (unit) {
                  if (onUnit) onUnit(cell)
                  else setInspected(cell === inspected ? null : cell)
                  if (!aiming) showPreview(cell, event.currentTarget)
                  else setHovered(null)
                }
              }}>{content}{rangeDescription && <span id={`${previewId}-shot-${cell}`} className="board-unit__shooting-description">{rangeDescription}</span>}{shootingTarget && <span className="board-unit__shooting-target" aria-hidden="true"><span>◎</span>{shootingTarget.distance} case{shootingTarget.distance > 1 ? 's' : ''}</span>}{choosingShot && cell === shootingSourceCell && <span className="board-unit__shooting-source" aria-hidden="true">Tireur</span>}{battleRole && <span className="board-unit__role">{battleRole === 'attacker' ? 'Att.' : 'Déf.'}</span>}</button>
              : <div key={cell} data-cell={cell} className={className} aria-label={label}>{content}</div>
          }))}</div>
        </div>))}</div>
      </div>
    </div>
    <div className="board-camp-label board-camp-label--you" data-faction={factionKey(me)}><span className="board-army-sigil" aria-hidden="true">◆</span><strong>{me.factionName ?? 'Votre armée'}</strong><span>{me.displayName} · {readOnly ? 'Camp sud' : 'Votre camp'}</span></div>
    {!readOnly && detail && onReposition && detail.owner.isMe && <div className="board-inspection" aria-label="Correction du placement">
      <div><p className="eyebrow">{detail.owner.displayName} · {cellCoordinate(inspected!)}</p><h3>{detail.card.name}</h3></div>
      <button type="button" className="ui-button" disabled={busy} onClick={() => { setHovered(null); onReposition(inspected!) }}>Changer de case</button>
      <button type="button" className="ui-button ui-button--quiet" onClick={() => setInspected(null)}>Fermer</button>
    </div>}
    {previewUnit && hovered && !interaction?.dragging && <CardPreview id={previewId} x={hovered.x} y={hovered.y} interactive onEnter={keepPreview} onLeave={hidePreviewSoon} card={previewUnit.card} />}
    <p className="board-caption">3 axes · 15 zones · 54 cases <span>✦ Zones stratégiques</span></p>
  </div>
}
