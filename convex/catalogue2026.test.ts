import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createGameHarness } from '../src/test/gameHarness'
import { catalogue2026, CATALOGUE_VERSION } from '../shared/catalogue2026'
import { hasUnitAbility, unitAbilities } from '../shared/unitAbilities'

function setup() {
  const h = createGameHarness()
  h.tables.factions.push({ ...h.tables.factions[0], _id: 'sephosi', stableId: 'sephosi', name: 'Céphosi' }, { ...h.tables.factions[0], _id: 'orcs', stableId: 'orcs' }, { ...h.tables.factions[0], _id: 'gaeli', stableId: 'gaeli', name: 'Gaeli' })
  h.tables.cards.push({ ...h.tables.cards[0], _id: 'troll', stableId: 'gobelins-meneurs-de-troll', name: 'Meneurs de Troll', dataVersion: 'paff-v100', profile: { unitType: 'elite', regiment: 3, dice: 2, offense: { kind: 'melee', score: 6 }, defenseMelee: 3, defenseRanged: 2, source: 'defined' } }, { ...h.tables.cards[0], _id: 'orc', stableId: 'orc', factionId: 'orcs' })
  h.tables.deckCards.push({ _id: 'troll-deck', deckId: 'deck-1', cardId: 'troll', quantity: 3 })
  const apply = () => h.invoke('catalogue2026', 'apply', 0)
  return { ...h, apply }
}

describe('AUTO roster with the October 2 rulings and preserved identities', () => {
  it('updates attack values and removes retired abilities without changing the thirty-unit roster', () => {
    expect(catalogue2026).toHaveLength(30)
    expect(new Set(catalogue2026.map((unit) => unit.stableId)).size).toBe(30)
    for (const faction of ['gobelins', 'sephosi', 'gaeli']) expect(catalogue2026.filter((unit) => unit.faction === faction)).toHaveLength(10)
    expect(catalogue2026.find((unit) => unit.stableId === 'gobelins-shaman-gobelin')).toMatchObject({ cost: 1, profile: { unitType: 'ranged', regiment: 1, dice: 0, offense: { kind: 'none', score: null }, defenseMelee: 1, defenseRanged: 1 } })
    expect(catalogue2026.find((unit) => unit.stableId === 'gobelins-katapult-a-gobs')).toMatchObject({ cost: 2, profile: { regiment: 1, dice: 2, offense: { kind: 'ranged', score: 3 }, ability: unitAbilities.ammunition } })
    expect(catalogue2026.find((unit) => unit.stableId === 'sephosi-lanciers-sephosiens')?.profile).toMatchObject({ dice: 2, offense: { kind: 'melee', score: 3 }, defenseMelee: 4, defenseRanged: 4 })
    expect(catalogue2026.find((unit) => unit.stableId === 'sephosi-cavalerie-lourde-sephosienne')?.profile).toMatchObject({ dice: 2, offense: { kind: 'melee', score: 4 }, defenseMelee: 3, defenseRanged: 2 })
    expect(catalogue2026.find((unit) => unit.stableId === 'gobelins-le-danzereu')?.profile.ability).toEqual(unitAbilities.shamanicConcentration)
    for (const stableId of ['gobelins-archers-gobelins', 'gobelins-shaman-gobelin', 'sephosi-lanciers-sephosiens', 'sephosi-cavalerie-lourde-sephosienne', 'gaeli-gardiens-des-cen', 'gaeli-druide']) {
      expect(catalogue2026.find((unit) => unit.stableId === stableId)?.profile.ability, stableId).toBeUndefined()
    }
    const abilityIds = Object.values(unitAbilities).map((ability) => ability.id)
    for (const id of ['bran-teha', 'ancestral-song', 'powerful-charge', 'green-line', 'spear-wall', 'goblin-rain', 'melee-shooting', 'magical-shot']) expect(abilityIds).not.toContain(id)
  })
  it('publishes long-range fire as an Archer ability while preserving frozen Archers and deck references', async () => {
    const h = setup()
    const archers = catalogue2026.find((unit) => unit.stableId === 'gaeli-archers-longs-gaeliens')!
    const historicalProfile = structuredClone(archers.profile)
    delete historicalProfile.ability
    h.tables.cards.push({ ...h.tables.cards[0], _id: 'long-archers', stableId: archers.stableId, factionId: 'gaeli', name: archers.name, cost: archers.cost, profile: historicalProfile })
    h.tables.decks.find((deck) => deck._id === 'deck-1')!.factionId = 'gaeli'
    h.tables.deckCards = h.tables.deckCards.filter((entry) => entry.deckId !== 'deck-1')
    h.tables.deckCards.push({ _id: 'long-archers-deck', deckId: 'deck-1', cardId: 'long-archers', quantity: 1 })
    await h.readyFor('preparation')
    const frozen = structuredClone(h.tables.gameCards)
    const entries = structuredClone(h.tables.deckCards)
    expect(frozen.find((card) => card.stableId === archers.stableId)).toMatchObject({ profile: historicalProfile })

    await h.apply()
    expect(h.tables.cards.find((card) => card._id === 'long-archers')).toMatchObject({
      dataVersion: CATALOGUE_VERSION, abilities: ['Tir longue portée'],
      profile: { ...historicalProfile, ability: unitAbilities.longRangeFire },
    })
    expect(catalogue2026.filter((unit) => hasUnitAbility(unit.profile, 'longRangeFire')).map((unit) => unit.stableId)).toEqual([archers.stableId])
    expect(h.tables.gameCards).toEqual(frozen)
    expect(h.tables.deckCards).toEqual(entries)

    await h.run('leave', 1, { gameId: h.tables.games[0]._id })
    const gameId = await h.readyFor('deck_selection')
    await h.run('selectDeck', 1, { gameId, deckId: 'deck-1' })
    const me = (await h.run('get', 1, { gameId }))!.players[0]
    expect(me.cards[0]).toMatchObject({ stableId: archers.stableId, profile: { ability: unitAbilities.longRangeFire } })
  })
  it('removes all Orc deck entries, hides the faction, and leaves empty decks reusable', async () => {
    const h = setup()
    h.tables.decks.push({ _id: 'orc-deck', ownerUserId: 'user-1', name: 'Ma vieille armée', factionId: 'orcs' }, { _id: 'empty-orc-deck', ownerUserId: 'user-2', name: 'Vide', factionId: 'orcs' })
    h.tables.cards.push({ ...h.tables.cards[0], _id: 'old-orc', stableId: 'old-orc', factionId: 'orcs', status: 'archived' })
    h.tables.deckCards.push(
      { _id: 'orc-only', deckId: 'orc-deck', cardId: 'orc', quantity: 3 },
      { _id: 'orc-mixed', deckId: 'deck-2', cardId: 'orc', quantity: 2 },
      { _id: 'orc-retired', deckId: 'deck-1', cardId: 'old-orc', quantity: 1 },
    )
    const others = structuredClone(h.tables.deckCards.filter((entry) => !['orc', 'old-orc'].includes(String(entry.cardId))))
    const result = await h.apply()
    expect(result).toMatchObject({ disabledFactions: 1, removedOrcEntries: 3, clearedOrcDecks: 2 })
    expect(h.tables.deckCards).toEqual(others)
    expect(h.tables.decks.find((deck) => deck._id === 'orc-deck')).toMatchObject({ ownerUserId: 'user-1', name: 'Ma vieille armée', factionId: undefined })
    expect(await h.invoke('catalogue', 'listCards', 0, { factionStableId: 'orcs' })).toEqual([])
    expect((await h.invoke('catalogue', 'listFactions', 0) as { stableId: string }[]).map((faction) => faction.stableId).sort()).toEqual(['gaeli', 'gobelins', 'sephosi'])
    await expect(h.invoke('decks', 'create', 1, { name: 'Orcs', factionStableId: 'orcs' })).rejects.toMatchObject({ data: { code: 'FACTION_NOT_AVAILABLE' } })
    await expect(h.invoke('decks', 'setCardQuantity', 1, { deckId: 'orc-deck', cardStableId: 'orc', quantity: 1 })).rejects.toMatchObject({ data: { code: 'CARD_NOT_AVAILABLE' } })
    await h.invoke('decks', 'setCardQuantity', 1, { deckId: 'orc-deck', cardStableId: 'gaeli-combattants-des-vlands', quantity: 1 })
    expect(h.tables.decks.find((deck) => deck._id === 'orc-deck')?.factionId).toBe('gaeli')
    const gameId = await h.readyFor('deck_selection')
    await h.run('selectDeck', 1, { gameId, deckId: 'orc-deck' })
    expect(h.tables.gameCards[0]).toMatchObject({ name: 'Combattants des Vlands', cost: 2, profile: { regiment: 2, dice: 2 } })
  })
  it('updates historical Gaeli identities and archives Sorl Caleit and old action cards', async () => {
    const h = setup()
    for (const slug of ['combattants-des-vlands', 'druide', 'esprits-des-bois', 'chefs-de-clan-de-gaeli', 'sorl-caleit', 'charge-du-gardien', 'appel-des-vents', 'sacrifice-druidique']) {
      h.tables.cards.push({ ...h.tables.cards[0], _id: slug, stableId: `gaeli-${slug}`, factionId: 'gaeli' })
      h.tables.deckCards.push({ _id: `entry-${slug}`, deckId: 'deck-1', cardId: slug, quantity: 1 })
    }
    const entries = structuredClone(h.tables.deckCards)
    await h.apply()
    expect(h.tables.deckCards).toEqual(entries)
    expect(h.tables.cards.find((card) => card._id === 'druide')).toMatchObject({ name: 'Druides', profile: { dice: 0, offense: { kind: 'none', score: null } } })
    expect(h.tables.cards.find((card) => card._id === 'druide')?.profile).not.toHaveProperty('ability')
    expect(h.tables.cards.find((card) => card._id === 'chefs-de-clan-de-gaeli')).toMatchObject({ profile: { unitType: 'unique', regiment: 2, ability: { id: 'for-gaeli' } } })
    for (const id of ['sorl-caleit', 'charge-du-gardien', 'appel-des-vents', 'sacrifice-druidique']) expect(h.tables.cards.find((card) => card._id === id)?.status).toBe('archived')
    expect(h.tables.cards.filter((card) => card.factionId === 'gaeli' && card.status === 'published')).toHaveLength(10)
  })
  it('publishes ten units per faction and preserves existing deck references', async () => {
    const { tables, apply } = setup()
    const entries = structuredClone(tables.deckCards)
    expect(await apply()).toEqual({ created: 29, updated: 1, archived: 3, disabledFactions: 1, removedOrcEntries: 0, clearedOrcDecks: 0 })
    expect(tables.cards.find((card) => card._id === 'troll')).toMatchObject({ name: 'Trolls', cost: 3, profile: { regiment: 2, dice: 2, defenseRanged: 5 }, dataVersion: CATALOGUE_VERSION, deckLimit: undefined })
    expect(tables.cards.filter((card) => card.factionId === 'faction' && card.status === 'published')).toHaveLength(10)
    expect(tables.cards.filter((card) => card.factionId === 'sephosi' && card.status === 'published')).toHaveLength(10)
    expect(tables.cards.find((card) => card._id === 'unit')?.status).toBe('archived')
    expect(tables.deckCards).toEqual(entries)
    expect(tables.cards.find((card) => card._id === 'orc')?.status).toBe('archived')
    expect(tables.cards.filter((card) => card.factionId === 'gaeli' && card.status === 'published')).toHaveLength(10)
    // Convex reorders keys when values are stored; comparison must ignore that order.
    for (const card of tables.cards) if (card.profile) card.profile = Object.fromEntries(Object.entries(card.profile as object).reverse())
    const after = structuredClone(tables)
    expect(await apply()).toEqual({ created: 0, updated: 0, archived: 0, disabledFactions: 0, removedOrcEntries: 0, clearedOrcDecks: 0 })
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
    expect(catalogue2026.some((unit) => unit.stableId === 'gobelins-bande-du-chef')).toBe(false)
    const djil = catalogue2026.find((unit) => unit.stableId === 'gobelins-djil-meneur-de-trolls')!
    expect(djil).toMatchObject({ name: 'Djil, meneur de Trolls', cost: 4, profile: { unitType: 'unique', regiment: 3, dice: 2, offense: { kind: 'melee', score: 4 }, defenseMelee: 5, defenseRanged: 5 } })
    expect(djil.profile.ability).toBeUndefined()
    expect(catalogue2026.find((unit) => unit.stableId === 'gobelins-chevaucheurs-de-skrans-gobelins')?.cost).toBe(2)
    expect(catalogue2026.find((unit) => unit.stableId === 'gobelins-bon-gros-tarre-de-gobelin')?.cost).toBe(1)
    expect(catalogue2026.find((unit) => unit.name === 'Porte-ordres Sephosiens')).toMatchObject({ stableId: 'sephosi-aides-de-camp-sephosiens', profile: { dice: 0, offense: { kind: 'none', score: null }, defenseRanged: 1 } })
    expect(catalogue2026.find((unit) => unit.name === 'Maréchal Vallardi')?.profile).toMatchObject({ dice: 0, offense: { kind: 'none', score: null }, ability: { name: 'Stratège' } })
    expect(catalogue2026.find((unit) => unit.name === 'Bande de Gobelins')?.profile).toMatchObject({ regiment: 2, dice: 2 })
    expect(catalogue2026.find((unit) => unit.name === 'Anges Protecteurs de la Sephosi')?.profile).toMatchObject({ regiment: 2, dice: 2, defenseMelee: 3, defenseRanged: 2 })
    expect(catalogue2026.every((unit) => unit.profile.defenseRangedFormat === undefined)).toBe(true)
    expect(catalogue2026.find((unit) => unit.name === 'Archers Gobelins')?.profile).toMatchObject({ regiment: 1, dice: 2, offense: { kind: 'ranged', score: 1 }, defenseRanged: 1 })
    expect(catalogue2026.find((unit) => unit.name === 'Epéistes Sephosiens')?.profile).toMatchObject({ regiment: 3, dice: 3, defenseMelee: 3, defenseRanged: 3 })
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
    expect(tables.cards.find((card) => card._id === 'mad-goblin')).toMatchObject({ status: 'published', name: 'Gros tarrés de gobelins', cost: 1, profile: { unitType: 'elite', regiment: 1, dice: 1, offense: { score: 5 } } })
    expect(tables.deckCards).toEqual(entries)
    for (const unit of catalogue2026) if (unit.profile.ability) {
      expect(unit.profile.ability.id).toBeTruthy()
      expect(unit.profile.ability.description).not.toMatch(/en cours de définition|pas encore appliqué/)
    }
  })
  it('archives the Bande du Sef without converting decks or frozen units into Djil', async () => {
    const h = setup()
    Object.assign(h.tables.cards[0], { stableId: 'gobelins-bande-du-chef', name: 'Bande du chef', cost: 3,
      profile: { unitType: 'elite', regiment: 5, dice: 4, offense: { kind: 'melee', score: 3 }, defenseMelee: 3, defenseRanged: 2, source: 'defined' } })
    // Four elites respect the existing deck quota.
    h.tables.deckCards = h.tables.deckCards.filter((entry) => entry.cardId !== 'troll')
    for (const entry of h.tables.deckCards) if (entry.cardId === 'unit') entry.quantity = 4
    await h.readyFor('preparation')
    const frozen = structuredClone(h.tables.gameCards), entries = structuredClone(h.tables.deckCards)
    await h.apply()
    expect(h.tables.cards.find((card) => card._id === 'unit')).toMatchObject({ stableId: 'gobelins-bande-du-chef', name: 'Bande du Sef', status: 'archived', cost: 3 })
    expect(h.tables.cards.filter((card) => card.stableId === 'gobelins-djil-meneur-de-trolls')).toHaveLength(1)
    expect(h.tables.gameCards).toEqual(frozen)
    expect(h.tables.deckCards).toEqual(entries)
    await expect(h.invoke('decks', 'adjustCardQuantity', 1, { deckId: 'deck-1', cardStableId: 'gobelins-bande-du-chef', delta: 1 })).rejects.toMatchObject({ data: { code: 'CARD_NOT_AVAILABLE' } })
    await h.invoke('decks', 'setCardQuantity', 1, { deckId: 'deck-1', cardStableId: 'gobelins-bande-du-chef', quantity: 0 })
    expect(h.tables.deckCards.some((entry) => entry.deckId === 'deck-1' && entry.cardId === 'unit')).toBe(false)
  })
})
