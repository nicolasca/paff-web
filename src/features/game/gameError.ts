import { ConvexError } from 'convex/values'

const messages: Record<string, string> = {
  CELL_OCCUPIED: 'Cette case vient d’être occupée. Choisissez une case libre.',
  INVALID_MANUAL_COUNTER: 'Le compteur a atteint sa limite.',
  INVALID_DICE_COUNT: 'Choisissez entre 1 et 100 dés à six faces.',
  INVALID_DUEL: 'Choisissez deux unités de camps différents sur le plateau.',
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
  RESERVE_ONLY_UNIT: 'Blop, le Meuteur doit commencer en réserve. Sa capacité interdit le déploiement avec l’armée initiale.',
  INVALID_DEPLOYMENT_QUANTITY: 'Choisissez une quantité comprise entre zéro et le nombre d’exemplaires dans votre deck.',
  DEPLOYMENT_LOCKED: 'Votre préparation est déjà validée.',
  DECK_RULES_VIOLATION: 'Ce deck ne respecte pas le budget de 33 points ou les quotas de types. Consultez les indications sous le deck.',
  DEPLOYMENT_BUDGET_EXCEEDED: 'Choisissez au maximum 21 points à déployer.',
  RESERVE_BUDGET_EXCEEDED: 'La réserve ne peut pas dépasser 12 points. Choisissez davantage d’unités à déployer.',
  INVALID_MOVEMENT: 'Cette destination est inaccessible pour cette unité.',
  RESERVE_EMPTY: 'Cet exemplaire n’est plus disponible dans votre réserve.',
  STALE_GAME_ACTION: 'La partie a évolué. Consultez les informations actualisées avant de rejouer.',
  NOT_YOUR_TURN: 'C’est à votre adversaire de déployer une unité.',
  INITIATIVE_PENDING: 'Les deux joueurs doivent lancer leur dé avant de continuer.',
  INVALID_DEPLOYMENT_CELL: 'Cette case n’est pas disponible pour cette unité. Choisissez une case éclairée.',
  PREPARATION_LOCKED: 'Votre sélection est déjà validée. Elle ne peut plus être modifiée.',
  PREPARATION_TOO_LARGE: 'Votre camp compte 18 cases. Choisissez au maximum 18 unités à déployer.',
  TOO_MUCH_ARTILLERY: 'L’arrière compte 9 cases. Choisissez au maximum 9 unités d’artillerie.',
  DEPLOYMENT_INCOMPLETE: 'Placez toutes les unités choisies avant de terminer le déploiement.',
  UNIT_NOT_PREPARED: 'Cet exemplaire ne fait pas partie des unités choisies avant l’initiative.',
  UNIT_NOT_OWNED: 'Choisissez une de vos unités déjà placées.',
  WRONG_BATTLE_PHASE: 'Le plateau n’est pas disponible à cette étape de la partie.',
  ORDER_NOT_AVAILABLE: 'Cet ordre n’est pas disponible pour vous.',
}
export const gameErrorMessage = (code: string) => messages[code] ?? 'La modification n’a pas été enregistrée. Réessayez.'
export function gameError(error: unknown) {
  return error instanceof ConvexError && typeof error.data === 'object' && error.data !== null
    ? gameErrorMessage(error.data.code)
    : 'La modification n’a pas été enregistrée. Vérifiez votre connexion et réessayez.'
}
