'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

export default function LoginPage() {
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [debugLines, setDebugLines] = useState([])

  function addDebug(line) {
    console.log(line)
    setDebugLines(prev => [...prev, line])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setDebugLines([])
    setLoading(true)

    const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    addDebug('LOGIN_START')
    addDebug('URL: ' + (url ?? '[MISSING]'))
    addDebug('ANON: ' + (anon ? anon.slice(0, 20) + '...' : '[MISSING]'))

    if (!url)  { setError('[ENV ERROR] NEXT_PUBLIC_SUPABASE_URL が未設定です'); setLoading(false); return }
    if (!anon) { setError('[ENV ERROR] NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定です'); setLoading(false); return }

    try {
      const supabase = createClient()
      addDebug('SIGNIN_CALL')
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
      addDebug('AUTH_RESPONSE: ' + JSON.stringify({ user: data?.user?.id ?? null, session: !!data?.session }))
      addDebug('AUTH_ERROR: ' + (err ? err.message : 'null'))

      if (err) {
        // eslint-disable-next-line no-alert
        alert('[DEBUG] AUTH_ERROR: ' + err.message)
        setError(err.message)
        return
      }

      console.log('LOGIN_SUCCESS')
      console.log('SESSION', data.session)
      console.log('USER', data.user)
      addDebug('LOGIN_SUCCESS → /dashboard')
      window.location.href = '/dashboard'
    } catch (err) {
      addDebug('EXCEPTION: ' + err.message)
      // eslint-disable-next-line no-alert
      alert('[DEBUG] EXCEPTION: ' + err.message)
      setError(err.message ?? 'ログインに失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <img
            src="https://res.cloudinary.com/deyc8gz2k/image/upload/v1781495769/fzzxktjm2c5feemspvqu.png"
            alt="CIELO"
          />
          <h1>SHOP CONSOLE</h1>
          <p>管理者アカウントでログイン</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {debugLines.length > 0 && (
          <div style={{ background: '#111', color: '#0f0', fontFamily: 'monospace', fontSize: 11, padding: 8, borderRadius: 4, marginBottom: 12, maxHeight: 140, overflowY: 'auto' }}>
            {debugLines.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">メールアドレス</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="form-label">パスワード</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: '11px 16px' }}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <div className="login-footer">
          © 2025 CIELO / ASIA VISION LINK
        </div>
      </div>
    </div>
  )
}
