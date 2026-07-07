'use client'
import { useState, useRef } from 'react'

const SHOT_LABELS = {
  worn_full:      'Lifestyle — Full Body',
  worn_closeup:   'Close-up — Worn',
  worn_urban:     'Lifestyle — Urban',
  detail_surface: 'Detail — Material',
  worn_seated:    'Lifestyle — Seated',
}

export default function AiImageGen({ productName, productType, category, color, onImagesReady }) {
  const [refImage,  setRefImage]  = useState(null)   // File object
  const [refPreview, setRefPreview] = useState('')   // object URL for preview
  const [status,    setStatus]    = useState('idle')
  const [progress,  setProgress]  = useState('')
  const [error,     setError]     = useState('')
  const [previews,  setPreviews]  = useState([])
  const inputRef = useRef()

  const canGenerate = !!refImage

  function handleRefFile(file) {
    if (!file) return
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!allowed.includes(file.type)) { setError('PNG / JPEG / WebP のみ対応'); return }
    if (refPreview) URL.revokeObjectURL(refPreview)
    setRefImage(file)
    setRefPreview(URL.createObjectURL(file))
    setError('')
    setStatus('idle')
    setPreviews([])
  }

  function handleDrop(e) {
    e.preventDefault()
    e.currentTarget.classList.remove('drag-over')
    handleRefFile(e.dataTransfer.files?.[0])
  }

  async function uploadToCloudinary(b64, index) {
    const cloudName    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
    if (!cloudName || !uploadPreset) throw new Error('Cloudinary 環境変数が未設定')
    const bytes = atob(b64)
    const arr   = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
    const blob = new Blob([arr], { type: 'image/png' })
    const fd   = new FormData()
    fd.append('file', blob, `cielo-ai-${index}.png`)
    fd.append('upload_preset', uploadPreset)
    fd.append('folder', 'products')
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
      // Build multipart form with reference image
      setProgress('AI が商品画像を解析・生成しています（約30〜90秒）...')
      const fd = new FormData()
      fd.append('image',       refImage)
      fd.append('productName', productName || '')
      fd.append('productType', productType || '')
      fd.append('category',    category    || '')
      fd.append('color',       color       || '')

      const res  = await fetch('/api/generate-images', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || '生成に失敗しました')

      const { images } = data

      // Upload to Cloudinary
      setStatus('uploading')
      const urls = []
      for (let i = 0; i < images.length; i++) {
        setProgress(`Cloudinary にアップロード中 (${i + 1}/${images.length})...`)
        const url = await uploadToCloudinary(images[i].b64, i + 1)
        urls.push(url)
        setPreviews(prev => [...prev, { url, label: SHOT_LABELS[images[i].id] || images[i].id }])
      }

      setStatus('done')
      setProgress('')
      onImagesReady?.(urls)
    } catch (e) {
      setStatus('error')
      setError(e.message)
      setProgress('')
    }
  }

  function reset() {
    if (refPreview) URL.revokeObjectURL(refPreview)
    setRefImage(null); setRefPreview('')
    setStatus('idle'); setError(''); setProgress(''); setPreviews([])
    if (inputRef.current) inputRef.current.value = ''
  }

  const busy = status === 'generating' || status === 'uploading'

  return (
    <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(240,244,255,.07)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-2)' }}>AI 商品画像生成</span>
        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>— 商品写真からライフスタイル画像5枚を生成</span>
      </div>

      {/* Reference image upload */}
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over') }}
        onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
        onClick={() => !busy && inputRef.current?.click()}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          border: `1px dashed ${refImage ? 'rgba(200,169,110,0.5)' : 'rgba(240,244,255,0.12)'}`,
          borderRadius: 4, padding: '12px 14px',
          cursor: busy ? 'wait' : 'pointer',
          background: refImage ? 'rgba(200,169,110,0.03)' : 'transparent',
          transition: 'border-color 0.2s',
          marginBottom: 12,
        }}
      >
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }}
          onChange={e => handleRefFile(e.target.files?.[0])} />

        {refPreview ? (
          <>
            <img src={refPreview} alt="参照画像"
              style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 11, color: 'rgba(240,244,255,.7)', marginBottom: 2 }}>{refImage?.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)' }}>クリックして変更</div>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
            商品の参照画像をドロップ、またはクリックして選択
            <div style={{ fontSize: 10, marginTop: 2, opacity: 0.6 }}>PNG / JPEG / WebP — この画像をもとにライフスタイル画像を生成</div>
          </div>
        )}
      </div>

      {/* Progress / Error */}
      {busy && <div style={{ fontSize: 11, color: 'var(--gold)', marginBottom: 10, opacity: 0.8 }}>{progress}</div>}
      {error && <div style={{ fontSize: 11, color: 'var(--danger, #e53e3e)', marginBottom: 10 }}>{error}</div>}

      {/* Done notice */}
      {status === 'done' && (
        <div style={{ fontSize: 11, color: 'var(--gold)', padding: '6px 10px', background: 'rgba(200,169,110,0.05)', border: '1px solid rgba(200,169,110,0.2)', borderRadius: 3, marginBottom: 12 }}>
          {previews.length}枚を生成・アップロードし、画像スロットに反映しました。
        </div>
      )}

      {/* Generated previews */}
      {previews.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 12 }}>
          {previews.map((p, i) => (
            <div key={i}>
              <img src={p.url} alt={p.label}
                style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 3, border: '1px solid rgba(240,244,255,.08)' }} />
              <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 3, lineHeight: 1.3 }}>{p.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn btn-ghost btn-sm"
          disabled={busy || !canGenerate}
          onClick={generate}
          style={{ fontSize: 11, letterSpacing: '0.08em' }}>
          {busy ? '生成中...' : status === 'done' ? '再生成' : 'GENERATE IMAGES'}
        </button>
        {(refImage || status !== 'idle') && !busy && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={reset} style={{ fontSize: 11 }}>リセット</button>
        )}
      </div>
      {!refImage && <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 6 }}>参照画像をアップロードすると生成できます</div>}
    </div>
  )
}
