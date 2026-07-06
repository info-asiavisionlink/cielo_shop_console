'use client'
import { useState, useRef } from 'react'

const MAX_MB = 10

export default function AiImportSection({ onDraftReady }) {
  const [status,   setStatus]   = useState('idle')   // idle | analyzing | done | error
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
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  async function analyze() {
    if (!file) { setError('PDFを選択してください'); return }
    setStatus('analyzing')
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res  = await fetch('/api/analyze-pdf', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error || 'AI解析に失敗しました')
      setStatus('done')
      onDraftReady?.(json.draft)
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

  const isAnalyzing = status === 'analyzing'

  return (
    <div className="form-section" style={{ borderColor: 'rgba(200,169,110,0.2)', background: 'rgba(200,169,110,0.02)' }}>
      <div className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>AI 商品情報読込</span>
        <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 400, letterSpacing: '0.04em' }}>
          — 仕入先PDFから下書きを生成します
        </span>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over') }}
        onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
        onClick={() => !isAnalyzing && inputRef.current?.click()}
        style={{
          border: `1px dashed ${fileName ? 'rgba(200,169,110,0.5)' : 'rgba(240,244,255,0.15)'}`,
          borderRadius: 4,
          padding: '20px 16px',
          textAlign: 'center',
          cursor: isAnalyzing ? 'wait' : 'pointer',
          transition: 'border-color 0.2s, background 0.2s',
          background: fileName ? 'rgba(200,169,110,0.03)' : 'transparent',
          userSelect: 'none',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files?.[0])}
        />

        {isAnalyzing ? (
          <div style={{ fontSize: 12, color: 'var(--text-3)', letterSpacing: '0.08em' }}>
            <div style={{ marginBottom: 6, color: 'var(--gold)', fontWeight: 600 }}>ANALYZING PRODUCT</div>
            <div>AI が商品情報を読み取っています...</div>
          </div>
        ) : fileName ? (
          <div style={{ fontSize: 12 }}>
            <div style={{ color: 'var(--gold)', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>
              {fileName}
            </div>
            <div style={{ color: 'var(--text-3)', fontSize: 11 }}>クリックして別のファイルに変更</div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
            <div style={{ marginBottom: 4, letterSpacing: '0.06em' }}>PDF をドロップ、またはクリックして選択</div>
            <div style={{ fontSize: 10, opacity: 0.6 }}>最大 {MAX_MB}MB</div>
          </div>
        )}
      </div>

      {error && (
        <div style={{ fontSize: 12, color: 'var(--danger, #e53e3e)', marginTop: 6 }}>{error}</div>
      )}

      {status === 'done' && (
        <div style={{
          marginTop: 8, padding: '6px 10px',
          background: 'rgba(200,169,110,0.06)', border: '1px solid rgba(200,169,110,0.2)',
          borderRadius: 3, fontSize: 11, color: 'var(--gold)', letterSpacing: '0.06em'
        }}>
          DRAFT READY — フォームへ反映されました。内容を確認・修正してください。
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={!file || isAnalyzing}
          onClick={analyze}
          style={{ letterSpacing: '0.1em', fontSize: 11 }}
        >
          {isAnalyzing ? '解析中...' : 'ANALYZE PRODUCT'}
        </button>
        {(file || status !== 'idle') && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>
            リセット
          </button>
        )}
      </div>
    </div>
  )
}
