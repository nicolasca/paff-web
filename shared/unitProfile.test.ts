import { describe, expect, it } from 'vitest'
import { estimateUnitProfile, getUnitProfile, unitTypeNames, type UnitProfile } from './unitProfile'

const card = { kind: 'unit' as const, stableId: 'archers', name: 'Archers', life: 2, attack: 1, unitType: 'T', abilities: [] }

describe('2026 unit profiles', () => {
  it('keeps dice separate from the exclusive offensive value', () => {
    const profile = getUnitProfile(card)!
    expect(profile).toMatchObject({ regiment: 2, dice: 1, offense: { kind: 'ranged', score: 3 }, source: 'estimated' })
    expect(profile.defenseMelee).toBeTypeOf('number')
    expect(profile.defenseRanged).toBeTypeOf('number')
  })
  it('allows ranged cavalry without giving the unit two attacks', () => {
    const profile = estimateUnitProfile({ ...card, name: 'Arbalétriers montés', unitType: 'T' })
    expect(profile.unitType).toBe('cavalry')
    expect(profile.offense).toEqual({ kind: 'ranged', score: 3 })
  })
  it('preserves a non-attacking support unit with zero dice', () => {
    const profile = estimateUnitProfile({ ...card, name: 'Druide', unitType: undefined, attack: 0 })
    expect(profile.dice).toBe(0)
    expect(profile.offense.kind).toBe('melee')
  })
  it.each([
    [{ name: 'Soldats', unitType: undefined }, 'troop'],
    [{ name: 'Archers' }, 'ranged'],
    [{ name: 'Chevaucheurs', unitType: 'C' }, 'cavalry'],
    [{ name: 'Baliste', unitType: undefined }, 'artillery'],
    [{ name: 'Guerriers Orcs', life: 3, attack: 2, unitType: undefined }, 'elite'],
    [{ name: 'Chef monté', deckLimit: 1 }, 'unique'],
  ] as const)('can infer the %s category', (overrides, expected) => {
    expect(estimateUnitProfile({ ...card, ...overrides }).unitType).toBe(expected)
    expect(unitTypeNames[expected]).toBeTruthy()
  })
  it('recognizes unique units in legacy game copies without a deck limit', () => {
    expect(estimateUnitProfile({ ...card, stableId: 'gaeli-chefs-de-clan-de-gaeli', name: 'Chefs de clan de Gaeli', unitType: 'C' }).unitType).toBe('unique')
  })
  it('honors a manually defined profile without recalculating it', () => {
    const profile: UnitProfile = { ...estimateUnitProfile(card), regiment: 12, dice: 4, offense: { kind: 'melee', score: 5 }, defenseMelee: 6, defenseRanged: 2, source: 'defined' }
    expect(getUnitProfile({ ...card, life: 1, attack: 0, profile })).toBe(profile)
  })
  it('gives no unit profile to action cards, including artillery actions', () => {
    expect(getUnitProfile({ ...card, name: 'Tirs de balistes', kind: 'action', profile: estimateUnitProfile(card) })).toBeUndefined()
  })
  it('keeps the full ability description behind a title of at most three words', () => {
    const description = 'Annulez 1 dégât par tour sur une unité gaelienne de la même colonne.'
    const profile = estimateUnitProfile({ ...card, stableId: 'gaeli-druide', abilities: [description] })
    expect(profile.ability).toEqual({ name: 'Protection druidique', description })
    expect(estimateUnitProfile({ ...card, abilities: [description] }).ability?.name.split(/\s+/).length).toBeLessThanOrEqual(3)
    expect(estimateUnitProfile({ ...card, abilities: [] }).ability).toBeUndefined()
  })
})
