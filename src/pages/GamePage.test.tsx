import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getFunctionName } from 'convex/server'
import { ConvexError } from 'convex/values'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Id } from '../../convex/_generated/dataModel'
import type { Game, GamePlayer, Lobby } from '../features/game/types'
import type { Deck } from '../features/decks/deckStats'
import { GameRoom } from './GamePage'
import { LobbyContent } from './LobbyPage'
import { initialSetup } from '../../shared/board'
import { catalogue2026 } from '../../shared/catalogue2026'

const mutations = vi.hoisted(() => ({ create: vi.fn(), join: vi.fn(), start: vi.fn(), selectDeck: vi.fn(), finishDeployment: vi.fn(), leave: vi.fn(), rollInitiative: vi.fn(), confirmInitiative: vi.fn(), deployUnit: vi.fn(), updatePreparation: vi.fn(), finishPreparation: vi.fn(), repositionUnit: vi.fn() }))
vi.mock('convex/react', () => ({
  useQuery: vi.fn(), useConvexConnectionState: () => ({ isWebSocketConnected: true }),
  useMutation: (reference: unknown) => mutations[getFunctionName(reference as never).split(':')[1] as keyof typeof mutations],
}))

const gameId = 'game-1' as Id<'games'>
const card = { stableId: 'archers', name: 'Archers', kind: 'unit' as const, cost: 2, life: 1, attack: 1, abilities: [], profile: undefined, imagePath: '/archers.webp', faction: { stableId: 'gobelins', name: 'Gobelins', themeKey: 'gobelins' }, quantity: 5, deploymentQuantity: 2 }
const me: GamePlayer = { id: 'member-1' as Id<'gamePlayers'>, displayName: 'Nicolas', seat: 0, isMe: true, deckChosen: false, deploymentReady: false, preparationReady: false, preparationCount: 0, deckId: null, deckName: null, factionName: null, cards: [], deployedCards: [], drawPileCount: 0, deploymentCount: 0 }
const opponent: GamePlayer = { ...me, id: 'member-2' as Id<'gamePlayers'>, displayName: 'Nicolas 2', seat: 1, isMe: false, drawPileCount: null, deploymentCount: null }
const game: Game = { id: gameId, name: 'Partie de Nicolas', phase: 'waiting', isHost: true, isSpectator: false, battleStartedAt: null, setup: null, players: [me, opponent] }
const deck: Deck = { id: 'deck-1' as Id<'decks'>, name: 'Embuscade', faction: card.faction, cards: [card], updatedAt: 1 }
const deployment: Game = { ...game, phase: 'preparation', setup: initialSetup(), players: [{ ...me, deckChosen: true, deckName: deck.name, factionName: 'Gobelins', cards: [card, { ...card, stableId: 'action', name: 'Piège', kind: 'action', quantity: 2, deploymentQuantity: 0 }], deploymentCount: 2, drawPileCount: 5 }, { ...opponent, deckChosen: true }] }
function room(value: Game = game, decks: Deck[] = [deck]) {
  const onLeave = vi.fn()
  const result = render(<MemoryRouter><GameRoom game={value} decks={decks} onLeave={onLeave} /></MemoryRouter>)
  return { ...result, onLeave }
}
function lobby(value: Lobby | undefined = { currentGame: null, watchable: [], rooms: [] }) {
  const onEnter = vi.fn()
  render(<MemoryRouter><LobbyContent lobby={value} onEnter={onEnter} /></MemoryRouter>)
  return onEnter
}
beforeEach(() => {
  vi.resetAllMocks()
  for (const fn of Object.values(mutations)) fn.mockResolvedValue(undefined)
  mutations.create.mockResolvedValue(gameId)
  mutations.join.mockResolvedValue(gameId)
})

describe('2026 preparation screens', () => {
  const modern: Game = { ...deployment, phase: 'deployment', setup: { ...initialSetup(), initiativeWinner: 0, initiativeReady: [0, 1], revision: 4 }, players: [{ ...deployment.players[0], cards: [{ ...card, selectedQuantity: 5, deploymentQuantity: 0 }], deployedCards: [], deploymentCount: 0, drawPileCount: 5 }, deployment.players[1]] }
  it('rolls once, displays both results and waits for both confirmations', async () => {
    const value: Game = { ...modern, phase: 'initiative', setup: initialSetup() }
    const { rerender } = room(value)
    await userEvent.click(screen.getByRole('button', { name: 'Lancer mon dé' }))
    expect(mutations.rollInitiative).toHaveBeenCalledWith({ gameId, round: 1 })
    const rolled = { ...initialSetup(), initiativeRolls: [{ seat: 0, result: 6, round: 1 }] }
    rerender(<MemoryRouter><GameRoom game={{ ...value, setup: rolled }} onLeave={vi.fn()} /></MemoryRouter>)
    expect(screen.getByRole('img', { name: 'Nicolas : 6 sur 6' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Dé lancé ✓' })).toBeDisabled()
    const won = { ...rolled, initiativeWinner: 0, initiativeRolls: [...rolled.initiativeRolls, { seat: 1, result: 2, round: 1 }] }
    rerender(<MemoryRouter><GameRoom game={{ ...value, setup: won }} onLeave={vi.fn()} /></MemoryRouter>)
    expect(screen.getByText('Nicolas prend l’initiative.')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Passer au déploiement' }))
    expect(mutations.confirmInitiative).toHaveBeenCalledWith({ gameId })
    rerender(<MemoryRouter><GameRoom game={{ ...value, setup: { ...won, initiativeReady: [0] } }} onLeave={vi.fn()} /></MemoryRouter>)
    expect(screen.getByRole('button', { name: 'En attente de l’adversaire…' })).toBeDisabled()
  })
  it('explains ties and uses the current round for a reroll', async () => {
    room({ ...modern, phase: 'initiative', setup: { ...initialSetup(), initiativeRound: 2, initiativeRolls: [{ seat: 0, result: 3, round: 1 }, { seat: 1, result: 3, round: 1 }] } })
    expect(screen.getByText('Égalité au jet précédent : relancez !')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Lancer mon dé' }))
    expect(mutations.rollInitiative).toHaveBeenCalledWith({ gameId, round: 2 })
  })
  it('highlights the five first-placement cells and sends their canonical coordinates', async () => {
    const { container } = room(modern)
    expect(container.querySelectorAll('[data-cell]')).toHaveLength(54)
    await userEvent.click(screen.getByRole('button', { name: 'Sélectionner Archers, 5 disponibles' }))
    expect(screen.getAllByRole('button', { name: /Déployer ici/ })).toHaveLength(5)
    await userEvent.click(screen.getByRole('button', { name: 'E5 · Déployer ici' }))
    expect(mutations.deployUnit).toHaveBeenCalledWith({ gameId, cardStableId: 'archers', cell: 40, revision: 4 })
  })
  it('shows the same board rotated for the guest and locks actions outside their turn', async () => {
    const guest: Game = { ...modern, players: [{ ...modern.players[0], isMe: false, cards: [] }, { ...modern.players[0], id: opponent.id, displayName: opponent.displayName, seat: 1, isMe: true }] }
    const { container, rerender } = room(guest)
    expect(container.querySelector('[data-cell]')).toHaveAttribute('data-cell', '53')
    expect(screen.getByRole('button', { name: 'Sélectionner Archers, 5 disponibles' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Terminer mon déploiement' })).toBeDisabled()
    rerender(<MemoryRouter><GameRoom game={{ ...guest, setup: { ...guest.setup!, deploymentTurn: 1, revision: 5 } }} onLeave={vi.fn()} /></MemoryRouter>)
    await userEvent.click(screen.getByRole('button', { name: 'Sélectionner Archers, 5 disponibles' }))
    await userEvent.click(screen.getByRole('button', { name: 'E2 · Déployer ici' }))
    expect(mutations.deployUnit).toHaveBeenCalledWith({ gameId, cardStableId: 'archers', cell: 13, revision: 5 })
  })
})

describe('lobby', () => {
  it('creates and enters a room', async () => {
    const onEnter = lobby()
    await userEvent.click(screen.getByRole('button', { name: /Créer une partie/ }))
    expect(mutations.create).toHaveBeenCalledWith({})
    expect(onEnter).toHaveBeenCalledWith(gameId)
  })
  it('joins an open table and disables a full one', async () => {
    const onEnter = lobby({ currentGame: null, watchable: [], rooms: [{ id: gameId, name: 'Table ouverte', playerCount: 1, createdAt: 1 }, { id: 'full' as Id<'games'>, name: 'Table complète', playerCount: 2, createdAt: 2 }] })
    const buttons = screen.getAllByRole('button', { name: /Rejoindre/ })
    expect(buttons[1]).toBeDisabled()
    await userEvent.click(buttons[0])
    expect(mutations.join).toHaveBeenCalledWith({ gameId })
    expect(onEnter).toHaveBeenCalledWith(gameId)
  })
  it('resumes an existing game instead of opening a second one', () => {
    lobby({ currentGame: { id: gameId, name: game.name, phase: 'deployment' }, watchable: [], rooms: [] })
    expect(screen.getByRole('button', { name: /Créer une partie/ })).toBeDisabled()
    expect(screen.getByRole('link', { name: /Reprendre/ })).toHaveAttribute('href', '/lobby/game-1')
  })
  it('reports a race for the last seat and allows retry', async () => {
    mutations.join.mockRejectedValueOnce(new ConvexError({ code: 'GAME_FULL' }))
    const onEnter = lobby({ currentGame: null, watchable: [], rooms: [{ id: gameId, name: game.name, playerCount: 1, createdAt: 1 }] })
    await userEvent.click(screen.getByRole('button', { name: /Rejoindre/ }))
    expect(screen.getByRole('alert')).toHaveTextContent('dernière place')
    expect(onEnter).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Rejoindre/ })).toBeEnabled()
  })
})

describe('synchronized preparation screens', () => {
  it('explains Blop’s reserve-only rule and prevents selecting him for initial deployment', () => {
    const blop = catalogue2026.find((unit) => unit.name === 'Blop, le Meuteur')!
    room({ ...deployment, players: [{ ...deployment.players[0], cards: [{ ...card, ...blop, faction: card.faction, quantity: 1, selectedQuantity: 0, deploymentQuantity: 0 }] }, deployment.players[1]] })
    expect(screen.getByText('Commence en réserve · Meuteur !')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Ajouter Blop, le Meuteur' })).toBeDisabled()
    expect(screen.getByRole('spinbutton')).toHaveAttribute('max', '0')
    expect(screen.getByRole('button', { name: 'Valider mes unités' })).toBeEnabled()
  })
  it('waits for two seats before the host can start', async () => {
    const { rerender } = room({ ...game, players: [me] })
    expect(screen.getByRole('button', { name: /Lancer/ })).toBeDisabled()
    rerender(<MemoryRouter><GameRoom game={game} decks={[]} onLeave={vi.fn()} /></MemoryRouter>)
    await userEvent.click(screen.getByRole('button', { name: /Lancer/ }))
    expect(mutations.start).toHaveBeenCalledWith({ gameId })
  })
  it('shows the guest that only the host launches the game', () => {
    room({ ...game, isHost: false, players: [{ ...me, isMe: false }, { ...opponent, isMe: true }] })
    expect(screen.queryByRole('button', { name: /Lancer/ })).not.toBeInTheDocument()
    expect(screen.getByText(/En attente du lancement par l’hôte/)).toBeVisible()
  })
  it('selects the deck on the server and waits for the other player', async () => {
    const { rerender } = room({ ...game, phase: 'deck_selection' })
    await userEvent.click(screen.getByRole('button', { name: 'Choisir Embuscade' }))
    expect(mutations.selectDeck).toHaveBeenCalledWith({ gameId, deckId: deck.id })
    expect(screen.getByRole('heading', { name: 'Choisissez votre deck' })).toBeVisible()
    rerender(<MemoryRouter><GameRoom game={{ ...game, phase: 'deck_selection', players: [{ ...me, deckChosen: true, deckName: deck.name, deckId: deck.id }, opponent] }} decks={[deck]} onLeave={vi.fn()} /></MemoryRouter>)
    expect(screen.getByText(/En attente du choix de l’adversaire/)).toBeVisible()
    expect(screen.getByRole('button', { name: /Deck choisi/ })).toBeDisabled()
  })
  it('allows creating a missing deck while keeping a route back to the room', () => {
    room({ ...game, phase: 'deck_selection' }, [])
    expect(screen.getByRole('link', { name: 'Créer mon premier deck' })).toHaveAttribute('href', '/decks')
  })
  it('deploys only units, caps copies and saves quantities before enabling validation', async () => {
    let resolve!: () => void
    mutations.updatePreparation.mockReturnValueOnce(new Promise<void>((done) => { resolve = done }))
    room(deployment)
    expect(screen.queryByRole('heading', { name: 'Piège' })).not.toBeInTheDocument()
    expect(screen.getByRole('spinbutton')).toHaveAttribute('max', '5')
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter Archers' }))
    expect(mutations.updatePreparation).toHaveBeenCalledWith({ gameId, cardStableId: 'archers', change: { delta: 1 } })
    expect(screen.getByRole('button', { name: 'Valider mes unités' })).toBeDisabled()
    await act(async () => resolve())
    await userEvent.click(screen.getByRole('button', { name: 'Valider mes unités' }))
    expect(mutations.finishPreparation).toHaveBeenCalledWith({ gameId })
    expect(screen.queryByRole('region', { name: 'Aire de jeu' })).not.toBeInTheDocument()
  })
  it('rejects more copies than the deck contains without sending the invalid choice', async () => {
    const user = userEvent.setup()
    room(deployment)
    const input = screen.getByRole('spinbutton')
    await user.clear(input)
    await user.type(input, '6{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('5 exemplaire')
    expect(mutations.updatePreparation).not.toHaveBeenCalled()
    await user.clear(input)
    await user.type(input, '5{Enter}')
    expect(mutations.updatePreparation).toHaveBeenCalledWith({ gameId, cardStableId: 'archers', change: { quantity: 5 } })
  })
  it('restores a validated preparation with locked controls', () => {
    room({ ...deployment, players: [{ ...deployment.players[0], preparationReady: true }, deployment.players[1]] })
    expect(screen.getByRole('spinbutton')).toBeDisabled()
    expect(screen.getByRole('button', { name: /Sélection validée/ })).toBeDisabled()
    expect(screen.getByText(/Votre sélection est enregistrée/)).toBeVisible()
  })
  it('allows a zero-unit preparation', async () => {
    room({ ...deployment, players: [{ ...deployment.players[0], cards: [], deploymentCount: 0, drawPileCount: 0 }, deployment.players[1]] })
    expect(screen.getByText('Aucune unité dans ce deck.')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Valider mes unités' }))
    expect(mutations.finishPreparation).toHaveBeenCalledWith({ gameId })
  })
  it('keeps the room open after a failed leave and allows retry', async () => {
    mutations.leave.mockRejectedValueOnce(new Error('Offline'))
    const { onLeave } = room(deployment)
    await userEvent.click(screen.getByRole('button', { name: 'Quitter la table' }))
    expect(screen.getByText(/fermera cette partie pour les deux joueurs/)).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Confirmer le départ' }))
    expect(screen.getByRole('alert')).toBeVisible()
    expect(onLeave).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Confirmer le départ' }))
    expect(onLeave).toHaveBeenCalledOnce()
  })
})
