import HeroManager from './HeroManager'
import { getHeroSlides } from '@/actions/experience'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'ヒーロースライド — CIELO Console' }

export default async function HeroPage() {
  let slides = []
  try { slides = await getHeroSlides() } catch {}

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">ヒーロースライド</h1>
          <p className="page-sub">ショップトップのヒーロースライダーを管理</p>
        </div>
      </div>
      <div className="page-content">
        <HeroManager initialSlides={slides} />
      </div>
    </>
  )
}
