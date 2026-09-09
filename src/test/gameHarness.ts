import type { FunctionReturnType } from 'convex/server'
import type { api } from '../../convex/_generated/api'
import type { MutationCtx } from '../../convex/_generated/server'
import * as games from '../../convex/games'
import * as decks from '../../convex/decks'
import * as players from '../../convex/players'
import * as catalogue2026 from '../../convex/catalogue2026'
import * as manual from '../../convex/manual'
type Row = Record<string, unknown> & { _id: string }

export function createGameHarness() {
  const tables: Record<string, Row[]> = {
    playerProfiles: [1, 2, 3].map((i) => ({ _id: `profile-${i}`, userId: `user-${i}`, active: true, displayName: `Joueur ${i}`, loginId: `joueur${i}`, role: 'player' })),
    entities: [{ _id: 'entity', status: 'published' }],
    factions: [{ _id: 'faction', stableId: 'gobelins', entityId: 'entity', name: 'Gobelins', themeKey: 'gobelins', status: 'published' }],
    cards: [{ _id: 'unit', stableId: 'archers', factionId: 'faction', name: 'Archers', kind: 'unit', cost: 2, life: 1, attack: 2, deckLimit: 2, abilities: ['Tir'], imagePath: '/archers.webp', status: 'published' }, { _id: 'action', stableId: 'piege', factionId: 'faction', name: 'Piège', kind: 'action', abilities: [], imagePath: '/piege.webp', status: 'published' }],
    decks: [1, 2].map((i) => ({ _id: `deck-${i}`, ownerUserId: `user-${i}`, name: `Armée ${i}`, factionId: 'faction' })),
    deckCards: [1, 2].flatMap((i) => [{ _id: `units-${i}`, deckId: `deck-${i}`, cardId: 'unit', quantity: 5 }]),
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
  const modules = { games, decks, players, catalogue2026, manual }
  async function invoke(module: keyof typeof modules, name: string, user: number, args: Record<string, unknown> = {}): Promise<unknown> {
    const ctx = { db, auth: { getUserIdentity: async () => user ? { subject: `user-${user}|session` } : null } } as unknown as MutationCtx
    const snapshot = structuredClone(tables)
    const handler = (modules[module] as unknown as Record<string, { _handler: (ctx: MutationCtx, args: Record<string, unknown>) => Promise<unknown> }>)[name]
    if (!handler) throw new Error(`Missing test handler ${module}:${name}`)
    try {
      const result = await handler._handler(ctx, args)
      return result
    }
    catch (error) { Object.assign(tables, snapshot); throw error }
  }
  async function run<T extends keyof typeof games>(name: T, user = 1, args: Record<string, unknown> = {}): Promise<FunctionReturnType<typeof api.games[T]>> {
    return invoke('games', name, user, args) as Promise<FunctionReturnType<typeof api.games[T]>>
  }
  async function readyFor(phase: 'waiting' | 'deck_selection' | 'preparation' = 'preparation') {
    const gameId = await run('create')
    await run('join', 2, { gameId })
    if (phase === 'waiting') return gameId
    await run('start', 1, { gameId })
    if (phase === 'deck_selection') return gameId
    await run('selectDeck', 1, { gameId, deckId: 'deck-1' })
    await run('selectDeck', 2, { gameId, deckId: 'deck-2' })
    return gameId
  }
  return { tables, run, readyFor, invoke }
}
