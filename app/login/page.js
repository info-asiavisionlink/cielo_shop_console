'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      console.log('LOGIN_START')
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) {
        console.log('LOGIN_ERROR', err)
        setError('メールアドレスまたはパスワードが正しくありません。')
        return
      }
      console.log('LOGIN_SUCCESS')
      console.log('SESSION', data.session)
      // refresh → push の順でサーバーキャッシュを更新してから遷移
      router.refresh()
      router.push('/dashboard')
    } catch (err) {
      console.log('LOGIN_ERROR', err)
      setError('ログインに失敗しました。しばらくしてからお試しください。')
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
