import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)
const RecoveryContext = createContext(false)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [isRecovery, setIsRecovery] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecovery(true)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return <div className="loading-screen">Loading…</div>
  }

  return (
    <AuthContext.Provider value={session}>
      <RecoveryContext.Provider value={isRecovery}>
        {children}
      </RecoveryContext.Provider>
    </AuthContext.Provider>
  )
}

export function useSession() {
  return useContext(AuthContext)
}

export function useIsRecovery() {
  return useContext(RecoveryContext)
}
