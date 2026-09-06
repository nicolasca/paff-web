import { v } from 'convex/values'
const roll = v.object({ attacker: v.string(), target: v.string(), dice: v.array(v.number()), rerolls: v.array(v.object({ index: v.number(), result: v.number() })), threshold: v.number(), modifier: v.number(), hits: v.number() })
export const engineValidator = v.object({
  units: v.array(v.object({ id: v.string(), seat: v.number(), cardStableId: v.string(), cell: v.number(), regiment: v.number(), movedTurn: v.optional(v.number()), shotTurn: v.optional(v.number()), chargedTurn: v.optional(v.number()) })),
  engagements: v.array(v.object({ a: v.string(), b: v.string() })),
  endedSeats: v.array(v.number()), chargesPassed: v.array(v.number()), combatStep: v.union(v.literal('charges'), v.literal('fights')), resolvedUnits: v.array(v.string()),
  activeOrder: v.optional(v.object({ chosenId: v.string(), orderId: v.string(), seat: v.number(), zone: v.optional(v.string()), usedUnits: v.array(v.string()), recruitmentSpent: v.number(), recruitmentBonus: v.number() })),
  fight: v.optional(v.object({ id: v.string(), unitIds: v.array(v.string()), targets: v.array(v.object({ unitId: v.string(), targetId: v.string() })), readySeats: v.array(v.number()) })),
  result: v.optional(v.object({ winner: v.union(v.number(), v.null()), reason: v.union(v.literal('annihilation'), v.literal('base'), v.literal('strategy'), v.literal('draw')) })),
  log: v.array(v.object({ id: v.number(), turn: v.number(), text: v.string(), rolls: v.array(roll) })),
})
