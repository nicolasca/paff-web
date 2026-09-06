import { v } from 'convex/values'

const chosenOrder = v.object({ id: v.string(), seat: v.number(), orderId: v.string(), status: v.union(v.literal('selected'), v.literal('passed')) })
export const battleValidator = v.object({
  revision: v.number(), turn: v.number(), phase: v.union(v.literal('orders'), v.literal('actions'), v.literal('combat'), v.literal('end_turn'), v.literal('finished')),
  initiativeSeat: v.number(), actingSeat: v.number(), allowance: v.array(v.number()), strategyPoints: v.array(v.number()), draftPoints: v.array(v.number()), readySeats: v.array(v.number()),
  catalog: v.array(v.object({ id: v.string(), name: v.string(), faction: v.string(), category: v.union(v.literal('common'), v.literal('classic'), v.literal('advanced'), v.literal('rare'), v.literal('legendary')), description: v.string(), limit: v.optional(v.number()), seats: v.array(v.number()) })),
  orders: v.array(chosenOrder), used: v.array(v.object({ seat: v.number(), orderId: v.string(), count: v.number() })),
  history: v.array(v.object({ turn: v.number(), initiativeSeat: v.number(), orders: v.array(chosenOrder), strategyPoints: v.array(v.number()) })),
})
