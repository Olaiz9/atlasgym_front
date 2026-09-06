'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAppData } from '@/lib/store'
import { Users, WalletCards, Dumbbell, Package, LayoutDashboard, Video, LogOut } from 'lucide-react'

const navItemsAdmin = [
  { label: 'Inicio', href: '/', icon: LayoutDashboard },
  { label: 'Alumnos', href: '/alumnos', icon: Users },
  { label: 'Finanzas', href: '/finanzas', icon: WalletCards },
  { label: 'Rutinas', href: '/rutinas', icon: Dumbbell },
  { label: 'Videoteca', href: '/videoteca', icon: Video },
  { label: 'Planes', href: '/planes', icon: Package },
]

const navItemsAlumno = [
  { label: 'Inicio', href: '/', icon: LayoutDashboard },
  { label: 'Mi Rutina', href: '/rutinas', icon: Dumbbell },
  { label: 'Mis Cuotas', href: '/finanzas', icon: WalletCards },
  { label: 'Videoteca', href: '/videoteca', icon: Video },
]

export function MobileNav() {
  const pathname = usePathname()
  const { usuarioActual } = useAppData()

  const esAlumno = usuarioActual.rol === 'ALUMNO'
  const navItems = esAlumno ? navItemsAlumno : navItemsAdmin

  return (
    <nav
      aria-label="Navegación móvil"
      className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-slate-800/80 bg-slate-950/95 px-2 backdrop-blur-lg md:hidden"
    >
      {navItems.map(({ label, href, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={label}
            href={href}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 transition-colors ${
              active
                ? 'text-blue-500 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className={`size-5 ${active ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className="text-[10px] tracking-tight">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
