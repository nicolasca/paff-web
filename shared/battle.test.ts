import { describe, expect, it } from 'vitest'
import { initialBattle, orderDefinitions } from './battle'

describe('orders from the September 11 PDF, pages 3 and 7', () => {
  it('keeps four common orders and describes the progressive recruitment allowance', () => {
    expect(orderDefinitions.filter((order) => order.faction === 'common').map((order) => order.name)).toEqual(['Mouvement', 'Tir', 'Tir Artillerie', 'Recrutement'])
    const battle = initialBattle([{ seat: 0, faction: 'gobelins' }, { seat: 1, faction: 'sephosi' }])
    const recruitment = battle.catalog.find((order) => order.id === 'recruitment')!
    expect(battle.manual.stocks.filter((stock) => stock.orderId === 'recruitment')).toEqual([{ seat: 0, orderId: 'recruitment', remaining: 3 }, { seat: 1, orderId: 'recruitment', remaining: 3 }])
    for (const rule of ['première est accessible à partir du tour 3', 'deuxième à partir du tour 4', 'troisième à partir du tour 5', '6 ou 9 points', 'ne peuvent pas tirer']) expect(recruitment.description).toContain(rule)
  })

  it('gives each faction its four finalized orders and the 4/2/1 limited stocks', () => {
    const battle = initialBattle([{ seat: 0, faction: 'gobelins' }, { seat: 1, faction: 'sephosi' }])
    const expected = [
      ['Tiens, des gobelins...', 'Invokation shamanique', 'Pause-déjeuner', 'La gross Invokation !'],
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
    first.manual.stocks.find((stock) => stock.seat === 0 && stock.orderId === 'shamanic-invocation')!.remaining--
    expect(first.manual.stocks.find((stock) => stock.seat === 1 && stock.orderId === 'shamanic-invocation')?.remaining).toBe(4)
    const second = initialBattle(factions)
    expect(second.manual.stocks.filter((stock) => stock.orderId === 'shamanic-invocation').map((stock) => stock.remaining)).toEqual([4, 4])
  })

  it('does not assign Goblin or Sephosi orders to the other factions', () => {
    const battle = initialBattle([{ seat: 0, faction: 'orcs' }, { seat: 1, faction: 'gaeli' }])
    expect(battle.catalog).toHaveLength(4)
    expect(battle.catalog.every((order) => order.faction === 'common')).toBe(true)
    expect(new Set(orderDefinitions.map((order) => order.id)).size).toBe(orderDefinitions.length)
  })
})
