import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createGameHarness } from '../src/test/gameHarness'
import { catalogue2026, CATALOGUE_VERSION } from '../shared/catalogue2026'

function setup() {
  const h = createGameHarness()
  h.tables.factions.push({ ...h.tables.factions[0], _id: 'sephosi', stableId: 'sephosi', name: 'Céphosi' }, { ...h.tables.factions[0], _id: 'orcs', stableId: 'orcs' })
  h.tables.cards.push({ ...h.tables.cards[0], _id: 'troll', stableId: 'gobelins-meneurs-de-troll', name: 'Meneurs de Troll', dataVersion: 'paff-v100' }, { ...h.tables.cards[0], _id: 'orc', stableId: 'orc', factionId: 'orcs' })
  h.tables.deckCards.push({ _id: 'troll-deck', deckId: 'deck-1', cardId: 'troll', quantity: 3 })
  const apply = () => h.invoke('catalogue2026', 'apply', 0)
  return { ...h, apply }
}

describe('authoritative WIP roster', () => {
  it('publishes seven Goblin and eight Sephosi units and preserves existing deck references', async () => {
    const { tables, apply } = setup()
    const entries = structuredClone(tables.deckCards)
    const orc = structuredClone(tables.cards.find((card) => card._id === 'orc'))
    expect(await apply()).toEqual({ created: 14, updated: 1, archived: 2 })
    expect(tables.cards.find((card) => card._id === 'troll')).toMatchObject({ name: 'Trolls', cost: 4, profile: { regiment: 3, dice: 2, defenseRangedFormat: 'threshold', defenseRanged: 2 }, dataVersion: CATALOGUE_VERSION, deckLimit: undefined })
    expect(tables.cards.filter((card) => card.factionId === 'faction' && card.status === 'published')).toHaveLength(7)
    expect(tables.cards.filter((card) => card.factionId === 'sephosi' && card.status === 'published')).toHaveLength(8)
    expect(tables.cards.find((card) => card._id === 'unit')?.status).toBe('archived')
    expect(tables.deckCards).toEqual(entries)
    expect(tables.cards.find((card) => card._id === 'orc')).toEqual(orc)
    // Convex reorders keys when values are stored; comparison must ignore that order.
    for (const card of tables.cards) if (card.profile) card.profile = Object.fromEntries(Object.entries(card.profile as object).reverse())
    const after = structuredClone(tables)
    expect(await apply()).toEqual({ created: 0, updated: 0, archived: 0 })
    expect(tables).toEqual(after)
  })
  it('preserves frozen game profiles and offers a repair path for decks containing retired cards', async () => {
    const { tables, run, readyFor, invoke, apply } = setup()
    await readyFor('deployment')
    const frozen = structuredClone(tables.gameCards)
    await apply()
    expect(tables.gameCards).toEqual(frozen)
    const decks = await invoke('decks', 'listMine', 1) as { cards: { stableId: string; available: boolean }[] }[]
    expect(decks[0].cards.find((card) => card.stableId === 'archers')?.available).toBe(false)
    expect(decks[0].cards.find((card) => card.stableId === 'gobelins-meneurs-de-troll')?.available).toBe(true)
    const currentId = tables.games[0]._id
    await run('leave', 1, { gameId: currentId })
    const gameId = await readyFor('deck_selection')
    await expect(run('selectDeck', 1, { gameId, deckId: 'deck-1' })).rejects.toMatchObject({ data: { code: 'INVALID_DECK' } })
    await expect(invoke('decks', 'adjustCardQuantity', 1, { deckId: 'deck-1', cardStableId: 'archers', delta: 1 })).rejects.toMatchObject({ data: { code: 'CARD_NOT_AVAILABLE' } })
    for (const cardStableId of ['archers', 'piege']) await invoke('decks', 'setCardQuantity', 1, { deckId: 'deck-1', cardStableId, quantity: 0 })
    await run('selectDeck', 1, { gameId, deckId: 'deck-1' })
    const me = (await run('get', 1, { gameId }))!.players[0]
    expect(me.cards).toHaveLength(1)
    expect(me.cards[0]).toMatchObject({ name: 'Trolls', quantity: 3, profile: { offense: { score: 6 } } })
  })
  it('reactivates mounted crossbowmen in place without publishing the WIP Salamander regiment', async () => {
    const { tables, apply } = setup()
    const base = tables.cards[0]
    tables.cards.push(
      { ...base, _id: 'mounted', factionId: 'sephosi', stableId: 'sephosi-arbaletriers-montes-sephosiens', status: 'archived', dataVersion: 'paff-v100' },
      { ...base, _id: 'salamander', factionId: 'sephosi', stableId: 'sephosi-regiment-de-la-salamandre', status: 'archived', dataVersion: 'paff-v100' },
    )
    tables.deckCards.push({ _id: 'mounted-deck', deckId: 'deck-2', cardId: 'mounted', quantity: 2 })
    const entries = structuredClone(tables.deckCards)
    await apply()
    expect(tables.cards.filter((card) => card.stableId === 'sephosi-arbaletriers-montes-sephosiens')).toHaveLength(1)
    expect(tables.cards.find((card) => card._id === 'mounted')).toMatchObject({ status: 'published', name: 'Arbalétriers Montés', profile: { unitType: 'cavalry', offense: { kind: 'ranged' } } })
    expect(tables.cards.find((card) => card._id === 'salamander')?.status).toBe('archived')
    expect(tables.deckCards).toEqual(entries)
  })
  it('preserves excluded WIP values and supplies an existing image for every current unit', () => {
    expect(catalogue2026.find((unit) => unit.name === 'Bande du chef')?.profile.regiment).toBe(2)
    expect(catalogue2026.some((unit) => unit.name.includes('Sef'))).toBe(false)
    expect(catalogue2026.find((unit) => unit.name === 'Aides de camp Sephosiens')?.profile).toMatchObject({ dice: 0, offense: { score: null }, defenseRanged: 6, defenseRangedFormat: 'threshold' })
    expect(catalogue2026.find((unit) => unit.name === 'Archers Gobelins')?.profile).toMatchObject({ regiment: 2, dice: 3, offense: { kind: 'ranged', score: 1 }, defenseRanged: 1 })
    expect(catalogue2026.find((unit) => unit.name === 'Balistes Sephosiennes')?.profile).toMatchObject({ unitType: 'artillery', offense: { kind: 'ranged', score: 6 } })
    for (const unit of catalogue2026) expect(existsSync(`public${unit.imagePath}`), unit.imagePath).toBe(true)
  })
})
