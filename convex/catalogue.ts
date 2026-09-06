import { v } from 'convex/values'
import { query } from './_generated/server'
import { getUnitProfile } from '../shared/unitProfile'

export const listFactions = query({
  args: {},
  handler: async (ctx) => {
    const factions = await ctx.db
      .query('factions')
      .withIndex('by_status', (query) => query.eq('status', 'published'))
      .collect()

    const result = await Promise.all(
      factions.map(async (faction) => {
        const entity = await ctx.db.get(faction.entityId)

        if (!entity || entity.status !== 'published') {
          return null
        }

        return {
          stableId: faction.stableId,
          slug: faction.slug,
          name: faction.name,
          themeKey: faction.themeKey,
          entity: {
            stableId: entity.stableId,
            slug: entity.slug,
            name: entity.name,
          },
        }
      }),
    )

    return result
      .filter((faction) => faction !== null)
      .sort((first, second) => first.name.localeCompare(second.name, 'fr'))
  },
})

export const listCards = query({
  args: { factionStableId: v.string() },
  handler: async (ctx, args) => {
    const faction = await ctx.db
      .query('factions')
      .withIndex('by_stable_id', (query) =>
        query.eq('stableId', args.factionStableId),
      )
      .unique()

    if (!faction || faction.status !== 'published') {
      return []
    }

    const cards = await ctx.db
      .query('cards')
      .withIndex('by_faction_and_status', (query) =>
        query.eq('factionId', faction._id).eq('status', 'published'),
      )
      .collect()

    return cards
      .map((card) => ({
        stableId: card.stableId,
        name: card.name,
        kind: card.kind,
        cost: card.cost,
        deckLimit: card.deckLimit,
        life: card.life,
        attack: card.attack,
        unitType: card.unitType,
        abilities: card.abilities,
        profile: getUnitProfile(card),
        imagePath: card.imagePath,
        faction: {
          stableId: faction.stableId,
          name: faction.name,
          themeKey: faction.themeKey,
        },
      }))
      .sort((first, second) => {
        if (first.kind !== second.kind) {
          return first.kind === 'unit' ? -1 : 1
        }

        return first.name.localeCompare(second.name, 'fr')
      })
  },
})
