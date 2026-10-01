import { axisOf, type BattleUnit } from './battleEngine'

export const GREAT_INVOCATION_ID = 'great-invocation'
export const INVOCATION_AXES = ['Flanc coco', 'Centre', 'Flanc aux pommes'] as const
export type InvocationScope = 0 | 1 | 2 | 'all'
export type InvocationEffect = { seat: number; turn: number; scope: InvocationScope; unitIds: string[] }
export const GOBLIN_SHAMAN_ID = 'gobelins-shaman-gobelin'
export type InvocationRoll = {
  id: number; seat: number; turn: number; value: number; axis: 0 | 1 | 2; scope: InvocationScope
  shaman?: { id: string; name: string; cell: number }
  units: { id: string; name: string; cell: number; before: number; after: number }[]
}

export const invocationScopeName = (scope: InvocationScope) => scope === 'all' ? 'Les trois axes' : INVOCATION_AXES[scope]
export function invocationEligible(unit: BattleUnit, seat: number, scope: InvocationScope) {
  return unit.seat === seat && unit.regiment > 0 && unit.cardStableId.startsWith('gobelins-')
    && !['gobelins-meneurs-de-troll', 'gobelins-djil-meneur-de-trolls'].includes(unit.cardStableId)
    && (scope === 'all' || axisOf(unit.cell) === scope)
}
export function underInvocation(unit: BattleUnit, effects: InvocationEffect[] | undefined, turn: number) {
  return unit.regiment > 0 && Boolean(effects?.some((effect) => effect.seat === unit.seat && effect.turn === turn && effect.unitIds.includes(unit.id)))
}
