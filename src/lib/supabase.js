import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Fail loudly instead of a blank page when env vars are missing (e.g. not set in Vercel)
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env (or set them in Vercel) and restart.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
