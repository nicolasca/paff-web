import { describe, expect, it, vi } from 'vitest'
import type { MutationCtx } from './_generated/server'
import { adjustCardQuantity, create, listMine, remove, rename, setCardQuantity } from './decks'

type Row = Record<string, unknown> & { _id: string }

function context({ owner = 'user-1', active = true, authenticated = true } = {}) {
  const tables: Record<string, Row[]> = {
    playerProfiles: [{ _id: 'profile', userId: 'user-1', active, displayName: 'Joueur', loginId: 'joueur', role: 'player' }],
    entities: [{ _id: 'entity', status: 'published' }],
    factions: [{ _id: 'gobelins', stableId: 'gobelins', entityId: 'entity', name: 'Gobelins', themeKey: 'gobelins', status: 'published' }, { _id: 'orcs', stableId: 'orcs', entityId: 'entity', name: 'Orcs', themeKey: 'orcs', status: 'published' }],
    cards: [{ _id: 'card-1', stableId: 'archers', factionId: 'gobelins', name: 'Archers', kind: 'unit', cost: 2, deckLimit: 2, abilities: [], imagePath: '/archers.webp', status: 'published' }, { _id: 'card-2', stableId: 'orc', factionId: 'orcs', name: 'Orc', kind: 'unit', cost: 4, abilities: [], imagePath: '/orc.webp', status: 'published' }],
    decks: [{ _id: 'deck-1', ownerUserId: owner, name: 'Embuscade', factionId: 'gobelins', updatedAt: 1, createdAt: 1 }, { _id: 'other-deck', ownerUserId: 'other-user', name: 'Privé', updatedAt: 2, createdAt: 2 }],
    deckCards: [],
  }
  let serial = 0
  const get = (id: string) => Object.values(tables).flat().find((row) => row._id === id) ?? null
  const db = {
    get: vi.fn(async (id: string) => get(id)),
    query: (table: string) => ({
      withIndex: (_index: string, filter: (q: unknown) => unknown) => {
        const values: Record<string, unknown> = {}
        const query = { eq: (field: string, value: unknown) => { values[field] = value; return query } }
        filter(query)
        const rows = () => tables[table].filter((row) => Object.entries(values).every(([key, value]) => row[key] === value))
        return { unique: async () => rows()[0] ?? null, collect: async () => rows() }
      },
    }),
    insert: vi.fn(async (table: string, fields: Record<string, unknown>) => {
      const id = `${table}-${++serial}`
      tables[table].push({ ...fields, _id: id })
      return id
    }),
    patch: vi.fn(async (id: string, fields: Record<string, unknown>) => Object.assign(get(id)!, fields)),
    delete: vi.fn(async (id: string) => {
      for (const rows of Object.values(tables)) {
        const index = rows.findIndex((row) => row._id === id)
        if (index >= 0) rows.splice(index, 1)
      }
    }),
  }
  const ctx = { db, auth: { getUserIdentity: async () => authenticated ? { subject: 'user-1|session' } : null } } as unknown as MutationCtx
  return { ctx, db, tables }
}

async function run(fn: unknown, ctx: MutationCtx, args: Record<string, unknown>) {
  return (fn as { _handler: (context: MutationCtx, args: Record<string, unknown>) => Promise<unknown> })._handler(ctx, args)
}

describe('private decks persistence', () => {
  it('creates an empty deck with its chosen faction and normalizes its name', async () => {
    const { ctx, tables } = context()
    const id = await run(create, ctx, { name: '  A  ', factionStableId: 'gobelins' })
    expect(tables.decks.find((deck) => deck._id === id)).toMatchObject({ name: 'A', ownerUserId: 'user-1' })
    expect(tables.decks.find((deck) => deck._id === id)).toHaveProperty('factionId', 'gobelins')
    expect(tables.deckCards).toEqual([])
  })

  it.each([' ', 'a'.repeat(61)])('rejects an invalid name', async (name) => {
    const { ctx, db } = context()
    await expect(run(create, ctx, { name })).rejects.toMatchObject({ data: { code: 'INVALID_DECK_NAME' } })
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('ignores printed copy limits but refuses cards of another faction', async () => {
    const { ctx, tables } = context()
    await run(setCardQuantity, ctx, { deckId: 'deck-1', cardStableId: 'archers', quantity: 100 })
    await expect(run(setCardQuantity, ctx, { deckId: 'deck-1', cardStableId: 'orc', quantity: 7 })).rejects.toMatchObject({ data: { code: 'DECK_FACTION_MISMATCH' } })
    await expect(run(adjustCardQuantity, ctx, { deckId: 'deck-1', cardStableId: 'orc', delta: 1 })).rejects.toMatchObject({ data: { code: 'DECK_FACTION_MISMATCH' } })
    expect(tables.deckCards.map((entry) => [entry.cardId, entry.quantity])).toEqual([['card-1', 100]])
    const decks = await run(listMine, ctx, {}) as Array<{ cards: unknown[] }>
    expect(decks).toHaveLength(1)
    expect(decks[0].cards).toEqual(expect.arrayContaining([
      expect.objectContaining({ stableId: 'archers', quantity: 100, kind: 'unit', faction: { stableId: 'gobelins', name: 'Gobelins', themeKey: 'gobelins' } }),
    ]))
  })

  it('locks a legacy deck without a faction to the first added card', async () => {
    const { ctx, tables } = context()
    delete tables.decks[0].factionId
    await run(setCardQuantity, ctx, { deckId: 'deck-1', cardStableId: 'orc', quantity: 1 })
    expect(tables.decks[0].factionId).toBe('orcs')
    await expect(run(setCardQuantity, ctx, { deckId: 'deck-1', cardStableId: 'archers', quantity: 1 })).rejects.toMatchObject({ data: { code: 'DECK_FACTION_MISMATCH' } })
  })

  it('preserves mixed legacy entries until the player removes the incompatible cards', async () => {
    const { ctx, tables } = context()
    tables.deckCards.push({ _id: 'entry-1', deckId: 'deck-1', cardId: 'card-1', quantity: 2 }, { _id: 'entry-2', deckId: 'deck-1', cardId: 'card-2', quantity: 3 })
    await expect(run(adjustCardQuantity, ctx, { deckId: 'deck-1', cardStableId: 'archers', delta: 1 })).rejects.toMatchObject({ data: { code: 'DECK_FACTION_MISMATCH' } })
    expect(tables.deckCards).toHaveLength(2)
    await run(setCardQuantity, ctx, { deckId: 'deck-1', cardStableId: 'orc', quantity: 0 })
    await run(adjustCardQuantity, ctx, { deckId: 'deck-1', cardStableId: 'archers', delta: 1 })
    expect(tables.deckCards).toHaveLength(1)
    expect(tables.deckCards[0].quantity).toBe(3)
  })

  it('rejects creation with an unpublished faction', async () => {
    const { ctx, tables } = context()
    tables.factions[0].status = 'draft'
    await expect(run(create, ctx, { name: 'Deck', factionStableId: 'gobelins' })).rejects.toMatchObject({ data: { code: 'FACTION_NOT_AVAILABLE' } })
  })

  it('applies consecutive increments from stored state and removes entries at zero', async () => {
    const { ctx, tables } = context()
    for (let i = 0; i < 3; i++) await run(adjustCardQuantity, ctx, { deckId: 'deck-1', cardStableId: 'archers', delta: 1 })
    expect(tables.deckCards[0].quantity).toBe(3)
    for (let i = 0; i < 4; i++) await run(adjustCardQuantity, ctx, { deckId: 'deck-1', cardStableId: 'archers', delta: -1 })
    expect(tables.deckCards).toEqual([])
  })

  it.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects invalid quantity %s', async (quantity) => {
    const { ctx, db } = context()
    await expect(run(setCardQuantity, ctx, { deckId: 'deck-1', cardStableId: 'archers', quantity })).rejects.toMatchObject({ data: { code: 'INVALID_QUANTITY' } })
    expect(db.insert).not.toHaveBeenCalled()
    expect(db.patch).not.toHaveBeenCalled()
  })

  it('lets players remove archived cards but refuses to add unavailable cards', async () => {
    const { ctx, tables } = context()
    await run(setCardQuantity, ctx, { deckId: 'deck-1', cardStableId: 'archers', quantity: 3 })
    tables.cards[0].status = 'archived'
    await expect(run(adjustCardQuantity, ctx, { deckId: 'deck-1', cardStableId: 'archers', delta: 1 })).rejects.toMatchObject({ data: { code: 'CARD_NOT_AVAILABLE' } })
    await run(setCardQuantity, ctx, { deckId: 'deck-1', cardStableId: 'archers', quantity: 0 })
    expect(tables.deckCards).toEqual([])
  })

  it('refuses additions from an unpublished faction', async () => {
    const { ctx, tables } = context()
    tables.factions[1].status = 'draft'
    tables.decks[0].factionId = 'orcs'
    await expect(run(setCardQuantity, ctx, { deckId: 'deck-1', cardStableId: 'orc', quantity: 1 })).rejects.toMatchObject({ data: { code: 'CARD_NOT_AVAILABLE' } })
  })

  it('renames and deletes only the owned deck and its entries', async () => {
    const { ctx, tables } = context()
    await run(setCardQuantity, ctx, { deckId: 'deck-1', cardStableId: 'archers', quantity: 3 })
    tables.deckCards.push({ _id: 'other-entry', deckId: 'other-deck', cardId: 'card-1', quantity: 5 })
    await run(rename, ctx, { deckId: 'deck-1', name: ' La  garde ' })
    expect(tables.decks[0].name).toBe('La garde')
    await run(remove, ctx, { deckId: 'deck-1' })
    expect(tables.decks.map((deck) => deck._id)).toEqual(['other-deck'])
    expect(tables.deckCards.map((entry) => entry._id)).toEqual(['other-entry'])
  })

  it.each([rename, setCardQuantity, adjustCardQuantity, remove])('prevents mutations of another player’s deck', async (fn) => {
    const { ctx, db } = context({ owner: 'other-user' })
    await expect(run(fn, ctx, { deckId: 'deck-1', name: 'Volé', cardStableId: 'archers', quantity: 2, delta: 1 })).rejects.toMatchObject({ data: { code: 'DECK_NOT_FOUND' } })
    expect(db.patch).not.toHaveBeenCalled()
    expect(db.delete).not.toHaveBeenCalled()
    expect(db.insert).not.toHaveBeenCalled()
  })

  it.each([{ authenticated: false, code: 'UNAUTHENTICATED' }, { active: false, code: 'ACCOUNT_DISABLED' }])('requires an active session', async ({ code, ...options }) => {
    const { ctx } = context(options)
    await expect(run(listMine, ctx, {})).rejects.toMatchObject({ data: { code } })
    await expect(run(create, ctx, { name: 'Deck' })).rejects.toMatchObject({ data: { code } })
  })
})
