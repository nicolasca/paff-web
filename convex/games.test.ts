import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FunctionReturnType } from 'convex/server'
import type { api } from './_generated/api'
import type { MutationCtx } from './_generated/server'
import * as games from './games'

type Row = Record<string, unknown> & { _id: string }

function setup() {
  const tables: Record<string, Row[]> = {
    playerProfiles: [1, 2, 3].map((i) => ({ _id: `profile-${i}`, userId: `user-${i}`, active: true, displayName: `Joueur ${i}`, loginId: `joueur${i}`, role: 'player' })),
    entities: [{ _id: 'entity', status: 'published' }],
    factions: [{ _id: 'faction', stableId: 'gobelins', entityId: 'entity', name: 'Gobelins', themeKey: 'gobelins', status: 'published' }],
    cards: [{ _id: 'unit', stableId: 'archers', factionId: 'faction', name: 'Archers', kind: 'unit', cost: 2, life: 1, attack: 2, deckLimit: 2, abilities: ['Tir'], imagePath: '/archers.webp', status: 'published' }, { _id: 'action', stableId: 'piege', factionId: 'faction', name: 'Piège', kind: 'action', abilities: [], imagePath: '/piege.webp', status: 'published' }],
    decks: [1, 2].map((i) => ({ _id: `deck-${i}`, ownerUserId: `user-${i}`, name: `Armée ${i}`, factionId: 'faction' })),
    deckCards: [1, 2].flatMap((i) => [{ _id: `units-${i}`, deckId: `deck-${i}`, cardId: 'unit', quantity: 5 }, { _id: `actions-${i}`, deckId: `deck-${i}`, cardId: 'action', quantity: 2 }]),
    games: [], gamePlayers: [], gameCards: [],
  }
  let serial = 0
  const row = (id: string) => Object.values(tables).flat().find((item) => item._id === id) ?? null
  const db = {
    get: async (id: string) => structuredClone(row(id)),
    query: (table: string) => ({ withIndex: (_name: string, filter: (q: unknown) => unknown) => {
      const values: Record<string, unknown> = {}
      const q = { eq: (field: string, value: unknown) => { values[field] = value; return q } }
      filter(q)
      const rows = () => structuredClone(tables[table].filter((item) => Object.entries(values).every(([key, value]) => item[key] === value)))
      return { collect: async () => rows(), unique: async () => { const found = rows(); if (found.length > 1) throw new Error('Not unique'); return found[0] ?? null } }
    } }),
    insert: async (table: string, fields: Record<string, unknown>) => { const id = `${table}-${++serial}`; tables[table].push({ ...structuredClone(fields), _id: id, _creationTime: serial }); return id },
    patch: async (id: string, fields: Record<string, unknown>) => { Object.assign(row(id)!, structuredClone(fields)) },
    delete: async (id: string) => { for (const rows of Object.values(tables)) { const index = rows.findIndex((item) => item._id === id); if (index >= 0) rows.splice(index, 1) } },
  }
  async function run<T extends keyof typeof games>(name: T, user = 1, args: Record<string, unknown> = {}): Promise<FunctionReturnType<typeof api.games[T]>> {
    const ctx = { db, auth: { getUserIdentity: async () => user ? { subject: `user-${user}|session` } : null } } as unknown as MutationCtx
    const snapshot = structuredClone(tables)
    try { return await (games[name] as unknown as { _handler: (ctx: MutationCtx, args: Record<string, unknown>) => Promise<FunctionReturnType<typeof api.games[T]>> })._handler(ctx, args) }
    catch (error) { Object.assign(tables, snapshot); throw error }
  }
  async function readyFor(phase: 'waiting' | 'deck_selection' | 'deployment' = 'deployment', modern = false) {
    const gameId = await run('create')
    await run('join', 2, { gameId })
    if (phase === 'waiting') return gameId
    await run('start', 1, { gameId })
    // Existing tests exercise legacy rooms, which must remain finishable.
    if (!modern) delete tables.games.find((item) => item._id === gameId)!.setup
    if (phase === 'deck_selection') return gameId
    await run('selectDeck', 1, { gameId, deckId: 'deck-1' })
    await run('selectDeck', 2, { gameId, deckId: 'deck-2' })
    return gameId
  }
  return { tables, run, readyFor }
}

const code = (value: string) => ({ data: { code: value } })
afterEach(() => vi.restoreAllMocks())

async function preparedGame(winner = 0, artilleryOnly = false) {
  const harness = setup()
  if (artilleryOnly) harness.tables.cards[0].name = 'Catapulte'
  const gameId = await harness.readyFor('deployment', true)
  vi.spyOn(Math, 'random').mockReturnValueOnce(winner === 0 ? 0.99 : 0).mockReturnValueOnce(winner === 0 ? 0 : 0.99)
  await harness.run('rollInitiative', 1, { gameId, round: 1 })
  await harness.run('rollInitiative', 2, { gameId, round: 1 })
  await harness.run('confirmInitiative', 1, { gameId })
  await harness.run('confirmInitiative', 2, { gameId })
  const read = async (user = 1) => (await harness.run('get', user, { gameId }))!
  const deploy = async (user: number, cell: number, cardStableId = 'archers') => harness.run('deployUnit', user, { gameId, cardStableId, cell, revision: (await read()).setup!.revision })
  const finish = async (user: number) => harness.run('finishDeployment', user, { gameId, revision: (await read()).setup!.revision })
  return { ...harness, gameId, read, deploy, finish }
}

describe('shared 2026 preparation', () => {
  it('starts initiative only after both decks and records one server-generated D6 per player', async () => {
    const { run, readyFor } = setup()
    const gameId = await readyFor('deck_selection', true)
    await run('selectDeck', 1, { gameId, deckId: 'deck-1' })
    await expect(run('rollInitiative', 1, { gameId, round: 1 })).rejects.toMatchObject(code('WRONG_GAME_PHASE'))
    await run('selectDeck', 2, { gameId, deckId: 'deck-2' })
    const random = vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.99)
    await expect(run('confirmInitiative', 1, { gameId })).rejects.toMatchObject(code('INITIATIVE_PENDING'))
    await run('rollInitiative', 1, { gameId, round: 1 })
    await run('rollInitiative', 1, { gameId, round: 1 })
    expect(random).toHaveBeenCalledTimes(1)
    expect((await run('get', 2, { gameId }))?.setup?.initiativeRolls).toEqual([{ seat: 0, result: 1, round: 1 }])
    await run('rollInitiative', 2, { gameId, round: 1 })
    await run('rollInitiative', 2, { gameId, round: 1 })
    expect(random).toHaveBeenCalledTimes(2)
    await run('confirmInitiative', 1, { gameId })
    await run('confirmInitiative', 1, { gameId })
    expect((await run('get', 1, { gameId }))?.phase).toBe('initiative')
    await run('confirmInitiative', 2, { gameId })
    const state = await run('get', 1, { gameId })
    expect(state).toMatchObject({ phase: 'deployment', setup: { initiativeWinner: 1, deploymentTurn: 1, initiativeReady: [0, 1] } })
  })
  it('persists ties and prevents a delayed first-round request from rolling the next round', async () => {
    const { run, readyFor } = setup()
    const gameId = await readyFor('deployment', true)
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.5).mockReturnValueOnce(0.5).mockReturnValueOnce(0.99).mockReturnValueOnce(0)
    await run('rollInitiative', 1, { gameId, round: 1 })
    await run('rollInitiative', 2, { gameId, round: 1 })
    const state = await run('get', 2, { gameId })
    expect(state?.setup).toMatchObject({ initiativeRound: 2, initiativeRolls: [{ result: 4 }, { result: 4 }] })
    expect(state?.setup?.initiativeWinner).toBeUndefined()
    await expect(run('rollInitiative', 1, { gameId, round: 1 })).rejects.toMatchObject(code('STALE_GAME_ACTION'))
    await expect(run('confirmInitiative', 2, { gameId })).rejects.toMatchObject(code('INITIATIVE_PENDING'))
    await run('rollInitiative', 2, { gameId, round: 2 })
    await run('rollInitiative', 1, { gameId, round: 2 })
    expect((await run('get', 1, { gameId }))?.setup).toMatchObject({ initiativeWinner: 1, initiativeRound: 2 })
  })
  it('enforces alternating placement, first Centre Base, occupancy and each player’s deployment zone', async () => {
    const { deploy, read, run, gameId } = await preparedGame()
    await expect(deploy(2, 13)).rejects.toMatchObject(code('NOT_YOUR_TURN'))
    await expect(deploy(1, 45)).rejects.toMatchObject(code('INVALID_DEPLOYMENT_CELL'))
    await expect(deploy(1, 36)).rejects.toMatchObject(code('INVALID_DEPLOYMENT_CELL'))
    const revision = (await read()).setup!.revision
    await deploy(1, 40)
    await expect(run('deployUnit', 1, { gameId, revision, cell: 41, cardStableId: 'archers' })).rejects.toMatchObject(code('STALE_GAME_ACTION'))
    await expect(deploy(1, 41)).rejects.toMatchObject(code('NOT_YOUR_TURN'))
    await deploy(2, 13)
    await expect(deploy(1, 40)).rejects.toMatchObject(code('INVALID_DEPLOYMENT_CELL'))
    await expect(deploy(1, 20)).rejects.toMatchObject(code('INVALID_DEPLOYMENT_CELL'))
    await expect(deploy(1, 0)).rejects.toMatchObject(code('INVALID_DEPLOYMENT_CELL'))
    await deploy(1, 45)
    const host = await read()
    const guest = await read(2)
    expect(host.setup).toEqual(guest.setup)
    expect(host.setup?.units).toEqual([{ seat: 0, cardStableId: 'archers', cell: 40 }, { seat: 1, cardStableId: 'archers', cell: 13 }, { seat: 0, cardStableId: 'archers', cell: 45 }])
    expect(guest.players[0].deployedCards[0]).toMatchObject({ name: 'Archers', quantity: 2 })
    expect(guest.players[0].cards).toEqual([])
    expect(guest.players[0].drawPileCount).toBeNull()
    await expect(run('updateDeployment', 1, { gameId, cardStableId: 'archers', change: { quantity: 5 } })).rejects.toMatchObject(code('WRONG_GAME_PHASE'))
  })
  it('rejects non-units and excess copies and lets the other player continue after an early finish', async () => {
    const { deploy, finish, read, run, gameId } = await preparedGame()
    await expect(deploy(1, 40, 'piege')).rejects.toMatchObject(code('UNIT_REQUIRED'))
    await expect(deploy(1, 40, 'missing')).rejects.toMatchObject(code('UNIT_REQUIRED'))
    await expect(finish(2)).rejects.toMatchObject(code('NOT_YOUR_TURN'))
    await finish(1)
    const revision = (await read()).setup!.revision
    await deploy(2, 13)
    await expect(run('deployUnit', 2, { gameId, revision, cell: 14, cardStableId: 'archers' })).rejects.toMatchObject(code('STALE_GAME_ACTION'))
    for (const cell of [0, 1, 2, 3]) await deploy(2, cell)
    await expect(deploy(2, 4)).rejects.toMatchObject(code('INVALID_DEPLOYMENT_QUANTITY'))
    await expect(deploy(1, 40)).rejects.toMatchObject(code('DEPLOYMENT_LOCKED'))
    expect((await read()).phase).toBe('deployment')
    await finish(2)
    const state = await read()
    expect(state.phase).toBe('battle')
    expect(state.battleStartedAt).toBeTypeOf('number')
    expect(state.players.map((player) => [player.deploymentCount, player.drawPileCount])).toEqual([[0, 7], [5, 2]])
    expect(state.setup?.units).toHaveLength(5)
    await finish(2)
    await expect(deploy(2, 4)).rejects.toMatchObject(code('WRONG_GAME_PHASE'))
  })
  it('requires a revision even when validating deployment without placing any units', async () => {
    const { run, gameId, read, finish } = await preparedGame(1)
    await expect(run('finishDeployment', 2, { gameId })).rejects.toMatchObject(code('STALE_GAME_ACTION'))
    await finish(2)
    await finish(1)
    expect((await read()).setup?.units).toEqual([])
    expect((await read()).phase).toBe('battle')
  })
  it('keeps artillery in the rear even for the first piece in an artillery-only army', async () => {
    const { deploy, read } = await preparedGame(0, true)
    await expect(deploy(1, 40)).rejects.toMatchObject(code('INVALID_DEPLOYMENT_CELL'))
    await deploy(1, 45)
    await expect(deploy(2, 13)).rejects.toMatchObject(code('INVALID_DEPLOYMENT_CELL'))
    await deploy(2, 0)
    expect((await read()).setup?.units.map((unit) => unit.cell)).toEqual([45, 0])
  })
  it('permits empty armies to finish the new flow without inventing a minimum budget', async () => {
    const { run, readyFor, tables } = setup()
    tables.deckCards = []
    const gameId = await readyFor('deployment', true)
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.9).mockReturnValueOnce(0)
    await run('rollInitiative', 1, { gameId, round: 1 })
    await run('rollInitiative', 2, { gameId, round: 1 })
    await run('confirmInitiative', 1, { gameId })
    await run('confirmInitiative', 2, { gameId })
    for (const user of [1, 2]) {
      const state = (await run('get', user, { gameId }))!
      await run('finishDeployment', user, { gameId, revision: state.setup!.revision })
    }
    expect((await run('get', 1, { gameId }))?.phase).toBe('battle')
  })
})

describe('two-player lobby and access', () => {
  it('requires an authenticated and active player', async () => {
    const { run, tables } = setup()
    await expect(run('create', 0)).rejects.toMatchObject(code('UNAUTHENTICATED'))
    await expect(run('listLobby', 0)).rejects.toMatchObject(code('UNAUTHENTICATED'))
    tables.playerProfiles[0].active = false
    await expect(run('create')).rejects.toMatchObject(code('ACCOUNT_DISABLED'))
  })
  it('exposes open rooms, limits the table to two players and allows only one active game', async () => {
    const { run } = setup()
    const gameId = await run('create')
    expect(await run('listLobby', 2)).toMatchObject({ currentGame: null, rooms: [{ id: gameId, playerCount: 1 }] })
    await expect(run('create')).rejects.toMatchObject(code('ALREADY_IN_GAME'))
    await run('join', 2, { gameId })
    await run('join', 2, { gameId })
    await expect(run('join', 3, { gameId })).rejects.toMatchObject(code('GAME_FULL'))
    await expect(run('create', 2)).rejects.toMatchObject(code('ALREADY_IN_GAME'))
    const other = await run('create', 3)
    await expect(run('join', 1, { gameId: other })).rejects.toMatchObject(code('ALREADY_IN_GAME'))
    expect((await run('get', 1, { gameId }))?.players).toHaveLength(2)
  })
  it('lets only the host start with both players seated', async () => {
    const { run } = setup()
    const gameId = await run('create')
    await expect(run('start', 1, { gameId })).rejects.toMatchObject(code('NEED_TWO_PLAYERS'))
    await run('join', 2, { gameId })
    await expect(run('start', 2, { gameId })).rejects.toMatchObject(code('HOST_ONLY'))
    await run('start', 1, { gameId })
    expect((await run('listLobby')).rooms).toEqual([])
    expect((await run('listLobby')).currentGame?.phase).toBe('deck_selection')
    await expect(run('join', 3, { gameId })).rejects.toMatchObject(code('GAME_NOT_AVAILABLE'))
  })
  it('hides private rooms from outsiders and rejects all their game mutations', async () => {
    const { run, readyFor } = setup()
    const gameId = await readyFor()
    expect(await run('get', 3, { gameId })).toBeNull()
    for (const name of ['start', 'selectDeck', 'updateDeployment', 'finishDeployment', 'leave', 'rollInitiative', 'confirmInitiative', 'deployUnit'] as const) {
      await expect(run(name, 3, { gameId, deckId: 'deck-1', cardStableId: 'archers', change: { quantity: 1 } })).rejects.toMatchObject(code('GAME_NOT_AVAILABLE'))
    }
  })
  it('enforces the stage order on the server', async () => {
    const { run, readyFor } = setup()
    const gameId = await readyFor('waiting')
    await expect(run('selectDeck', 1, { gameId, deckId: 'deck-1' })).rejects.toMatchObject(code('WRONG_GAME_PHASE'))
    await expect(run('updateDeployment', 1, { gameId, cardStableId: 'archers', change: { quantity: 1 } })).rejects.toMatchObject(code('WRONG_GAME_PHASE'))
    await expect(run('finishDeployment', 1, { gameId })).rejects.toMatchObject(code('WRONG_GAME_PHASE'))
  })
  it('frees a guest seat, then closes the table for everyone when the host leaves', async () => {
    const { run, readyFor } = setup()
    const gameId = await readyFor('waiting')
    await run('leave', 2, { gameId })
    expect((await run('listLobby', 2)).currentGame).toBeNull()
    expect((await run('listLobby')).rooms[0].playerCount).toBe(1)
    await run('join', 2, { gameId })
    await run('leave', 1, { gameId })
    expect((await run('get', 2, { gameId }))?.phase).toBe('cancelled')
    expect(await run('listLobby', 2)).toEqual({ currentGame: null, rooms: [] })
    await expect(run('create', 2)).resolves.toBeTruthy()
  })
  it('closes an ongoing preparation if either player leaves', async () => {
    const { run, readyFor } = setup()
    const gameId = await readyFor()
    await run('leave', 2, { gameId })
    expect((await run('listLobby', 1)).currentGame).toBeNull()
    await expect(run('finishDeployment', 1, { gameId })).rejects.toMatchObject(code('GAME_NOT_AVAILABLE'))
  })
})

describe('deck snapshots and simultaneous preparation', () => {
  it('waits for both decks and keeps each selection private', async () => {
    const { run, readyFor } = setup()
    const gameId = await readyFor('deck_selection')
    await expect(run('selectDeck', 1, { gameId, deckId: 'deck-2' })).rejects.toMatchObject(code('DECK_NOT_FOUND'))
    await run('selectDeck', 1, { gameId, deckId: 'deck-1' })
    const guestView = await run('get', 2, { gameId })
    expect(guestView?.phase).toBe('deck_selection')
    expect(guestView?.players[0]).toMatchObject({ deckChosen: true, deckName: null, factionName: null, cards: [], drawPileCount: null, deploymentCount: null, deckId: null })
    await run('selectDeck', 2, { gameId, deckId: 'deck-2' })
    expect((await run('get', 1, { gameId }))?.phase).toBe('deployment')
    await expect(run('selectDeck', 1, { gameId, deckId: 'deck-1' })).rejects.toMatchObject(code('WRONG_GAME_PHASE'))
  })
  it('does not allow mixed factions or unpublished cards', async () => {
    const { run, readyFor, tables } = setup()
    const gameId = await readyFor('deck_selection')
    tables.cards[0].factionId = 'other-faction'
    await expect(run('selectDeck', 1, { gameId, deckId: 'deck-1' })).rejects.toMatchObject(code('INVALID_DECK'))
    tables.cards[0].factionId = 'faction'
    tables.cards[0].status = 'draft'
    await expect(run('selectDeck', 1, { gameId, deckId: 'deck-1' })).rejects.toMatchObject(code('INVALID_DECK'))
    expect(tables.gameCards).toEqual([])
  })
  it('replaces a selection before the other player chooses and freezes the selected content', async () => {
    const { run, readyFor, tables } = setup()
    const gameId = await readyFor('deck_selection')
    await run('selectDeck', 1, { gameId, deckId: 'deck-1' })
    tables.deckCards[0].quantity = 4
    await run('selectDeck', 1, { gameId, deckId: 'deck-1' })
    tables.cards[0].name = 'Modifié'
    tables.deckCards = tables.deckCards.filter((card) => card.deckId !== 'deck-1')
    tables.decks = tables.decks.filter((deck) => deck._id !== 'deck-1')
    const me = (await run('get', 1, { gameId }))!.players.find((player) => player.isMe)!
    expect(me.cards).toHaveLength(2)
    expect(me.cards[0]).toMatchObject({ name: 'Archers', quantity: 4, abilities: ['Tir'] })
    expect(me.deckName).toBe('Armée 1')
  })
  it('freezes the new profile when choosing a deck and hides it from the opponent', async () => {
    const { run, readyFor, tables } = setup()
    const profile = { unitType: 'ranged', regiment: 4, dice: 2, offense: { kind: 'ranged', score: 5 }, defenseMelee: 2, defenseRanged: 3, ability: { name: 'Tir précis', description: 'Relancez un dé.' }, source: 'defined' }
    tables.cards[0].profile = profile
    const gameId = await readyFor()
    tables.cards[0].profile = { ...profile, dice: 99 }
    expect((await run('get', 1, { gameId }))?.players[0].cards[0].profile).toEqual(profile)
    expect((await run('get', 2, { gameId }))?.players[0].cards).toEqual([])
    await run('updateDeployment', 1, { gameId, cardStableId: 'archers', change: { quantity: 1 } })
    await run('finishDeployment', 1, { gameId })
    await run('finishDeployment', 2, { gameId })
    expect((await run('get', 2, { gameId }))?.players[0].deployedCards[0].profile).toEqual(profile)
  })
  it.each([-1, 1.5, 6, NaN, Infinity])('rejects deployment quantity %s outside available copies', async (quantity) => {
    const { run, readyFor } = setup()
    const gameId = await readyFor()
    await expect(run('updateDeployment', 1, { gameId, cardStableId: 'archers', change: { quantity } })).rejects.toMatchObject(code('INVALID_DEPLOYMENT_QUANTITY'))
  })
  it('rejects actions or cards that are absent from the chosen deck', async () => {
    const { run, readyFor } = setup()
    const gameId = await readyFor()
    for (const cardStableId of ['piege', 'unknown']) await expect(run('updateDeployment', 1, { gameId, cardStableId, change: { quantity: 1 } })).rejects.toMatchObject(code('UNIT_REQUIRED'))
  })
  it('persists quantities and readiness, then reveals opposing reserves only after both finish', async () => {
    const { run, readyFor } = setup()
    const gameId = await readyFor()
    await run('updateDeployment', 1, { gameId, cardStableId: 'archers', change: { quantity: 3 } })
    await run('updateDeployment', 1, { gameId, cardStableId: 'archers', change: { delta: 1 } })
    await run('updateDeployment', 1, { gameId, cardStableId: 'archers', change: { delta: -1 } })
    await run('updateDeployment', 2, { gameId, cardStableId: 'archers', change: { quantity: 5 } })
    await run('finishDeployment', 1, { gameId })
    await run('finishDeployment', 1, { gameId })
    const before = await run('get', 1, { gameId })
    expect(before?.phase).toBe('deployment')
    expect(before?.players[0]).toMatchObject({ deploymentReady: true, drawPileCount: 4, deploymentCount: 3 })
    expect(before?.players[1]).toMatchObject({ cards: [], deployedCards: [], deploymentCount: null })
    await expect(run('updateDeployment', 1, { gameId, cardStableId: 'archers', change: { quantity: 0 } })).rejects.toMatchObject(code('DEPLOYMENT_LOCKED'))
    await run('finishDeployment', 2, { gameId })
    const host = await run('get', 1, { gameId })
    const guest = await run('get', 2, { gameId })
    expect(host?.phase).toBe('battle')
    expect(host?.battleStartedAt).toBeTypeOf('number')
    expect(host?.players[0].deployedCards[0].quantity).toBe(3)
    expect(host?.players[1]).toMatchObject({ deckName: 'Armée 2', cards: [], drawPileCount: 2, deploymentCount: 5 })
    expect(host?.players[1].deployedCards).toEqual(guest?.players[1].deployedCards)
    expect(guest?.players[0].cards).toEqual([])
    expect(guest?.players[1].isMe).toBe(true)
    await run('finishDeployment', 2, { gameId })
    await expect(run('updateDeployment', 2, { gameId, cardStableId: 'archers', change: { quantity: 0 } })).rejects.toMatchObject(code('WRONG_GAME_PHASE'))
  })
  it('allows empty decks and zero deployment without a cost or deck-size constraint', async () => {
    const { run, readyFor, tables } = setup()
    tables.deckCards = []
    const gameId = await readyFor()
    await run('finishDeployment', 1, { gameId })
    await run('finishDeployment', 2, { gameId })
    const game = await run('get', 1, { gameId })
    expect(game?.phase).toBe('battle')
    expect(game?.players.map((player) => [player.drawPileCount, player.deploymentCount])).toEqual([[0, 0], [0, 0]])
  })
})
