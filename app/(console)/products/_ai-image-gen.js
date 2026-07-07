'use client'
import { useState } from 'react'

const SHOT_LABELS = {
  lifestyle_full:    'Lifestyle — Full Body',
  closeup_worn:      'Close-up — Worn',
  lifestyle_urban:   'Lifestyle — Urban',
  detail_texture:    'Detail — Material',
  lifestyle_seated:  'Lifestyle — Seated',
}

export default function AiImageGen({ productName, productType, category, color, onImagesReady }) {
  const [status,   setStatus]   = useState('idle')   // idle | generating | uploading | done | error
  const [progress, setProgress] = useState('')
  const [error,    setError]    = useState('')
  const [previews, setPreviews] = useState([])

  const canGenerate = !!(productName || productType)

  async function uploadToCloudinary(b64, index) {
    const cloudName    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
    if (!cloudName || !uploadPreset) throw new Error('Cloudinary 環境変数が未設定です')

    // base64 → Blob
    const byteChars = atob(b64)
    const byteArr   = new Uint8Array(byteChars.length)
    for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i)
    const blob = new Blob([byteArr], { type: 'image/png' })

    const fd = new FormData()
    fd.append('file',          blob, `cielo-ai-${index}.png`)
    fd.append('upload_preset', uploadPreset)
    fd.append('folder',        'products')

    const res  = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd })
    const json = await res.json()
    if (!res.ok || json.error) throw new Error(json.error?.message || 'Upload failed')
    return json.secure_url.replace('/upload/', '/upload/f_auto,q_auto,w_1200/')
  }

  async function generate() {
    if (!canGenerate) return
    setStatus('generating')
    setError('')
    setPreviews([])

    try {
      // Step 1: Generate
      setProgress('AI が画像を生成しています（約30〜60秒）...')
      const res  = await fetch('/api/generate-images', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ productName, productType, category, color }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || '生成に失敗しました')

      const { images } = data

      // Step 2: Upload to Cloudinary
      setStatus('uploading')
      setProgress(`Cloudinary にアップロード中 (0/${images.length})...`)

      const urls = []
      for (let i = 0; i < images.length; i++) {
        setProgress(`Cloudinary にアップロード中 (${i + 1}/${images.length})...`)
        const url = await uploadToCloudinary(images[i].b64, i + 1)
        urls.push({ url, id: images[i].id })
        setPreviews(prev => [...prev, { url, label: SHOT_LABELS[images[i].id] || images[i].id }])
      }

      setStatus('done')
      setProgress('')
      onImagesReady?.(urls.map(u => u.url))
    } catch (e) {
      setStatus('error')
      setError(e.message)
      setProgress('')
    }
  }

  function reset() {
    setStatus('idle')
    setError('')
    setProgress('')
    setPreviews([])
  }

  const busy = status === 'generating' || status === 'uploading'

  return (
    <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(240,244,255,.07)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-2)' }}>AI 商品画像生成</span>
          <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.04em' }}>— gpt-image-2 · 5枚自動生成</span>
        </div>
      </div>

      {/* Status / Progress */}
      {busy && (
        <div style={{ fontSize: 12, color: 'var(--gold)', letterSpacing: '0.06em', marginBottom: 12, opacity: 0.8 }}>
          {progress}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ fontSize: 12, color: 'var(--danger, #e53e3e)', marginBottom: 10 }}>{error}</div>
      )}

      {/* Done notice */}
      {status === 'done' && (
        <div style={{
          fontSize: 11, color: 'var(--gold)', letterSpacing: '0.06em',
          padding: '6px 10px', background: 'rgba(200,169,110,0.05)',
          border: '1px solid rgba(200,169,110,0.2)', borderRadius: 3, marginBottom: 12,
        }}>
          5枚を生成・アップロードし、画像スロットに反映しました。内容を確認してください。
        </div>
      )}

      {/* Previews */}
      {previews.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 12 }}>
          {previews.map((p, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <img
                src={p.url} alt={p.label}
                style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 4, border: '1px solid rgba(240,244,255,.1)' }}
              />
              <span style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.04em', lineHeight: 1.3 }}>{p.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      {!canGenerate && status === 'idle' && (
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>
          商品名または種別を入力すると生成できます
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={busy || !canGenerate}
          onClick={generate}
          style={{ fontSize: 11, letterSpacing: '0.08em' }}
        >
          {busy ? progress.split('(')[0].trim() || '生成中...' : status === 'done' ? '再生成' : 'GENERATE IMAGES'}
        </button>
        {(previews.length > 0 || error) && !busy && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={reset} style={{ fontSize: 11 }}>
            リセット
          </button>
        )}
      </div>
    </div>
  )
}
