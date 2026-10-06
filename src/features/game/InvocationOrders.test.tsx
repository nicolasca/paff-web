import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invocationGame } from '../../test/invocationGame'
import type { InvocationRoll } from '../../../shared/greatInvocation'
import { emptyCombat } from '../../../shared/combat'
import { InvocationOrders } from './InvocationOrders'

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }))
vi.mock('convex/react', () => ({ useMutation: () => invoke }))

const report: InvocationRoll = {
  id: 1, seat: 0, turn: 1, value: 6, axis: 1, scope: 'all',
  shaman: { id: 'shaman', name: 'Shamans Gobelins', cell: 40 },
  units: [
    { id: 'band', name: 'Bande de Gobelins', cell: 30, before: 2, after: 2 },
    { id: 'archer', name: 'Archers Gobelins', cell: 36, before: 1, after: 1 },
  ],
}

async function resolvedGame(spectator = false) {
  const h = await invocationGame()
  const game = await h.read(spectator ? 3 : 1)
  game.battle!.manual.combat = emptyCombat()
  game.battle!.manual.combat!.invocationRolls = [structuredClone(report)]
  game.battle!.manual.combat!.invocations = [{ seat: 0, turn: 1, scope: 'all', unitIds: ['band', 'archer'] }]
  game.battle!.manual.stocks.find((stock) => stock.seat === 0 && stock.orderId === 'great-invocation')!.remaining = 0
  return game
}

describe('La gross Invokation report', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the numeric D6 result and keeps the effects when closing and reopening locally', async () => {
    const game = await resolvedGame()
    const before = structuredClone(game.battle)
    const run = vi.fn()
    render(<InvocationOrders game={game} locked run={run} />)
    const region = screen.getByRole('region', { name: 'La gross Invokation ! · Joueur 1' })
    const die = within(region).getByLabelText('Dé d’invocation : 6')
    expect(within(die).getByText('D6')).toBeVisible()
    expect(within(die).getByText('6', { exact: true })).toBeVisible()
    expect(region).toHaveTextContent('2 unités renforcées · ×2 dés')
    expect(region).toHaveTextContent('Shaman invoquant : Shamans Gobelins · E5 · Centre')
    expect(region).toHaveAttribute('data-active', 'true')

    await userEvent.click(within(region).getByRole('button', { name: 'Fermer La gross Invokation ! · Joueur 1' }))
    expect(region).toHaveAttribute('data-collapsed', 'true')
    expect(within(region).queryByText(/Shaman invoquant :/)).not.toBeInTheDocument()
    expect(within(region).getByLabelText('Dé d’invocation : 6')).toBeVisible()
    expect(region).toHaveTextContent('bonus actif')
    expect(game.battle).toEqual(before)
    expect(run).not.toHaveBeenCalled()
    expect(invoke).not.toHaveBeenCalled()

    await userEvent.click(within(region).getByRole('button', { name: 'Voir les détails de La gross Invokation ! · Joueur 1' }))
    expect(region).toHaveAttribute('data-collapsed', 'false')
    expect(within(region).getByText(/Shaman invoquant :/)).toBeVisible()
  })

  it('reopens for a new report even when its die value is identical', async () => {
    const game = await resolvedGame()
    const mounted = render(<InvocationOrders game={game} run={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Fermer La gross Invokation ! · Joueur 1' }))
    mounted.rerender(<InvocationOrders game={structuredClone(game)} run={vi.fn()} />)
    expect(screen.getByRole('region', { name: 'La gross Invokation ! · Joueur 1' })).toHaveAttribute('data-collapsed', 'true')
    const updated = structuredClone(game)
    updated.battle!.manual.combat!.invocationRolls!.push({ ...structuredClone(report), id: 2, turn: 2 })
    mounted.rerender(<InvocationOrders game={updated} run={vi.fn()} />)
    const region = screen.getByRole('region', { name: 'La gross Invokation ! · Joueur 1' })
    expect(region).toHaveAttribute('data-collapsed', 'false')
    expect(within(region).getByRole('button', { name: 'Fermer La gross Invokation ! · Joueur 1' })).toBeEnabled()
    expect(within(region).getByText(/Shaman invoquant :/)).toBeVisible()
    expect(region).toHaveTextContent('tour 2')
  })

  it('lets a spectator close a failure report and recover the die and losses', async () => {
    const game = await resolvedGame(true)
    game.battle!.manual.combat!.invocations = []
    game.battle!.manual.combat!.invocationRolls = [{ ...structuredClone(report), value: 1, units: report.units.map((unit) => ({ ...unit, after: unit.before - 1 })) }]
    render(<InvocationOrders game={game} />)
    expect(screen.queryByRole('button', { name: 'Lancer La gross Invokation !' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Dé d’invocation : 1')).toHaveTextContent('1')
    expect(screen.getByText('2 R perdus · 1 unité détruite')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Fermer La gross Invokation ! · Joueur 1' }))
    expect(screen.getByText('2 R perdus · 1 unité détruite')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Voir les détails de La gross Invokation ! · Joueur 1' }))
    await userEvent.click(screen.getByText('2 unités affectées'))
    expect(screen.getByText('1 → 0 R · détruite')).toBeVisible()
  })
})
