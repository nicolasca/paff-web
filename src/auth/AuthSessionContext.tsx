import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth, useQuery } from 'convex/react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { api } from '../../convex/_generated/api'
import { AuthSessionContext, type AuthSessionValue } from './authSession'

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signIn: convexSignIn, signOut: convexSignOut } = useAuthActions()
  const currentPlayer = useQuery(
    api.players.current,
    isAuthenticated ? {} : 'skip',
  )
  const isEndingDisabledSession = useRef(false)
  const disabledSession =
    isAuthenticated &&
    currentPlayer !== undefined &&
    currentPlayer.status !== 'active'

  useEffect(() => {
    if (!disabledSession || isEndingDisabledSession.current) {
      return
    }

    isEndingDisabledSession.current = true
    void convexSignOut().finally(() => {
      isEndingDisabledSession.current = false
    })
  }, [convexSignOut, disabledSession])

  const signIn = useCallback(
    async (loginId: string, password: string) => {
      await convexSignIn('password', {
        email: loginId,
        password,
        flow: 'signIn',
      })
    },
    [convexSignIn],
  )

  const signOut = useCallback(async () => {
    await convexSignOut()
  }, [convexSignOut])

  const value = useMemo<AuthSessionValue>(() => {
    if (
      isLoading ||
      (isAuthenticated && currentPlayer === undefined)
    ) {
      return { status: 'loading', player: null, signIn, signOut }
    }

    if (!isAuthenticated) {
      return { status: 'unauthenticated', player: null, signIn, signOut }
    }

    if (!currentPlayer || currentPlayer.status !== 'active') {
      return { status: 'disabled', player: null, signIn, signOut }
    }

    return {
      status: 'authenticated',
      player: {
        loginId: currentPlayer.loginId,
        displayName: currentPlayer.displayName,
        role: currentPlayer.role,
      },
      signIn,
      signOut,
    }
  }, [
    currentPlayer,
    isAuthenticated,
    isLoading,
    signIn,
    signOut,
  ])

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  )
}
