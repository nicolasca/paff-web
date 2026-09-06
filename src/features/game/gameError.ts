import { ConvexError } from 'convex/values'

const messages: Record<string, string> = {
  ALREADY_IN_GAME: 'Vous êtes déjà dans une partie. Reprenez-la depuis le lobby.',
  GAME_NOT_AVAILABLE: 'Cette partie n’est plus disponible.',
  GAME_FULL: 'La dernière place vient d’être prise.',
  HOST_ONLY: 'Seul l’hôte peut lancer la partie.',
  NEED_TWO_PLAYERS: 'Il faut deux joueurs pour lancer la partie.',
  WRONG_GAME_PHASE: 'La partie a changé d’étape. Les informations vont se mettre à jour.',
  DECK_NOT_FOUND: 'Ce deck n’est plus disponible. Choisissez-en un autre.',
  INVALID_DECK: 'Ce deck contient des cartes indisponibles ou de plusieurs factions. Modifiez-le dans Mes decks.',
  FACTION_NOT_AVAILABLE: 'La faction de ce deck n’est pas disponible.',
  UNIT_REQUIRED: 'Seules les unités de votre deck peuvent être préparées.',
  INVALID_DEPLOYMENT_QUANTITY: 'Choisissez une quantité comprise entre zéro et le nombre d’exemplaires dans votre deck.',
  DEPLOYMENT_LOCKED: 'Votre préparation est déjà validée.',
  STALE_GAME_ACTION: 'Le tour a changé. Consultez le plateau actualisé avant de rejouer.',
  NOT_YOUR_TURN: 'C’est à votre adversaire de déployer une unité.',
  INITIATIVE_PENDING: 'Les deux joueurs doivent lancer leur dé avant de continuer.',
  INVALID_DEPLOYMENT_CELL: 'Cette case n’est pas disponible pour cette unité. Choisissez une case éclairée.',
}
export function gameError(error: unknown) {
  return error instanceof ConvexError && typeof error.data === 'object' && error.data !== null
    ? messages[error.data.code] ?? 'La modification n’a pas été enregistrée. Réessayez.'
    : 'La modification n’a pas été enregistrée. Vérifiez votre connexion et réessayez.'
}
