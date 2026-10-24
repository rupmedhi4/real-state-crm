import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { TextInput } from '../components/Form'
import { Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../services/api'

function Brand() {
  return (
    <div className="brand">
      <div className="mark">🏠</div>
      <span className="brand-name">Estateflow</span>
    </div>
  )
}

export function LoginPage() {
  const { user, login, sessionExpired } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  if (user) return <Navigate to={from} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(errorMessage(err, 'Login failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <Brand />
        <h1>Sign in</h1>
        <p>Real estate CRM for your team.</p>
        {sessionExpired && !error && <div className="form-warn">Your session expired. Please sign in again.</div>}
        {error && <div className="form-error">{error}</div>}
        <TextInput label="Email" type="email" value={email} onChange={setEmail} required autoComplete="username" autoFocus />
        <TextInput label="Password" type="password" value={password} onChange={setPassword} required autoComplete="current-password" />
        <button className="btn primary" disabled={busy}>
          {busy && <Spinner />} Sign in
        </button>
        <div className="auth-foot">
          New here? <Link to="/register">Create an account</Link>
        </div>
      </form>
    </div>
  )
}

export function RegisterPage() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [v, setV] = useState({ name: '', email: '', phone: '', password: '', confirm: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof v) => (val: string) => setV((p) => ({ ...p, [k]: val }))

  if (user) return <Navigate to="/" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (v.password.length < 8) return setError('Password must be at least 8 characters')
    if (v.password !== v.confirm) return setError('Passwords do not match')
    setBusy(true)
    setError(null)
    try {
      await register({
        name: v.name.trim(),
        email: v.email.trim(),
        phone: v.phone.trim() || undefined,
        password: v.password,
      })
      navigate('/', { replace: true })
    } catch (err) {
      setError(errorMessage(err, 'Registration failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <Brand />
        <h1>Create account</h1>
        <p>New accounts join as Agents. An admin can change your role.</p>
        {error && <div className="form-error">{error}</div>}
        <TextInput label="Full Name" value={v.name} onChange={set('name')} required autoFocus />
        <TextInput label="Email" type="email" value={v.email} onChange={set('email')} required autoComplete="username" />
        <TextInput label="Phone" value={v.phone} onChange={set('phone')} />
        <div className="two-col">
          <TextInput label="Password" type="password" value={v.password} onChange={set('password')} required autoComplete="new-password" />
          <TextInput label="Confirm" type="password" value={v.confirm} onChange={set('confirm')} required autoComplete="new-password" />
        </div>
        <button className="btn primary" disabled={busy}>
          {busy && <Spinner />} Create account
        </button>
        <div className="auth-foot">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </form>
    </div>
  )
}
