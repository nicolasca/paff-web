import { Link } from 'react-router-dom'
import { useAuthSession } from '../auth/authSession'
import { SiteHeader } from '../components/SiteHeader'
import './HomePage.css'

export function HomePage() {
  const { status } = useAuthSession()
  return (
    <>
      <SiteHeader overlay />
      <main className="home-hero" aria-labelledby="home-title">

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
        <p className="home-hero__eyebrow">Le champ de bataille vous attend</p>
        <h1 id="home-title">
          <img src="/brand/paff-logo.png" alt="PAFF" width="1942" height="809" />
        </h1>
        <p className="home-hero__subtitle">Jeu de stratégie multijoueur</p>
        <p className="home-hero__description">
          PAFF est un jeu de stratégie dans lequel deux joueurs dirigent chacun
          une faction et s’affrontent sur un champ de bataille tactique.
        </p>
        <div className="home-hero__actions">
        <Link className="ui-button ui-button--primary" to="/cards">
          Voir les cartes <span aria-hidden="true">→</span>
        </Link>
        <Link className="ui-button ui-button--quiet" to={status === 'authenticated' ? '/decks' : '/login'}>
          {status === 'authenticated' ? 'Retrouver mes decks' : 'Créer un deck'}
        </Link>
        </div>
      </section>
      </main>
    </>
  )
}
