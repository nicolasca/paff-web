import { useState, type FormEvent } from 'react'
import { useAuthSession } from '../auth/authSession'
import { SiteHeader } from '../components/SiteHeader'
import './LoginPage.css'

const GENERIC_AUTH_ERROR = 'Identifiant ou mot de passe incorrect.'

export function LoginPage() {
  const { signIn } = useAuthSession()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!loginId.trim() || !password) {
      setError(GENERIC_AUTH_ERROR)
      return
    }

    setIsSubmitting(true)
    try {
      await signIn(loginId.trim().toLowerCase(), password)
    } catch {
      setError(GENERIC_AUTH_ERROR)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <SiteHeader overlay />
      <main className="login-page">
        <section className="login-panel" aria-labelledby="login-title">
        <img className="login-panel__wordmark" src="/brand/paff-logo.png" alt="PAFF" width="1942" height="809" />
        <h1 id="login-title">Connexion</h1>

        <form onSubmit={handleSubmit} noValidate>
          <div className="login-field">
            <label htmlFor="login-id">Identifiant</label>
            <input
              id="login-id"
              name="loginId"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck="false"
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Mot de passe</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <p className="login-error" role="alert" aria-live="assertive">
            {error}
          </p>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
        </section>
      </main>
    </>
  )
}
