import { v } from 'convex/values'

export const attackKindValidator = v.union(v.literal('ranged'), v.literal('melee'))
export const invocationAxisValidator = v.union(v.literal(0), v.literal(1), v.literal(2))
export const invocationScopeValidator = v.union(invocationAxisValidator, v.literal('all'))
const combatant = v.object({ id: v.string(), name: v.string(), seat: v.number(), cell: v.number() })
export const combatValidator = v.object({
  revision: v.number(),
  arrows: v.array(v.object({ kind: attackKindValidator, attackerId: v.string(), targetId: v.string(), allyId: v.optional(v.string()), slot: v.optional(v.number()), sacrificeId: v.optional(v.string()) })),
  ready: v.array(v.number()),
  rain: v.array(v.object({ unitId: v.string(), turn: v.number(), penalty: v.number() })),
  held: v.optional(v.array(v.object({ unitId: v.string(), turn: v.number() }))),
  forestWrath: v.optional(v.array(v.object({ seat: v.number(), turn: v.number() }))),
  trollRolls: v.optional(v.array(v.object({ unitId: v.string(), targetId: v.string(), value: v.number(), turn: v.number() }))),
  invocations: v.optional(v.array(v.object({ seat: v.number(), turn: v.number(), scope: invocationScopeValidator, unitIds: v.array(v.string()) }))),
  invocationRolls: v.optional(v.array(v.object({
    id: v.number(), seat: v.number(), turn: v.number(), value: v.number(), axis: invocationAxisValidator, scope: invocationScopeValidator,
    shaman: v.optional(v.object({ id: v.string(), name: v.string(), cell: v.number() })),
    units: v.array(v.object({ id: v.string(), name: v.string(), cell: v.number(), before: v.number(), after: v.number() })),
  }))),
  reports: v.array(v.object({
    id: v.number(), turn: v.number(), kind: attackKindValidator, seat: v.number(),
    attacks: v.array(v.object({ attacker: combatant, target: combatant, threshold: v.number(), offense: v.number(), defense: v.number(), dice: v.array(v.object({ value: v.number(), rerolled: v.optional(v.number()) })), hits: v.number(), damage: v.number(), rain: v.number(), effects: v.array(v.string()), slot: v.optional(v.number()) })),
    diversions: v.array(v.object({ attacker: combatant, ally: combatant, target: combatant, values: v.array(v.number()) })),
    losses: v.array(v.object({ unit: combatant, before: v.number(), after: v.number(), damage: v.number() })),
    sacrifices: v.optional(v.array(combatant)),
    shamanRisks: v.optional(v.array(v.object({ unit: combatant, value: v.number(), discarded: v.boolean() }))),
    held: v.optional(v.array(combatant)),
    orderId: v.optional(v.literal('concentrated-fire')),
  })),
})
