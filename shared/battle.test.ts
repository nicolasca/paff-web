import { describe, expect, it } from 'vitest'
import { initialBattle, orderDefinitions, RULES_VERSION } from './battle'
import { CATALOGUE_VERSION } from './catalogue2026'

describe('orders from the AUTO PDF and October 2 rulings', () => {
  it('uses the same AUTO reference for battle rules and unit profiles', () => {
    expect(RULES_VERSION).toBe('2026-10-02-auto-1')
    expect(CATALOGUE_VERSION).toBe(RULES_VERSION)
    expect(orderDefinitions).toHaveLength(16)
    expect(orderDefinitions.some((order) => ['shamanic-invocation', 'summon-spirits', 'long-range-fire'].includes(order.id))).toBe(false)
  })
  it('keeps four common orders and describes the progressive recruitment allowance', () => {
    expect(orderDefinitions.filter((order) => order.faction === 'common').map((order) => order.name)).toEqual(['Mouvement', 'Tir', 'Tir Artillerie', 'Recrutement'])
    const battle = initialBattle([{ seat: 0, faction: 'gobelins' }, { seat: 1, faction: 'sephosi' }])
    const recruitment = battle.catalog.find((order) => order.id === 'recruitment')!
    expect(battle.manual.stocks.filter((stock) => stock.orderId === 'recruitment')).toEqual([{ seat: 0, orderId: 'recruitment', remaining: 3 }, { seat: 1, orderId: 'recruitment', remaining: 3 }])
    for (const rule of ['première est accessible à partir du tour 2', 'deuxième à partir du tour 3', 'troisième à partir du tour 4', 'aux tours 2, 4 et 5', 'sans ennemi non engagé', 'tirer dès leur arrivée']) expect(recruitment.description).toContain(rule)
    expect(recruitment.description).not.toContain('ne peuvent pas tirer')
    expect(recruitment.description).not.toContain('6 ou 9 points')
  })

  it('gives each faction its four finalized orders and the 4/2/1 limited stocks', () => {
    const battle = initialBattle([{ seat: 0, faction: 'gobelins' }, { seat: 1, faction: 'sephosi' }])
    const expected = [
      ['Tiens, des gobelins...', 'Boost shamanique', 'Pause-déjeuner', 'La gross Invokation !'],
      ['Repli stratégique', 'Tir concentré', 'Fureur divine', 'Protéger la Salamandre !'],
    ]
    for (const seat of [0, 1]) {
      const orders = battle.catalog.filter((order) => order.faction !== 'common' && order.seats.includes(seat))
      expect(orders.map((order) => order.name)).toEqual(expected[seat])
      expect(orders.map((order) => order.category)).toEqual(['common', 'advanced', 'rare', 'legendary'])
      expect(orders.map((order) => order.limit)).toEqual([undefined, 4, 2, 1])
      expect(orders.every((order) => order.seats.length === 1)).toBe(true)
      expect(battle.manual.stocks.filter((stock) => stock.seat === seat).map((stock) => stock.remaining)).toEqual([3, 4, 2, 1])
    }
    expect(battle.catalog).toHaveLength(12)
    expect(battle.catalog.some((order) => ['shamanic', 'waaagh'].includes(order.id))).toBe(false)
    expect(battle.catalog.some((order) => /mettre à jour|pas encore défini/.test(order.description))).toBe(false)
  })

  it('keeps separate stocks for two players of the same faction and for a later battle', () => {
    const factions = [{ seat: 0, faction: 'gobelins' }, { seat: 1, faction: 'gobelins' }]
    const first = initialBattle(factions)
    expect(first.catalog).toHaveLength(8)
    expect(first.catalog.every((order) => order.seats.join(',') === '0,1')).toBe(true)
    first.manual.stocks.find((stock) => stock.seat === 0 && stock.orderId === 'shamanic-boost')!.remaining--
    expect(first.manual.stocks.find((stock) => stock.seat === 1 && stock.orderId === 'shamanic-boost')?.remaining).toBe(4)
    const second = initialBattle(factions)
    expect(second.manual.stocks.filter((stock) => stock.orderId === 'shamanic-boost').map((stock) => stock.remaining)).toEqual([4, 4])
  })

  it('does not assign Goblin or Sephosi orders to the other factions', () => {
    const battle = initialBattle([{ seat: 0, faction: 'orcs' }, { seat: 1, faction: 'gaeli' }])
    expect(battle.catalog).toHaveLength(8)
    expect(battle.catalog.every((order) => order.faction === 'common' || order.faction === 'gaeli')).toBe(true)
    const gaeli = battle.catalog.filter((order) => order.faction === 'gaeli')
    expect(gaeli.map((order) => order.name)).toEqual(['Bran Teha', 'Course héroique', 'Appel des vents', 'Colère de la Forêt'])
    expect(gaeli.map((order) => order.seats)).toEqual([[1], [1], [1], [1]])
    expect(gaeli.map((order) => order.limit)).toEqual([undefined, 4, 2, 1])
    expect(battle.catalog.some((order) => order.id === 'long-range-fire')).toBe(false)
    expect(battle.manual.stocks.filter((stock) => stock.seat === 1).map((stock) => stock.remaining)).toEqual([3, 4, 2, 1])
    expect(new Set(orderDefinitions.map((order) => order.id)).size).toBe(orderDefinitions.length)
  })
})
