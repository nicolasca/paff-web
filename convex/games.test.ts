import { describe, expect, it } from 'vitest'
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
  async function readyFor(phase: 'waiting' | 'deck_selection' | 'deployment' = 'deployment') {
    const gameId = await run('create')
    await run('join', 2, { gameId })
    if (phase === 'waiting') return gameId
    await run('start', 1, { gameId })
    if (phase === 'deck_selection') return gameId
    await run('selectDeck', 1, { gameId, deckId: 'deck-1' })
    await run('selectDeck', 2, { gameId, deckId: 'deck-2' })
    return gameId
  }
  return { tables, run, readyFor }
}

const code = (value: string) => ({ data: { code: value } })

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
    for (const name of ['start', 'selectDeck', 'updateDeployment', 'finishDeployment', 'leave'] as const) {
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
