'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { MobileNav } from '@/components/mobile-nav'
import { useAppData } from '@/lib/store'
import { puedeAccederRuta } from '@/lib/auth-utils'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { usuarioActual } = useAppData()

  useEffect(() => {
    if (!usuarioActual && pathname !== '/login') {
      router.replace('/login')
    } else if (usuarioActual && !puedeAccederRuta(pathname, usuarioActual.rol)) {
      router.replace('/')
    }
  }, [usuarioActual, pathname, router])

  if (pathname === '/login') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-blue-500/30">
        {children}
      </div>
    )
  }

  if (!usuarioActual) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-blue-500/20 border-t-blue-500" />
          <p className="text-xs text-slate-400 font-medium">Redirigiendo al inicio de sesión...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-blue-500/30 pb-20 md:pb-0">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <main className={`transition-[padding-left] duration-300 ${collapsed ? 'md:pl-20' : 'md:pl-64'}`}>
        {children}
      </main>
      <MobileNav />
    </div>
  )
}