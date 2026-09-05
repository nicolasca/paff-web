import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { MutationCtx, QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { requireActivePlayer } from './lib/auth'

const deckId = v.id('decks')

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const player = await requireActivePlayer(ctx)
    const decks = await ctx.db
      .query('decks')
      .withIndex('by_owner', (query) => query.eq('ownerUserId', player.userId))
      .collect()

    return Promise.all(
      decks
        .sort((first, second) => second.updatedAt - first.updatedAt)
        .map(async (deck) => {
          const faction = deck.factionId ? await ctx.db.get(deck.factionId) : null
          const entries = await ctx.db
            .query('deckCards')
            .withIndex('by_deck', (query) => query.eq('deckId', deck._id))
            .collect()

          const cards = await Promise.all(
            entries.map(async (entry) => {
              const card = await ctx.db.get(entry.cardId)
              const cardFaction = card ? await ctx.db.get(card.factionId) : null
              return card
                ? {
                    stableId: card.stableId,
                    name: card.name,
                    quantity: entry.quantity,
                    cost: card.cost,
                    kind: card.kind,
                    life: card.life,
                    attack: card.attack,
                    deckLimit: card.deckLimit,
                    unitType: card.unitType,
                    abilities: card.abilities,
                    imagePath: card.imagePath,
                    faction: {
                      stableId: cardFaction?.stableId ?? 'unavailable',
                      name: cardFaction?.name ?? 'Faction indisponible',
                      themeKey: cardFaction?.themeKey ?? 'neutral',
                    },
                  }
                : null
            }),
          )

          return {
            id: deck._id,
            name: deck.name,
            faction: faction
              ? { stableId: faction.stableId, name: faction.name }
              : (cards.find((card) => card !== null)?.faction ?? null),
            cards: cards.filter((card) => card !== null),
            updatedAt: deck.updatedAt,
          }
        }),
    )
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    factionStableId: v.string(),
  },
  handler: async (ctx, args) => {
    const player = await requireActivePlayer(ctx)
    const name = normalizeDeckName(args.name)
    const faction = await findPublishedFaction(ctx, args.factionStableId)
    const now = Date.now()

    return ctx.db.insert('decks', {
      ownerUserId: player.userId,
      factionId: faction._id,
      name,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const rename = mutation({
  args: { deckId, name: v.string() },
  handler: async (ctx, args) => {
    const deck = await getOwnedDeck(ctx, args.deckId)
    await ctx.db.patch(deck._id, {
      name: normalizeDeckName(args.name),
      updatedAt: Date.now(),
    })
  },
})

export const remove = mutation({
  args: { deckId },
  handler: async (ctx, args) => {
    const deck = await getOwnedDeck(ctx, args.deckId)
    const entries = await ctx.db
      .query('deckCards')
      .withIndex('by_deck', (query) => query.eq('deckId', deck._id))
      .collect()

    for (const entry of entries) {
      await ctx.db.delete(entry._id)
    }

    await ctx.db.delete(deck._id)
  },
})

export const setCardQuantity = mutation({
  args: {
    deckId,
    cardStableId: v.string(),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const deck = await getOwnedDeck(ctx, args.deckId)
    await writeCardQuantity(ctx, deck, args.cardStableId, args.quantity)
  },
})

// Apply increments in a transaction so concurrent clicks cannot overwrite each other.
export const adjustCardQuantity = mutation({
  args: { deckId, cardStableId: v.string(), delta: v.union(v.literal(-1), v.literal(1)) },
  handler: async (ctx, args) => {
    const deck = await getOwnedDeck(ctx, args.deckId)
    const card = await findCard(ctx, args.cardStableId)
    const entry = await findEntry(ctx, deck._id, card._id)
    const quantity = Math.max(0, (entry?.quantity ?? 0) + args.delta)
    await writeCardQuantity(ctx, deck, args.cardStableId, quantity)
  },
})

async function findCard(ctx: MutationCtx, stableId: string) {
  const card = await ctx.db.query('cards')
    .withIndex('by_stable_id', (query) => query.eq('stableId', stableId)).unique()
  if (!card) throw new ConvexError({ code: 'CARD_NOT_AVAILABLE' })
  return card
}

function findEntry(ctx: MutationCtx, id: Id<'decks'>, cardId: Id<'cards'>) {
  return ctx.db.query('deckCards')
    .withIndex('by_deck_and_card', (query) => query.eq('deckId', id).eq('cardId', cardId)).unique()
}

async function writeCardQuantity(
  ctx: MutationCtx, deck: Doc<'decks'>, stableId: string, quantity: number,
) {
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new ConvexError({ code: 'INVALID_QUANTITY' })
  }
  const id = deck._id
  const card = await findCard(ctx, stableId)
  const entry = await findEntry(ctx, id, card._id)
  // Preserve old decks without silently deleting cards: they can be reduced to one faction.
  const entries = await ctx.db.query('deckCards')
    .withIndex('by_deck', (query) => query.eq('deckId', id)).collect()
  const existingCards = await Promise.all(entries.map((item) => ctx.db.get(item.cardId)))
  const factionId = deck.factionId ?? existingCards.find((item) => item !== null)?.factionId ?? card.factionId
  // Existing entries can always be reduced, including cards since archived.
  if (quantity > (entry?.quantity ?? 0)) {
    if (card.factionId !== factionId || existingCards.some((item) => item && item.factionId !== factionId)) {
      throw new ConvexError({ code: 'DECK_FACTION_MISMATCH' })
    }
    const faction = await ctx.db.get(card.factionId)
    const entity = faction ? await ctx.db.get(faction.entityId) : null
    if (card.status !== 'published' || faction?.status !== 'published' || entity?.status !== 'published') {
      throw new ConvexError({ code: 'CARD_NOT_AVAILABLE' })
    }
  }
  const now = Date.now()
  if (quantity === 0) {
    if (entry) await ctx.db.delete(entry._id)
  } else if (entry) {
    await ctx.db.patch(entry._id, { quantity, updatedAt: now })
  } else {
    await ctx.db.insert('deckCards', { deckId: id, cardId: card._id, quantity, updatedAt: now })
  }
  await ctx.db.patch(id, { factionId, updatedAt: now })
}

function normalizeDeckName(value: string) {
  const name = value.trim().replace(/\s+/g, ' ')

  if (name.length < 1 || name.length > 60) {
    throw new ConvexError({ code: 'INVALID_DECK_NAME' })
  }

  return name
}

async function findPublishedFaction(
  ctx: Pick<MutationCtx, 'db'>,
  stableId: string,
) {
  const faction = await ctx.db
    .query('factions')
    .withIndex('by_stable_id', (query) => query.eq('stableId', stableId))
    .unique()

  const entity = faction ? await ctx.db.get(faction.entityId) : null
  if (!faction || faction.status !== 'published' || entity?.status !== 'published') {
    throw new ConvexError({ code: 'FACTION_NOT_AVAILABLE' })
  }

  return faction
}

async function getOwnedDeck(
  ctx: Pick<QueryCtx | MutationCtx, 'auth' | 'db'>,
  id: Id<'decks'>,
) {
  const player = await requireActivePlayer(ctx)
  const deck = await ctx.db.get(id)

  if (!deck || deck.ownerUserId !== player.userId) {
    throw new ConvexError({ code: 'DECK_NOT_FOUND' })
  }

  return deck
}
