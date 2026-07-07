'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createProduct, getTags } from '@/actions/products'
import AiImportSection from '../_ai-import'
import AiImageGen from '../_ai-image-gen'

export default function NewProductPage() {
  const router  = useRouter()
  const [error,  setError]  = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const fd = new FormData(e.currentTarget)
      await createProduct(fd)
      router.push('/products')
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">商品追加</h1>
          <p className="page-sub">新しい商品を登録します</p>
        </div>
        <div className="page-actions">
          <Link href="/products" className="btn btn-ghost">キャンセル</Link>
        </div>
      </div>
      <div className="page-content">
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <ProductForm />
          <div style={{ marginTop: 28, display: 'flex', gap: 10, paddingBottom: 48 }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? '保存中...' : '商品を登録'}
            </button>
            <Link href="/products" className="btn btn-ghost">キャンセル</Link>
          </div>
        </form>
      </div>
    </>
  )
}

/* ─── Product type → subcategory slug ─── */
const TYPE_TO_SUBCAT = {
  // Accessories
  Necklace: 'necklace', Bracelet: 'bracelet', Earring: 'earring',
  Ring: 'ring', Pendant: 'pendant', Anklet: 'anklet', Chain: 'chain',
  Brooch: 'brooch', Bangle: 'bangle', Pierce: 'earring',
  // Apparel
  'T-Shirt': 'tshirt', 'Long T-Shirt': 'longtshirt', Hoodie: 'hoodie',
  Sweatshirt: 'sweatshirt', Pants: 'pants', Shorts: 'shorts',
  Jacket: 'jacket', Setup: 'setup', Cap: 'cap', Socks: 'socks',
  // Art
  Print: 'print', Photography: 'photography', Canvas: 'canvas',
  'Mixed Media': 'mixed-media', Sculpture: 'sculpture',
}

/* ─── Base product types per category ─── */
const BASE_PRODUCT_TYPES = {
  jewelry: [
    'Necklace', 'Bracelet', 'Earring', 'Ring', 'Pendant',
    'Anklet', 'Chain', 'Brooch', 'Bangle', 'Charm', 'Other',
  ],
  apparel: [
    'T-Shirt', 'Long T-Shirt', 'Hoodie', 'Sweatshirt',
    'Pants', 'Shorts', 'Jacket', 'Setup', 'Cap', 'Socks', 'Other',
  ],
  art: [
    'Print', 'Photography', 'Canvas', 'Mixed Media', 'Sculpture', 'Other',
  ],
}

/* ─── Spec templates per category ─── */
const SPEC_TEMPLATES = {
  jewelry: [
    { spec_key: 'Material',          spec_value: '' },
    { spec_key: 'Stone',             spec_value: '' },
    { spec_key: 'Plating',           spec_value: '' },
    { spec_key: 'Length',            spec_value: '' },
    { spec_key: 'Width',             spec_value: '' },
    { spec_key: 'Weight',            spec_value: '' },
    { spec_key: 'Clasp',             spec_value: '' },
    { spec_key: 'Country of Origin', spec_value: '' },
    { spec_key: 'Care',              spec_value: '' },
  ],
  apparel: [
    { spec_key: 'Material',          spec_value: '' },
    { spec_key: 'Fabric Weight',     spec_value: '' },
    { spec_key: 'Fit',               spec_value: '' },
    { spec_key: 'Print Method',      spec_value: '' },
    { spec_key: 'Country of Origin', spec_value: '' },
    { spec_key: 'Color',             spec_value: '' },
    { spec_key: 'Care',              spec_value: '' },
  ],
  art: [
    { spec_key: 'Material',          spec_value: '' },
    { spec_key: 'Dimensions',        spec_value: '' },
    { spec_key: 'Thickness',         spec_value: '' },
    { spec_key: 'Print Method',      spec_value: '' },
    { spec_key: 'Finish',            spec_value: '' },
    { spec_key: 'Edition',           spec_value: '' },
    { spec_key: 'Installation',      spec_value: '' },
  ],
}

/* ═══════════════════════════════════════════════════════════
   ProductForm — 新規・編集 共用
═══════════════════════════════════════════════════════════ */
export function ProductForm({ product }) {
  const [category,    setCategory]    = useState(product?.category || '')
  const [productType, setProductType] = useState(product?.product_type || '')
  const [subcategory, setSubcategory] = useState(product?.subcategory || '')
  const [featured,    setFeatured]    = useState(product?.featured ?? false)

  /* ── Inscription ── */
  const [engravingAvailable, setEngravingAvailable] = useState(product?.engraving_available ?? false)
  const [engravingRequired,  setEngravingRequired]  = useState(product?.engraving_required  ?? false)
  const [engravingMaxChars,  setEngravingMaxChars]  = useState(product?.engraving_max_chars  ?? 20)
  const [inscriptionTypes,   setInscriptionTypes]   = useState(product?.inscription_available_types ?? [])
  const [inscriptionLocation, setInscriptionLocation] = useState(product?.inscription_location ?? '')

  /* ── Dynamic specs ── */
  const [specs, setSpecs] = useState(() => {
    const rows = (product?.product_specs || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(s => ({ spec_key: s.spec_key, spec_value: s.spec_value }))
    return rows
  })

  /* ── AI Draft ── */
  const [aiDraftFields, setAiDraftFields] = useState(new Set())
  const [variantSuggestions, setVariantSuggestions] = useState([])
  const [reviewRequired,     setReviewRequired]     = useState([])

  /* ── Color (1 color per product) ── */
  const [productColor, setProductColor] = useState(
    product?.product_specs?.find(s => ['Color', 'カラー', 'colour'].includes(s.spec_key))?.spec_value || ''
  )

  /* ── Extra product types added by AI ── */
  const [extraTypes, setExtraTypes] = useState({})

  function getTypes(cat) {
    const base  = BASE_PRODUCT_TYPES[cat] || []
    const extra = extraTypes[cat] || []
    return [...base, ...extra.filter(t => !base.includes(t))]
  }

  /* ── Images (max 5) ── */
  const initImages = () => {
    const imgs = (product?.product_images || [])
      .sort((a, b) => a.sort_order - b.sort_order).slice(0, 5)
      .map(i => ({ url: i.image_url, alt: i.alt_text || '' }))
    while (imgs.length < 5) imgs.push({ url: '', alt: '' })
    return imgs
  }
  const [images, setImages] = useState(initImages)

  /* ── Variants ── */
  const [variants, setVariants] = useState(
    (product?.product_variants || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(v => ({ sku: v.sku, type: v.type, label: v.label, label_ja: v.label_ja || '', stock_count: v.stock_count, price_modifier: v.price_modifier }))
  )

  /* ── Tags ── */
  const [allTags,      setAllTags]      = useState([])
  const [selectedTags, setSelectedTags] = useState(
    (product?.product_tags || []).map(pt => ({ id: pt.tags.id, name: pt.tags.name, name_ja: pt.tags.name_ja || '' }))
  )
  const [tagInput, setTagInput] = useState('')

  useEffect(() => { getTags().then(setAllTags).catch(() => {}) }, [])

  /* ── Text field refs for auto-fill ── */
  const nameRef       = useRef()
  const nameJaRef     = useRef()
  const slugRef       = useRef()
  const descRef       = useRef()
  const descJaRef     = useRef()
  const storyRef      = useRef()
  const storyJaRef    = useRef()
  const seoTitleRef   = useRef()
  const seoDescRef    = useRef()

  /* product_type 変更時に subcategory を自動更新 */
  useEffect(() => {
    if ((category === 'jewelry' || category === 'apparel') && TYPE_TO_SUBCAT[productType]) {
      setSubcategory(TYPE_TO_SUBCAT[productType])
    }
    if (category === 'art') { setProductType('Art'); setSubcategory(subcategory || 'art') }
  }, [productType, category])

  /* ── Helpers ── */
  function setImage(i, field, value) {
    setImages(prev => prev.map((img, idx) => idx === i ? { ...img, [field]: value } : img))
  }
  function toggleTag(tag) {
    setSelectedTags(prev => prev.find(t => t.id === tag.id) ? prev.filter(t => t.id !== tag.id) : [...prev, tag])
  }
  function addCustomTag() {
    const name = tagInput.trim()
    if (!name) return
    const existing = allTags.find(t => t.name === name.toLowerCase())
    if (existing) { toggleTag(existing); setTagInput(''); return }
    if (selectedTags.find(t => t.name === name.toLowerCase())) { setTagInput(''); return }
    setSelectedTags(prev => [...prev, { id: null, name: name.toLowerCase(), name_ja: '' }])
    setTagInput('')
  }
  function removeTag(name) { setSelectedTags(prev => prev.filter(t => t.name !== name)) }

  function addVariant() {
    setVariants(v => [...v, { sku: '', type: defaultVariantType(), label: '', label_ja: '', stock_count: 9999, price_modifier: 0 }])
  }
  function updateVariant(i, field, value) {
    setVariants(v => v.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }
  function removeVariant(i) { setVariants(v => v.filter((_, idx) => idx !== i)) }

  function defaultVariantType() {
    if (category === 'jewelry') {
      if (productType === 'Ring') return 'ring_size'
      if (['Necklace', 'Pendant', 'Bracelet'].includes(productType)) return 'chain_length'
    }
    if (category === 'apparel') return 'color_size'
    return 'size'
  }

  /* ── Spec helpers ── */
  function addSpec() {
    setSpecs(prev => [...prev, { spec_key: '', spec_value: '' }])
  }
  function updateSpec(i, field, value) {
    setSpecs(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }
  function removeSpec(i) {
    setSpecs(prev => prev.filter((_, idx) => idx !== i))
  }
  function moveSpec(i, dir) {
    setSpecs(prev => {
      const arr = [...prev]
      const j   = i + dir
      if (j < 0 || j >= arr.length) return arr
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return arr
    })
  }
  function applyTemplate() {
    const tpl = SPEC_TEMPLATES[category]
    if (!tpl) return
    const existing = new Set(specs.map(s => s.spec_key.toLowerCase()))
    const toAdd = tpl.filter(t => !existing.has(t.spec_key.toLowerCase()))
    setSpecs(prev => [...prev, ...toAdd])
  }

  /* ── AI Draft auto-fill ── */
  function applyAiDraft(draft) {
    const filled = new Set()
    if (draft.name        && nameRef.current)     { nameRef.current.value      = draft.name;        filled.add('name') }
    if (draft.name_ja     && nameJaRef.current)   { nameJaRef.current.value    = draft.name_ja;     filled.add('name_ja') }
    if (draft.slug_suggestion && slugRef.current) { slugRef.current.value      = draft.slug_suggestion; filled.add('slug') }
    if (draft.description && descRef.current)     { descRef.current.value      = draft.description; filled.add('description') }
    if (draft.description_ja && descJaRef.current){ descJaRef.current.value    = draft.description_ja; filled.add('description_ja') }
    if (draft.story       && storyRef.current)    { storyRef.current.value     = draft.story;        filled.add('story') }
    if (draft.story_ja    && storyJaRef.current)  { storyJaRef.current.value   = draft.story_ja;     filled.add('story_ja') }
    if (draft.seo_title   && seoTitleRef.current) { seoTitleRef.current.value  = draft.seo_title;    filled.add('seo_title') }
    if (draft.seo_description && seoDescRef.current) { seoDescRef.current.value = draft.seo_description; filled.add('seo_description') }

    const resolvedCat = draft.category === 'accessories' ? 'jewelry' : draft.category
    if (resolvedCat && ['jewelry', 'apparel', 'art'].includes(resolvedCat)) {
      setCategory(resolvedCat); filled.add('category')
    }

    // product_type: auto-add if not in base list
    if (draft.product_type && typeof draft.product_type === 'string') {
      const cat   = resolvedCat || category
      const types = getTypes(cat)
      if (!types.includes(draft.product_type)) {
        setExtraTypes(prev => ({
          ...prev,
          [cat]: [...(prev[cat] || []), draft.product_type],
        }))
      }
      setProductType(draft.product_type)
      const sub = TYPE_TO_SUBCAT[draft.product_type]
      if (sub) setSubcategory(sub)
      filled.add('product_type')
    }
    if (Array.isArray(draft.specs) && draft.specs.length) {
      setSpecs(draft.specs.map(s => ({ spec_key: s.label, spec_value: s.value }))); filled.add('specs')
    }
    if (Array.isArray(draft.tags) && draft.tags.length) {
      const existingMap = new Map(allTags.map(t => [t.name.toLowerCase(), t]))
      const newSelected = []
      for (const tagName of draft.tags) {
        const lower = tagName.toLowerCase()
        const match = existingMap.get(lower)
        if (match) { newSelected.push(match) }
        else { newSelected.push({ id: null, name: lower, name_ja: '' }) }
      }
      setSelectedTags(newSelected); filled.add('tags')
    }
    if (Array.isArray(draft.variant_suggestions)) setVariantSuggestions(draft.variant_suggestions)
    if (Array.isArray(draft.review_required))     setReviewRequired(draft.review_required)
    setAiDraftFields(filled)
  }

  /* ── Label with AI indicator ── */
  function FieldLabel({ name, children }) {
    return (
      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {children}
        {aiDraftFields.has(name) && (
          <span style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: '0.1em', opacity: 0.7 }}>AI</span>
        )}
        {reviewRequired.includes(name) && (
          <span style={{ fontSize: 9, color: '#e8a04a', letterSpacing: '0.1em' }}>REVIEW</span>
        )}
      </label>
    )
  }

  return (
    <>
      {/* ─ JSON hidden inputs ─ */}
      <input type="hidden" name="specs_json" value={JSON.stringify(
        productColor.trim()
          ? [{ spec_key: 'カラー', spec_value: productColor.trim() }, ...specs.filter(s => !['Color','カラー','colour'].includes(s.spec_key))]
          : specs.filter(s => !['Color','カラー','colour'].includes(s.spec_key))
      )} />
      <input type="hidden" name="variants_json" value={JSON.stringify(variants)} />
      <input type="hidden" name="images_json"   value={JSON.stringify(images)} />
      <input type="hidden" name="tags_json"     value={JSON.stringify(selectedTags)} />
      <input type="hidden" name="product_type"  value={productType} />
      <input type="hidden" name="subcategory"   value={subcategory} />

      {/* ══ AI IMPORT ══ */}
      <AiImportSection onDraftReady={applyAiDraft} />

      {/* ══ 基本情報 ══ */}
      <div className="form-section">
        <div className="form-section-title">基本情報</div>
        <div className="form-grid">
          <div className="form-group">
            <FieldLabel name="name">商品名（英）*</FieldLabel>
            <input ref={nameRef} className="form-input" name="name" defaultValue={product?.name} required placeholder="CIELO Moissanite Necklace" />
          </div>
          <div className="form-group">
            <FieldLabel name="name_ja">商品名（日）</FieldLabel>
            <input ref={nameJaRef} className="form-input" name="name_ja" defaultValue={product?.name_ja} placeholder="シエロ モアサナイトネックレス" />
          </div>
          <div className="form-group">
            <FieldLabel name="slug">スラッグ</FieldLabel>
            <input ref={slugRef} className="form-input" name="slug" defaultValue={product?.slug} placeholder="空欄で自動生成" />
          </div>
          <div className="form-group">
            <FieldLabel name="category">カテゴリ *</FieldLabel>
            <select
              className="form-select" name="category" value={category} required
              onChange={e => { setCategory(e.target.value); setProductType(''); setSubcategory('') }}
            >
              <option value="" disabled>選択してください</option>
              <option value="jewelry">Accessories（アクセサリー）</option>
              <option value="apparel">Apparel（アパレル）</option>
              <option value="art">Art（アート）</option>
            </select>
          </div>
          <div className="form-group">
            <FieldLabel name="product_color">カラー</FieldLabel>
            <input
              className="form-input"
              placeholder="BLACK / SILVER / GOLD / WHITE ..."
              value={productColor}
              onChange={e => setProductColor(e.target.value)}
            />
            <span className="form-hint">1商品1カラー。SHOPの仕様欄に表示されます。</span>
          </div>
          <div className="form-group">
            <label className="form-label">サブカテゴリ</label>
            <input className="form-input" value={subcategory} onChange={e => setSubcategory(e.target.value)} placeholder="necklace / ring / tshirt ..." />
            <span className="form-hint">Jewelry/Apparel は種別選択で自動入力</span>
          </div>
          <div className="form-group">
            <label className="form-label">ステータス</label>
            <select className="form-select" name="status" defaultValue={product?.status || 'draft'}>
              <option value="draft">下書き（非公開）</option>
              <option value="active">公開中</option>
              <option value="archived">アーカイブ</option>
            </select>
          </div>
        </div>
      </div>

      {/* ══ 商品画像（最大5枚） ══ */}
      <div className="form-section">
        <div className="form-section-title">
          商品画像
          <span className="form-hint" style={{ marginLeft: 8 }}>1枚目がサムネイルになります</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {images.map((img, i) => (
            <ImageSlot
              key={i} index={i} value={img.url} alt={img.alt} isThumbnail={i === 0}
              onChange={(url, alt) => { setImage(i, 'url', url); if (alt !== undefined) setImage(i, 'alt', alt) }}
            />
          ))}
        </div>

        {/* AI Image Generation */}
        <AiImageGen
          productName={nameRef.current?.value || product?.name || ''}
          productType={productType}
          category={category}
          color={productColor}
          onGalleryReady={urls => {
            // ギャラリー画像 → slots 2-5
            setImages(prev => {
              const next = [...prev]
              urls.forEach((url, i) => {
                const slot = i + 1  // slot 1〜4（0-indexed: 1, 2, 3, 4）
                if (slot < next.length) next[slot] = { url, alt: '' }
              })
              return next
            })
          }}
          onThumbnailSelected={url => {
            // 選択されたサムネイル → slot 0（画像1）
            setImages(prev => {
              const next = [...prev]
              next[0] = { url, alt: '' }
              return next
            })
          }}
        />
      </div>

      {/* ══ 価格 ══ */}
      <div className="form-section">
        <div className="form-section-title">価格</div>
        {/* stock_count は常に 9999（OEM在庫レス運用） */}
        <input type="hidden" name="stock_count" value="9999" />
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">価格（税込・JPY）*</label>
            <input className="form-input" name="price" type="number" min="0" defaultValue={product?.price ?? 0} required />
          </div>
          <div className="form-group form-col-2">
            <label className="form-label" style={{ marginBottom: 10 }}>注目商品（Featured）</label>
            <div className="toggle-wrap">
              <label className="toggle">
                <input type="checkbox" name="featured" value="true" checked={featured} onChange={e => setFeatured(e.target.checked)} />
                <span className="toggle-slider" />
              </label>
              <span className="toggle-label">トップページのFeaturedに表示</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══ Product Type（Accessories / Apparel / Art） ══ */}
      {(category === 'jewelry' || category === 'apparel' || category === 'art') && (
        <div className="form-section">
          <div className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {category === 'jewelry' ? 'Accessories Type' : category === 'apparel' ? 'Apparel Type' : 'Art Type'}
            {aiDraftFields.has('product_type') && (
              <span style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: '0.1em', opacity: 0.7 }}>AI</span>
            )}
          </div>
          <div className="form-grid">
            <div className="form-group form-col-2">
              <label className="form-label">種別</label>
              <select
                className="form-select"
                value={productType}
                onChange={e => {
                  setProductType(e.target.value)
                  const sub = TYPE_TO_SUBCAT[e.target.value]
                  if (sub) setSubcategory(sub)
                }}
              >
                <option value="">選択してください</option>
                {getTypes(category).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {(extraTypes[category] || []).length > 0 && (
                <span className="form-hint">
                  ✦ AIが追加したタイプ: {(extraTypes[category] || []).join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ Product Specifications (Dynamic) ══ */}
      <div className="form-section">
        <div className="form-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            仕様・スペック
            {aiDraftFields.has('specs') && (
              <span style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: '0.1em', opacity: 0.7 }}>AI DRAFT</span>
            )}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {category && SPEC_TEMPLATES[category] && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={applyTemplate}
                title={`${category} テンプレートを追加`}>
                + テンプレート
              </button>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={addSpec}>+ 行を追加</button>
          </div>
        </div>

        {specs.length === 0 ? (
          <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '8px 0' }}>
            仕様なし — 「行を追加」または「テンプレート」で項目を追加してください
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 6, fontSize: 11, color: 'var(--text-3)', padding: '0 2px', marginBottom: 4 }}>
              <span>項目名</span><span>値</span><span />
            </div>
            {specs.map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                <input
                  className="form-input"
                  placeholder="Material / 素材 / Stone ..."
                  value={s.spec_key}
                  onChange={e => updateSpec(i, 'spec_key', e.target.value)}
                  style={{ fontSize: 12 }}
                />
                <input
                  className="form-input"
                  placeholder="値"
                  value={s.spec_value}
                  onChange={e => updateSpec(i, 'spec_value', e.target.value)}
                  style={{ fontSize: 12 }}
                />
                <div style={{ display: 'flex', gap: 3 }}>
                  <button type="button" onClick={() => moveSpec(i, -1)} disabled={i === 0}
                    style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-3)', cursor: 'pointer', padding: '4px 6px', fontSize: 10, borderRadius: 2, opacity: i === 0 ? 0.3 : 1 }}>▲</button>
                  <button type="button" onClick={() => moveSpec(i, 1)} disabled={i === specs.length - 1}
                    style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-3)', cursor: 'pointer', padding: '4px 6px', fontSize: 10, borderRadius: 2, opacity: i === specs.length - 1 ? 0.3 : 1 }}>▼</button>
                  <button type="button" onClick={() => removeSpec(i)}
                    style={{ background: 'none', border: 'none', color: 'var(--danger,#e53e3e)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>×</button>
                </div>
              </div>
            ))}
          </>
        )}
        <span className="form-hint" style={{ marginTop: 6, display: 'block' }}>
          SHOPの商品詳細ページに設定した順番で表示されます
        </span>
      </div>

      {/* ══ Variant Suggestions from AI ══ */}
      {variantSuggestions.length > 0 && (
        <div className="form-section" style={{ borderColor: 'rgba(200,169,110,0.2)', background: 'rgba(200,169,110,0.02)' }}>
          <div className="form-section-title" style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: '0.1em' }}>
            VARIANT SUGGESTIONS — AI 提案（採用するものだけバリアントに追加してください）
          </div>
          {variantSuggestions.map((vs, i) => (
            <div key={i} style={{ marginBottom: 8, fontSize: 12 }}>
              <span style={{ color: 'var(--text-3)', marginRight: 8 }}>{vs.type}:</span>
              {(vs.options || []).map((opt, j) => (
                <span key={j} style={{
                  display: 'inline-block', marginRight: 6, padding: '2px 8px',
                  border: '1px solid rgba(240,244,255,0.15)', borderRadius: 3, fontSize: 11, color: 'var(--text-2)'
                }}>{opt}</span>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ══ 刻印設定 ══ */}
      <div className="form-section">
        <div className="form-section-title">刻印オプション</div>
        <div className="form-grid">
          <div className="form-group form-col-2">
            <label className="form-label" style={{ marginBottom: 10 }}>刻印対応</label>
            <div className="toggle-wrap">
              <label className="toggle">
                <input type="checkbox" name="engraving_available" value="true" checked={!!engravingAvailable} onChange={e => setEngravingAvailable(e.target.checked)} />
                <span className="toggle-slider" />
              </label>
              <span className="toggle-label">この商品は刻印オプションに対応しています</span>
            </div>
          </div>
          {engravingAvailable && (
            <>
              <div className="form-group form-col-2">
                <label className="form-label" style={{ marginBottom: 10 }}>刻印必須</label>
                <div className="toggle-wrap">
                  <label className="toggle">
                    <input type="checkbox" name="engraving_required" value="true" checked={!!engravingRequired} onChange={e => setEngravingRequired(e.target.checked)} />
                    <span className="toggle-slider" />
                  </label>
                  <span className="toggle-label">注文時に刻印内容の入力を必須にする</span>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">最大文字数</label>
                <input className="form-input" type="number" name="engraving_max_chars" min="1" max="50"
                  value={engravingMaxChars} onChange={e => setEngravingMaxChars(Math.min(50, Math.max(1, parseInt(e.target.value, 10) || 20)))} />
              </div>
              <div className="form-group form-col-2">
                <label className="form-label" style={{ marginBottom: 10 }}>利用可能なタイプ</label>
                <input type="hidden" name="inscription_available_types" value={JSON.stringify(inscriptionTypes)} />
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {[['initials','イニシャル'],['name','お名前'],['date','日付'],['short_message','メッセージ']].map(([val, lbl]) => (
                    <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                      <input type="checkbox" checked={inscriptionTypes.includes(val)} style={{ width: 14, height: 14 }}
                        onChange={e => setInscriptionTypes(prev => e.target.checked ? [...prev, val] : prev.filter(t => t !== val))} />
                      {lbl}
                    </label>
                  ))}
                </div>
                <span className="form-hint">未選択の場合は全タイプが使用可能</span>
              </div>
              <div className="form-group form-col-2">
                <label className="form-label">刻印場所</label>
                <input className="form-input" name="inscription_location" value={inscriptionLocation} onChange={e => setInscriptionLocation(e.target.value)} placeholder="例: インナータグ / バックプレート / リング内側" />
                <span className="form-hint">注文詳細に表示されます</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ══ 説明文 ══ */}
      <div className="form-section">
        <div className="form-section-title">説明文</div>
        <div className="form-grid single">
          <div className="form-group">
            <FieldLabel name="description">説明（英）</FieldLabel>
            <textarea ref={descRef} className="form-textarea" name="description" defaultValue={product?.description} rows={4} />
          </div>
          <div className="form-group">
            <FieldLabel name="description_ja">説明（日）</FieldLabel>
            <textarea ref={descJaRef} className="form-textarea" name="description_ja" defaultValue={product?.description_ja} rows={4} />
          </div>
          <div className="form-group">
            <FieldLabel name="story">ブランドコピー（英）</FieldLabel>
            <textarea ref={storyRef} className="form-textarea" name="story" defaultValue={product?.story} rows={2} placeholder="The light you deserve." />
          </div>
          <div className="form-group">
            <FieldLabel name="story_ja">ブランドコピー（日）</FieldLabel>
            <textarea ref={storyJaRef} className="form-textarea" name="story_ja" defaultValue={product?.story_ja} rows={2} />
          </div>
          <div className="form-group">
            <FieldLabel name="seo_title">SEOタイトル</FieldLabel>
            <input ref={seoTitleRef} className="form-input" name="seo_title" defaultValue={product?.seo_title} placeholder="CIELO Solitaire Necklace — ¥28,600 | CIELO" />
          </div>
          <div className="form-group">
            <FieldLabel name="seo_description">SEO説明文</FieldLabel>
            <input ref={seoDescRef} className="form-input" name="seo_description" defaultValue={product?.seo_description} />
          </div>
          <div className="form-group">
            <label className="form-label">OGP画像URL</label>
            <input className="form-input" name="og_image_url" defaultValue={product?.og_image_url} placeholder="https://..." />
          </div>
        </div>
      </div>

      {/* ══ タグ ══ */}
      <div className="form-section">
        <div className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          タグ
          {aiDraftFields.has('tags') && (
            <span style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: '0.1em', opacity: 0.7 }}>AI DRAFT</span>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {selectedTags.map(t => (
            <span key={t.name} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px',
              borderRadius: 20, background: t.id ? 'var(--gold)' : '#4a90d9', color: '#fff', fontSize: 12, fontWeight: 600,
            }}>
              {t.name_ja || t.name}
              <button type="button" onClick={() => removeTag(t.name)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: 14 }}>×</button>
            </span>
          ))}
          {selectedTags.length === 0 && <span style={{ fontSize: 13, color: 'var(--text-3)' }}>タグ未設定</span>}
        </div>
        {allTags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {allTags.map(t => {
              const selected = !!selectedTags.find(s => s.id === t.id)
              return (
                <button key={t.id} type="button" onClick={() => toggleTag(t)}
                  style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: '1px solid var(--border)', background: selected ? 'var(--gold)' : 'transparent', color: selected ? '#fff' : 'var(--text-2)', fontWeight: selected ? 600 : 400 }}>
                  {t.name_ja || t.name}
                </button>
              )
            })}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, maxWidth: 360 }}>
          <input className="form-input" placeholder="新しいタグを入力" value={tagInput} onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag() } }} style={{ fontSize: 13 }} />
          <button type="button" className="btn btn-ghost btn-sm" onClick={addCustomTag}>追加</button>
        </div>
        <span className="form-hint">Enterまたは「追加」でタグ追加。金色=既存、青=新規作成</span>
      </div>

      {/* ══ バリアント ══ */}
      <div className="form-section">
        <div className="form-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>バリアント（サイズ・カラー・長さ等）</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={addVariant}>+ バリアント追加</button>
        </div>
        {variants.length === 0 ? (
          <div style={{ color: 'var(--text-3)', fontSize: 13 }}>バリアントなし（サイズ・長さ等がある場合は追加）</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.2fr 90px 90px 36px', gap: 6, fontSize: 11, color: 'var(--text-3)', padding: '0 2px' }}>
              <span>ラベル（英）</span><span>ラベル（日）</span><span>タイプ</span><span>追加料金</span><span>SKU</span><span />
            </div>
            {variants.map((v, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.2fr 90px 90px 36px', gap: 6, alignItems: 'center' }}>
                <input className="form-input" placeholder="S / M / L / 40cm" value={v.label} onChange={e => updateVariant(i,'label',e.target.value)} style={{ fontSize: 12 }} />
                <input className="form-input" placeholder="小 / 中 / 大" value={v.label_ja} onChange={e => updateVariant(i,'label_ja',e.target.value)} style={{ fontSize: 12 }} />
                <select className="form-select" value={v.type} onChange={e => updateVariant(i,'type',e.target.value)} style={{ fontSize: 12 }}>
                  <option value="size">Size（サイズ）</option>
                  <option value="ring_size">Ring Size（号数）</option>
                  <option value="chain_length">Chain Length（長さ）</option>
                  <option value="length">Length（旧形式）</option>
                  <option value="frame">Frame（額装）</option>
                </select>
                <input className="form-input" type="number" value={v.price_modifier} onChange={e => updateVariant(i,'price_modifier',e.target.value)} style={{ fontSize: 12 }} placeholder="0" />
                <input className="form-input" placeholder="省略可" value={v.sku} onChange={e => updateVariant(i,'sku',e.target.value)} style={{ fontSize: 12 }} />
                <button type="button" onClick={() => removeVariant(i)}
                  style={{ background: 'none', border: 'none', color: 'var(--danger,#e53e3e)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 0 }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════
   ImageSlot — Cloudinary アップロード
═══════════════════════════════════════════════════════════ */
function ImageSlot({ index, value, alt, isThumbnail, onChange }) {
  const inputRef = useRef()
  const [uploading, setUploading] = useState(false)
  const [progress,  setProgress]  = useState('')
  const [error,     setError]     = useState('')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError('')
    try {
      setProgress('アップロード中…')
      const cloudName    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
      if (!cloudName || !uploadPreset) throw new Error('Cloudinary 環境変数が未設定です')
      const fd = new FormData()
      fd.append('file', file); fd.append('upload_preset', uploadPreset); fd.append('folder', 'products')
      const res  = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error?.message || 'Upload failed')
      onChange(json.secure_url.replace('/upload/', '/upload/f_auto,q_auto,w_1200/'))
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false); setProgress('')
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div onClick={() => !uploading && inputRef.current?.click()}
        style={{ width: '100%', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: `2px ${value ? 'solid var(--gold)' : 'dashed var(--border)'}`, background: 'var(--bg-2, #1a1a1a)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploading ? 'wait' : 'pointer', position: 'relative' }}>
        {value ? (
          <>
            <img src={value} alt={alt || `画像${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div onClick={e => { e.stopPropagation(); onChange('') }}
              style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, cursor: 'pointer' }}>×</div>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
            {uploading ? <span style={{ fontSize: 11 }}>{progress}</span> : <><div style={{ fontSize: 24, marginBottom: 4 }}>＋</div><div>画像{index + 1}{isThumbnail ? '（サムネイル）' : ''}</div></>}
          </div>
        )}
      </div>
      {error && <div style={{ fontSize: 10, color: '#e53e3e', wordBreak: 'break-all' }}>{error}</div>}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  )
}
