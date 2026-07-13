'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

const NAV = [
  {
    section: '概要',
    items: [
      { href: '/dashboard', label: 'ダッシュボード', icon: <GridIcon /> },
    ],
  },
  {
    section: 'カタログ',
    items: [
      { href: '/products', label: '商品', icon: <BoxIcon /> },
    ],
  },
  {
    section: '販売管理',
    items: [
      { href: '/orders',    label: '注文',   icon: <BagIcon /> },
      { href: '/shipping',  label: '配送',   icon: <TruckIcon /> },
      { href: '/customers', label: '顧客',   icon: <UserIcon /> },
    ],
  },
  {
    section: 'コンテンツ',
    items: [
      { href: '/media',           label: 'メディア',         icon: <ImageIcon /> },
      { href: '/experience/hero', label: 'ヒーロースライド', icon: <SlidersIcon /> },
    ],
  },
]

export default function ConsoleLayout({ children }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [open, setOpen]   = useState(false)
  const [email, setEmail] = useState('')

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data }) => {
      if (data.user) setEmail(data.user.email)
    })
  }, [])

  async function logout() {
    const sb = createClient()
    await sb.auth.signOut()
    router.push('/login')
  }

  function isActive(href) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const sidebar = (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      <div className="sidebar-logo">
        <img
          src="https://res.cloudinary.com/deyc8gz2k/image/upload/v1781495769/fzzxktjm2c5feemspvqu.png"
          alt="CIELO"
        />
        <span className="sidebar-badge">Console</span>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(({ section, items }) => (
          <div key={section}>
            <div className="nav-section">{section}</div>
            {items.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                className={`nav-item${isActive(href) ? ' active' : ''}`}
                onClick={() => setOpen(false)}
              >
                {icon}
                {label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">{email}</div>
        <button className="btn-logout" onClick={logout}>
          <LogoutIcon />
          ログアウト
        </button>
      </div>
    </aside>
  )

  return (
    <div className="console-layout">
      {/* Mobile Header */}
      <header className="mobile-header">
        <button className="hamburger" onClick={() => setOpen(o => !o)} aria-label="Menu">
          <span /><span /><span />
        </button>
        <img
          src="https://res.cloudinary.com/deyc8gz2k/image/upload/v1781495769/fzzxktjm2c5feemspvqu.png"
          alt="CIELO" style={{ height: 28 }}
        />
        <span className="sidebar-badge">Console</span>
      </header>

      {/* Overlay */}
      <div
        className={`sidebar-overlay${open ? ' open' : ''}`}
        onClick={() => setOpen(false)}
      />

      {sidebar}

      <main className="main-area">
        {children}
      </main>
    </div>
  )
}

/* ── Icons ── */
function GridIcon()    { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg> }
function BoxIcon()     { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 5l6-3 6 3v6l-6 3-6-3V5z"/><path d="M8 2v12M2 5l6 3 6-3"/></svg> }
function BagIcon()     { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 6V4a3 3 0 116 0v2"/><rect x="1" y="6" width="14" height="9" rx="1"/></svg> }
function TruckIcon()   { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 3h9v7H1z"/><path d="M10 5h3l2 3v2h-5V5z"/><circle cx="4" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/></svg> }
function UserIcon()    { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="5" r="3"/><path d="M1.5 14c0-3.04 2.91-5.5 6.5-5.5s6.5 2.46 6.5 5.5"/></svg> }
function ImageIcon()   { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="2" width="14" height="12" rx="1.5"/><circle cx="5.5" cy="6" r="1.5"/><path d="M1 11l3.5-3.5L8 11l2.5-2 4.5 4"/></svg> }
function SlidersIcon() { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="2" width="14" height="12" rx="1"/><path d="M5 7h6M1 5h2m10 0h2M1 11h4m6 0h4"/></svg> }
function LogoutIcon()  { return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 3H2v10h4"/><path d="M11 11l3-3-3-3M14 8H6"/></svg> }
