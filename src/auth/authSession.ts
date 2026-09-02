import { createContext, useContext } from 'react'

export type Player = {
  loginId: string
  displayName: string
  role: 'player' | 'admin'
}

export type AuthSessionValue = {
  status: 'loading' | 'unauthenticated' | 'authenticated' | 'disabled'
  player: Player | null
  signIn: (loginId: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthSessionContext = createContext<AuthSessionValue | null>(null)

export function useAuthSession() {
  const value = useContext(AuthSessionContext)

  if (!value) {
    throw new Error('useAuthSession must be used inside AuthSessionProvider')
  }

  return value
}
