import { useEffect, useState, type RefObject } from 'react'
import type { BattleUnit, Engagement } from '../../../shared/battleEngine'

export function EngagementLines({ surface, units, engagements }: { surface: RefObject<HTMLDivElement | null>; units: BattleUnit[]; engagements: Engagement[] }) {
  const [lines, setLines] = useState<{ key: string; x1: number; y1: number; x2: number; y2: number }[]>([])
  // The surface belongs to the parent: its ref is attached after child layout effects.
  useEffect(() => {
    const board = surface.current
    if (!board) return
    const measure = () => {
      const bounds = board.getBoundingClientRect()
      setLines(engagements.flatMap((edge) => {
        const a = units.find((unit) => unit.id === edge.a)
        const b = units.find((unit) => unit.id === edge.b)
        const first = a && board.querySelector(`[data-cell="${a.cell}"]`)?.getBoundingClientRect()
        const second = b && board.querySelector(`[data-cell="${b.cell}"]`)?.getBoundingClientRect()
        if (!first || !second) return []
        return [{ key: `${edge.a}:${edge.b}`, x1: first.x + first.width / 2 - bounds.x, y1: first.y + first.height / 2 - bounds.y, x2: second.x + second.width / 2 - bounds.x, y2: second.y + second.height / 2 - bounds.y }]
      }))
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure)
    observer?.observe(board)
    return () => observer?.disconnect()
  }, [surface, units, engagements])
  return <svg className="manual-engagement-lines" aria-hidden="true">{lines.map(({ key, ...line }) => <line key={key} {...line} />)}</svg>
}
