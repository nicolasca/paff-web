import { useEffect, useState, type CSSProperties, type RefObject } from 'react'
import { FactionEmblem } from '../catalogue/FactionEmblem'
import type { BattleResolution, ResolutionEffect } from './useBattleResolution'
import './BattleResolutionEffects.css'

type PositionedEffect = { effect: ResolutionEffect; left: number; top: number; width: number; height: number }

function resultLabel(effect: ResolutionEffect) {
  if (effect.reason === 'sacrifice') return `${effect.name} : munition sacrifiée, défaussée.`
  if (effect.reason === 'shaman') return `${effect.name} : défaussée après le risque du Shaman.`
  const loss = Math.max(0, effect.before - effect.after)
  const ending = effect.outcome === 'destroyed' ? ', défaussée' : effect.outcome === 'held' ? ', conservée pour son Dernier combat' : ''
  return `${effect.name} : perd ${loss} R, ${effect.before} vers ${effect.after} R${ending}.`
}

// Layout offsets remain stable while the card itself shakes, shrinks or rises.
function cellBounds(cell: HTMLElement, board: HTMLDivElement) {
  let left = 0, top = 0
  let node: HTMLElement | null = cell
  while (node && node !== board) {
    left += node.offsetLeft
    top += node.offsetTop
    const parent: Element | null = node.offsetParent
    if (!(parent instanceof HTMLElement)) return undefined
    if (parent !== board) {
      left += parent.clientLeft
      top += parent.clientTop
    }
    node = parent
  }
  return node === board ? { left, top, width: cell.offsetWidth, height: cell.offsetHeight } : undefined
}

export function BattleResolutionEffects({ resolution, surface }: { resolution: BattleResolution; surface: RefObject<HTMLDivElement | null> }) {
  const [positions, setPositions] = useState<PositionedEffect[]>([])
  useEffect(() => {
    const board = surface.current
    if (!board) return
    const cells = resolution.effects.map((effect) => ({ effect, cell: board.querySelector<HTMLElement>(`[data-cell="${effect.unit.cell}"]`) }))
    const measure = () => setPositions(cells.flatMap(({ effect, cell }) => {
      const bounds = cell && cellBounds(cell, board)
      return bounds ? [{ effect, ...bounds }] : []
    }))
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure)
    observer?.observe(board)
    for (const { cell } of cells) if (cell) observer?.observe(cell)
    window.addEventListener('resize', measure)
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure) }
  }, [resolution, surface])

  return <>
    <div className="battle-resolution-effects" aria-hidden="true">
      {positions.map(({ effect, left, top, width, height }) => <div key={effect.unit.id} className="battle-resolution-effect" data-resolution-unit={effect.unit.id} data-faction={effect.faction} data-outcome={effect.outcome} data-reason={effect.reason} style={{ left, top, width, height, '--resolution-reach': `${Math.min(width, height) * .48}px` } as CSSProperties}>
        <span className="resolution-flash" /><span className="resolution-ring" />
        <span className="resolution-signature" /><span className="resolution-trail" />
        <span className="resolution-emblem"><FactionEmblem theme={effect.faction} /></span>
        <span className="resolution-particles">{Array.from({ length: 10 }, (_, index) => <i key={index} style={{ '--i': index } as CSSProperties} />)}</span>
        <strong className="resolution-loss">{effect.reason === 'sacrifice' ? 'Munition' : effect.reason === 'shaman' ? 'Risque Shaman' : `−${Math.max(0, effect.before - effect.after)} R`}</strong>
        {!effect.reason && <span className="resolution-regiment">{effect.before} → {effect.after} R</span>}
        {effect.outcome !== 'wounded' && <span className="resolution-result">{effect.outcome === 'held' ? 'Dernier combat' : 'Défaussée'}</span>}
      </div>)}
    </div>
    <p className="battle-resolution-announcement" role="status" aria-atomic="true">{resolution.effects.map(resultLabel).join(' ')}</p>
  </>
}
