import { v } from 'convex/values'
import { battleUnitValidator } from './battleEngine'

export const manualValidator = v.object({
  stocks: v.array(v.object({ seat: v.number(), orderId: v.string(), remaining: v.number() })),
  duel: v.optional(v.object({ attackerId: v.string(), targetId: v.optional(v.string()) })),
  discarded: v.array(battleUnitValidator),
  dice: v.array(v.object({ id: v.number(), seat: v.number(), turn: v.number(), values: v.array(v.number()) })),
})
