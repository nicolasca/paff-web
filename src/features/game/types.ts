import type { FunctionReturnType } from 'convex/server'
import type { api } from '../../../convex/_generated/api'

export type Game = NonNullable<FunctionReturnType<typeof api.games.get>>
export type GamePlayer = Game['players'][number]
export type Lobby = FunctionReturnType<typeof api.games.listLobby>
export const phaseNames = { waiting: 'Salon', deck_selection: 'Choix du deck', initiative: 'Initiative', deployment: 'Déploiement', battle: 'Plateau', cancelled: 'Partie fermée' } as const
