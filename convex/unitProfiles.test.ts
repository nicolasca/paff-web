import { describe, expect, it } from 'vitest'
import type { MutationCtx } from './_generated/server'
import { backfillUnitProfiles } from './migrations'
import { importCards } from './catalogImport'
import { getUnitProfile } from '../shared/unitProfile'

type Row = Record<string, unknown> & { _id: string }
const legacy = { stableId: 'sephosi-lanciers-sephosiens', name: 'Lanciers Sephosiens', kind: 'unit' as const, life: 3, attack: 1, unitType: 'D', abilities: ['-1 dégâts reçus par des unités C'] }

function setup() {
  const tables: Record<string, Row[]> = { cards: [], gameCards: [], entities: [], factions: [] }
  const row = (id: string) => Object.values(tables).flat().find((value) => value._id === id)!
  let serial = 0
  const ctx = { db: {
    query: (table: string) => ({
      paginate: async ({ cursor, numItems }: { cursor: string | null; numItems: number }) => {
        const start = Number(cursor ?? 0)
        return { page: structuredClone(tables[table].slice(start, start + numItems)), isDone: start + numItems >= tables[table].length, continueCursor: String(start + numItems) }
      },
      withIndex: (_index: string, filter: (q: unknown) => unknown) => {
        const criteria: Record<string, unknown> = {}
        const q = { eq: (field: string, value: unknown) => { criteria[field] = value; return q } }
        filter(q)
        return { unique: async () => structuredClone(tables[table].find((item) => Object.entries(criteria).every(([key, value]) => item[key] === value)) ?? null) }
      },
    }),
    insert: async (table: string, fields: Record<string, unknown>) => { const id = `${table}-${++serial}`; tables[table].push({ ...structuredClone(fields), _id: id }); return id },
    patch: async (id: string, fields: Record<string, unknown>) => { Object.assign(row(id), structuredClone(fields)) },
  } } as unknown as MutationCtx
  const run = (fn: unknown, args: Record<string, unknown>) => (fn as { _handler: (ctx: MutationCtx, args: Record<string, unknown>) => Promise<unknown> })._handler(ctx, args)
  return { tables, run }
}

describe('profile migration and imports', () => {
  it('fills only missing unit profiles and preserves IDs and manually defined values', async () => {
    const { tables, run } = setup()
    const manual = { ...getUnitProfile(legacy)!, dice: 8, source: 'defined' as const }
    tables.cards.push({ ...legacy, _id: 'legacy' }, { ...legacy, _id: 'defined', profile: manual }, { ...legacy, _id: 'action', kind: 'action' })
    expect(await run(backfillUnitProfiles, { table: 'cards', cursor: null })).toMatchObject({ scanned: 3, updated: 1, isDone: true })
    expect(tables.cards[0]).toMatchObject({ _id: 'legacy', life: 3, profile: { regiment: 3, dice: 1, source: 'estimated' } })
    expect(tables.cards[1].profile).toEqual(manual)
    expect(tables.cards[2].profile).toBeUndefined()
    expect(await run(backfillUnitProfiles, { table: 'cards', cursor: null })).toMatchObject({ updated: 0 })
  })
  it('builds old game profiles from frozen values rather than the edited catalogue', async () => {
    const { tables, run } = setup()
    tables.cards.push({ ...legacy, _id: 'current', life: 99, attack: 99 })
    tables.gameCards.push({ ...legacy, _id: 'copy', life: 2, attack: 0, quantity: 5, deploymentQuantity: 2 })
    await run(backfillUnitProfiles, { table: 'gameCards', cursor: null })
    expect(tables.gameCards[0]).toMatchObject({ quantity: 5, deploymentQuantity: 2, profile: { regiment: 2, dice: 0 } })
    expect(tables.cards[0].profile).toBeUndefined()
  })
  it('continues across bounded batches without skipping cards', async () => {
    const { tables, run } = setup()
    tables.cards = Array.from({ length: 105 }, (_, i) => ({ ...legacy, _id: `unit-${i}` }))
    const first = await run(backfillUnitProfiles, { table: 'cards', cursor: null }) as { continueCursor: string }
    expect(first).toMatchObject({ updated: 100, isDone: false })
    expect(await run(backfillUnitProfiles, { table: 'cards', cursor: first.continueCursor })).toMatchObject({ updated: 5, isDone: true })
    expect(tables.cards.every((card) => card.profile)).toBe(true)
  })
  it('creates profiles during a CSV import and preserves subsequent balancing', async () => {
    const { tables, run } = setup()
    const source = { lineNumber: 2, entityCode: 'EP', faction: 'Sephosi', name: 'Lanciers Sephosiens', cost: '3', deckLimit: '30', life: '3', attack: '1', unitType: 'D', abilities: legacy.abilities[0], isUnit: 'oui', sourceNote: '' }
    expect(await run(importCards, { rows: [source] })).toMatchObject({ cards: { created: 1 }, rejected: [] })
    const id = tables.cards[0]._id
    const profile = { ...getUnitProfile(legacy)!, offense: { kind: 'ranged' as const, score: 6 }, dice: 4, source: 'defined' as const }
    tables.cards[0].profile = profile
    expect(await run(importCards, { rows: [{ ...source, attack: '3' }] })).toMatchObject({ cards: { updated: 1 }, rejected: [] })
    expect(tables.cards[0]).toMatchObject({ _id: id, profile, attack: 3 })
    expect(await run(importCards, { rows: [{ ...source, attack: '3' }] })).toMatchObject({ cards: { unchanged: 1 } })
  })
})
