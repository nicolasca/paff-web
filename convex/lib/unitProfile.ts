import { v } from 'convex/values'

export const unitProfileValidator = v.object({
  unitType: v.union(v.literal('troop'), v.literal('ranged'), v.literal('cavalry'), v.literal('artillery'), v.literal('elite'), v.literal('unique')),
  regiment: v.number(),
  dice: v.number(),
  offense: v.object({ kind: v.union(v.literal('melee'), v.literal('ranged')), score: v.union(v.number(), v.null()) }),
  defenseMelee: v.number(),
  defenseRanged: v.number(),
  defenseRangedFormat: v.optional(v.literal('threshold')),
  ability: v.optional(v.object({ name: v.string(), description: v.string() })),
  source: v.union(v.literal('estimated'), v.literal('defined')),
})
