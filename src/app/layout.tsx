import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Finança Casa',
  description: 'Controle financeiro familiar',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Aplica o tema antes do render para evitar flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);})();
        `}} />
      </head>
      <body>{children}</body>
    </html>
  )
}
