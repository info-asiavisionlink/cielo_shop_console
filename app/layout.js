import './globals.css'

export const metadata = {
  title: 'CIELO SHOP CONSOLE',
  description: 'CIELO SHOP 管理画面',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
