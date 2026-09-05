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
  entities: defineTable({
    stableId: v.string(),
    slug: v.string(),
    name: v.string(),
    sourceCode: v.string(),
    status: v.union(
      v.literal('draft'),
      v.literal('published'),
      v.literal('archived'),
    ),
  }).index('by_stable_id', ['stableId']),
  factions: defineTable({
    stableId: v.string(),
    slug: v.string(),
    entityId: v.id('entities'),
    name: v.string(),
    themeKey: v.string(),
    status: v.union(
      v.literal('draft'),
      v.literal('published'),
      v.literal('archived'),
    ),
  })
    .index('by_stable_id', ['stableId'])
    .index('by_status', ['status']),
  cards: defineTable({
    stableId: v.string(),
    dataVersion: v.string(),
    factionId: v.id('factions'),
    name: v.string(),
    kind: v.union(v.literal('unit'), v.literal('action')),
    cost: v.optional(v.number()),
    deckLimit: v.optional(v.number()),
    life: v.optional(v.number()),
    attack: v.optional(v.number()),
    unitType: v.optional(v.string()),
    abilities: v.array(v.string()),
    imagePath: v.string(),
    sourceLine: v.number(),
    sourceNote: v.optional(v.string()),
    status: v.union(
      v.literal('draft'),
      v.literal('published'),
      v.literal('archived'),
    ),
  })
    .index('by_stable_id', ['stableId'])
    .index('by_faction_and_status', ['factionId', 'status']),
  decks: defineTable({
    ownerUserId: v.id('users'),
    factionId: v.optional(v.id('factions')),
    name: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_owner', ['ownerUserId']),
  deckCards: defineTable({
    deckId: v.id('decks'),
    cardId: v.id('cards'),
    quantity: v.number(),
    updatedAt: v.number(),
  })
    .index('by_deck', ['deckId'])
    .index('by_deck_and_card', ['deckId', 'cardId']),
})
