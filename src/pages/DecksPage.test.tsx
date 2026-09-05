import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getFunctionName } from 'convex/server'
import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Id } from '../../convex/_generated/dataModel'
import type { Deck } from '../features/decks/deckStats'
import { DeckLibrary, DeckWorkspace } from './DecksPage'

const mutations = vi.hoisted(() => ({
  create: vi.fn(), rename: vi.fn(), remove: vi.fn(), setCardQuantity: vi.fn(), adjustCardQuantity: vi.fn(),
}))
vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
  useMutation: (reference: unknown) => mutations[getFunctionName(reference as never).split(':')[1] as keyof typeof mutations],
}))
const deckId = 'deck-1' as Id<'decks'>
const factions = [{ stableId: 'gobelins', slug: 'gobelins', name: 'Gobelins', themeKey: 'gobelins', entity: { stableId: 'peaux-vertes', slug: 'peaux-vertes', name: 'Peaux-Vertes' } },
  { stableId: 'orcs', slug: 'orcs', name: 'Orcs', themeKey: 'orcs', entity: { stableId: 'peaux-vertes', slug: 'peaux-vertes', name: 'Peaux-Vertes' } }]
const card = { stableId: 'archers', name: 'Archers Gobelins', kind: 'unit' as const, cost: 1, deckLimit: 2, life: 1, attack: 1, unitType: 'T', abilities: [], imagePath: '/missing.webp', faction: { stableId: 'gobelins', name: 'Gobelins', themeKey: 'gobelins' } }
const deck: Deck = { id: deckId, name: 'Embuscade', faction: { stableId: 'gobelins', name: 'Gobelins' }, cards: [], updatedAt: 1 }

function renderEditor(overrides: Partial<Parameters<typeof DeckWorkspace>[0]> = {}) {
  const props = { deck, mode: 'edit' as const, factions, cards: [card], selectedFactionId: 'gobelins', onSelectFaction: vi.fn(), onDeleted: vi.fn(), ...overrides }
  const result = render(<MemoryRouter><DeckWorkspace {...props} /></MemoryRouter>)
  return { ...result, props }
}

beforeEach(() => {
  vi.clearAllMocks()
  mutations.create.mockResolvedValue(deckId)
  for (const name of ['rename', 'remove', 'setCardQuantity', 'adjustCardQuantity'] as const) mutations[name].mockResolvedValue(undefined)
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open') } })
})

describe('deck library', () => {
  it('creates an empty deck with a name and one selected faction', async () => {
    const user = userEvent.setup()
    const onCreated = vi.fn()
    render(<MemoryRouter><DeckLibrary factions={factions} decks={[]} onCreated={onCreated} /></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: 'Nouveau deck' }))
    await user.type(screen.getByLabelText('Nom du deck'), 'A')
    expect(screen.getByRole('button', { name: 'Créer le deck' })).toBeDisabled()
    await user.selectOptions(screen.getByLabelText('Faction du deck'), 'gobelins')
    await user.click(screen.getByRole('button', { name: 'Créer le deck' }))
    expect(mutations.create).toHaveBeenCalledWith({ name: 'A', factionStableId: 'gobelins' })
    expect(onCreated).toHaveBeenCalledWith(deckId)
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('preserves the name after a creation failure and supports retry', async () => {
    const user = userEvent.setup()
    mutations.create.mockRejectedValueOnce(new Error('Offline'))
    const onCreated = vi.fn()
    render(<MemoryRouter><DeckLibrary factions={factions} decks={[]} onCreated={onCreated} /></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: 'Nouveau deck' }))
    await user.type(screen.getByLabelText('Nom du deck'), 'Embuscade')
    await user.selectOptions(screen.getByLabelText('Faction du deck'), 'gobelins')
    await user.click(screen.getByRole('button', { name: 'Créer le deck' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Impossible de créer')
    expect(screen.getByLabelText('Nom du deck')).toHaveValue('Embuscade')
    expect(onCreated).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Créer le deck' }))
    expect(onCreated).toHaveBeenCalledWith(deckId)
  })

  it('offers view and edit links and cancels deletion without changing anything', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><DeckLibrary factions={factions} decks={[deck]} onCreated={vi.fn()} /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Voir Embuscade' })).toHaveAttribute('href', '/decks/deck-1')
    expect(screen.getByRole('link', { name: 'Éditer Embuscade' })).toHaveAttribute('href', '/decks/deck-1/edit')
    await user.click(screen.getByRole('button', { name: 'Supprimer Embuscade' }))
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Supprimer « Embuscade » ?')
    await user.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(mutations.remove).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows loading separately from an empty collection', () => {
    render(<MemoryRouter><DeckLibrary factions={factions} decks={undefined} onCreated={vi.fn()} /></MemoryRouter>)
    expect(screen.getByRole('status')).toHaveTextContent('Chargement des decks')
    expect(screen.queryByText(/Aucun deck pour le moment/)).not.toBeInTheDocument()
  })
})

describe('deck editing and viewing', () => {
  it('adds beyond the printed limit and accepts an arbitrary quantity', async () => {
    const user = userEvent.setup()
    renderEditor({ deck: { ...deck, cards: [{ ...card, quantity: 2 }] } })
    await user.click(screen.getByRole('button', { name: 'Ajouter Archers Gobelins' }))
    expect(mutations.adjustCardQuantity).toHaveBeenCalledWith({ deckId, cardStableId: 'archers', delta: 1 })
    const quantity = screen.getByRole('spinbutton', { name: 'Quantité de Archers Gobelins' })
    await user.clear(quantity)
    await user.type(quantity, '50{Enter}')
    expect(mutations.setCardQuantity).toHaveBeenCalledWith({ deckId, cardStableId: 'archers', quantity: 50 })
  })

  it('removes a card entirely and disables decrement at zero', async () => {
    const user = userEvent.setup()
    renderEditor({ deck: { ...deck, cards: [{ ...card, quantity: 3 }] } })
    await user.click(screen.getByRole('button', { name: 'Retirer toutes les copies de Archers Gobelins' }))
    expect(mutations.setCardQuantity).toHaveBeenCalledWith({ deckId, cardStableId: 'archers', quantity: 0 })
  })

  it('starts with zero and rejects fractional input without a mutation', async () => {
    const user = userEvent.setup()
    renderEditor()
    expect(screen.getByRole('button', { name: 'Retirer Archers Gobelins' })).toBeDisabled()
    const quantity = screen.getByRole('spinbutton')
    await user.clear(quantity)
    await user.type(quantity, '1.5{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('nombre entier')
    expect(mutations.setCardQuantity).not.toHaveBeenCalled()
  })

  it('keeps changes to different cards independent and reports failed saves', async () => {
    const user = userEvent.setup()
    let rejectPending!: (reason: Error) => void
    mutations.adjustCardQuantity.mockReturnValueOnce(new Promise((_, reject) => { rejectPending = reject }))
    renderEditor({ cards: [card, { ...card, stableId: 'shaman', name: 'Shaman' }] })
    await user.click(screen.getByRole('button', { name: 'Ajouter Archers Gobelins' }))
    expect(screen.getByRole('button', { name: 'Ajouter Archers Gobelins' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Ajouter Shaman' })).toBeEnabled()
    await act(async () => rejectPending(new Error('Offline')))
    expect(screen.getByRole('alert')).toHaveTextContent('n’a pas été enregistrée')
    expect(screen.getByRole('button', { name: 'Ajouter Archers Gobelins' })).toBeEnabled()
  })

  it('locks the faction and excludes other factions from the available cards', () => {
    renderEditor({ deck: { ...deck, cards: [{ ...card, quantity: 4 }] }, cards: [card, { ...card, stableId: 'orc', name: 'Orc', faction: factions[1] }] })
    expect(screen.getByLabelText('Faction du deck')).toBeDisabled()
    expect(screen.getByLabelText('Faction du deck')).toHaveValue('gobelins')
    expect(screen.queryByRole('button', { name: 'Ajouter Orc' })).not.toBeInTheDocument()
    expect(within(screen.getByRole('complementary')).getByText('Archers Gobelins')).toBeVisible()
  })

  it('allows a legacy mixed deck to be repaired without further additions', async () => {
    const user = userEvent.setup()
    renderEditor({ deck: { ...deck, cards: [{ ...card, quantity: 2 }, { ...card, stableId: 'orc', name: 'Orc', faction: factions[1], quantity: 1 }] } })
    expect(screen.getByRole('alert')).toHaveTextContent('plusieurs factions')
    expect(screen.getByRole('button', { name: 'Ajouter Archers Gobelins' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Retirer toutes les copies de Orc' }))
    expect(mutations.setCardQuantity).toHaveBeenCalledWith({ deckId, cardStableId: 'orc', quantity: 0 })
  })

  it('updates the saved composition and stats after adding then removing a card', async () => {
    const user = userEvent.setup()
    function ConnectedEditor() {
      const [current, setCurrent] = useState(deck)
      mutations.adjustCardQuantity.mockImplementation(async ({ delta }: { delta: number }) => {
        setCurrent((previous) => {
          const quantity = Math.max(0, (previous.cards[0]?.quantity ?? 0) + delta)
          return { ...previous, cards: quantity ? [{ ...card, quantity }] : [] }
        })
      })
      return <DeckWorkspace deck={current} mode="edit" factions={factions} cards={[card]} selectedFactionId="gobelins" onSelectFaction={vi.fn()} onDeleted={vi.fn()} />
    }
    render(<MemoryRouter><ConnectedEditor /></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: 'Ajouter Archers Gobelins' }))
    expect(screen.getByRole('spinbutton')).toHaveValue(1)
    expect(within(screen.getByRole('complementary')).getByText('1 unités')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Retirer Archers Gobelins' }))
    expect(screen.getByRole('spinbutton')).toHaveValue(0)
    expect(within(screen.getByRole('complementary')).getByText(/Votre deck est vide/)).toBeVisible()
  })

  it('renames without a browser prompt', async () => {
    const user = userEvent.setup()
    renderEditor()
    await user.clear(screen.getByLabelText('Nom du deck'))
    await user.type(screen.getByLabelText('Nom du deck'), 'Nouvelle embuscade')
    await user.click(screen.getByRole('button', { name: 'Enregistrer le nom' }))
    expect(mutations.rename).toHaveBeenCalledWith({ deckId, name: 'Nouvelle embuscade' })
    expect(screen.getByRole('status')).toHaveTextContent('Modifications enregistrées')
  })

  it('confirms deletion and handles failure before retrying', async () => {
    const user = userEvent.setup()
    mutations.remove.mockRejectedValueOnce(new Error('Offline'))
    const { props } = renderEditor()
    await user.click(screen.getByRole('button', { name: 'Supprimer' }))
    await user.click(screen.getByRole('button', { name: 'Supprimer le deck' }))
    expect(props.onDeleted).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(screen.getByRole('alert')).toHaveTextContent('Impossible de supprimer')
    await user.click(screen.getByRole('button', { name: 'Supprimer le deck' }))
    await waitFor(() => expect(props.onDeleted).toHaveBeenCalledOnce())
    expect(mutations.remove).toHaveBeenCalledWith({ deckId })
  })

  it('shows the deck in read-only mode with its quantities and no editing controls', () => {
    renderEditor({ mode: 'view', deck: { ...deck, cards: [{ ...card, quantity: 7 }] } })
    expect(screen.getByRole('heading', { level: 1, name: 'Embuscade' })).toBeVisible()
    expect(screen.getByText('exemplaires')).toBeVisible()
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ajouter Archers Gobelins' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Éditer le deck' })).toHaveAttribute('href', '/decks/deck-1/edit')
  })
})
