import { createContext, useContext } from 'react'

// Kept separate from AuthProvider so that file only exports a component (Vite fast refresh)
export const AuthContext = createContext(null)
export const NeedsPasswordContext = createContext(false)

export function useSession() {
  return useContext(AuthContext)
}

export function useNeedsPassword() {
  return useContext(NeedsPasswordContext)
}
