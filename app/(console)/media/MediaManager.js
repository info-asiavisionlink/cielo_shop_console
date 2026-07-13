'use client'
import { useState, useRef } from 'react'
import { updateSiteImage, reorderSiteImage } from '@/actions/media'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

/* ════════════════════════════════════════
   セクション定義 + 推奨サイズ
════════════════════════════════════════ */
const SECTION_META = {
  hero_slider: {
    label: 'Hero スライダー',
    desc: 'トップページのスライドショー画像（↑↓で順番変更可能）',
    pc:     { size: '1920 × 1080 px 以上', ratio: '横長 16:9' },
    mobile: { size: '750 × 1334 px 以上',  ratio: '縦長 9:16' },
  },
  about: {
    label: 'About セクション',
    desc: 'ブランドストーリーのメイン画像',
    pc:     { size: '1200 × 800 px 以上', ratio: '横長 3:2' },
    mobile: { size: '750 × 900 px 以上',  ratio: '縦長 5:6' },
  },
  collections: {
    label: 'Collections',
    desc: 'アパレルコレクション一覧のカード画像（縦長推奨）',
    pc:     { size: '800 × 1050 px 以上', ratio: '縦長 4:5' },
    mobile: { size: '750 × 960 px 以上',  ratio: '縦長 4:5' },
  },
  presentation: {
    label: 'Presentation',
    desc: '梱包・お届けセクションの背景画像',
    pc:     { size: '1200 × 800 px 以上', ratio: '横長 3:2' },
    mobile: { size: '750 × 900 px 以上',  ratio: '縦長 5:6' },
  },
}

const SECTION_ORDER = ['hero_slider', 'about', 'collections', 'presentation']

const SITE_TABS = [
  { value: 'website', label: 'CIELOウェブサイト' },
  { value: 'shop',    label: 'CIELOショップ' },
]

/* ════════════════════════════════════════
   Cloudinary Upload hook
════════════════════════════════════════ */
function useCloudinaryUpload(folder = 'site') {
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
      fd.append('folder', folder)

      const res  = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error?.message || 'Upload failed')
      return json.secure_url
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
   DeviceImageRow — PC or スマホ の1行
════════════════════════════════════════ */
function DeviceImageRow({ device, size, ratio, value, onChange }) {
  const fileRef = useRef()
  const { upload, uploading, error } = useCloudinaryUpload(device === 'pc' ? 'site/pc' : 'site/mobile')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await upload(file)
    if (url) onChange(url)
    if (fileRef.current) fileRef.current.value = ''
  }

  const isPc = device === 'pc'

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '120px 1fr',
      gap: 12,
      padding: '12px 0',
      borderBottom: isPc ? '1px dashed rgba(240,244,255,0.08)' : 'none',
    }}>
      {/* デバイスラベル + 推奨サイズ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 14 }}>{isPc ? '💻' : '📱'}</span>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: isPc ? 'var(--sapphire-light)' : 'var(--green, #22c55e)',
          }}>
            {isPc ? 'PC' : 'スマホ'}
          </span>
        </div>
        <div style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 600, letterSpacing: '0.04em' }}>
          {size}
        </div>
        <div style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.04em' }}>
          {ratio}
        </div>
        {!isPc && (
          <div style={{ fontSize: 9, color: 'var(--text-3)', fontStyle: 'italic', lineHeight: 1.4 }}>
            省略すると<br />PC画像を使用
          </div>
        )}
      </div>

      {/* 画像プレビュー + 入力 */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        {/* サムネイル */}
        <div style={{ flexShrink: 0 }}>
          {value ? (
            <div style={{ position: 'relative' }}>
              <img src={value} alt=""
                style={{
                  width: isPc ? 96 : 54,
                  height: isPc ? 54 : 96,
                  objectFit: 'cover',
                  border: '1px solid var(--border)',
                  borderRadius: 2,
                  display: 'block',
                }} />
              <button
                type="button"
                onClick={() => onChange('')}
                style={{
                  position: 'absolute', top: -6, right: -6,
                  width: 16, height: 16, borderRadius: '50%',
                  background: 'rgba(239,68,68,0.9)', color: '#fff',
                  border: 'none', fontSize: 10, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>×</button>
            </div>
          ) : (
            <div style={{
              width: isPc ? 96 : 54,
              height: isPc ? 54 : 96,
              background: 'var(--dark-3)',
              border: '1px dashed rgba(240,244,255,0.15)',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ fontSize: 9, color: 'var(--text-3)' }}>未設定</span>
            </div>
          )}
        </div>

        {/* URL + Upload */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              className="form-input"
              style={{ flex: 1, fontSize: 11, padding: '6px 8px' }}
              type="text"
              placeholder="https://res.cloudinary.com/..."
              value={value}
              onChange={e => onChange(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{ whiteSpace: 'nowrap', flexShrink: 0, fontSize: 11 }}>
              {uploading ? 'アップ中...' : 'ファイル選択'}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif"
              style={{ display: 'none' }} onChange={handleFile} />
          </div>
          {error && <div style={{ fontSize: 10, color: 'var(--red)' }}>{error}</div>}
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════
   ImageSlot — 1スロット分（PC + スマホ）
════════════════════════════════════════ */
function ImageSlot({ image, isFirst, isLast, sectionKey }) {
  const router    = useRouter()
  const meta      = SECTION_META[sectionKey] || {}
  const [pcUrl,   setPcUrl]    = useState(image.image_url        || '')
  const [mobUrl,  setMobUrl]   = useState(image.mobile_image_url || '')
  const [alt,     setAlt]      = useState(image.alt_text         || '')
  const [saving,  setSaving]   = useState(false)
  const [saved,   setSaved]    = useState(false)
  const [reordering, setReordering] = useState(false)

  const dirty = pcUrl !== (image.image_url || '') ||
                mobUrl !== (image.mobile_image_url || '') ||
                alt   !== (image.alt_text || '')

  const isSlider = sectionKey === 'hero_slider'

  async function handleSave() {
    setSaving(true)
    try {
      await updateSiteImage(image.id, {
        image_url:        pcUrl,
        mobile_image_url: mobUrl,
        alt_text:         alt,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      router.refresh()
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

  return (
    <div style={{
      padding: '16px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      {/* ヘッダー行: ラベル + 並び替え + 保存 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        {/* 並び替えボタン (スライダーのみ) */}
        {isSlider && (
          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
            <button type="button" className="btn btn-ghost btn-sm"
              onClick={() => handleReorder('up')} disabled={isFirst || reordering}
              style={{ padding: '3px 7px', fontSize: 12 }}>↑</button>
            <button type="button" className="btn btn-ghost btn-sm"
              onClick={() => handleReorder('down')} disabled={isLast || reordering}
              style={{ padding: '3px 7px', fontSize: 12 }}>↓</button>
          </div>
        )}

        {/* スライド番号バッジ */}
        {isSlider && (
          <span style={{
            display: 'inline-block',
            padding: '2px 8px',
            background: 'rgba(201,168,76,0.12)',
            border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: 3,
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--gold)',
            letterSpacing: '0.08em',
            flexShrink: 0,
          }}>{image.display_order}枚目</span>
        )}

        {/* スロットラベル */}
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', flex: 1 }}>
          {image.slot_label}
        </span>

        {/* 保存ボタン */}
        <button
          type="button"
          className={`btn btn-sm ${saved ? 'btn-ghost' : dirty ? 'btn-primary' : 'btn-ghost'}`}
          onClick={handleSave}
          disabled={saving || !dirty}
          style={{ flexShrink: 0, minWidth: 64, opacity: dirty ? 1 : 0.35 }}>
          {saving ? '保存中...' : saved ? '✓ 保存済' : '保存'}
        </button>
      </div>

      {/* PC 行 */}
      <DeviceImageRow
        device="pc"
        size={meta.pc?.size || '1920×1080px 以上'}
        ratio={meta.pc?.ratio || '横長 16:9'}
        value={pcUrl}
        onChange={v => setPcUrl(v)}
      />

      {/* スマホ 行 */}
      <DeviceImageRow
        device="mobile"
        size={meta.mobile?.size || '750×1334px 以上'}
        ratio={meta.mobile?.ratio || '縦長 9:16'}
        value={mobUrl}
        onChange={v => setMobUrl(v)}
      />

      {/* alt テキスト */}
      <div style={{ marginTop: 8 }}>
        <input
          className="form-input"
          style={{ fontSize: 11, padding: '5px 10px', color: 'var(--text-3)', width: '100%', boxSizing: 'border-box' }}
          type="text"
          placeholder="alt テキスト（アクセシビリティ・SEO用の画像説明）"
          value={alt}
          onChange={e => setAlt(e.target.value)}
        />
      </div>
    </div>
  )
}

/* ════════════════════════════════════════
   SectionBlock — セクションまとめ
════════════════════════════════════════ */
function SectionBlock({ section, images }) {
  const meta   = SECTION_META[section] || { label: section, desc: '' }
  const sorted = [...images].sort((a, b) => a.display_order - b.display_order)

  return (
    <div className="table-wrap" style={{ marginBottom: 24 }}>
      <div className="table-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2, paddingBottom: 10 }}>
        <span className="table-title">
          {meta.label}
          <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: 'var(--text-3)' }}>
            ({sorted.length}枚)
          </span>
        </span>
        {meta.desc && (
          <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{meta.desc}</span>
        )}
      </div>
      <div style={{ padding: '0 4px' }}>
        {sorted.map((img, i) => (
          <ImageSlot
            key={img.id}
            image={img}
            isFirst={i === 0}
            isLast={i === sorted.length - 1}
            sectionKey={section}
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
  const [activeTab, setActiveTab] = useState('website')

  const grouped = {}
  for (const img of websiteImages) {
    if (!grouped[img.section]) grouped[img.section] = []
    grouped[img.section].push(img)
  }

  return (
    <div>
      {/* サイトタブ */}
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

      {/* CIELOウェブサイト */}
      {activeTab === 'website' && (
        <div>
          {/* 推奨サイズ凡例 */}
          <div style={{
            display: 'flex',
            gap: 20,
            padding: '10px 16px',
            marginBottom: 20,
            background: 'rgba(240,244,255,0.03)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)',
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14 }}>💻</span>
              <span style={{ fontSize: 11, color: 'var(--sapphire-light)', fontWeight: 700 }}>PC</span>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>— デスクトップ・タブレット向け</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14 }}>📱</span>
              <span style={{ fontSize: 11, color: 'var(--green, #22c55e)', fontWeight: 700 }}>スマホ</span>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>— モバイル向け（省略するとPC画像を使用）</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)' }} />
              <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600 }}>推奨サイズ</span>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>— WebP 形式を推奨（ファイルサイズ小）</span>
            </div>
          </div>

          {SECTION_ORDER.filter(s => grouped[s]).map(section => (
            <SectionBlock key={section} section={section} images={grouped[section]} />
          ))}

          <div style={{ padding: '14px 16px', background: 'rgba(27,79,191,0.06)', border: '1px solid rgba(27,79,191,0.2)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.8 }}>
            <strong style={{ display: 'block', marginBottom: 4, color: 'var(--sapphire-light)' }}>反映ルール</strong>
            保存した画像は CIELO ウェブサイトに即時反映されます。<br />
            スマホ画像を設定すると、スマホユーザーには専用画像が表示されます。<br />
            Hero スライダーは↑↓ボタンで表示順を変更できます。
          </div>
        </div>
      )}

      {/* CIELOショップ */}
      {activeTab === 'shop' && (
        <div>
          <div className="table-wrap" style={{ marginBottom: 24 }}>
            <div className="table-header">
              <span className="table-title">ヒーロースライダー</span>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16, lineHeight: 1.7 }}>
                CIELO ショップのヒーロースライダーは <strong style={{ color: 'var(--text)' }}>ヒーロースライド</strong> で管理しています。<br />
                PC・スマホ両方の画像を設定できます。
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
                商品を管理 →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
