import { v } from 'convex/values'

export const gameSetupValidator = v.object({
  version: v.union(v.literal(2), v.literal(3)),
  revision: v.number(),
  initiativeRound: v.number(),
  initiativeRolls: v.array(v.object({ seat: v.number(), result: v.number(), round: v.number() })),
  initiativeWinner: v.optional(v.number()),
  initiativeReady: v.array(v.number()),
  deploymentTurn: v.number(),
  units: v.array(v.object({ seat: v.number(), cardStableId: v.string(), cell: v.number() })),
})
