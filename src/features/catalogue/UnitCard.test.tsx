import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { CardsCatalogue } from '../../pages/CardsPage'
import type { PublicCard, PublicFaction } from './types'
import { UnitCard } from './UnitCard'
import { catalogue2026 } from '../../../shared/catalogue2026'

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
  it('shows full orders from the chosen faction and common orders, then returns to units', async () => {
    const user = userEvent.setup()
    const props = { factions, cards: [card], selectedFactionId: 'gobelins', onSelectFaction: () => undefined }
    const { rerender } = render(<CardsCatalogue {...props} />)
    await user.click(screen.getByRole('button', { name: 'Ordres 8' }))
    expect(screen.getByRole('button', { name: 'Ordres 8' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByRole('article')).toHaveLength(8)
    const invocation = screen.getByRole('article', { name: 'Invokation shamanique' })
    expect(invocation).toHaveTextContent('4 fois par partie')
    expect(invocation).toHaveTextContent('sur 2–3, défaussez une unité de Shamans ; sur 4–5, aucun effet supplémentaire')
    expect(within(screen.getByRole('region', { name: 'Ordres communs' })).getAllByRole('article')).toHaveLength(4)
    expect(screen.getByRole('article', { name: 'Recrutement' })).toHaveTextContent('à partir du tour 3')
    expect(screen.queryByRole('heading', { name: 'Archers Gobelins' })).not.toBeInTheDocument()
    rerender(<CardsCatalogue {...props} selectedFactionId="sephosi" />)
    expect(screen.getByRole('article', { name: 'Fureur divine' })).toHaveTextContent('2 fois par partie')
    expect(screen.queryByRole('article', { name: 'Invokation shamanique' })).not.toBeInTheDocument()
    rerender(<CardsCatalogue {...props} selectedFactionId="orcs" />)
    expect(screen.getAllByRole('article')).toHaveLength(4)
    expect(screen.queryByRole('article', { name: 'Fureur divine' })).not.toBeInTheDocument()
    rerender(<CardsCatalogue {...props} />)
    await user.click(screen.getByRole('button', { name: 'Unités 1' }))
    expect(screen.getByRole('heading', { name: 'Archers Gobelins' })).toBeVisible()
  })
  it.each(['Porte-ordres Sephosiens', 'Maréchal Vallardi'])('shows %s without invented dice or an attack mode', (name) => {
    const unit = catalogue2026.find((unit) => unit.name === name)!
    const { container } = render(<UnitCard card={{ ...card, ...unit, faction: card.faction }} />)
    expect(screen.getByLabelText('Aucune attaque')).toHaveTextContent('—')
    expect(screen.getByLabelText('Nombre de dés : —')).toBeVisible()
    expect(container.querySelector('.unit-stat__mode')).toBeNull()
    expect(screen.queryByText(/préciser/)).not.toBeInTheDocument()
  })
  it('shows the finalized spell definition instead of an implementation placeholder', async () => {
    const unit = catalogue2026.find((unit) => unit.name === 'Le Danzereu')!
    render(<UnitCard card={{ ...card, ...unit, faction: card.faction }} />)
    await userEvent.hover(screen.getByRole('button', { name: /Ligne Verte/ }))
    expect(screen.getByRole('tooltip')).toHaveTextContent('quel que soit son camp')
    expect(screen.getByRole('tooltip')).toHaveTextContent('+1 dé et +1 A')
    expect(screen.getByRole('tooltip')).not.toHaveTextContent('en cours de définition')
  })
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
    expect(screen.getByLabelText('Coût de recrutement 1')).toBeVisible()
    expect(screen.getByLabelText('Points de Régiment : 1')).toBeVisible()
    expect(screen.getByLabelText('Nombre de dés : 1')).toBeVisible()
    expect(screen.getByLabelText('Valeur d’attaque au tir : 3')).toBeVisible()
    expect(screen.getByLabelText('Défense contre le corps à corps : 2')).toBeVisible()
    expect(screen.getByLabelText('Défense contre le tir : 2')).toBeVisible()
    expect(screen.queryByText('A')).not.toBeInTheDocument()
    expect(screen.queryByText('Limite')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tir imprévisible/ })).toBeVisible()
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  })

  it('uses an estimated profile for missing legacy values and preserves a zero dice count', () => {
    render(<UnitCard card={{ ...card, cost: 0, life: undefined, attack: 0 }} />)
    expect(screen.getByLabelText('Coût de recrutement 0')).toBeVisible()
    expect(screen.getByLabelText('Points de Régiment : 1')).toBeVisible()
    expect(screen.getByLabelText('Nombre de dés : 0')).toBeVisible()
  })

  it('uses defined profiles instead of stale legacy statistics', () => {
    render(<UnitCard card={{ ...card, profile: { unitType: 'elite', regiment: 7, dice: 4, offense: { kind: 'melee', score: 5 }, defenseMelee: 6, defenseRanged: 3, source: 'defined' } }} />)
    expect(screen.getByLabelText('Élite')).toHaveTextContent('E')
    expect(screen.getByLabelText('Points de Régiment : 7')).toBeVisible()
    expect(screen.getByLabelText('Nombre de dés : 4')).toBeVisible()
    expect(screen.getByLabelText('Valeur d’attaque au corps à corps : 5')).toBeVisible()
    expect(screen.queryByText('T')).not.toBeInTheDocument()
  })

  it('reveals a full ability on hover or keyboard focus and dismisses it with Escape', async () => {
    const user = userEvent.setup()
    const description = 'Annulez un dégât sur une unité alliée de la même colonne.'
    render(<UnitCard card={{ ...card, stableId: 'gaeli-druide', abilities: [description] }} />)
    expect(screen.queryByText(description)).not.toBeInTheDocument()
    const button = screen.getByRole('button', { name: /Protection druidique/ })
    await user.hover(button)
    expect(screen.getByRole('tooltip')).toHaveTextContent(description)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    await user.tab()
    expect(button).toHaveFocus()
    expect(button).toHaveAccessibleDescription(/Annulez un dégât/)
    await user.keyboard('{Escape}')
    await user.click(button)
    expect(screen.getByRole('tooltip')).toHaveTextContent(description)
    await user.click(document.body)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('keeps action cards readable without invented unit statistics', () => {
    render(<UnitCard card={{ ...card, name: 'Tirs de balistes', kind: 'action', abilities: ['Infligez 1 dégât à chaque unité.'] }} />)
    expect(screen.getByText('Action')).toBeVisible()
    expect(screen.getByLabelText('Coût 1')).toBeVisible()
    expect(screen.getByText('Infligez 1 dégât à chaque unité.')).toBeVisible()
    expect(screen.queryByLabelText('Profil de l’unité')).not.toBeInTheDocument()
  })

  it('shows an explicit fallback when an illustration is missing', () => {
    render(<UnitCard card={card} />)
    fireEvent.error(screen.getByRole('img', { name: 'Illustration de Archers Gobelins' }))
    expect(screen.getByRole('img', { name: 'Illustration absente' })).toBeVisible()
  })

  it('keeps recruitment off the illustration in reserve and battlefield contexts', () => {
    const { container, rerender } = render(<UnitCard card={card} costPlacement="footer" />)
    expect(screen.getByLabelText('Coût de recrutement 1')).toHaveTextContent('Recrutement')
    expect(container.querySelector('.unit-card__art')).not.toHaveTextContent('1')
    rerender(<UnitCard card={card} costPlacement="hidden" />)
    expect(screen.queryByLabelText('Coût de recrutement 1')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Valeur d’attaque au tir : 3')).toHaveTextContent('3T')
    expect(screen.getByText('DC')).toBeVisible()
    expect(screen.queryByText('DA')).not.toBeInTheDocument()
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
