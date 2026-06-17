'use client'
// [DEBUG ONLY] 調査完了後に削除すること
import { useState, useEffect } from 'react'

export default function DebugPage() {
  const [users, setUsers]       = useState(null)
  const [projectId, setProjectId] = useState('')
  const [apiError, setApiError] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [createResult, setCreateResult] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetch('/api/debug/auth-users')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setApiError(d.error); return }
        setProjectId(d.project_id)
        setUsers(d.users)
      })
      .catch(e => setApiError(e.message))
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    setCreateResult('')
    try {
      const res = await fetch('/api/debug/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const d = await res.json()
      if (d.error) { setCreateResult('ERROR: ' + d.error); return }
      setCreateResult('作成成功: ' + d.user.email + ' (confirmed: ' + !!d.user.email_confirmed_at + ')')
      // ユーザー一覧を再取得
      fetch('/api/debug/auth-users').then(r => r.json()).then(d => setUsers(d.users))
    } catch (err) {
      setCreateResult('EXCEPTION: ' + err.message)
    } finally {
      setCreating(false)
    }
  }

  const s = { fontFamily: 'monospace', padding: 24, maxWidth: 720, margin: '0 auto' }

  return (
    <div style={s}>
      <h2 style={{ color: '#c00', marginBottom: 4 }}>[DEBUG PAGE] 調査完了後に削除</h2>
      <p style={{ fontSize: 12, color: '#666', marginBottom: 24 }}>
        Project ID: <strong>{projectId || '取得中...'}</strong>
        &nbsp;|&nbsp;
        期待値: <strong>bturaaafeetnfptpqwai</strong>
        &nbsp;|&nbsp;
        {projectId === 'bturaaafeetnfptpqwai'
          ? <span style={{ color: 'green' }}>一致</span>
          : <span style={{ color: 'red' }}>不一致!</span>}
      </p>

      {/* ユーザー一覧 */}
      <h3>Auth Users 一覧</h3>
      {apiError && <p style={{ color: 'red' }}>API ERROR: {apiError}</p>}
      {!users && !apiError && <p>取得中...</p>}
      {users && users.length === 0 && <p style={{ color: 'orange' }}>ユーザーが存在しません</p>}
      {users && users.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 32 }}>
          <thead>
            <tr style={{ background: '#eee' }}>
              <th style={th}>email</th>
              <th style={th}>confirmed</th>
              <th style={th}>last_sign_in</th>
              <th style={th}>created_at</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={td}>{u.email}</td>
                <td style={{ ...td, color: u.confirmed ? 'green' : 'red' }}>
                  {u.confirmed ? 'YES' : 'NO (未確認)'}
                </td>
                <td style={td}>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString('ja-JP') : '—'}</td>
                <td style={td}>{new Date(u.created_at).toLocaleString('ja-JP')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ユーザー作成 */}
      <h3>管理ユーザー作成（email_confirm: true で即時有効）</h3>
      <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360 }}>
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={input}
        />
        <input
          type="password"
          placeholder="パスワード（8文字以上）"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={input}
        />
        <button type="submit" disabled={creating} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          {creating ? '作成中...' : 'ユーザーを作成'}
        </button>
      </form>
      {createResult && (
        <p style={{ marginTop: 12, color: createResult.startsWith('ERROR') ? 'red' : 'green' }}>
          {createResult}
        </p>
      )}
    </div>
  )
}

const th = { padding: '6px 8px', border: '1px solid #ccc', textAlign: 'left' }
const td = { padding: '6px 8px', border: '1px solid #ccc' }
const input = { padding: '6px 8px', border: '1px solid #ccc', borderRadius: 4, fontFamily: 'monospace' }
