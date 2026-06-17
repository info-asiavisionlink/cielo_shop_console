'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'

const SESSION_KEY = 'cielo_debug_log'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [debugLines, setDebugLines] = useState([])

  // ページ再表示時にsessionStorageからデバッグ履歴を復元
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY)
    if (saved) setDebugLines(JSON.parse(saved))
  }, [])

  function addDebug(line) {
    console.log(line)
    setDebugLines(prev => {
      const next = [...prev, line]
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(next))
      return next
    })
  }

  function clearDebug() {
    sessionStorage.removeItem(SESSION_KEY)
    setDebugLines([])
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    clearDebug()
    setLoading(true)

    const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    addDebug('LOGIN_START ' + new Date().toISOString())
    addDebug('URL: ' + (url ?? '[MISSING]'))
    addDebug('ANON: ' + (anon ? anon.slice(0, 20) + '...' : '[MISSING]'))

    if (!url)  { setError('[ENV ERROR] NEXT_PUBLIC_SUPABASE_URL が未設定'); setLoading(false); return }
    if (!anon) { setError('[ENV ERROR] NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定'); setLoading(false); return }

    try {
      const supabase = createClient()
      addDebug('SIGNIN_CALL')
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })

      addDebug('AUTH_RESPONSE user=' + (data?.user?.id ?? 'null') + ' session=' + !!data?.session)
      addDebug('AUTH_ERROR: ' + (err ? err.message : 'null'))

      if (err) {
        setError('AUTH_ERROR: ' + err.message)
        addDebug('→ STOPPING (error)')
        return
      }

      addDebug('LOGIN_SUCCESS')
      addDebug('SESSION_TOKEN: ' + (data.session?.access_token?.slice(0, 30) ?? 'null') + '...')
      addDebug('USER_EMAIL: ' + (data.user?.email ?? 'null'))
      addDebug('USER_CONFIRMED: ' + (data.user?.email_confirmed_at ? 'YES' : 'NO'))
      addDebug('→ navigating to /dashboard')
      window.location.href = '/dashboard'
    } catch (err) {
      addDebug('EXCEPTION: ' + err.message)
      setError('EXCEPTION: ' + err.message)
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

        {/* エラーメッセージ（大きく赤で表示） */}
        {error && (
          <div style={{ background: '#fee', border: '2px solid #c00', borderRadius: 6, padding: '10px 14px', marginBottom: 12, color: '#c00', fontFamily: 'monospace', fontSize: 13, wordBreak: 'break-all' }}>
            {error}
          </div>
        )}

        {/* デバッグパネル（sessionStorage から復元するため画面遷移後も残る） */}
        {debugLines.length > 0 && (
          <div style={{ background: '#111', color: '#0f0', fontFamily: 'monospace', fontSize: 11, padding: 8, borderRadius: 4, marginBottom: 12, maxHeight: 180, overflowY: 'auto' }}>
            <div style={{ color: '#888', marginBottom: 4 }}>
              --- DEBUG LOG (ページ再表示後も保持) ---
              <button onClick={clearDebug} style={{ marginLeft: 8, fontSize: 10, cursor: 'pointer', background: 'none', color: '#888', border: '1px solid #444' }}>クリア</button>
            </div>
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
