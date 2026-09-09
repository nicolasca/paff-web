import { v } from 'convex/values'
export const battleUnitValidator = v.object({ id: v.string(), seat: v.number(), cardStableId: v.string(), cell: v.number(), regiment: v.number() })
export const engineValidator = v.object({
  units: v.array(battleUnitValidator),
  engagements: v.array(v.object({ a: v.string(), b: v.string() })),
  log: v.array(v.object({ id: v.number(), turn: v.number(), text: v.string() })),
})
