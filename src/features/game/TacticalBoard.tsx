import { isEngaged } from '../../../shared/battleEngine'
import { useEffect, useId, useRef, useState, type DragEvent } from 'react'
import { cellCoordinate, displayCell } from '../../../shared/board'
import { getUnitProfile } from '../../../shared/unitProfile'
import { CardPreview } from '../catalogue/CardPreview'
import type { Game, GamePlayer } from './types'
import '../catalogue/factionTheme.css'
import './TacticalBoard.css'
import { EngagementLines } from './EngagementLines'

const bands = [[0], [1], [2, 3], [4], [5]]
const axes = [[0, 1], [2, 3, 4, 5, 6], [7, 8]]
const bandNames = ['Arrière adverse', 'Base adverse', 'Centre stratégique', 'Votre base', 'Votre arrière']
const factionKey = (player: GamePlayer) => player.deployedCards[0]?.faction.stableId ?? player.cards[0]?.faction.stableId ?? player.factionName?.toLowerCase()

export function TacticalBoard({ game, allowedCells = [], onPlace, onReposition, placeLabel = 'Déployer ici', busy = false, onUnit, selectedCell, interaction }: {
  onUnit?: (cell: number) => void; selectedCell?: number; game: Game; allowedCells?: number[]; onPlace?: (cell: number) => void; onReposition?: (cell: number) => void; placeLabel?: string; busy?: boolean
  interaction?: { canDrag: (cell: number) => boolean; onDrag: (cell: number, event: DragEvent<HTMLButtonElement>) => void; onDragEnd: () => void; onDrop: (cell: number) => void; onCompare: (cell: number) => void; dragging: boolean }
}) {
  const readOnly = game.isSpectator
  const me = game.players.find((player) => player.isMe) ?? game.players.find((player) => player.seat === 0)!
  const opponent = game.players.find((player) => player.seat !== me.seat)!
  const zoneNames = readOnly ? ['Arrière nord', 'Base nord', 'Centre stratégique', 'Base sud', 'Arrière sud'] : bandNames
  const [inspected, setInspected] = useState<number | null>(null)
  const previewId = useId()
  const surface = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState<{ cell: number; x: number; y: number } | null>(null)
  useEffect(() => {
    const dismiss = () => setHovered(null)
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss() }
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', dismiss, true)
    window.addEventListener('resize', dismiss)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('scroll', dismiss, true); window.removeEventListener('resize', dismiss) }
  }, [])
  function unitAt(cell: number) {
    const unit = (game.battle?.engine?.units ?? game.setup?.units)?.find((item) => item.cell === cell)
    const owner = game.players.find((player) => player.seat === unit?.seat)
    const card = owner?.deployedCards.find((item) => item.stableId === unit?.cardStableId)
    const runtime = game.battle?.engine?.units.find((item) => item.cell === cell)
    return card && owner ? { card, owner, runtime } : undefined
  }
  const detail = inspected === null ? undefined : unitAt(inspected)
  const previewUnit = hovered && unitAt(hovered.cell)
  const previewProfile = previewUnit && getUnitProfile(previewUnit.card)
  return <div className="tactical-board">
    <div className="board-camp-label" data-faction={factionKey(opponent)}><span className="board-army-sigil" aria-hidden="true">◆</span><strong>{opponent.factionName ?? 'Armée adverse'}</strong><span>{opponent.displayName} · {readOnly ? 'Camp nord' : 'Adversaire'}</span></div>
    <p className="board-mobile-hint">↔ Faites défiler le plateau horizontalement</p>
    <div className="board-scroll" tabIndex={0} role="region" aria-label="Plateau de 54 cases et 15 zones, défilement horizontal sur petit écran">
      <div className="board-surface" ref={surface}>
        {game.battle?.manual && <EngagementLines surface={surface} units={game.battle.engine!.units} engagements={game.battle.engine!.engagements} />}
        <div className="board-axis"><span>Flanc coco</span><span>Centre</span><span>Flanc aux pommes</span></div>
        <div className="board-zones">{bands.flatMap((rows, band) => axes.map((columns, axis) => <div
          key={`${band}-${axis}`} className={`board-zone board-zone--${band < 2 ? 'opponent' : band === 2 ? 'strategic' : 'you'}`}
          role="group" aria-label={`${zoneNames[band]} · ${['Flanc coco', 'Centre', 'Flanc aux pommes'][axis]}`}>
          <span className="board-zone__label">{axis === 1 ? zoneNames[band] : band === 2 ? '✦' : band === 0 || band === 4 ? 'Arrière' : 'Base'}</span>
          <div className="board-zone__cells" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>{rows.flatMap((row) => columns.map((column) => {
            const cell = displayCell(row * 9 + column, me.seat)
            const unit = unitAt(cell)
            const allowed = !readOnly && allowedCells.includes(cell)
            const engaged = Boolean(unit?.runtime && isEngaged(game.battle!.engine!, unit.runtime.id))
            const battleRole = unit?.runtime && game.battle?.manual?.duel ? unit.runtime.id === game.battle.manual.duel.attackerId ? 'attacker' : unit.runtime.id === game.battle.manual.duel.targetId ? 'defender' : undefined : undefined
            const content = <>{unit ? <><img src={unit.card.imagePath} alt="" /><span className="board-unit__regiment" title={interaction && unit.owner.isMe ? 'Cliquez cette unité pour modifier ses R' : 'Points de régiment'}>{unit.runtime?.regiment ?? getUnitProfile(unit.card)?.regiment}<small>R</small></span><strong>{unit.card.name}</strong>{engaged && <span className="board-unit__engaged" title="Unité engagée">⚔</span>}</> : <span className="board-cell__mark" aria-hidden="true">{allowed ? '+' : '·'}</span>}<span className="board-cell__coordinate" aria-hidden="true">{cellCoordinate(cell)}</span></>
            const className = `board-cell${unit ? ` board-unit board-unit--${unit.owner.seat === me.seat ? 'you' : 'opponent'}` : ''}${allowed ? ' board-cell--allowed' : ''}${!readOnly && cell === (selectedCell ?? inspected) ? ' board-cell--selected' : ''}${engaged && (interaction || readOnly) ? ' board-unit--engaged' : ''}${battleRole ? ` board-unit--${battleRole}` : ''}`
            const label = `${cellCoordinate(cell)}${allowed ? ` · ${placeLabel}` : ''}${unit ? ` · ${unit.card.name} · ${unit.owner.displayName}` : allowed ? '' : ' · Case vide'}`
            if (readOnly && unit) return <div key={cell} role="img" tabIndex={0} data-cell={cell} data-unit-id={unit.runtime?.id} data-faction={unit.card.faction.stableId} data-battle-role={battleRole} className={`${className} board-unit--spectator`} aria-label={`${label} · ${unit.runtime?.regiment ?? getUnitProfile(unit.card)?.regiment} R`} aria-describedby={hovered?.cell === cell ? previewId : undefined}
              onMouseEnter={(event) => setHovered({ cell, x: event.clientX, y: event.clientY })}
              onMouseMove={(event) => hovered?.cell === cell && setHovered({ cell, x: event.clientX, y: event.clientY })}
              onMouseLeave={() => setHovered(null)}
              onFocus={(event) => { const rect = event.currentTarget.getBoundingClientRect(); setHovered({ cell, x: rect.right, y: rect.top }) }}
              onBlur={() => setHovered(null)}
            >{content}{battleRole && <span className="board-unit__role">{battleRole === 'attacker' ? 'Att.' : 'Déf.'}</span>}</div>
            return unit || allowed ? <button key={cell} type="button" data-cell={cell} data-unit-id={unit?.runtime?.id} data-faction={unit?.card.faction.stableId} data-battle-role={battleRole} className={className} aria-label={label} aria-describedby={hovered?.cell === cell ? previewId : undefined} aria-pressed={unit ? cell === (selectedCell ?? inspected) : undefined} disabled={busy && (allowed || Boolean(onUnit))}
              draggable={!busy && Boolean(interaction?.canDrag(cell))}
              onDragStart={(event) => { setHovered(null); interaction?.onDrag(cell, event) }}
              onDragEnd={() => interaction?.onDragEnd()}
              onDragEnter={(event) => { if (allowed && !busy && interaction) event.preventDefault() }}
              onDragOver={(event) => { if (allowed && !busy && interaction) { event.preventDefault(); event.dataTransfer.dropEffect = 'move' } }}
              onDrop={(event) => { event.preventDefault(); if (allowed && !busy) interaction?.onDrop(cell) }}
              onContextMenu={(event) => { if (unit && interaction) { event.preventDefault(); setHovered(null); if (!busy) interaction.onCompare(cell) } }}
              onKeyDown={(event) => { if (interaction && unit && (event.key === 'c' || event.key === 'C')) { event.preventDefault(); if (!busy) interaction.onCompare(cell) } }}
              onMouseEnter={(event) => unit && !interaction?.dragging && setHovered({ cell, x: event.clientX, y: event.clientY })}
              onMouseMove={(event) => unit && hovered?.cell === cell && setHovered({ cell, x: event.clientX, y: event.clientY })}
              onMouseLeave={() => setHovered(null)}
              onFocus={(event) => { if (unit) { const rect = event.currentTarget.getBoundingClientRect(); setHovered({ cell, x: rect.right, y: rect.top }) } }}
              onBlur={() => setHovered(null)}
              onClick={(event) => {
                if (allowed) { setHovered(null); onPlace?.(cell) }
                else if (unit) {
                  if (onUnit) onUnit(cell)
                  else setInspected(cell === inspected ? null : cell)
                  const rect = event.currentTarget.getBoundingClientRect()
                  setHovered({ cell, x: rect.right, y: rect.top })
                }
              }}>{content}{battleRole && <span className="board-unit__role">{battleRole === 'attacker' ? 'Att.' : 'Déf.'}</span>}</button>
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
    {previewUnit && hovered && !interaction?.dragging && <CardPreview id={previewId} x={hovered.x} y={hovered.y} card={{ ...previewUnit.card, ...(previewProfile ? { profile: { ...previewProfile, regiment: previewUnit.runtime?.regiment ?? previewProfile.regiment } } : {}) }} />}
    <p className="board-caption">3 axes · 15 zones · 54 cases <span>✦ Zones stratégiques</span></p>
  </div>
}
