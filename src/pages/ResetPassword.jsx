import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './Login.css'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const isInvite = window.location.hash.includes('type=invite')
    || sessionStorage.getItem('auth_type') === 'invite'

  if (window.location.hash.includes('type=invite')) {
    sessionStorage.setItem('auth_type', 'invite')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    sessionStorage.removeItem('auth_type')
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <img src="/apple-touch-icon.png" alt="Tisha's Library" className="login-logo" />
        <h1 className="login-title">{isInvite ? 'Welcome!' : 'New Password'}</h1>
        <p className="login-subtitle">
          {isInvite
            ? 'Set a password to get started'
            : 'Enter your new password below'}
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
          {error && <p className="login-error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Saving…' : (isInvite ? 'Set Password' : 'Update Password')}
          </button>
        </form>
      </div>
    </div>
  )
}
