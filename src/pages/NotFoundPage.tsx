import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="not-found">
      <div className="not-found__folio" aria-hidden="true">
        <span>Erreur de transcription</span>
        <strong>404</strong>
      </div>
      <section className="not-found__content" aria-labelledby="not-found-title">
        <p className="kicker">Feuillet introuvable</p>
        <h1 id="not-found-title">Cette page a quitté les archives.</h1>
        <p>
          Le passage demandé ne figure dans aucun volume connu. Reprenez le fil
          des chroniques depuis la première page.
        </p>
        <Link className="back-link" to="/">
          Revenir au seuil <span aria-hidden="true">→</span>
        </Link>
      </section>
    </main>
  )
}
