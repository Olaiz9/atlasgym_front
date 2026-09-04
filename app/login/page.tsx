'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppData } from '@/lib/store'
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Dumbbell, ArrowRight, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { iniciarSesion } = useAppData()
  const [rol, setRol] = useState<'ADMIN' | 'ALUMNO'>('ADMIN')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [recordarme, setRecordarme] = useState(true)
  const [cargando, setCargando] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)

    iniciarSesion(rol, email)

    setTimeout(() => {
      setCargando(false)
      if (rol === 'ADMIN') {
        router.push('/')
      } else {
        router.push('/finanzas')
      }
    }, 500)
  }

  const handleQuickDemo = (demoRol: 'ADMIN' | 'ALUMNO') => {
    setRol(demoRol)
    if (demoRol === 'ADMIN') {
      setEmail('admin@atlasgym.com')
      setPassword('admin123')
    } else {
      setEmail('lucia.fernandez@mail.com')
      setPassword('alumno123')
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12">
      {/* Fondo con resplandores sutiles */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 size-[600px] rounded-full bg-blue-600/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 -translate-x-1/2 size-[500px] rounded-full bg-blue-500/10 blur-[140px]" />

      <div className="relative w-full max-w-md">
        {/* Logo & Marca */}
        <div className="mb-8 text-center">
          <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-black text-white shadow-xl shadow-blue-600/30">
            A
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-[0.2em] text-white">ATLAS GYM</h1>
          <p className="mt-1 text-sm font-medium text-slate-400">
            Plataforma de gestión y entrenamiento
          </p>
        </div>

        {/* Tarjeta principal */}
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-7 shadow-2xl backdrop-blur-xl sm:p-8">
          {/* Selector de Rol */}
          <div className="mb-6 grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-950/60 p-1.5 border border-slate-800/60">
            <button
              type="button"
              onClick={() => setRol('ADMIN')}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all duration-300 ${
                rol === 'ADMIN'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="size-4" />
              Dueño / Admin
            </button>
            <button
              type="button"
              onClick={() => setRol('ALUMNO')}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all duration-300 ${
                rol === 'ALUMNO'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Dumbbell className="size-4" />
              Alumno
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input Email */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={rol === 'ADMIN' ? 'admin@atlasgym.com' : 'tu.email@ejemplo.com'}
                  className="h-12 w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-all focus:border-blue-500/60 focus:bg-slate-950 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            {/* Input Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300">Contraseña</label>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    alert('Contactá al administrador para restablecer tu clave.')
                  }}
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-10 pr-11 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-all focus:border-blue-500/60 focus:bg-slate-950 focus:ring-4 focus:ring-blue-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Recordar sesión */}
            <div className="flex items-center gap-2 pt-1">
              <input
                id="recordar"
                type="checkbox"
                checked={recordarme}
                onChange={(e) => setRecordarme(e.target.checked)}
                className="size-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
              />
              <label htmlFor="recordar" className="text-xs font-medium text-slate-400 cursor-pointer select-none">
                Recordar mi sesión en este equipo
              </label>
            </div>

            {/* Botón Submit */}
            <button
              type="submit"
              disabled={cargando}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 font-bold text-white shadow-lg shadow-blue-600/25 transition-all duration-300 hover:bg-blue-500 hover:-translate-y-0.5 hover:shadow-blue-500/30 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {cargando ? (
                <span className="inline-block size-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              ) : (
                <>
                  Iniciar sesión
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>

          {/* Botones de Acceso Rápido DEMO */}
          <div className="mt-8 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mb-3">
              <Sparkles className="size-3.5 text-blue-400" />
              Acceso rápido para probar (Demo):
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('ADMIN')}
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 transition-all hover:border-blue-500/40 hover:bg-slate-800 hover:text-white text-left"
              >
                👑 <strong>Admin</strong>
                <span className="block text-[10px] text-slate-500 font-normal">admin@atlasgym</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('ALUMNO')}
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 transition-all hover:border-blue-500/40 hover:bg-slate-800 hover:text-white text-left"
              >
                🏋️ <strong>Alumno</strong>
                <span className="block text-[10px] text-slate-500 font-normal">lucia@mail.com</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs font-medium text-slate-500">
          ATLAS Gym Admin System · v2.4.0
        </p>
      </div>
    </div>
  )
}
