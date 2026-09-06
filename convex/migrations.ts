import { v } from 'convex/values'
import { internalMutation } from './_generated/server'
import { getUnitProfile } from '../shared/unitProfile'

// Backfill in bounded batches. Existing profiles, IDs and deck contents are preserved.
export const backfillUnitProfiles = internalMutation({
  args: { table: v.union(v.literal('cards'), v.literal('gameCards')), cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    const page = await ctx.db.query(args.table).paginate({ cursor: args.cursor, numItems: 100 })
    let updated = 0
    for (const card of page.page) {
      if (card.kind === 'unit' && !card.profile) {
        // Game copies use their own frozen legacy values, never the live catalogue.
        await ctx.db.patch(card._id, { profile: getUnitProfile(card) })
        updated++
      }
    }
    return { updated, scanned: page.page.length, isDone: page.isDone, continueCursor: page.continueCursor }
  },
})
