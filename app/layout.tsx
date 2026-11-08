import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Big_Shoulders, Public_Sans } from 'next/font/google'
import { AppShell } from '@/components/app-shell'
import { AppDataProvider } from '@/lib/store'
import { ToastProvider } from '@/components/ui/toast'
import './globals.css'

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-public-sans',
  display: 'swap',
})

const bigShoulders = Big_Shoulders({
  subsets: ['latin'],
  weight: 'variable',
  axes: ['opsz'],
  variable: '--font-big-shoulders',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ATLAS GYM',
  description: 'Plataforma de entrenamiento y gestión ATLAS GYM.',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#14264a',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`bg-background ${publicSans.variable} ${bigShoulders.variable}`}>
      <body className="antialiased">
        <AppDataProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </AppDataProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}