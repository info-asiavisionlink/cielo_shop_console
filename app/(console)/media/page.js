import MediaManager from './MediaManager'
import { getSiteImages } from '@/actions/media'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'メディア — CIELO Console' }

export default async function MediaPage() {
  let websiteImages = []
  try { websiteImages = await getSiteImages('website') } catch {}

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">メディア</h1>
          <p className="page-sub">WEBサイト・SHOPの画像を管理</p>
        </div>
      </div>
      <div className="page-content">
        <MediaManager websiteImages={websiteImages} />
      </div>
    </>
  )
}
