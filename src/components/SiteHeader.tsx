import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuthSession } from '../auth/authSession'
import { PlayerLink } from '../features/players/PlayerLink'
import './SiteHeader.css'

export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const navigate = useNavigate()
  const { status, player, signOut } = useAuthSession()
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleSignOut() {
    setIsSigningOut(true)
    try {
      await signOut()
      navigate('/home', { replace: true })
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <header className={`site-bar${overlay ? ' site-bar--overlay' : ''}`}>
      <Link className="site-bar__brand" to="/home" aria-label="PAFF, accueil">
        <svg className="site-bar__sigil" viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
          <circle cx="32" cy="32" r="21" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="32" cy="32" r="17" stroke="currentColor" strokeWidth=".7" />
          <path d="m32 2 5 23 25 7-25 6-5 24-6-24L2 32l24-7Z" stroke="currentColor" strokeWidth="1.2" />
          <path d="m32 8 2 20 20 4-20 3-2 21-3-21-21-3 21-4Z" fill="currentColor" opacity=".65" />
          <path d="m14 14 11 6m25-6-11 6m11 30-11-6m-25 6 11-6" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="32" cy="32" r="5" fill="#6c2027" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <span aria-hidden="true">PAFF</span>
      </Link>

      <nav className="site-bar__nav" aria-label="Navigation principale">
        <NavLink to="/home">Accueil</NavLink>
        <NavLink to="/cards">Cartes</NavLink>
        {status === 'authenticated' ? (
          <><NavLink to="/decks">Mes decks</NavLink><NavLink to="/lobby">Lobby</NavLink></>
        ) : null}
      </nav>

      <div className="site-bar__aside">
      <nav className="site-bar__about" aria-label="À propos de PAFF">
        <NavLink to="/journal">Journal</NavLink>
      </nav>
      <div className="site-bar__session" aria-live="polite">
        {status === 'loading' ? (
          <span>Session…</span>
        ) : status === 'authenticated' ? (
          <>
            {player && <PlayerLink className="site-bar__player" userId={player.userId} displayName={player.displayName} />}
            <button type="button" onClick={handleSignOut} disabled={isSigningOut}>
              {isSigningOut ? 'Déconnexion…' : 'Se déconnecter'}
            </button>
          </>
        ) : (
          <Link to="/login">Se connecter</Link>
        )}
      </div>
      </div>
    </header>
  )
}
