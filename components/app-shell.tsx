'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  if (pathname === '/login') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-blue-500/30">
        {children}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-blue-500/30">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <main className={`transition-all duration-300 ${collapsed ? 'md:pl-20' : 'md:pl-64'}`}>
        {children}
      </main>
    </div>
  )
}