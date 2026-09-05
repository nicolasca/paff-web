import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuthSession } from '../auth/authSession'
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
        <img src="/brand/paff-logo.png" alt="" width="1942" height="809" />
      </Link>

      <nav className="site-bar__nav" aria-label="Navigation principale">
        <NavLink to="/home">Accueil</NavLink>
        <NavLink to="/cards">Cartes</NavLink>
        {status === 'authenticated' ? (
          <><NavLink to="/decks">Mes decks</NavLink><NavLink to="/lobby">Lobby</NavLink></>
        ) : null}
      </nav>

      <div className="site-bar__session" aria-live="polite">
        {status === 'loading' ? (
          <span>Session…</span>
        ) : status === 'authenticated' ? (
          <>
            <span className="site-bar__player">{player?.displayName}</span>
            <button type="button" onClick={handleSignOut} disabled={isSigningOut}>
              {isSigningOut ? 'Déconnexion…' : 'Se déconnecter'}
            </button>
          </>
        ) : (
          <Link to="/login">Se connecter</Link>
        )}
      </div>
    </header>
  )
}
