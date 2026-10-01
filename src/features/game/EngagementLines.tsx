import { useEffect, useId, useState, type RefObject } from 'react'
import type { BattleUnit, Engagement } from '../../../shared/battleEngine'
import type { AttackArrow, AttackKind } from '../../../shared/combat'

const noArrows: AttackArrow[] = []
export function EngagementLines({ surface, units, engagements, arrows = noArrows, activeKind }: { surface: RefObject<HTMLDivElement | null>; units: BattleUnit[]; engagements: Engagement[]; arrows?: AttackArrow[]; activeKind?: AttackKind }) {
  const marker = useId().replaceAll(':', '')
  const [lines, setLines] = useState<{ key: string; x1: number; y1: number; x2: number; y2: number; kind?: AttackKind; seat: number }[]>([])
  // The surface belongs to the parent: its ref is attached after child layout effects.
  useEffect(() => {
    const board = surface.current
    if (!board) return
    const measure = () => {
      const bounds = board.getBoundingClientRect()
      const edges = [...engagements.filter((edge) => !arrows.some((arrow) => arrow.kind === 'melee' && [edge.a, edge.b].includes(arrow.attackerId) && [edge.a, edge.b].includes(arrow.targetId))).map((edge) => ({ ...edge, kind: undefined })), ...arrows.map((arrow) => ({ a: arrow.attackerId, b: arrow.targetId, kind: arrow.kind }))]
      setLines(edges.flatMap((edge) => {
        const a = units.find((unit) => unit.id === edge.a)
        const b = units.find((unit) => unit.id === edge.b)
        const first = a && board.querySelector(`[data-cell="${a.cell}"]`)?.getBoundingClientRect()
        const second = b && board.querySelector(`[data-cell="${b.cell}"]`)?.getBoundingClientRect()
        if (!first || !second) return []
        return [{ key: `${edge.kind}:${edge.a}:${edge.b}`, kind: edge.kind, seat: a!.seat, x1: first.x + first.width / 2 - bounds.x, y1: first.y + first.height / 2 - bounds.y, x2: second.x + second.width / 2 - bounds.x, y2: second.y + second.height / 2 - bounds.y }]
      }))
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure)
    observer?.observe(board)
    return () => observer?.disconnect()
  }, [surface, units, engagements, arrows])
  return <svg className="manual-engagement-lines" aria-hidden="true">
    <defs>{['ranged', 'melee-0', 'melee-1'].map((kind) => <marker key={kind} id={`${marker}-${kind}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L6,3 L0,6 L1.5,3 Z" fill={kind === 'ranged' ? '#8ee1ff' : kind === 'melee-0' ? '#ffc276' : '#ff7f83'} /></marker>)}</defs>
    {lines.map(({ key, kind, seat, ...line }) => {
      if (!kind) return <line key={key} {...line} />
      const dx = line.x2 - line.x1, dy = line.y2 - line.y1
      const length = Math.max(1, Math.hypot(dx, dy)), ux = dx / length, uy = dy / length
      const x1 = line.x1 + ux * 17, y1 = line.y1 + uy * 17, x2 = line.x2 - ux * 23, y2 = line.y2 - uy * 23
      const bend = kind === 'melee' ? 15 : 8
      const d = `M${x1},${y1} Q${(x1 + x2) / 2 - uy * bend},${(y1 + y2) / 2 + ux * bend} ${x2},${y2}`
      return <path key={key} d={d} className="combat-arrow" data-kind={kind} data-seat={seat} data-muted={Boolean(activeKind && kind !== activeKind)} markerEnd={`url(#${marker}-${kind === 'ranged' ? kind : `${kind}-${seat}`})`} />
    })}
  </svg>
}
