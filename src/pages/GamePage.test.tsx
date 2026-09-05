import { act, render, screen, within } from '@testing-library/react'
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

const mutations = vi.hoisted(() => ({ create: vi.fn(), join: vi.fn(), start: vi.fn(), selectDeck: vi.fn(), updateDeployment: vi.fn(), finishDeployment: vi.fn(), leave: vi.fn() }))
vi.mock('convex/react', () => ({
  useQuery: vi.fn(), useConvexConnectionState: () => ({ isWebSocketConnected: true }),
  useMutation: (reference: unknown) => mutations[getFunctionName(reference as never).split(':')[1] as keyof typeof mutations],
}))

const gameId = 'game-1' as Id<'games'>
const card = { stableId: 'archers', name: 'Archers', kind: 'unit' as const, cost: 2, life: 1, attack: 1, abilities: [], imagePath: '/archers.webp', faction: { stableId: 'gobelins', name: 'Gobelins', themeKey: 'gobelins' }, quantity: 5, deploymentQuantity: 2 }
const me: GamePlayer = { id: 'member-1' as Id<'gamePlayers'>, displayName: 'Nicolas', seat: 0, isMe: true, deckChosen: false, deploymentReady: false, deckId: null, deckName: null, factionName: null, cards: [], deployedCards: [], drawPileCount: 0, deploymentCount: 0 }
const opponent: GamePlayer = { ...me, id: 'member-2' as Id<'gamePlayers'>, displayName: 'Nicolas 2', seat: 1, isMe: false, drawPileCount: null, deploymentCount: null }
const game: Game = { id: gameId, name: 'Partie de Nicolas', phase: 'waiting', isHost: true, battleStartedAt: null, players: [me, opponent] }
const deck: Deck = { id: 'deck-1' as Id<'decks'>, name: 'Embuscade', faction: card.faction, cards: [card], updatedAt: 1 }
const deployment: Game = { ...game, phase: 'deployment', players: [{ ...me, deckChosen: true, deckName: deck.name, factionName: 'Gobelins', cards: [card, { ...card, stableId: 'action', name: 'Piège', kind: 'action', quantity: 2, deploymentQuantity: 0 }], deploymentCount: 2, drawPileCount: 5 }, { ...opponent, deckChosen: true }] }
function room(value: Game = game, decks: Deck[] = [deck]) {
  const onLeave = vi.fn()
  const result = render(<MemoryRouter><GameRoom game={value} decks={decks} onLeave={onLeave} /></MemoryRouter>)
  return { ...result, onLeave }
}
function lobby(value: Lobby | undefined = { currentGame: null, rooms: [] }) {
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

describe('lobby', () => {
  it('creates and enters a room', async () => {
    const onEnter = lobby()
    await userEvent.click(screen.getByRole('button', { name: /Créer une partie/ }))
    expect(mutations.create).toHaveBeenCalledWith({})
    expect(onEnter).toHaveBeenCalledWith(gameId)
  })
  it('joins an open table and disables a full one', async () => {
    const onEnter = lobby({ currentGame: null, rooms: [{ id: gameId, name: 'Table ouverte', playerCount: 1, createdAt: 1 }, { id: 'full' as Id<'games'>, name: 'Table complète', playerCount: 2, createdAt: 2 }] })
    const buttons = screen.getAllByRole('button', { name: /Rejoindre/ })
    expect(buttons[1]).toBeDisabled()
    await userEvent.click(buttons[0])
    expect(mutations.join).toHaveBeenCalledWith({ gameId })
    expect(onEnter).toHaveBeenCalledWith(gameId)
  })
  it('resumes an existing game instead of opening a second one', () => {
    lobby({ currentGame: { id: gameId, name: game.name, phase: 'deployment' }, rooms: [] })
    expect(screen.getByRole('button', { name: /Créer une partie/ })).toBeDisabled()
    expect(screen.getByRole('link', { name: /Reprendre/ })).toHaveAttribute('href', '/lobby/game-1')
  })
  it('reports a race for the last seat and allows retry', async () => {
    mutations.join.mockRejectedValueOnce(new ConvexError({ code: 'GAME_FULL' }))
    const onEnter = lobby({ currentGame: null, rooms: [{ id: gameId, name: game.name, playerCount: 1, createdAt: 1 }] })
    await userEvent.click(screen.getByRole('button', { name: /Rejoindre/ }))
    expect(screen.getByRole('alert')).toHaveTextContent('dernière place')
    expect(onEnter).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Rejoindre/ })).toBeEnabled()
  })
})

describe('synchronized preparation screens', () => {
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
    mutations.updateDeployment.mockReturnValueOnce(new Promise<void>((done) => { resolve = done }))
    room(deployment)
    expect(screen.queryByRole('heading', { name: 'Piège' })).not.toBeInTheDocument()
    expect(screen.getByRole('spinbutton')).toHaveAttribute('max', '5')
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter Archers' }))
    expect(mutations.updateDeployment).toHaveBeenCalledWith({ gameId, cardStableId: 'archers', change: { delta: 1 } })
    expect(screen.getByRole('button', { name: 'J’ai fini' })).toBeDisabled()
    await act(async () => resolve())
    await userEvent.click(screen.getByRole('button', { name: 'J’ai fini' }))
    expect(mutations.finishDeployment).toHaveBeenCalledWith({ gameId })
    expect(screen.queryByRole('region', { name: 'Aire de jeu' })).not.toBeInTheDocument()
  })
  it('rejects more copies than the deck contains without sending the invalid choice', async () => {
    const user = userEvent.setup()
    room(deployment)
    const input = screen.getByRole('spinbutton')
    await user.clear(input)
    await user.type(input, '6{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('5 exemplaire')
    expect(mutations.updateDeployment).not.toHaveBeenCalled()
    await user.clear(input)
    await user.type(input, '5{Enter}')
    expect(mutations.updateDeployment).toHaveBeenCalledWith({ gameId, cardStableId: 'archers', change: { quantity: 5 } })
  })
  it('restores a validated preparation with locked controls', () => {
    room({ ...deployment, players: [{ ...deployment.players[0], deploymentReady: true }, deployment.players[1]] })
    expect(screen.getByRole('spinbutton')).toBeDisabled()
    expect(screen.getByRole('button', { name: /Préparation terminée/ })).toBeDisabled()
    expect(screen.getByText(/Vos choix sont validés/)).toBeVisible()
  })
  it('allows a zero-unit preparation', async () => {
    room({ ...deployment, players: [{ ...deployment.players[0], cards: [], deploymentCount: 0, drawPileCount: 0 }, deployment.players[1]] })
    expect(screen.getByText('Aucune unité dans ce deck.')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'J’ai fini' }))
    expect(mutations.finishDeployment).toHaveBeenCalledWith({ gameId })
  })
  it('shows both camps, reserves and piles on the initialized board', () => {
    room({ ...deployment, phase: 'battle', players: [{ ...deployment.players[0], deploymentReady: true, deployedCards: [{ ...card, quantity: 2 }] }, { ...opponent, deckName: 'La garde', factionName: 'Gobelins', deploymentReady: true, deploymentCount: 1, drawPileCount: 4, deployedCards: [{ ...card, quantity: 1 }] }] })
    const board = screen.getByRole('region', { name: 'Aire de jeu' })
    const camps = within(board).getAllByRole('region')
    expect(camps[0]).toHaveAccessibleName('Camp de Nicolas 2')
    expect(camps[1]).toHaveAccessibleName('Camp de Nicolas')
    expect(within(camps[0]).getByText('×1')).toBeVisible()
    expect(within(camps[1]).getByText('×2')).toBeVisible()
    expect(screen.getByLabelText('Pioche de Nicolas : 5 cartes')).toBeVisible()
    expect(screen.getByLabelText('Pioche de Nicolas 2 : 4 cartes')).toBeVisible()
    expect(within(board).queryByRole('button')).not.toBeInTheDocument()
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
