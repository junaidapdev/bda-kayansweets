import { useCallback, useState, type FormEvent } from 'react'
import { LockKeyhole } from 'lucide-react'
import Button from '../../components/Button'
import { APP_NAME } from '../../constants/appConstants'
import { ENV } from '../../constants/env'
import { useAuth } from '../../hooks/useAuth'

export default function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState(ENV.ADMIN_USERNAME)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const result = await login(username, password)
      if (!result.success) {
        setError(result.error ?? 'Unable to sign in.')
      }
    } finally {
      setSubmitting(false)
    }
  }, [login, password, username])

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: '#f8fafc',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 380,
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
          padding: 28,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
          <span style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: '#1e293b',
            color: '#f8fafc',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <LockKeyhole size={18} />
          </span>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
              {APP_NAME}
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
              Admin sign in
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, fontWeight: 500, color: '#374151' }}>
            Username
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              style={{
                padding: '9px 10px',
                borderRadius: 6,
                border: '1px solid #d1d5db',
                fontSize: 14,
              }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, fontWeight: 500, color: '#374151' }}>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              autoFocus
              style={{
                padding: '9px 10px',
                borderRadius: 6,
                border: '1px solid #d1d5db',
                fontSize: 14,
              }}
            />
          </label>
        </div>

        {error && (
          <div style={{
            marginTop: 14,
            padding: '9px 10px',
            borderRadius: 6,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: 13,
          }}>
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={submitting || username.trim() === '' || password === ''}
          style={{ width: '100%', justifyContent: 'center', marginTop: 18, padding: '9px 14px' }}
        >
          {submitting ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
    </main>
  )
}
