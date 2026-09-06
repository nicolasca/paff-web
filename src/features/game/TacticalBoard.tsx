import { isEngaged } from '../../../shared/battleEngine'
import { useState } from 'react'
import { cellCoordinate, displayCell } from '../../../shared/board'
import { getUnitProfile } from '../../../shared/unitProfile'
import { SpecialAbility } from '../catalogue/SpecialAbility'
import { UnitProfileStats } from '../catalogue/UnitProfileStats'
import type { Game } from './types'
import './TacticalBoard.css'

const bands = [[0], [1], [2, 3], [4], [5]]
const axes = [[0, 1], [2, 3, 4, 5, 6], [7, 8]]
const bandNames = ['Arrière adverse', 'Base adverse', 'Centre stratégique', 'Votre base', 'Votre arrière']

export function TacticalBoard({ game, allowedCells = [], onPlace, onReposition, placeLabel = 'Déployer ici', busy = false, onUnit, selectedCell }: {
  onUnit?: (cell: number) => void; selectedCell?: number; game: Game; allowedCells?: number[]; onPlace?: (cell: number) => void; onReposition?: (cell: number) => void; placeLabel?: string; busy?: boolean
}) {
  const me = game.players.find((player) => player.isMe)!
  const opponent = game.players.find((player) => !player.isMe)!
  const [inspected, setInspected] = useState<number | null>(null)
  function unitAt(cell: number) {
    const unit = (game.battle?.engine?.units ?? game.setup?.units)?.find((item) => item.cell === cell)
    const owner = game.players.find((player) => player.seat === unit?.seat)
    const card = owner?.deployedCards.find((item) => item.stableId === unit?.cardStableId)
    const runtime = game.battle?.engine?.units.find((item) => item.cell === cell)
    return card && owner ? { card, owner, runtime } : undefined
  }
  const detail = inspected === null ? undefined : unitAt(inspected)
  const profile = detail && getUnitProfile(detail.card)
  return <div className="tactical-board">
    <div className="board-camp-label"><span className="board-side-dot board-side-dot--opponent" />{opponent.displayName}<span>Adversaire</span></div>
    <p className="board-mobile-hint">↔ Faites défiler le plateau horizontalement</p>
    <div className="board-scroll" tabIndex={0} role="region" aria-label="Plateau de 54 cases et 15 zones, défilement horizontal sur petit écran">
      <div className="board-surface">
        <div className="board-axis"><span>Flanc coco</span><span>Centre</span><span>Flanc aux pommes</span></div>
        <div className="board-zones">{bands.flatMap((rows, band) => axes.map((columns, axis) => <div
          key={`${band}-${axis}`} className={`board-zone board-zone--${band < 2 ? 'opponent' : band === 2 ? 'strategic' : 'you'}`}
          role="group" aria-label={`${bandNames[band]} · ${['Flanc coco', 'Centre', 'Flanc aux pommes'][axis]}`}>
          <span className="board-zone__label">{axis === 1 ? bandNames[band] : band === 2 ? '✦' : band === 0 || band === 4 ? 'Arrière' : 'Base'}</span>
          <div className="board-zone__cells" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>{rows.flatMap((row) => columns.map((column) => {
            const cell = displayCell(row * 9 + column, me.seat)
            const unit = unitAt(cell)
            const allowed = allowedCells.includes(cell)
            const content = <>{unit ? <><img src={unit.card.imagePath} alt="" /><span className="board-unit__regiment">{unit.runtime?.regiment ?? getUnitProfile(unit.card)?.regiment}<small>R</small></span><strong>{unit.card.name}</strong>{unit.runtime && isEngaged(game.battle!.engine!, unit.runtime.id) && <span className="board-unit__engaged">⚔</span>}</> : <span className="board-cell__mark" aria-hidden="true">{allowed ? '+' : '·'}</span>}<span className="board-cell__coordinate" aria-hidden="true">{cellCoordinate(cell)}</span></>
            const className = `board-cell${unit ? ` board-unit board-unit--${unit.owner.isMe ? 'you' : 'opponent'}` : ''}${allowed ? ' board-cell--allowed' : ''}${cell === (selectedCell ?? inspected) ? ' board-cell--selected' : ''}`
            const label = `${cellCoordinate(cell)}${allowed ? ` · ${placeLabel}` : ''}${unit ? ` · ${unit.card.name} · ${unit.owner.displayName}` : allowed ? '' : ' · Case vide'}`
            return unit || allowed ? <button key={cell} type="button" data-cell={cell} className={className} aria-label={label} aria-pressed={unit ? cell === inspected : undefined} disabled={busy && (allowed || Boolean(onUnit))} onClick={() => allowed ? onPlace?.(cell) : unit ? (onUnit ? onUnit(cell) : setInspected(cell === inspected ? null : cell)) : undefined}>{content}</button>
              : <div key={cell} data-cell={cell} className={className} aria-label={label}>{content}</div>
          }))}</div>
        </div>))}</div>
      </div>
    </div>
    <div className="board-camp-label board-camp-label--you"><span className="board-side-dot" />{me.displayName}<span>Votre camp</span></div>
    {detail && profile && <div className="board-inspection" aria-label={`Détails de ${detail.card.name}`}>
      <div><p className="eyebrow">{detail.owner.displayName} · {cellCoordinate(inspected!)}</p><h3>{detail.card.name}</h3></div>
      <UnitProfileStats profile={profile} compact />{detail.runtime && <p>{detail.runtime.regiment} R restants</p>}{profile.ability && <SpecialAbility ability={profile.ability} />}
      {onReposition && detail.owner.isMe && <button type="button" className="ui-button" disabled={busy} onClick={() => onReposition(inspected!)}>Changer de case</button>}
      <button type="button" className="ui-button ui-button--quiet" onClick={() => setInspected(null)}>Fermer</button>
    </div>}
    <p className="board-caption">3 axes · 15 zones · 54 cases <span>✦ Zones stratégiques</span></p>
  </div>
}
