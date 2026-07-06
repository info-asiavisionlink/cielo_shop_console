'use client'
import { useState, useRef } from 'react'
import {
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
  toggleHeroSlide,
  reorderHeroSlide,
} from '@/actions/experience'
import { useRouter } from 'next/navigation'

/* ════════════════════════════════════════
   Cloudinary Upload
════════════════════════════════════════ */
function useCloudinaryUpload() {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')

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
      fd.append('folder', 'hero')

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
   ImageField — single image upload slot
════════════════════════════════════════ */
function ImageField({ label, value, onChange, hint }) {
  const fileRef = useRef()
  const { upload, uploading, error } = useCloudinaryUpload()

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await upload(file)
    if (url) onChange(url)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <input
          className="form-input"
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="https://..."
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          {uploading ? 'アップロード中...' : 'ファイル選択'}
        </button>
      </div>
      {error && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>{error}</div>}
      {hint  && <span className="form-hint">{hint}</span>}
      {value && (
        <div style={{ marginTop: 8, position: 'relative', maxWidth: 240 }}>
          <img src={value} alt="" style={{ width: '100%', height: 80, objectFit: 'cover', border: '1px solid var(--border)' }} />
          <button
            type="button"
            onClick={() => onChange('')}
            style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >×</button>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  )
}

/* ════════════════════════════════════════
   BLANK SLIDE template
════════════════════════════════════════ */
const BLANK = {
  id:                null,
  title:             '',
  subtitle:          '',
  eyebrow_label:     '',
  desktop_image_url: '',
  mobile_image_url:  '',
  media_type:        'image',
  video_url:         '',
  overlay_opacity:   0.65,
  text_position:     'center',
  cta_label:         '',
  cta_link:          '',
  display_order:     0,
  is_active:         true,
  start_date:        '',
  end_date:          '',
  transition_duration: 1200,
}

/* ════════════════════════════════════════
   SlideForm — create / edit
════════════════════════════════════════ */
function SlideForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ ...BLANK, ...initial })

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  function toFormData() {
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      if (k === 'id' || v === null || v === undefined) return
      fd.set(k, String(v))
    })
    return fd
  }

  return (
    <div className="form-section" style={{ marginBottom: 0 }}>
      {/* Basic text */}
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">タイトル（英）</label>
          <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="WEAR THE LIGHT." />
        </div>
        <div className="form-group">
          <label className="form-label">サブタイトル</label>
          <input className="form-input" value={form.subtitle} onChange={e => set('subtitle', e.target.value)} placeholder="Own The Room." />
        </div>
        <div className="form-group form-col-2">
          <label className="form-label">Eyebrow ラベル（省略可）</label>
          <input className="form-input" value={form.eyebrow_label} onChange={e => set('eyebrow_label', e.target.value)} placeholder="Street Luxury — Tokyo · Ginza" />
          <span className="form-hint">省略すると既存デフォルトが表示されます</span>
        </div>
      </div>

      {/* Media */}
      <div className="form-section-title" style={{ marginTop: 20 }}>メディア</div>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">メディアタイプ</label>
          <select className="form-select" value={form.media_type} onChange={e => set('media_type', e.target.value)}>
            <option value="image">Image（画像）</option>
            <option value="video">Video（動画）</option>
          </select>
        </div>
        <div className="form-group" />
      </div>

      <ImageField
        label="デスクトップ画像URL"
        value={form.desktop_image_url}
        onChange={v => set('desktop_image_url', v)}
        hint="推奨: 1920×1080px 以上、WebP"
      />
      <ImageField
        label="モバイル画像URL（省略可）"
        value={form.mobile_image_url}
        onChange={v => set('mobile_image_url', v)}
        hint="省略するとデスクトップ画像を使用"
      />
      {form.media_type === 'video' && (
        <div className="form-group">
          <label className="form-label">動画URL（MP4）</label>
          <input className="form-input" type="text" value={form.video_url} onChange={e => set('video_url', e.target.value)} placeholder="https://..." />
        </div>
      )}

      {/* Display settings */}
      <div className="form-section-title" style={{ marginTop: 20 }}>表示設定</div>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">テキスト位置</label>
          <select className="form-select" value={form.text_position} onChange={e => set('text_position', e.target.value)}>
            <option value="left">左揃え</option>
            <option value="center">中央揃え</option>
            <option value="right">右揃え</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">オーバーレイ濃度 ({Math.round(form.overlay_opacity * 100)}%)</label>
          <input
            type="range" min="0" max="1" step="0.05"
            value={form.overlay_opacity}
            onChange={e => set('overlay_opacity', parseFloat(e.target.value))}
            style={{ width: '100%', marginTop: 8 }}
          />
        </div>
        <div className="form-group">
          <label className="form-label">CTA ラベル（省略可）</label>
          <input className="form-input" value={form.cta_label} onChange={e => set('cta_label', e.target.value)} placeholder="Explore Collection" />
        </div>
        <div className="form-group">
          <label className="form-label">CTA リンク（省略可）</label>
          <input className="form-input" value={form.cta_link} onChange={e => set('cta_link', e.target.value)} placeholder="index.html?cat=jewelry" />
        </div>
        <div className="form-group">
          <label className="form-label">表示順</label>
          <input className="form-input" type="number" min="0" value={form.display_order} onChange={e => set('display_order', parseInt(e.target.value, 10))} />
        </div>
        <div className="form-group">
          <label className="form-label">トランジション時間 (ms)</label>
          <input className="form-input" type="number" min="400" max="4000" value={form.transition_duration} onChange={e => set('transition_duration', parseInt(e.target.value, 10))} />
          <span className="form-hint">クロスフェードの速さ (推奨: 1200)</span>
        </div>
      </div>

      {/* Schedule */}
      <div className="form-section-title" style={{ marginTop: 20 }}>スケジュール（省略可）</div>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">開始日</label>
          <input className="form-input" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">終了日</label>
          <input className="form-input" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
        </div>
      </div>

      {/* is_active */}
      <div className="form-group" style={{ marginTop: 16 }}>
        <div className="toggle-wrap">
          <label className="toggle">
            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />
            <span className="toggle-slider" />
          </label>
          <span className="toggle-label">公開する（Active）</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={saving}
          onClick={() => onSave(toFormData())}
        >
          {saving ? '保存中...' : '保存'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>キャンセル</button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════
   Preview — simple mini mockup
════════════════════════════════════════ */
function SlidePreview({ slide }) {
  const bg = slide.desktop_image_url
  const overlay = slide.overlay_opacity ?? 0.65

  return (
    <div style={{
      position: 'relative',
      aspectRatio: '16/9',
      background: '#0a0a0a',
      overflow: 'hidden',
      border: '1px solid var(--border)',
      flexShrink: 0,
      width: 200,
    }}>
      {bg && (
        <img src={bg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
      <div style={{
        position: 'absolute', inset: 0,
        background: `rgba(10,10,10,${overlay})`,
        display: 'flex', flexDirection: 'column',
        alignItems: slide.text_position === 'left' ? 'flex-start' : slide.text_position === 'right' ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: '0 12px',
        textAlign: slide.text_position || 'center',
      }}>
        {slide.title && (
          <div style={{ fontSize: 8, fontWeight: 300, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.2em', lineHeight: 1.2 }}>
            {slide.title}
          </div>
        )}
        {slide.subtitle && (
          <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.6)', marginTop: 4, letterSpacing: '0.15em' }}>
            {slide.subtitle}
          </div>
        )}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════
   SlideRow — one slide in the list
════════════════════════════════════════ */
function SlideRow({ slide, isFirst, isLast, onEdit, onDelete, onToggle, onReorder }) {
  const [toggling,  setToggling]  = useState(false)
  const [deleting,  setDeleting]  = useState(false)
  const [reordering, setReordering] = useState(false)

  async function handleToggle() {
    setToggling(true)
    try { await toggleHeroSlide(slide.id, !slide.is_active) } catch {}
    setToggling(false)
  }

  async function handleDelete() {
    if (!confirm(`「${slide.title || 'このスライド'}」を削除しますか？`)) return
    setDeleting(true)
    try { await deleteHeroSlide(slide.id) } catch {}
    setDeleting(false)
  }

  async function handleReorder(dir) {
    setReordering(true)
    try { await reorderHeroSlide(slide.id, dir) } catch {}
    setReordering(false)
  }

  return (
    <div style={{
      display: 'flex',
      gap: 16,
      alignItems: 'flex-start',
      padding: '16px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      {/* Preview */}
      <SlidePreview slide={slide} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: slide.is_active ? 'var(--green)' : 'var(--text-3)',
            background: slide.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(240,244,255,0.05)',
            border: `1px solid ${slide.is_active ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
            padding: '2px 8px',
            borderRadius: 3,
          }}>
            {slide.is_active ? 'Active' : 'Inactive'}
          </span>
          {slide.media_type === 'video' && (
            <span style={{ fontSize: 10, color: 'var(--sapphire-light)', background: 'rgba(27,79,191,0.1)', border: '1px solid rgba(27,79,191,0.3)', padding: '2px 7px', borderRadius: 3 }}>VIDEO</span>
          )}
          <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 'auto' }}>#{slide.display_order}</span>
        </div>

        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>
          {slide.title || <span style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>（タイトル未設定）</span>}
        </div>
        {slide.subtitle && (
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 3 }}>{slide.subtitle}</div>
        )}
        {(slide.start_date || slide.end_date) && (
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
            {slide.start_date && `${slide.start_date} 〜 `}{slide.end_date}
          </div>
        )}
        {!slide.desktop_image_url && (
          <div style={{ fontSize: 11, color: 'var(--orange)', marginTop: 4 }}>⚠ 画像未設定</div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            type="button"
            onClick={() => handleReorder('up')}
            disabled={isFirst || reordering}
            className="btn btn-ghost btn-sm"
            title="上へ"
            style={{ padding: '4px 8px', fontSize: 14 }}
          >↑</button>
          <button
            type="button"
            onClick={() => handleReorder('down')}
            disabled={isLast || reordering}
            className="btn btn-ghost btn-sm"
            title="下へ"
            style={{ padding: '4px 8px', fontSize: 14 }}
          >↓</button>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={handleToggle}
          disabled={toggling}
        >
          {slide.is_active ? '非公開' : '公開'}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => onEdit(slide)}
        >編集</button>
        <button
          type="button"
          disabled={deleting}
          onClick={handleDelete}
          style={{ fontSize: 11, color: 'var(--red)', background: 'none', border: '1px solid rgba(239,68,68,0.3)', padding: '4px 8px', cursor: 'pointer', borderRadius: 'var(--r-sm)' }}
        >
          {deleting ? '...' : '削除'}
        </button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════
   HeroManager — main client component
════════════════════════════════════════ */
export default function HeroManager({ initialSlides }) {
  const router  = useRouter()
  const [slides,  setSlides]  = useState(initialSlides)
  const [editing, setEditing] = useState(null)  // null | 'new' | slide object
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  function refresh() { router.refresh() }

  async function handleSave(fd) {
    setError('')
    setSaving(true)
    try {
      if (editing === 'new') {
        await createHeroSlide(fd)
      } else {
        await updateHeroSlide(editing.id, fd)
      }
      setEditing(null)
      refresh()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Header actions */}
      {!editing && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => { setEditing('new'); setError('') }}
          >
            + 新しいスライドを追加
          </button>
        </div>
      )}

      {/* Error */}
      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Form (create or edit) */}
      {editing && (
        <div className="table-wrap" style={{ marginBottom: 28, padding: '20px 20px 24px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 20, color: 'var(--text)' }}>
            {editing === 'new' ? '新しいスライドを追加' : `編集: ${editing.title || '（タイトル未設定）'}`}
          </div>
          <SlideForm
            initial={editing === 'new' ? {} : editing}
            onSave={handleSave}
            onCancel={() => { setEditing(null); setError('') }}
            saving={saving}
          />
        </div>
      )}

      {/* Slide list */}
      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">
            登録済みスライド
            <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-3)', fontWeight: 400 }}>
              ({slides.length}件)
            </span>
          </span>
        </div>

        {slides.length === 0 ? (
          <div className="empty-state">
            <p style={{ fontSize: 28 }}>🖼</p>
            <p style={{ marginTop: 8 }}>スライドがまだありません</p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
              「新しいスライドを追加」からHeroを登録してください
            </p>
          </div>
        ) : (
          <div style={{ padding: '0 4px' }}>
            {slides.map((slide, i) => (
              <SlideRow
                key={slide.id}
                slide={slide}
                isFirst={i === 0}
                isLast={i === slides.length - 1}
                onEdit={s => { setEditing(s); setError('') }}
                onDelete={() => refresh()}
                onToggle={() => refresh()}
                onReorder={() => refresh()}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ marginTop: 20, padding: '16px', background: 'rgba(27,79,191,0.06)', border: '1px solid rgba(27,79,191,0.2)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
        <strong style={{ display: 'block', marginBottom: 6, color: 'var(--sapphire-light)' }}>表示ルール</strong>
        Active のスライドのみショップに表示されます。<br />
        スケジュールが設定されている場合は期間内のみ表示されます。<br />
        スライドが0件の場合はデフォルト画像が使用されます。<br />
        変更はショップに即時反映されます。
      </div>
    </div>
  )
}
