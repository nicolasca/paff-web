import { unitTypeNames, type UnitProfile, type UnitType } from './unitProfile'
export const DECK_BUDGET = 33
export const DEPLOYMENT_BUDGET = 21
export const RESERVE_BUDGET = 12
const quotas: Partial<Record<UnitType, number>> = { cavalry: 6, artillery: 4, elite: 4, unique: 1 }
type Card = { kind: 'unit' | 'action'; quantity: number; cost?: number; profile?: UnitProfile; selectedQuantity?: number }
export function armyBudget(cards: Card[]) {
  return cards.filter((card) => card.kind === 'unit').reduce((totals, card) => ({ total: totals.total + (card.cost ?? 0) * card.quantity, deployed: totals.deployed + (card.cost ?? 0) * (card.selectedQuantity ?? 0), reserve: totals.reserve + (card.cost ?? 0) * (card.quantity - (card.selectedQuantity ?? 0)) }), { total: 0, deployed: 0, reserve: 0 })
}
export function deckRuleIssues(cards: Card[]) {
  const issues: string[] = []
  if (cards.some((card) => card.kind === 'action')) issues.push('Le deck de bataille doit contenir uniquement des unités.')
  if (cards.some((card) => card.kind === 'unit' && (card.cost === undefined || card.cost < 0))) issues.push('Chaque unité doit avoir un coût de recrutement connu.')
  const total = armyBudget(cards).total
  if (total > DECK_BUDGET) issues.push(`${total} / ${DECK_BUDGET} points : dépassement du budget de deck.`)
  for (const [type, limit] of Object.entries(quotas)) {
    const count = cards.filter((card) => card.profile?.unitType === type).reduce((sum, card) => sum + card.quantity, 0)
    if (count > limit) issues.push(`${unitTypeNames[type as UnitType]} : ${count} / ${limit} unités.`)
  }
  return issues
}
export function preparationBudgetError(cards: Card[]) {
  const budget = armyBudget(cards)
  if (budget.deployed > DEPLOYMENT_BUDGET) return 'DEPLOYMENT_BUDGET_EXCEEDED'
  if (budget.reserve > RESERVE_BUDGET) return 'RESERVE_BUDGET_EXCEEDED'
  return null
}
