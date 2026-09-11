import { useMutation, useQuery } from 'convex/react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { SiteHeader } from '../components/SiteHeader'
import { GameConnection } from '../features/game/GameConnection'
import { gameError } from '../features/game/gameError'
import { phaseNames, type Lobby } from '../features/game/types'
import './GamePage.css'

export function LobbyPage() {
  const lobby = useQuery(api.games.listLobby)
  const navigate = useNavigate()
  return (
    <><SiteHeader /><main className="game-page"><div className="game-shell">
      <GameConnection />
      <LobbyContent lobby={lobby} onEnter={(id) => navigate(`/lobby/${id}`)} />
    </div></main></>
  )
}

export function LobbyContent({ lobby, onEnter }: { lobby: Lobby | undefined; onEnter: (id: Id<'games'>) => void }) {
  const create = useMutation(api.games.create)
  const join = useMutation(api.games.join)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function enter(id?: Id<'games'>) {
    if (busy) return
    setBusy(true)
    setError('')
    try { onEnter(id ? await join({ gameId: id }) : await create({})) }
    catch (cause) { setError(gameError(cause)) }
    finally { setBusy(false) }
  }
  return (
    <>
      <header className="game-page-heading">
        <div><p className="eyebrow">Le rendez-vous des stratèges</p><h1>Lobby</h1><p>Une table, deux joueurs. Votre prochaine bataille commence ici.</p></div>
        <button type="button" className="ui-button ui-button--primary" disabled={busy || !lobby || Boolean(lobby.currentGame)} onClick={() => void enter()}>{busy ? 'Ouverture…' : 'Créer une partie'}<span aria-hidden="true"> +</span></button>
      </header>
      {error && <p className="game-error" role="alert">{error}</p>}
      {lobby === undefined ? <div className="game-empty" role="status">Chargement du lobby…</div> : (
        <>
          {lobby.currentGame && <section className="game-current">
            <div><p className="eyebrow">Votre table</p><h2>{lobby.currentGame.name}</h2><p>{phaseNames[lobby.currentGame.phase]}</p></div>
            <Link className="ui-button ui-button--primary" to={`/lobby/${lobby.currentGame.id}`}>Reprendre la partie <span aria-hidden="true">→</span></Link>
          </section>}
          <div className="game-section-heading"><h2>Les tables ouvertes</h2><span>{lobby.rooms.length} partie{lobby.rooms.length > 1 ? 's' : ''}</span></div>
          {!lobby.rooms.length ? <div className="game-empty"><span className="game-empty__sigil" aria-hidden="true">✦</span><h2>Le calme avant la bataille.</h2><p>Créez une partie : un autre joueur pourra vous rejoindre ici.</p></div> : (
            <section className="lobby-rooms" aria-label="Parties ouvertes">
              {lobby.rooms.map((room) => <article className="lobby-room" key={room.id}>
                <div className="lobby-room__mark" aria-hidden="true">{room.playerCount}<span>/ 2</span></div>
                <div><span className="lobby-room__state">{room.playerCount < 2 ? 'Une place disponible' : 'Table complète'}</span><h3>{room.name}</h3><p>{room.playerCount} joueur{room.playerCount > 1 ? 's' : ''} installé{room.playerCount > 1 ? 's' : ''}</p></div>
                {lobby.currentGame?.id === room.id ? <Link className="ui-button" to={`/lobby/${room.id}`}>Ouvrir ma table</Link> : <button className="ui-button" type="button" disabled={busy || room.playerCount >= 2 || Boolean(lobby.currentGame)} onClick={() => void enter(room.id)}>Rejoindre <span aria-hidden="true">→</span></button>}
              </article>)}
            </section>
          )}
          <div className="game-section-heading"><h2>Les batailles en cours</h2><span>{lobby.watchable.length} partie{lobby.watchable.length > 1 ? 's' : ''}</span></div>
          <p className="game-intro">Suivez une bataille en direct, en tant que spectateur.</p>
          {!lobby.watchable.length ? <p className="game-empty">Aucune bataille à regarder pour le moment.</p> : <section className="lobby-rooms" aria-label="Batailles à regarder">
            {lobby.watchable.map((battle) => <article className="lobby-room" key={battle.id}>
              <div className="lobby-room__mark" aria-hidden="true">{battle.turn}<span>tour</span></div>
              <div><span className="lobby-room__state">En cours · Tour {battle.turn}</span><h3>{battle.name}</h3><p>{battle.players.map((player) => `${player.displayName}${player.factionName ? ` (${player.factionName})` : ''}`).join(' · ')}</p></div>
              <Link className="ui-button" to={`/lobby/${battle.id}`} aria-label={`Regarder ${battle.name}`}>Regarder <span aria-hidden="true">→</span></Link>
            </article>)}
          </section>}
        </>
      )}
    </>
  )
}
