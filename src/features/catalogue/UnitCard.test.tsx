import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CardsCatalogue } from '../../pages/CardsPage'
import type { PublicCard, PublicFaction } from './types'
import { UnitCard } from './UnitCard'

const factions: PublicFaction[] = [
  ['sephosi', 'Céphosi', 'EP'],
  ['orcs', 'Orcs', 'Peaux-Vertes'],
  ['gaeli', 'Gaeli', 'EP'],
  ['gobelins', 'Gobelins', 'Peaux-Vertes'],
].map(([stableId, name, entityName]) => ({
  stableId,
  slug: stableId,
  name,
  themeKey: stableId,
  entity: { stableId: entityName, slug: entityName, name: entityName },
}))

const card: PublicCard = {
  stableId: 'gobelins-archers-gobelins',
  name: 'Archers Gobelins',
  kind: 'unit',
  cost: 1,
  deckLimit: 30,
  life: 1,
  attack: 1,
  unitType: 'T',
  abilities: ['Tir imprévisible.'],
  imagePath: '/missing.webp',
  faction: { stableId: 'gobelins', name: 'Gobelins', themeKey: 'gobelins' },
}

describe('public card catalogue', () => {
  it('shows the four factions from data and their entity', () => {
    render(
      <CardsCatalogue
        factions={factions}
        cards={[card]}
        selectedFactionId="gobelins"
        onSelectFaction={() => undefined}
      />,
    )

    expect(screen.getAllByRole('option')).toHaveLength(4)
    expect(screen.getByRole('option', { name: 'Céphosi' })).toBeVisible()
    expect(screen.getByRole('option', { name: 'Orcs' })).toBeVisible()
    expect(screen.getByRole('option', { name: 'Gaeli' })).toBeVisible()
    expect(screen.getByRole('option', { name: 'Gobelins' })).toBeVisible()
    expect(screen.getByText('Peaux-Vertes')).toBeVisible()
  })

  it('renders card characteristics and abilities without deck controls', () => {
    render(<UnitCard card={card} />)
    expect(screen.getByRole('heading', { name: 'Archers Gobelins' })).toBeVisible()
    expect(screen.getByLabelText('Coût 1')).toBeVisible()
    expect(screen.getByText('30')).toBeVisible()
    expect(screen.getByText('Tir imprévisible.')).toBeVisible()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('keeps missing values distinct from zero', () => {
    render(<UnitCard card={{ ...card, cost: 0, life: undefined, attack: undefined }} />)
    expect(screen.getByLabelText('Coût 0')).toBeVisible()
    expect(screen.getAllByText('—')).toHaveLength(2)
  })

  it('shows an explicit fallback when an illustration is missing', () => {
    render(<UnitCard card={card} />)
    fireEvent.error(screen.getByRole('img', { name: 'Illustration de Archers Gobelins' }))
    expect(screen.getByRole('img', { name: 'Illustration absente' })).toBeVisible()
  })

  it('does not display a false empty state while loading', () => {
    render(
      <CardsCatalogue
        factions={undefined}
        cards={undefined}
        selectedFactionId=""
        onSelectFaction={() => undefined}
      />,
    )
    expect(screen.getByText('Chargement des factions…')).toBeVisible()
    expect(screen.queryByText(/aucune faction/i)).not.toBeInTheDocument()
  })

  it('shows an explicit empty catalogue state', () => {
    render(
      <CardsCatalogue
        factions={[]}
        cards={[]}
        selectedFactionId=""
        onSelectFaction={() => undefined}
      />,
    )
    expect(screen.getByText('Aucune faction publiée.')).toBeVisible()
  })
})
