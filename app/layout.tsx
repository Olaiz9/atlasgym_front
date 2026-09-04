import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { AppShell } from '@/components/app-shell'
import { AppDataProvider } from '@/lib/store'
import './globals.css'

export const metadata: Metadata = {
  title: 'ATLAS GYM',
  description: 'Plataforma de entrenamiento y gestión ATLAS GYM.',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#172554',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="bg-background">
      <body className="antialiased">
        <AppDataProvider>
          <AppShell>{children}</AppShell>
        </AppDataProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}