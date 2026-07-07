'use client'
import { useState, useRef } from 'react'

const GALLERY_LABELS = {
  gallery_male_full:      'Male — Full Body',
  gallery_female_full:    'Female — Full Body',
  gallery_female_closeup: 'Female — Close-up',
  gallery_urban_male:     'Male — Urban',
}
const THUMB_LABELS = {
  thumb_studio_male:      'Male — Studio',
  thumb_studio_female:    'Female — Studio',
  thumb_closeup_product:  'Product Only',
  thumb_editorial_female: 'Female — Editorial',
  thumb_editorial_male:   'Male — Editorial',
}

async function uploadToCloudinary(b64OrFile, folder = 'products') {
  const cloudName    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
  const fd = new FormData()
  if (typeof b64OrFile === 'string') {
    const bytes = atob(b64OrFile)
    const arr   = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
    fd.append('file', new Blob([arr], { type: 'image/png' }), 'cielo-ai.png')
  } else {
    fd.append('file', b64OrFile)
  }
  fd.append('upload_preset', uploadPreset)
  fd.append('folder', folder)
  const res  = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd })
  const json = await res.json()
  if (!res.ok || json.error) throw new Error(json.error?.message || 'Upload failed')
  return json.secure_url.replace('/upload/', '/upload/f_auto,q_auto,w_1200/')
}

export default function AiImageGen({ productName, productType, category, color, specs = [], onGalleryReady, onThumbnailSelected }) {
  const [refFile,     setRefFile]     = useState(null)
  const [refPreview,  setRefPreview]  = useState('')
  const [status,      setStatus]      = useState('idle')
  const [progress,    setProgress]    = useState('')
  const [error,       setError]       = useState('')
  const [galleryUrls, setGalleryUrls] = useState([])   // uploaded gallery URLs
  const [thumbItems,  setThumbItems]  = useState([])   // { url, label, id }
  const [selectedThumb, setSelectedThumb] = useState(null)
  const inputRef = useRef()

  function handleRefFile(file) {
    if (!file) return
    if (!['image/png','image/jpeg','image/jpg','image/webp'].includes(file.type)) {
      setError('PNG / JPEG / WebP のみ対応'); return
    }
    if (refPreview) URL.revokeObjectURL(refPreview)
    setRefFile(file); setRefPreview(URL.createObjectURL(file))
    setError(''); setStatus('idle'); setGalleryUrls([]); setThumbItems([]); setSelectedThumb(null)
  }

  function handleDrop(e) {
    e.preventDefault(); e.currentTarget.classList.remove('drag-over')
    handleRefFile(e.dataTransfer.files?.[0])
  }

  async function generate() {
    if (!refFile) return
    setStatus('uploading_ref'); setError('')
    setGalleryUrls([]); setThumbItems([]); setSelectedThumb(null)

    try {
      // 1. 参照画像をCloudinaryへ
      setProgress('参照画像をアップロード中...')
      const refUrl = await uploadToCloudinary(refFile, 'products/ref')

      // 2. API呼び出し（9枚並列生成）
      setStatus('generating')
      setProgress('AI が9枚の画像を並列生成しています（約60〜120秒）...')
      const res  = await fetch('/api/generate-images', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ imageUrl: refUrl, productName, productType, category, color, specs }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || '生成に失敗しました')

      const { gallery = [], thumbnails = [] } = data

      // 3. ギャラリー4枚をCloudinaryへアップロード → slots 2-5
      setStatus('uploading_gallery')
      const gUrls = []
      for (let i = 0; i < gallery.length; i++) {
        setProgress(`ギャラリー画像をアップロード中 (${i + 1}/${gallery.length})...`)
        const url = await uploadToCloudinary(gallery[i].b64)
        gUrls.push(url)
      }
      setGalleryUrls(gUrls)
      onGalleryReady?.(gUrls)  // slots 2-5 に反映

      // 4. サムネイル5枚をCloudinaryへアップロード → 候補として表示
      setStatus('uploading_thumbs')
      const tItems = []
      for (let i = 0; i < thumbnails.length; i++) {
        setProgress(`サムネイル候補をアップロード中 (${i + 1}/${thumbnails.length})...`)
        const url = await uploadToCloudinary(thumbnails[i].b64)
        tItems.push({ url, label: THUMB_LABELS[thumbnails[i].id] || thumbnails[i].id, id: thumbnails[i].id })
        setThumbItems([...tItems])  // 順次表示
      }

      setStatus('done'); setProgress('')
    } catch (e) {
      setStatus('error'); setError(e.message); setProgress('')
    }
  }

  function selectThumbnail(item) {
    setSelectedThumb(item.id)
    onThumbnailSelected?.(item.url)  // slot 1 に反映
  }

  function reset() {
    if (refPreview) URL.revokeObjectURL(refPreview)
    setRefFile(null); setRefPreview(''); setStatus('idle')
    setError(''); setProgress(''); setGalleryUrls([]); setThumbItems([]); setSelectedThumb(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const busy = ['uploading_ref','generating','uploading_gallery','uploading_thumbs'].includes(status)

  return (
    <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(240,244,255,.07)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-2)' }}>AI 商品画像生成</span>
        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>— ギャラリー4枚 + サムネイル候補5枚を同時生成</span>
      </div>

      {/* 参照画像 */}
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over') }}
        onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
        onClick={() => !busy && inputRef.current?.click()}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          border: `1px dashed ${refFile ? 'rgba(200,169,110,0.5)' : 'rgba(240,244,255,0.12)'}`,
          borderRadius: 4, padding: '12px 14px', marginBottom: 12,
          cursor: busy ? 'wait' : 'pointer',
          background: refFile ? 'rgba(200,169,110,0.03)' : 'transparent',
        }}
      >
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp"
          style={{ display: 'none' }} onChange={e => handleRefFile(e.target.files?.[0])} />
        {refPreview ? (
          <>
            <img src={refPreview} alt="参照" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 11, color: 'rgba(240,244,255,.7)', marginBottom: 2 }}>{refFile?.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)' }}>クリックして変更</div>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
            商品の参照画像をドロップ、またはクリックして選択
            <div style={{ fontSize: 10, marginTop: 2, opacity: 0.6 }}>この画像をもとにギャラリーとサムネイルを生成します</div>
          </div>
        )}
      </div>

      {busy && <div style={{ fontSize: 11, color: 'var(--gold)', marginBottom: 10, opacity: 0.8 }}>{progress}</div>}
      {error && <div style={{ fontSize: 11, color: 'var(--danger,#e53e3e)', marginBottom: 10 }}>{error}</div>}

      {/* ── サムネイル候補 ── */}
      {thumbItems.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-2)', marginBottom: 8 }}>
            サムネイル候補 — クリックして選択 → 画像1（サムネイル）に反映
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {thumbItems.map(item => (
              <div key={item.id}
                onClick={() => selectThumbnail(item)}
                style={{
                  cursor: 'pointer',
                  borderRadius: 4,
                  border: selectedThumb === item.id
                    ? '2px solid var(--gold)'
                    : '2px solid rgba(240,244,255,0.08)',
                  overflow: 'hidden',
                  position: 'relative',
                  transition: 'border-color 0.15s',
                }}
              >
                <img src={item.url} alt={item.label}
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                {selectedThumb === item.id && (
                  <div style={{
                    position: 'absolute', top: 4, right: 4,
                    background: 'var(--gold)', color: '#000',
                    borderRadius: '50%', width: 18, height: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                  }}>✓</div>
                )}
                <div style={{ fontSize: 9, color: 'var(--text-3)', padding: '3px 4px', lineHeight: 1.3 }}>{item.label}</div>
              </div>
            ))}
          </div>
          {selectedThumb && (
            <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 6, letterSpacing: '0.06em' }}>
              ✓ 画像1（サムネイル）に反映しました
            </div>
          )}
        </div>
      )}

      {/* ── ギャラリー確認 ── */}
      {galleryUrls.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-2)', marginBottom: 8 }}>
            ギャラリー画像（画像2〜5に反映）
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {galleryUrls.map((url, i) => (
              <img key={i} src={url} alt={`Gallery ${i + 2}`}
                style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 3, border: '1px solid rgba(240,244,255,.08)' }} />
            ))}
          </div>
        </div>
      )}

      {status === 'done' && (
        <div style={{ fontSize: 11, color: 'var(--gold)', padding: '6px 10px', background: 'rgba(200,169,110,0.05)', border: '1px solid rgba(200,169,110,0.2)', borderRadius: 3, marginBottom: 12 }}>
          生成完了。上のサムネイル候補から1枚選択して画像1に反映してください。
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="button" className="btn btn-ghost btn-sm"
          disabled={busy || !refFile} onClick={generate}
          style={{ fontSize: 11, letterSpacing: '0.08em' }}>
          {busy ? '生成中...' : status === 'done' ? '再生成' : 'GENERATE IMAGES'}
        </button>
        {(refFile || status !== 'idle') && !busy && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={reset} style={{ fontSize: 11 }}>リセット</button>
        )}
        {!refFile && <span style={{ fontSize: 10, color: 'var(--text-3)' }}>参照画像をアップロードすると生成できます</span>}
      </div>
    </div>
  )
}
