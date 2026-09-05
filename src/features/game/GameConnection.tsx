import { useConvexConnectionState } from 'convex/react'

export function GameConnection() {
  const connection = useConvexConnectionState()
  return (
    <p className={`game-connection${connection.isWebSocketConnected ? ' game-connection--online' : ' game-connection--waiting'}`} role="status">
      {connection.isWebSocketConnected ? 'Synchronisé en temps réel' : 'Connexion en cours… Les validations attendent la reconnexion.'}
    </p>
  )
}
