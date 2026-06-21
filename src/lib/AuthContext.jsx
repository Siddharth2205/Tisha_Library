import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)
const NeedsPasswordContext = createContext(false)

function checkHashForType() {
  const hash = window.location.hash
  if (hash.includes('type=invite') || hash.includes('type=recovery')) {
    return true
  }
  return false
}

function clearAuthTokensFromUrl() {
  if (window.location.hash && window.location.hash.includes('access_token')) {
    window.history.replaceState(null, '', window.location.pathname)
  }
  const params = new URLSearchParams(window.location.search)
  if (params.has('code') || params.has('token')) {
    params.delete('code')
    params.delete('token')
    params.delete('type')
    const clean = params.toString()
    window.history.replaceState(null, '', window.location.pathname + (clean ? '?' + clean : ''))
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [needsPassword, setNeedsPassword] = useState(() => checkHashForType())

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      clearAuthTokensFromUrl()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        if (event === 'PASSWORD_RECOVERY') {
          setNeedsPassword(true)
        }
        if (event === 'SIGNED_OUT') {
          setNeedsPassword(false)
        }
        clearAuthTokensFromUrl()
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return <div className="loading-screen">Loading…</div>
  }

  return (
    <AuthContext.Provider value={session}>
      <NeedsPasswordContext.Provider value={needsPassword}>
        {children}
      </NeedsPasswordContext.Provider>
    </AuthContext.Provider>
  )
}

export function useSession() {
  return useContext(AuthContext)
}

export function useNeedsPassword() {
  return useContext(NeedsPasswordContext)
}
