import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { liveGame } from '../../test/liveGame'
import { emptyCombat, type CombatReport as Report } from '../../../shared/combat'
import { CombatReport } from './CombatReport'

const attacker = { id: 'attacker', name: 'Le Danzereu', seat: 0, cell: 40 }
const target = { id: 'target', name: 'Combattants des Vlands', seat: 1, cell: 22 }
const report: Report = {
  id: 1, turn: 1, kind: 'ranged', seat: 0, diversions: [],
  attacks: [{ attacker, target, threshold: 4, offense: 3, defense: 3, dice: [{ value: 6 }], hits: 1, damage: 1, rain: 0, effects: [] }],
  losses: [{ unit: target, before: 1, after: 0, damage: 1 }],
}
async function show(value: Report) {
  const h = await liveGame()
  const game = await h.read()
  game.battle!.manual.combat = { ...emptyCombat(), reports: [value] }
  render(<CombatReport game={game} />)
  return screen.getByRole('region', { name: 'Compte rendu des attaques' })
}

describe('combat report compatibility and new costs', () => {
  it('keeps historical diversions, rerolls and rain readable', async () => {
    const old = structuredClone(report)
    old.diversions = [{ attacker, ally: { ...target, id: 'ally', seat: 0, name: 'Bande de Gobelins' }, target, values: [2, 6] }]
    old.attacks[0].dice = [{ value: 1, rerolled: 6 }]
    old.attacks[0].damage = 0
    old.attacks[0].rain = 2
    old.losses = []
    const region = await show(old)
    expect(region).toHaveTextContent('Tir en mêlée')
    expect(region).toHaveTextContent('Dés d’orientation')
    expect(within(region).getByLabelText('Dés : 1 relancé 6')).toBeInTheDocument()
    expect(region).toHaveTextContent('−2 dés ce tour')
  })

  it('distinguishes held warriors from discards and explains ammo and shaman risks', async () => {
    const value = structuredClone(report)
    value.attacks[0].slot = 1
    value.sacrifices = [{ id: 'ammo', name: 'Bande de Gobelins', seat: 0, cell: 31 }]
    value.shamanRisks = [{ unit: { id: 'shaman', name: 'Shamans Gobelins', seat: 0, cell: 41 }, value: 2, discarded: true }]
    value.held = [target]
    const region = await show(value)
    expect(region).toHaveTextContent('Tir 2')
    expect(region).toHaveTextContent('sacrifices avant les tirs')
    expect(region).toHaveTextContent('risques après les tirs')
    expect(region).toHaveTextContent('Dé 2 · Défaussé')
    expect(region).toHaveTextContent('Dernier combat jusqu’à la fin du tour')
    expect(region.querySelector('.combat-summary > div:last-child')).toHaveTextContent('0unités détruites')
    expect(region.querySelector('.combat-losses em')).not.toHaveTextContent('Défaussée')
  })
})
