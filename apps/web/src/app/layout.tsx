import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ledger Manager',
  description: 'Asset management system',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
