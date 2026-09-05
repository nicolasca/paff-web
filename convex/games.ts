import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { MutationCtx, QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { requireActivePlayer } from './lib/auth'

const gameId = v.id('games')
type Context = QueryCtx | MutationCtx

function members(ctx: Context, id: Id<'games'>) {
  return ctx.db.query('gamePlayers').withIndex('by_game', (q) => q.eq('gameId', id)).collect()
}
function gameCards(ctx: Context, id: Id<'gamePlayers'>) {
  return ctx.db.query('gameCards').withIndex('by_player', (q) => q.eq('gamePlayerId', id)).collect()
}
function activeMembership(ctx: Context, userId: Id<'users'>) {
  return ctx.db.query('gamePlayers').withIndex('by_user_and_active', (q) => q.eq('userId', userId).eq('active', true)).unique()
}
async function requireMember(ctx: Context, id: Id<'games'>) {
  const player = await requireActivePlayer(ctx)
  const game = await ctx.db.get(id)
  const member = await ctx.db.query('gamePlayers')
    .withIndex('by_game_and_user', (q) => q.eq('gameId', id).eq('userId', player.userId)).unique()
  if (!game || !member || !member.active || game.phase === 'cancelled') {
    throw new ConvexError({ code: 'GAME_NOT_AVAILABLE' })
  }
  return { game, member, player }
}
function requirePhase(game: Doc<'games'>, phase: Doc<'games'>['phase']) {
  if (game.phase !== phase) throw new ConvexError({ code: 'WRONG_GAME_PHASE' })
}

export const listLobby = query({
  args: {},
  handler: async (ctx) => {
    const player = await requireActivePlayer(ctx)
    const current = await activeMembership(ctx, player.userId)
    const currentGame = current ? await ctx.db.get(current.gameId) : null
    const waiting = await ctx.db.query('games').withIndex('by_phase', (q) => q.eq('phase', 'waiting')).collect()
    const rooms = await Promise.all(waiting.map(async (game) => {
      const players = await members(ctx, game._id)
      return { id: game._id, name: game.name, playerCount: players.length, createdAt: game.createdAt }
    }))
    return {
      currentGame: currentGame ? { id: currentGame._id, name: currentGame.name, phase: currentGame.phase } : null,
      rooms: rooms.sort((a, b) => b.createdAt - a.createdAt),
    }
  },
})

export const get = query({
  args: { gameId },
  handler: async (ctx, args) => {
    const player = await requireActivePlayer(ctx)
    const game = await ctx.db.get(args.gameId)
    if (!game) return null
    const players = await members(ctx, game._id)
    const me = players.find((member) => member.userId === player.userId)
    if (!me) return null
    return {
      id: game._id, name: game.name, phase: game.phase,
      isHost: game.hostUserId === player.userId,
      battleStartedAt: game.battleStartedAt ?? null,
      players: await Promise.all(players.sort((a, b) => a.seat - b.seat).map(async (member) => {
        const isMe = member._id === me._id
        const cards = await gameCards(ctx, member._id)
        const total = cards.reduce((sum, card) => sum + card.quantity, 0)
        const deployed = cards.reduce((sum, card) => sum + card.deploymentQuantity, 0)
        // Only this player's preparation is visible before both players finish.
        return {
          id: member._id, displayName: member.displayName, seat: member.seat, isMe,
          deckChosen: member.deckId !== undefined, deploymentReady: member.deploymentReady,
          deckId: isMe ? member.deckId ?? null : null,
          deckName: isMe || game.phase === 'battle' ? member.deckName ?? null : null,
          factionName: isMe || game.phase === 'battle' ? member.factionName ?? null : null,
          cards: isMe ? cards.map(({ _id, _creationTime, gamePlayerId: _gamePlayerId, ...card }) => card) : [],
          deployedCards: game.phase === 'battle'
            ? cards.filter((card) => card.deploymentQuantity > 0).map(({ _id, _creationTime, gamePlayerId: _gamePlayerId, quantity: _quantity, ...card }) => ({ ...card, quantity: card.deploymentQuantity })) : [],
          drawPileCount: isMe || game.phase === 'battle' ? total - deployed : null,
          deploymentCount: isMe || game.phase === 'battle' ? deployed : null,
        }
      })),
    }
  },
})

export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const player = await requireActivePlayer(ctx)
    if (await activeMembership(ctx, player.userId)) throw new ConvexError({ code: 'ALREADY_IN_GAME' })
    const now = Date.now()
    const id = await ctx.db.insert('games', { hostUserId: player.userId, name: `Partie de ${player.displayName}`, phase: 'waiting', createdAt: now, updatedAt: now })
    await ctx.db.insert('gamePlayers', { gameId: id, userId: player.userId, displayName: player.displayName, seat: 0, active: true, deploymentReady: false })
    return id
  },
})

export const join = mutation({
  args: { gameId },
  handler: async (ctx, args) => {
    const player = await requireActivePlayer(ctx)
    const current = await activeMembership(ctx, player.userId)
    if (current?.gameId === args.gameId) return args.gameId
    if (current) throw new ConvexError({ code: 'ALREADY_IN_GAME' })
    const game = await ctx.db.get(args.gameId)
    if (!game || game.phase !== 'waiting') throw new ConvexError({ code: 'GAME_NOT_AVAILABLE' })
    const players = await members(ctx, game._id)
    if (players.length >= 2) throw new ConvexError({ code: 'GAME_FULL' })
    await ctx.db.insert('gamePlayers', { gameId: game._id, userId: player.userId, displayName: player.displayName, seat: 1, active: true, deploymentReady: false })
    await ctx.db.patch(game._id, { updatedAt: Date.now() })
    return game._id
  },
})

export const start = mutation({
  args: { gameId },
  handler: async (ctx, args) => {
    const { game, player } = await requireMember(ctx, args.gameId)
    if (game.hostUserId !== player.userId) throw new ConvexError({ code: 'HOST_ONLY' })
    requirePhase(game, 'waiting')
    if ((await members(ctx, game._id)).length !== 2) throw new ConvexError({ code: 'NEED_TWO_PLAYERS' })
    await ctx.db.patch(game._id, { phase: 'deck_selection', updatedAt: Date.now() })
  },
})

export const selectDeck = mutation({
  args: { gameId, deckId: v.id('decks') },
  handler: async (ctx, args) => {
    const { game, member, player } = await requireMember(ctx, args.gameId)
    requirePhase(game, 'deck_selection')
    const deck = await ctx.db.get(args.deckId)
    if (!deck || deck.ownerUserId !== player.userId) throw new ConvexError({ code: 'DECK_NOT_FOUND' })
    const entries = await ctx.db.query('deckCards').withIndex('by_deck', (q) => q.eq('deckId', deck._id)).collect()
    const sourceCards = await Promise.all(entries.map(async (entry) => ({ entry, card: await ctx.db.get(entry.cardId) })))
    const factionId = deck.factionId ?? sourceCards[0]?.card?.factionId
    const faction = factionId ? await ctx.db.get(factionId) : null
    const entity = faction ? await ctx.db.get(faction.entityId) : null
    if (!faction || faction.status !== 'published' || entity?.status !== 'published') throw new ConvexError({ code: 'FACTION_NOT_AVAILABLE' })
    for (const { entry, card } of sourceCards) {
      if (!card || card.status !== 'published' || card.factionId !== faction._id || !Number.isSafeInteger(entry.quantity) || entry.quantity < 1) {
        throw new ConvexError({ code: 'INVALID_DECK' })
      }
    }
    for (const card of await gameCards(ctx, member._id)) await ctx.db.delete(card._id)
    // Snapshot the selected deck: later catalogue/deck edits cannot alter a game.
    for (const { entry, card } of sourceCards) {
      if (!card) continue
      await ctx.db.insert('gameCards', {
        gamePlayerId: member._id, stableId: card.stableId, name: card.name, kind: card.kind,
        ...(card.cost !== undefined ? { cost: card.cost } : {}),
        ...(card.life !== undefined ? { life: card.life } : {}),
        ...(card.attack !== undefined ? { attack: card.attack } : {}),
        ...(card.unitType !== undefined ? { unitType: card.unitType } : {}),
        abilities: card.abilities, imagePath: card.imagePath,
        faction: { stableId: faction.stableId, name: faction.name, themeKey: faction.themeKey },
        quantity: entry.quantity, deploymentQuantity: 0,
      })
    }
    await ctx.db.patch(member._id, { deckId: deck._id, deckName: deck.name, factionName: faction.name, deploymentReady: false })
    const players = await members(ctx, game._id)
    const bothChosen = players.length === 2 && players.every((item) => item._id === member._id || item.deckId !== undefined)
    await ctx.db.patch(game._id, { phase: bothChosen ? 'deployment' : 'deck_selection', updatedAt: Date.now() })
  },
})

export const updateDeployment = mutation({
  args: {
    gameId, cardStableId: v.string(),
    change: v.union(v.object({ quantity: v.number() }), v.object({ delta: v.union(v.literal(-1), v.literal(1)) })),
  },
  handler: async (ctx, args) => {
    const { game, member } = await requireMember(ctx, args.gameId)
    requirePhase(game, 'deployment')
    if (member.deploymentReady) throw new ConvexError({ code: 'DEPLOYMENT_LOCKED' })
    const card = await ctx.db.query('gameCards')
      .withIndex('by_player_and_card', (q) => q.eq('gamePlayerId', member._id).eq('stableId', args.cardStableId)).unique()
    if (!card || card.kind !== 'unit') throw new ConvexError({ code: 'UNIT_REQUIRED' })
    const quantity = 'quantity' in args.change ? args.change.quantity : card.deploymentQuantity + args.change.delta
    if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > card.quantity) throw new ConvexError({ code: 'INVALID_DEPLOYMENT_QUANTITY' })
    await ctx.db.patch(card._id, { deploymentQuantity: quantity })
    await ctx.db.patch(game._id, { updatedAt: Date.now() })
  },
})

export const finishDeployment = mutation({
  args: { gameId },
  handler: async (ctx, args) => {
    const { game, member } = await requireMember(ctx, args.gameId)
    if (member.deploymentReady) return
    requirePhase(game, 'deployment')
    await ctx.db.patch(member._id, { deploymentReady: true })
    const players = await members(ctx, game._id)
    const ready = players.length === 2 && players.every((item) => item._id === member._id || item.deploymentReady)
    const now = Date.now()
    await ctx.db.patch(game._id, { phase: ready ? 'battle' : 'deployment', updatedAt: now, ...(ready ? { battleStartedAt: now } : {}) })
  },
})

export const leave = mutation({
  args: { gameId },
  handler: async (ctx, args) => {
    const { game, member, player } = await requireMember(ctx, args.gameId)
    if (game.phase === 'waiting' && game.hostUserId !== player.userId) {
      await ctx.db.delete(member._id)
      await ctx.db.patch(game._id, { updatedAt: Date.now() })
      return
    }
    await ctx.db.patch(game._id, { phase: 'cancelled', updatedAt: Date.now() })
    for (const item of await members(ctx, game._id)) await ctx.db.patch(item._id, { active: false })
  },
})
