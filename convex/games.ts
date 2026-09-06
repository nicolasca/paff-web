import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { MutationCtx, QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { requireActivePlayer } from './lib/auth'
import { getUnitProfile } from '../shared/unitProfile'
import { canDeployUnit, canRepositionUnit, deploymentLimit, initialSetup, preparationCapacityError, type GameSetup } from '../shared/board'
import { BASE_ORDERS, initialBattle, MAX_STRATEGY_POINTS, MAX_TURNS, nextActor, remainingStock, RULES_VERSION, type BattleState } from '../shared/battle'

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
function requireSetup(game: Doc<'games'>): GameSetup {
  if (!game.setup) throw new ConvexError({ code: 'WRONG_GAME_PHASE' })
  return game.setup
}
function requireDeploymentTurn(game: Doc<'games'>, member: Doc<'gamePlayers'>, revision: number | undefined) {
  const setup = requireSetup(game)
  if (revision !== setup.revision) throw new ConvexError({ code: 'STALE_GAME_ACTION' })
  if (member.deploymentReady) throw new ConvexError({ code: 'DEPLOYMENT_LOCKED' })
  if (setup.deploymentTurn !== member.seat) throw new ConvexError({ code: 'NOT_YOUR_TURN' })
  return setup
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
      setup: game.setup ?? null,
      ...(game.battle ? { battle: game.battle } : {}),
      ...(game.rulesVersion ? { rulesVersion: game.rulesVersion } : {}),
      players: await Promise.all(players.sort((a, b) => a.seat - b.seat).map(async (member) => {
        const isMe = member._id === me._id
        const cards = await gameCards(ctx, member._id)
        const total = cards.reduce((sum, card) => sum + card.quantity, 0)
        const deployed = cards.reduce((sum, card) => sum + card.deploymentQuantity, 0)
        const prepared = game.setup?.version === 3 ? cards.reduce((sum, card) => sum + (card.selectedQuantity ?? 0), 0) : deployed
        // Deployed units are public in the new alternating setup. Unplayed cards stay private.
        const reveal = game.phase === 'battle' || (Boolean(game.setup) && game.phase === 'deployment')
        return {
          id: member._id, displayName: member.displayName, seat: member.seat, isMe,
          deckChosen: member.deckId !== undefined, deploymentReady: member.deploymentReady,
          preparationReady: member.preparationReady ?? false,
          preparationCount: prepared,
          deckId: isMe ? member.deckId ?? null : null,
          deckName: isMe || reveal ? member.deckName ?? null : null,
          factionName: isMe || reveal ? member.factionName ?? null : null,
          cards: isMe ? cards.map(({ _id, _creationTime, gamePlayerId: _gamePlayerId, ...card }) => ({ ...card, profile: getUnitProfile(card) })) : [],
          deployedCards: reveal
            ? cards.filter((card) => card.deploymentQuantity > 0).map(({ _id, _creationTime, gamePlayerId: _gamePlayerId, quantity: _quantity, selectedQuantity: _selectedQuantity, ...card }) => ({ ...card, profile: getUnitProfile(card), quantity: card.deploymentQuantity })) : [],
          drawPileCount: isMe || game.phase === 'battle' ? total - (game.setup?.version === 3 ? prepared : deployed) : null,
          deploymentCount: isMe || reveal ? deployed : null,
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
    await ctx.db.patch(game._id, { phase: 'deck_selection', setup: initialSetup(), rulesVersion: RULES_VERSION, updatedAt: Date.now() })
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
        ...(card.kind === 'unit' ? { profile: getUnitProfile(card) } : {}),
        faction: { stableId: faction.stableId, name: faction.name, themeKey: faction.themeKey },
        quantity: entry.quantity, deploymentQuantity: 0, selectedQuantity: 0,
      })
    }
    await ctx.db.patch(member._id, { deckId: deck._id, deckName: deck.name, factionName: faction.name, factionStableId: faction.stableId, deploymentReady: false, preparationReady: false })
    const players = await members(ctx, game._id)
    const bothChosen = players.length === 2 && players.every((item) => item._id === member._id || item.deckId !== undefined)
    await ctx.db.patch(game._id, { phase: bothChosen ? game.setup?.version === 3 ? 'preparation' : game.setup ? 'initiative' : 'deployment' : 'deck_selection', updatedAt: Date.now() })
  },
})

export const updatePreparation = mutation({
  args: {
    gameId, cardStableId: v.string(),
    change: v.union(v.object({ quantity: v.number() }), v.object({ delta: v.union(v.literal(-1), v.literal(1)) })),
  },
  handler: async (ctx, args) => {
    const { game, member } = await requireMember(ctx, args.gameId)
    requirePhase(game, 'preparation')
    if (member.preparationReady) throw new ConvexError({ code: 'PREPARATION_LOCKED' })
    const card = await ctx.db.query('gameCards')
      .withIndex('by_player_and_card', (q) => q.eq('gamePlayerId', member._id).eq('stableId', args.cardStableId)).unique()
    if (!card || card.kind !== 'unit') throw new ConvexError({ code: 'UNIT_REQUIRED' })
    const quantity = 'quantity' in args.change ? args.change.quantity : (card.selectedQuantity ?? 0) + args.change.delta
    if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > card.quantity) throw new ConvexError({ code: 'INVALID_DEPLOYMENT_QUANTITY' })
    await ctx.db.patch(card._id, { selectedQuantity: quantity })
    await ctx.db.patch(game._id, { updatedAt: Date.now() })
  },
})

export const finishPreparation = mutation({
  args: { gameId },
  handler: async (ctx, args) => {
    const { game, member } = await requireMember(ctx, args.gameId)
    if (member.preparationReady) return
    requirePhase(game, 'preparation')
    const cards = await gameCards(ctx, member._id)
    const capacityError = preparationCapacityError(cards.map((card) => ({ ...card, profile: getUnitProfile(card) })))
    if (capacityError) throw new ConvexError({ code: capacityError })
    await ctx.db.patch(member._id, { preparationReady: true })
    const players = await members(ctx, game._id)
    const ready = players.length === 2 && players.every((item) => item._id === member._id || item.preparationReady)
    await ctx.db.patch(game._id, { phase: ready ? 'initiative' : 'preparation', updatedAt: Date.now() })
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
    // Keep pre-2026 games readable and finishable, without bypassing positioned deployment.
    if (game.setup) throw new ConvexError({ code: 'WRONG_GAME_PHASE' })
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
  args: { gameId, revision: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { game, member } = await requireMember(ctx, args.gameId)
    if (member.deploymentReady) return
    requirePhase(game, 'deployment')
    const setup = game.setup ? requireDeploymentTurn(game, member, args.revision) : undefined
    if (setup?.version === 3 && (await gameCards(ctx, member._id)).some((card) => card.deploymentQuantity < deploymentLimit(card, setup))) {
      throw new ConvexError({ code: 'DEPLOYMENT_INCOMPLETE' })
    }
    await ctx.db.patch(member._id, { deploymentReady: true })
    const players = await members(ctx, game._id)
    const ready = players.length === 2 && players.every((item) => item._id === member._id || item.deploymentReady)
    const now = Date.now()
    await ctx.db.patch(game._id, {
      phase: ready ? 'battle' : 'deployment', updatedAt: now,
      ...(ready ? { battleStartedAt: now } : {}),
      ...(ready && setup?.version === 3 && game.rulesVersion === RULES_VERSION ? { battle: initialBattle(setup.initiativeWinner!, players.map((item) => ({ seat: item.seat, faction: item.factionStableId ?? '' }))) } : {}),
      ...(setup ? { setup: { ...setup, revision: setup.revision + 1, deploymentTurn: 1 - member.seat } } : {}),
    })
  },
})

export const rollInitiative = mutation({
  args: { gameId, round: v.number() },
  handler: async (ctx, args) => {
    const { game, member } = await requireMember(ctx, args.gameId)
    requirePhase(game, 'initiative')
    const setup = requireSetup(game)
    if (args.round !== setup.initiativeRound) throw new ConvexError({ code: 'STALE_GAME_ACTION' })
    if (setup.initiativeWinner !== undefined || setup.initiativeRolls.some((roll) => roll.round === args.round && roll.seat === member.seat)) return
    // Convex's mutation RNG is server-side and deterministic on transaction retries.
    const rolls = [...setup.initiativeRolls, { seat: member.seat, result: Math.floor(Math.random() * 6) + 1, round: args.round }]
    const current = rolls.filter((roll) => roll.round === args.round)
    const tie = current.length === 2 && current[0].result === current[1].result
    const winner = current.length === 2 && !tie ? current.reduce((best, roll) => roll.result > best.result ? roll : best).seat : undefined
    await ctx.db.patch(game._id, { setup: {
      ...setup, revision: setup.revision + 1,
      initiativeRolls: rolls.filter((roll) => roll.round >= args.round - 9),
      initiativeRound: args.round + (tie ? 1 : 0),
      ...(winner !== undefined ? { initiativeWinner: winner } : {}),
    }, updatedAt: Date.now() })
  },
})

export const confirmInitiative = mutation({
  args: { gameId },
  handler: async (ctx, args) => {
    const { game, member } = await requireMember(ctx, args.gameId)
    requirePhase(game, 'initiative')
    const setup = requireSetup(game)
    if (setup.initiativeWinner === undefined) throw new ConvexError({ code: 'INITIATIVE_PENDING' })
    if (setup.initiativeReady.includes(member.seat)) return
    const ready = [...setup.initiativeReady, member.seat]
    await ctx.db.patch(game._id, {
      phase: ready.length === 2 ? 'deployment' : 'initiative', updatedAt: Date.now(),
      setup: { ...setup, revision: setup.revision + 1, initiativeReady: ready, deploymentTurn: setup.initiativeWinner },
    })
  },
})

export const deployUnit = mutation({
  args: { gameId, cardStableId: v.string(), cell: v.number(), revision: v.number() },
  handler: async (ctx, args) => {
    const { game, member } = await requireMember(ctx, args.gameId)
    requirePhase(game, 'deployment')
    const setup = requireDeploymentTurn(game, member, args.revision)
    const cards = await gameCards(ctx, member._id)
    const card = cards.find((item) => item.stableId === args.cardStableId)
    const profile = card && getUnitProfile(card)
    if (!card || !profile || card.kind !== 'unit') throw new ConvexError({ code: 'UNIT_REQUIRED' })
    if (card.deploymentQuantity >= deploymentLimit(card, setup)) throw new ConvexError({ code: setup.version === 3 ? 'UNIT_NOT_PREPARED' : 'INVALID_DEPLOYMENT_QUANTITY' })
    const artilleryOnly = !cards.some((item) => deploymentLimit(item, setup) > 0 && getUnitProfile(item)?.unitType !== 'artillery')
    const artilleryRemaining = cards.filter((item) => getUnitProfile(item)?.unitType === 'artillery').reduce((sum, item) => sum + deploymentLimit(item, setup) - item.deploymentQuantity, 0)
    if (!canDeployUnit(args.cell, member.seat, profile, setup, artilleryOnly, artilleryRemaining)) throw new ConvexError({ code: 'INVALID_DEPLOYMENT_CELL' })
    const players = await members(ctx, game._id)
    const otherReady = players.find((item) => item.seat !== member.seat)?.deploymentReady
    await ctx.db.patch(card._id, { deploymentQuantity: card.deploymentQuantity + 1 })
    await ctx.db.patch(game._id, {
      setup: { ...setup, revision: setup.revision + 1,
        deploymentTurn: otherReady ? member.seat : 1 - member.seat,
        units: [...setup.units, { seat: member.seat, cardStableId: card.stableId, cell: args.cell }],
      }, updatedAt: Date.now(),
    })
  },
})

export const repositionUnit = mutation({
  args: { gameId, from: v.number(), to: v.number(), revision: v.number() },
  handler: async (ctx, args) => {
    const { game, member } = await requireMember(ctx, args.gameId)
    requirePhase(game, 'deployment')
    const setup = requireSetup(game)
    if (args.revision !== setup.revision) throw new ConvexError({ code: 'STALE_GAME_ACTION' })
    if (member.deploymentReady) throw new ConvexError({ code: 'DEPLOYMENT_LOCKED' })
    const unit = setup.units.find((item) => item.cell === args.from && item.seat === member.seat)
    const cards = await gameCards(ctx, member._id)
    const card = cards.find((item) => item.stableId === unit?.cardStableId)
    const profile = card && getUnitProfile(card)
    if (!unit || !profile) throw new ConvexError({ code: 'UNIT_NOT_OWNED' })
    const artilleryOnly = !cards.some((item) => deploymentLimit(item, setup) > 0 && getUnitProfile(item)?.unitType !== 'artillery')
    const artilleryRemaining = cards.filter((item) => getUnitProfile(item)?.unitType === 'artillery').reduce((sum, item) => sum + deploymentLimit(item, setup) - item.deploymentQuantity, 0)
    if (!canRepositionUnit(args.from, args.to, member.seat, profile, setup, artilleryOnly, artilleryRemaining)) throw new ConvexError({ code: 'INVALID_DEPLOYMENT_CELL' })
    // A correction does not spend a placement or change whose turn it is.
    await ctx.db.patch(game._id, { setup: { ...setup, revision: setup.revision + 1, units: setup.units.map((item) => item === unit ? { ...item, cell: args.to } : item) }, updatedAt: Date.now() })
  },
})

function requireBattle(game: Doc<'games'>, phase: BattleState['phase'], revision?: number) {
  requirePhase(game, 'battle')
  if (!game.battle || game.battle.phase !== phase) throw new ConvexError({ code: 'WRONG_BATTLE_PHASE' })
  if (revision !== undefined && revision !== game.battle.revision) throw new ConvexError({ code: 'STALE_GAME_ACTION' })
  return game.battle
}

export const chooseOrder = mutation({
  args: { gameId, orderId: v.string(), revision: v.number() },
  handler: async (ctx, args) => {
    const { game, member } = await requireMember(ctx, args.gameId)
    const battle = requireBattle(game, 'orders', args.revision)
    if (battle.actingSeat !== member.seat) throw new ConvexError({ code: 'NOT_YOUR_ORDER_TURN' })
    const definition = battle.catalog.find((item) => item.id === args.orderId && item.seats.includes(member.seat))
    if (!definition) throw new ConvexError({ code: 'ORDER_NOT_AVAILABLE' })
    if (remainingStock(battle, definition, member.seat) === 0) throw new ConvexError({ code: 'ORDER_EXHAUSTED' })
    if (battle.orders.filter((item) => item.seat === member.seat).length >= battle.allowance[member.seat]) throw new ConvexError({ code: 'ORDER_QUOTA_REACHED' })
    const orders = [...battle.orders, { id: `${battle.turn}:${battle.orders.length}`, seat: member.seat, orderId: definition.id, status: 'selected' as const }]
    const used = [...battle.used]
    if (definition.limit !== undefined) {
      const index = used.findIndex((item) => item.seat === member.seat && item.orderId === definition.id)
      if (index < 0) used.push({ seat: member.seat, orderId: definition.id, count: 1 })
      else used[index] = { ...used[index], count: used[index].count + 1 }
    }
    const needs = (seat: number) => orders.filter((item) => item.seat === seat).length < battle.allowance[seat]
    const complete = !needs(0) && !needs(1)
    await ctx.db.patch(game._id, { battle: { ...battle, revision: battle.revision + 1, orders, used,
      phase: complete ? 'actions' : 'orders', actingSeat: complete ? battle.initiativeSeat : nextActor(member.seat, needs),
    }, updatedAt: Date.now() })
  },
})

export const passOrder = mutation({
  args: { gameId, chosenId: v.string(), revision: v.number() },
  handler: async (ctx, args) => {
    const { game, member } = await requireMember(ctx, args.gameId)
    const battle = requireBattle(game, 'actions', args.revision)
    if (battle.actingSeat !== member.seat) throw new ConvexError({ code: 'NOT_YOUR_ORDER_TURN' })
    const chosen = battle.orders.find((item) => item.id === args.chosenId && item.seat === member.seat && item.status === 'selected')
    if (!chosen) throw new ConvexError({ code: 'ORDER_NOT_AVAILABLE' })
    // Demo progression only: no movement, damage or other game effect is claimed.
    const orders = battle.orders.map((item) => item === chosen ? { ...item, status: 'passed' as const } : item)
    const needs = (seat: number) => orders.some((item) => item.seat === seat && item.status === 'selected')
    await ctx.db.patch(game._id, { battle: { ...battle, revision: battle.revision + 1, orders,
      phase: !needs(0) && !needs(1) ? 'combat' : 'actions', actingSeat: nextActor(member.seat, needs), readySeats: [],
    }, updatedAt: Date.now() })
  },
})

export const setStrategyPoints = mutation({
  args: { gameId, turn: v.number(), points: v.number() },
  handler: async (ctx, args) => {
    const { game, member } = await requireMember(ctx, args.gameId)
    const battle = requireBattle(game, 'end_turn')
    if (args.turn !== battle.turn) throw new ConvexError({ code: 'STALE_GAME_ACTION' })
    if (battle.readySeats.includes(member.seat)) throw new ConvexError({ code: 'ROUND_ALREADY_CONFIRMED' })
    if (!Number.isSafeInteger(args.points) || args.points < 0 || args.points > MAX_STRATEGY_POINTS) throw new ConvexError({ code: 'INVALID_STRATEGY_POINTS' })
    const draftPoints = [...battle.draftPoints]
    draftPoints[member.seat] = args.points
    await ctx.db.patch(game._id, { battle: { ...battle, revision: battle.revision + 1, draftPoints }, updatedAt: Date.now() })
  },
})

export const confirmBattlePhase = mutation({
  args: { gameId, turn: v.number(), phase: v.union(v.literal('combat'), v.literal('end_turn')) },
  handler: async (ctx, args) => {
    const { game, member } = await requireMember(ctx, args.gameId)
    const battle = requireBattle(game, args.phase)
    if (args.turn !== battle.turn) throw new ConvexError({ code: 'STALE_GAME_ACTION' })
    if (battle.readySeats.includes(member.seat)) return
    const readySeats = [...battle.readySeats, member.seat]
    let next: BattleState = { ...battle, revision: battle.revision + 1, readySeats }
    if (readySeats.length === 2) {
      if (battle.phase === 'combat') next = { ...next, phase: 'end_turn', readySeats: [], draftPoints: [0, 0] }
      else {
        const history = [...battle.history, { turn: battle.turn, initiativeSeat: battle.initiativeSeat, orders: battle.orders, strategyPoints: battle.draftPoints }]
        if (battle.turn === MAX_TURNS) {
          next = { ...next, phase: 'finished', history, strategyPoints: battle.draftPoints }
          for (const player of await members(ctx, game._id)) await ctx.db.patch(player._id, { active: false })
        } else next = { ...next, turn: battle.turn + 1, phase: 'orders', initiativeSeat: 1 - battle.initiativeSeat, actingSeat: 1 - battle.initiativeSeat,
          strategyPoints: battle.draftPoints, allowance: battle.draftPoints.map((points) => BASE_ORDERS + points), draftPoints: [0, 0], readySeats: [], orders: [], history,
        }
      }
    }
    await ctx.db.patch(game._id, { battle: next, updatedAt: Date.now() })
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
