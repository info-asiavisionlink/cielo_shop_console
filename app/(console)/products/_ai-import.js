'use client'
import { useState, useRef } from 'react'

// Supabase Storageへの直接アップロードなので上限は50MB
const MAX_MB = 50

const STATUS_LABEL = {
  idle:      '',
  uploading: 'PDFをアップロード中...',
  analyzing: 'AI が商品情報を解析中...',
  done:      'DRAFT READY',
  error:     '',
}

export default function AiImportSection({ onDraftReady }) {
  const [status,   setStatus]   = useState('idle')
  const [fileName, setFileName] = useState('')
  const [error,    setError]    = useState('')
  const [file,     setFile]     = useState(null)
  const inputRef = useRef()

  function handleFile(f) {
    if (!f) return
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('PDF ファイルのみ対応しています')
      return
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`ファイルが大きすぎます（最大 ${MAX_MB}MB）`)
      return
    }
    setFile(f)
    setFileName(f.name)
    setError('')
    setStatus('idle')
  }

  function handleDrop(e) {
    e.preventDefault()
    e.currentTarget.classList.remove('drag-over')
    handleFile(e.dataTransfer.files?.[0])
  }

  async function analyze() {
    if (!file) { setError('PDFを選択してください'); return }
    setError('')

    try {
      // Step 1: Signed upload URL を取得
      setStatus('uploading')
      const urlRes  = await fetch('/api/pdf-upload-url')
      const urlData = await urlRes.json()
      if (!urlRes.ok || urlData.error) throw new Error(urlData.error || 'アップロードURLの取得に失敗しました')

      // Step 2: Supabase Storage へ直接アップロード（Vercel経由しないので制限なし）
      const uploadRes = await fetch(urlData.signedUrl, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/pdf', 'x-upsert': 'true' },
        body:    file,
      })
      if (!uploadRes.ok) {
        const msg = await uploadRes.text().catch(() => '')
        throw new Error('アップロードに失敗しました: ' + (msg || uploadRes.status))
      }

      // Step 3: AI 解析（ストレージパスを渡す）
      setStatus('analyzing')
      const analyzeRes  = await fetch('/api/analyze-pdf', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ path: urlData.path }),
      })
      const analyzeData = await analyzeRes.json()
      if (!analyzeRes.ok || analyzeData.error) throw new Error(analyzeData.error || 'AI解析に失敗しました')

      setStatus('done')
      onDraftReady?.(analyzeData.draft)
    } catch (e) {
      setStatus('error')
      setError(e.message)
    }
  }

  function reset() {
    setStatus('idle')
    setFile(null)
    setFileName('')
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const busy = status === 'uploading' || status === 'analyzing'

  return (
    <div className="form-section" style={{ borderColor: 'rgba(200,169,110,0.2)', background: 'rgba(200,169,110,0.02)' }}>
      <div className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>AI 商品情報読込</span>
        <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 400, letterSpacing: '0.04em' }}>
          — 仕入先PDFから商品情報の下書きを生成します
        </span>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over') }}
        onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
        onClick={() => !busy && inputRef.current?.click()}
        style={{
          border:       `1px dashed ${fileName ? 'rgba(200,169,110,0.5)' : 'rgba(240,244,255,0.15)'}`,
          borderRadius: 4,
          padding:      '20px 16px',
          textAlign:    'center',
          cursor:       busy ? 'wait' : 'pointer',
          transition:   'border-color 0.2s',
          background:   fileName ? 'rgba(200,169,110,0.03)' : 'transparent',
          userSelect:   'none',
          minHeight:    72,
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files?.[0])}
        />

        {busy ? (
          <>
            <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600, letterSpacing: '0.1em' }}>
              {status === 'uploading' ? 'UPLOADING' : 'ANALYZING PRODUCT'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{STATUS_LABEL[status]}</div>
          </>
        ) : fileName ? (
          <>
            <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600, letterSpacing: '0.06em' }}>{fileName}</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>クリックして別のファイルに変更</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, color: 'var(--text-3)', letterSpacing: '0.04em' }}>PDFをドロップ、またはクリックして選択</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', opacity: 0.6 }}>最大 {MAX_MB}MB</div>
          </>
        )}
      </div>

      {error && (
        <div style={{ fontSize: 12, color: 'var(--danger, #e53e3e)', marginTop: 6 }}>{error}</div>
      )}

      {status === 'done' && (
        <div style={{
          marginTop: 8, padding: '6px 10px',
          background: 'rgba(200,169,110,0.06)', border: '1px solid rgba(200,169,110,0.2)',
          borderRadius: 3, fontSize: 11, color: 'var(--gold)', letterSpacing: '0.06em',
        }}>
          DRAFT READY — フォームへ反映されました。内容を確認・修正してから保存してください。
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={!file || busy}
          onClick={analyze}
          style={{ letterSpacing: '0.1em', fontSize: 11 }}
        >
          {busy ? STATUS_LABEL[status] || '処理中...' : 'ANALYZE PRODUCT'}
        </button>
        {(file || status !== 'idle') && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={reset} disabled={busy}>
            リセット
          </button>
        )}
      </div>
    </div>
  )
}
