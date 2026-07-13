'use client'
import { useState, useRef } from 'react'
import { updateSiteImage, reorderSiteImage } from '@/actions/media'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

/* ════════════════════════════════════════
   定数
════════════════════════════════════════ */
const SECTION_META = {
  hero_slider:  { label: 'Hero スライダー',  desc: 'トップページのスライドショー画像（順番を変更可能）' },
  about:        { label: 'About セクション', desc: 'ブランドストーリーのメイン画像' },
  collections:  { label: 'Collections',      desc: 'アパレルコレクション一覧のカード画像' },
  presentation: { label: 'Presentation',     desc: '梱包・お届けセクションの背景画像' },
}

const SITE_TABS = [
  { value: 'website', label: 'CIELOウェブサイト' },
  { value: 'shop',    label: 'CIELOショップ' },
]

/* ════════════════════════════════════════
   Cloudinary Upload hook
════════════════════════════════════════ */
function useCloudinaryUpload() {
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState('')

  async function upload(file) {
    setError('')
    setUploading(true)
    try {
      const cloudName    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
      if (!cloudName || !uploadPreset) throw new Error('Cloudinary 環境変数が未設定です')

      const fd = new FormData()
      fd.append('file', file)
      fd.append('upload_preset', uploadPreset)
      fd.append('folder', 'site')

      const res  = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error?.message || 'Upload failed')

      return json.secure_url.replace('/upload/', '/upload/f_auto,q_auto,w_1920/')
    } catch (e) {
      setError(e.message)
      return null
    } finally {
      setUploading(false)
    }
  }

  return { upload, uploading, error }
}

/* ════════════════════════════════════════
   ImageSlot — 1枚分の編集行
════════════════════════════════════════ */
function ImageSlot({ image, isFirst, isLast, onSaved }) {
  const router              = useRouter()
  const fileRef             = useRef()
  const [url,     setUrl]   = useState(image.image_url  || '')
  const [alt,     setAlt]   = useState(image.alt_text   || '')
  const [saving,  setSaving] = useState(false)
  const [saved,   setSaved]  = useState(false)
  const [reordering, setReordering] = useState(false)
  const { upload, uploading, error: uploadError } = useCloudinaryUpload()
  const isSlider = image.section === 'hero_slider'

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const uploaded = await upload(file)
    if (uploaded) { setUrl(uploaded); setSaved(false) }
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateSiteImage(image.id, { image_url: url, alt_text: alt })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onSaved?.()
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleReorder(dir) {
    setReordering(true)
    try { await reorderSiteImage(image.id, dir); router.refresh() } catch {}
    setReordering(false)
  }

  const dirty = url !== image.image_url || alt !== image.alt_text

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isSlider ? '28px 100px 1fr auto' : '100px 1fr auto',
      gap: 12,
      alignItems: 'flex-start',
      padding: '16px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      {/* Reorder (slider only) */}
      {isSlider && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm"
            onClick={() => handleReorder('up')} disabled={isFirst || reordering}
            style={{ padding: '2px 6px', fontSize: 12 }}>↑</button>
          <button type="button" className="btn btn-ghost btn-sm"
            onClick={() => handleReorder('down')} disabled={isLast || reordering}
            style={{ padding: '2px 6px', fontSize: 12 }}>↓</button>
        </div>
      )}

      {/* Thumbnail */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {url ? (
          <img src={url} alt={alt}
            style={{ width: 100, height: 64, objectFit: 'cover', border: '1px solid var(--border)', borderRadius: 2, display: 'block' }} />
        ) : (
          <div style={{ width: 100, height: 64, background: 'var(--dark-3)', border: '1px solid var(--border)', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em' }}>未設定</span>
          </div>
        )}
        {isSlider && (
          <div style={{ position: 'absolute', top: 4, left: 4, background: 'rgba(0,0,0,0.7)', color: 'var(--gold)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', padding: '2px 5px', borderRadius: 2 }}>
            {image.display_order}
          </div>
        )}
      </div>

      {/* Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.04em' }}>
          {image.slot_label}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            className="form-input"
            style={{ flex: 1, fontSize: 12, padding: '6px 10px' }}
            type="text"
            placeholder="https://..."
            value={url}
            onChange={e => { setUrl(e.target.value); setSaved(false) }}
          />
          <button type="button" className="btn btn-ghost btn-sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            {uploading ? 'アップロード中...' : 'ファイル選択'}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFile} />
        </div>
        <input
          className="form-input"
          style={{ fontSize: 11, padding: '5px 10px', color: 'var(--text-3)' }}
          type="text"
          placeholder="alt テキスト（アクセシビリティ・SEO）"
          value={alt}
          onChange={e => { setAlt(e.target.value); setSaved(false) }}
        />
        {uploadError && <div style={{ fontSize: 11, color: 'var(--red)' }}>{uploadError}</div>}
      </div>

      {/* Save */}
      <div style={{ paddingTop: 20 }}>
        <button
          type="button"
          className={`btn ${saved ? 'btn-ghost' : dirty ? 'btn-primary' : 'btn-ghost'} btn-sm`}
          onClick={handleSave}
          disabled={saving || !dirty}
          style={{ whiteSpace: 'nowrap', minWidth: 52, opacity: dirty ? 1 : 0.4 }}>
          {saving ? '...' : saved ? '✓ 保存済' : '保存'}
        </button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════
   SectionBlock — セクションまとめ
════════════════════════════════════════ */
function SectionBlock({ section, images, router }) {
  const meta   = SECTION_META[section] || { label: section, desc: '' }
  const sorted = [...images].sort((a, b) => a.display_order - b.display_order)

  return (
    <div className="table-wrap" style={{ marginBottom: 24 }}>
      <div className="table-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
        <span className="table-title">{meta.label}
          <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: 'var(--text-3)' }}>({sorted.length}枚)</span>
        </span>
        {meta.desc && <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{meta.desc}</span>}
      </div>
      <div style={{ padding: '0 4px' }}>
        {sorted.map((img, i) => (
          <ImageSlot
            key={img.id}
            image={img}
            isFirst={i === 0}
            isLast={i === sorted.length - 1}
            onSaved={() => router.refresh()}
          />
        ))}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════
   MediaManager — メインコンポーネント
════════════════════════════════════════ */
export default function MediaManager({ websiteImages }) {
  const router     = useRouter()
  const [activeTab, setActiveTab] = useState('website')

  // セクション別にグループ化
  const grouped = {}
  for (const img of websiteImages) {
    if (!grouped[img.section]) grouped[img.section] = []
    grouped[img.section].push(img)
  }

  const SECTION_ORDER = ['hero_slider', 'about', 'collections', 'presentation']

  return (
    <div>
      {/* Site Tabs */}
      <div style={{
        display: 'flex',
        gap: 2,
        marginBottom: 28,
        background: 'rgba(240,244,255,0.04)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r)',
        padding: 4,
        maxWidth: 480,
      }}>
        {SITE_TABS.map(tab => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            style={{
              flex: 1,
              padding: '8px 16px',
              fontSize: 12,
              fontWeight: activeTab === tab.value ? 700 : 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              background: activeTab === tab.value ? 'rgba(27,79,191,0.18)' : 'transparent',
              border: activeTab === tab.value ? '1px solid rgba(27,79,191,0.4)' : '1px solid transparent',
              borderRadius: 'var(--r-sm)',
              color: activeTab === tab.value ? 'var(--sapphire-light)' : 'var(--text-3)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CIELO WEBSITE */}
      {activeTab === 'website' && (
        <div>
          {SECTION_ORDER.filter(s => grouped[s]).map(section => (
            <SectionBlock
              key={section}
              section={section}
              images={grouped[section]}
              router={router}
            />
          ))}
          {/* Info */}
          <div style={{ padding: '14px 16px', background: 'rgba(27,79,191,0.06)', border: '1px solid rgba(27,79,191,0.2)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.8 }}>
            <strong style={{ display: 'block', marginBottom: 4, color: 'var(--sapphire-light)' }}>反映ルール</strong>
            ここで保存した画像は CIELO WEBSITE に即時反映されます。<br />
            Hero スライダーは↑↓ボタンで表示順を変更できます。<br />
            推奨サイズ: 1920×1080px 以上、WebP 形式。
          </div>
        </div>
      )}

      {/* CIELO SHOP */}
      {activeTab === 'shop' && (
        <div>
          <div className="table-wrap" style={{ marginBottom: 24 }}>
            <div className="table-header">
              <span className="table-title">Hero スライダー</span>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16, lineHeight: 1.7 }}>
                CIELO ショップのヒーロースライダーは <strong style={{ color: 'var(--text)' }}>ヒーロースライド</strong> で管理しています。
              </p>
              <Link href="/experience/hero" className="btn btn-primary btn-sm">
                ヒーロースライドを管理 →
              </Link>
            </div>
          </div>
          <div className="table-wrap">
            <div className="table-header">
              <span className="table-title">商品画像</span>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16, lineHeight: 1.7 }}>
                商品画像は各商品の編集ページで管理しています。
              </p>
              <Link href="/products" className="btn btn-ghost btn-sm">
                Products を管理 →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
