import { v } from 'convex/values'
import { engineValidator } from './battleEngine'
import { manualValidator } from './manualBattle'

export const battleValidator = v.object({
  manual: manualValidator, engine: engineValidator,
  revision: v.number(), turn: v.number(), strategyPoints: v.array(v.number()),
  catalog: v.array(v.object({ id: v.string(), name: v.string(), faction: v.string(), category: v.union(v.literal('common'), v.literal('classic'), v.literal('advanced'), v.literal('rare'), v.literal('legendary')), description: v.string(), limit: v.optional(v.number()), seats: v.array(v.number()) })),
})
