import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createGameHarness } from '../src/test/gameHarness'
import { catalogue2026, CATALOGUE_VERSION } from '../shared/catalogue2026'

function setup() {
  const h = createGameHarness()
  h.tables.factions.push({ ...h.tables.factions[0], _id: 'sephosi', stableId: 'sephosi', name: 'Céphosi' }, { ...h.tables.factions[0], _id: 'orcs', stableId: 'orcs' })
  h.tables.cards.push({ ...h.tables.cards[0], _id: 'troll', stableId: 'gobelins-meneurs-de-troll', name: 'Meneurs de Troll', dataVersion: 'paff-v100', profile: { unitType: 'elite', regiment: 3, dice: 2, offense: { kind: 'melee', score: 6 }, defenseMelee: 3, defenseRanged: 2, source: 'defined' } }, { ...h.tables.cards[0], _id: 'orc', stableId: 'orc', factionId: 'orcs' })
  h.tables.deckCards.push({ _id: 'troll-deck', deckId: 'deck-1', cardId: 'troll', quantity: 3 })
  const apply = () => h.invoke('catalogue2026', 'apply', 0)
  return { ...h, apply }
}

describe('September 10 PDF roster', () => {
  it('publishes ten units per faction and preserves existing deck references', async () => {
    const { tables, apply } = setup()
    const entries = structuredClone(tables.deckCards)
    const orc = structuredClone(tables.cards.find((card) => card._id === 'orc'))
    expect(await apply()).toEqual({ created: 19, updated: 1, archived: 2 })
    expect(tables.cards.find((card) => card._id === 'troll')).toMatchObject({ name: 'Trolls', cost: 3, profile: { regiment: 2, dice: 2, defenseRanged: 5 }, dataVersion: CATALOGUE_VERSION, deckLimit: undefined })
    expect(tables.cards.filter((card) => card.factionId === 'faction' && card.status === 'published')).toHaveLength(10)
    expect(tables.cards.filter((card) => card.factionId === 'sephosi' && card.status === 'published')).toHaveLength(10)
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
    await readyFor('preparation')
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
    expect(me.cards[0]).toMatchObject({ name: 'Trolls', quantity: 3, profile: { offense: { score: 4 } } })
  })
  it('reactivates mounted crossbowmen and the Salamander regiment without duplicating their IDs', async () => {
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
    expect(tables.cards.find((card) => card._id === 'salamander')).toMatchObject({ status: 'published', cost: 4, profile: { unitType: 'unique', regiment: 3, dice: 3, offense: { kind: 'melee', score: 4 }, defenseMelee: 4, defenseRanged: 4 } })
    expect(tables.deckCards).toEqual(entries)
  })
  it('replaces WIP values and represents Vallardi and the Porte-ordres without an attack', () => {
    expect(catalogue2026.find((unit) => unit.name === 'Bande du chef')?.profile).toMatchObject({ regiment: 5, dice: 4, defenseRanged: 2 })
    expect(catalogue2026.some((unit) => unit.name.includes('Sef'))).toBe(false)
    expect(catalogue2026.find((unit) => unit.name === 'Porte-ordres Sephosiens')).toMatchObject({ stableId: 'sephosi-aides-de-camp-sephosiens', profile: { dice: 0, offense: { kind: 'none', score: null }, defenseRanged: 1 } })
    expect(catalogue2026.find((unit) => unit.name === 'Maréchal Vallardi')?.profile).toMatchObject({ dice: 0, offense: { kind: 'none', score: null }, ability: { name: 'Stratège' } })
    expect(catalogue2026.find((unit) => unit.name === 'Bande de Gobelins')?.profile.regiment).toBe(2)
    expect(catalogue2026.find((unit) => unit.name === 'Anges Protecteurs de la Sephosi')?.profile).toMatchObject({ regiment: 2, dice: 2, defenseMelee: 3, defenseRanged: 2 })
    expect(catalogue2026.every((unit) => unit.profile.defenseRangedFormat === undefined)).toBe(true)
    expect(catalogue2026.find((unit) => unit.name === 'Archers Gobelins')?.profile).toMatchObject({ regiment: 2, dice: 3, offense: { kind: 'ranged', score: 1 }, defenseRanged: 1 })
    expect(catalogue2026.find((unit) => unit.name === 'Balistes Sephosiennes')?.profile).toMatchObject({ unitType: 'artillery', offense: { kind: 'ranged', score: 6 } })
    for (const unit of catalogue2026) expect(existsSync(`public${unit.imagePath}`), unit.imagePath).toBe(true)
  })
  it('renames aides and reactivates the old goblin elite in place while replacing provisional ability descriptions', async () => {
    const { tables, apply } = setup()
    const base = tables.cards[0]
    tables.cards.push(
      { ...base, _id: 'aide', factionId: 'sephosi', stableId: 'sephosi-aides-de-camp-sephosiens', name: 'Aides de camp Sephosiens' },
      { ...base, _id: 'mad-goblin', stableId: 'gobelins-bon-gros-tarre-de-gobelin', status: 'archived' },
    )
    tables.deckCards.push({ _id: 'aide-deck', deckId: 'deck-2', cardId: 'aide', quantity: 1 }, { _id: 'mad-deck', deckId: 'deck-1', cardId: 'mad-goblin', quantity: 1 })
    const entries = structuredClone(tables.deckCards)
    await apply()
    expect(tables.cards.find((card) => card._id === 'aide')).toMatchObject({ name: 'Porte-ordres Sephosiens', profile: { ability: { id: 'strategic-support', description: expect.stringContaining('autre axe') } } })
    expect(tables.cards.find((card) => card._id === 'mad-goblin')).toMatchObject({ status: 'published', name: 'Gros tarrés de gobelins', cost: 2, profile: { unitType: 'elite', regiment: 1, dice: 1, offense: { score: 5 } } })
    expect(tables.deckCards).toEqual(entries)
    for (const unit of catalogue2026) if (unit.profile.ability) {
      expect(unit.profile.ability.id).toBeTruthy()
      expect(unit.profile.ability.description).not.toMatch(/en cours de définition|pas encore appliqué/)
    }
  })
})
