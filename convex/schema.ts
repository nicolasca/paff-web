import { authTables } from '@convex-dev/auth/server'
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  ...authTables,
  playerProfiles: defineTable({
    userId: v.id('users'),
    loginId: v.string(),
    displayName: v.string(),
    role: v.union(v.literal('player'), v.literal('admin')),
    active: v.boolean(),
  })
    .index('by_user_id', ['userId'])
    .index('by_login_id', ['loginId']),
})
