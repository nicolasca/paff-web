import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthSession } from '../auth/authSession'
import './HomePage.css'

export function HomePage() {
  const navigate = useNavigate()
  const { signOut } = useAuthSession()
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleSignOut() {
    setIsSigningOut(true)
    try {
      await signOut()
      navigate('/login', { replace: true })
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <main className="home-hero" aria-labelledby="home-title">
      <button
        className="home-hero__sign-out"
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
      >
        {isSigningOut ? 'Déconnexion…' : 'Se déconnecter'}
      </button>

      <div className="home-hero__media" aria-hidden="true">
        <img
          src="/art/paff-battle-home.png"
          alt=""
          width="1120"
          height="1400"
          fetchPriority="high"
        />
      </div>

      <section className="home-hero__content">
        <h1 id="home-title">PAFF</h1>
        <p className="home-hero__subtitle">Jeu de stratégie multijoueur</p>
        <p className="home-hero__description">
          PAFF est un jeu de stratégie dans lequel deux joueurs dirigent chacun
          une faction et s’affrontent sur un champ de bataille tactique.
        </p>
      </section>
    </main>
  )
}
