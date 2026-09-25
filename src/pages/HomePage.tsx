import { Link } from 'react-router-dom'
import { useAuthSession } from '../auth/authSession'
import { SiteHeader } from '../components/SiteHeader'
import { FactionEmblem } from '../features/catalogue/FactionEmblem'
import { catalogueFactions } from '../../shared/catalogue2026'
import './HomePage.css'

export function HomePage() {
  const { status } = useAuthSession()
  return (
    <div className="home-page">
      <SiteHeader overlay />
      <main className="home-hero" aria-labelledby="home-title">

      <div className="home-hero__media" aria-hidden="true">
        <img
          src="/art/paff-citadelle-home.webp"
          alt=""
          width="1672"
          height="941"
          fetchPriority="high"
        />
      </div>

      <section className="home-hero__content">
        <p className="home-hero__eyebrow">Le champ de bataille vous attend</p>
        <h1 id="home-title">Jeu de stratégie multijoueur</h1>
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
        <nav className="home-factions" aria-label="Faction">
          {Object.entries(catalogueFactions).map(([theme, name]) => (
            <Link key={theme} className="home-factions__banner" data-faction={theme} to={`/cards?faction=${theme}`}>
              <FactionEmblem theme={theme} />
              <span>{name}</span>
            </Link>
          ))}
        </nav>
      </section>
      </main>
    </div>
  )
}
