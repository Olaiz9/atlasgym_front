'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAppData } from '@/lib/store'
import { useEscapeKey } from '@/lib/use-escape-key'
import { APP_VERSION } from '@/lib/constants'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Dumbbell,
  ArrowRight,
  Sparkles,
  Smartphone,
  DownloadCloud,
  Share2,
  MoreVertical,
  PlusSquare,
  CheckCircle2,
  Zap,
  X,
  HelpCircle,
} from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { iniciarSesion, validarCredencialesStore } = useAppData()
  const [rol, setRol] = useState<'ADMIN' | 'ALUMNO'>('ADMIN')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [recordarme, setRecordarme] = useState(true)
  const [cargando, setCargando] = useState(false)
  const [plataformaTutorial, setPlataformaTutorial] = useState<'ANDROID' | 'IOS'>('ANDROID')
  const [mostrarModalTutorial, setMostrarModalTutorial] = useState(false)
  const [animandoCierre, setAnimandoCierre] = useState(false)
  const [error, setError] = useState('')

  const abrirModalTutorial = () => {
    setAnimandoCierre(false)
    setMostrarModalTutorial(true)
  }

  const cerrarModalTutorial = () => {
    setAnimandoCierre(true)
    setTimeout(() => {
      setMostrarModalTutorial(false)
      setAnimandoCierre(false)
    }, 200)
  }

  useEscapeKey(cerrarModalTutorial, mostrarModalTutorial)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const val = validarCredencialesStore(email, password, rol)
    if (!val.ok) {
      setError(val.motivo || 'Credenciales inválidas.')
      return
    }

    setCargando(true)
    const loginRes = iniciarSesion(rol, email, recordarme)
    if (!loginRes.ok) {
      setCargando(false)
      setError(loginRes.motivo || 'Error al iniciar sesión.')
      return
    }

    setTimeout(() => {
      setCargando(false)
      router.push('/')
    }, 400)
  }

  const handleQuickDemo = (demoRol: 'ADMIN' | 'ALUMNO') => {
    setRol(demoRol)
    setError('')
    if (demoRol === 'ADMIN') {
      setEmail('admin@atlasgym.com')
      setPassword('admin123')
    } else {
      setEmail('lucia.fernandez@mail.com')
      setPassword('alumno123')
    }
  }

  const handleSelectAlumnoDemo = (mail: string) => {
    setRol('ALUMNO')
    setError('')
    setEmail(mail)
    setPassword('alumno123')
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      {/* Fondo con resplandores sutiles */}
      <div className="pointer-events-none absolute -top-40 left-1/4 -translate-x-1/2 size-[600px] rounded-full bg-blue-600/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 -translate-x-1/2 size-[500px] rounded-full bg-blue-500/10 blur-[140px]" />

      <div className="relative w-full max-w-md">
        {/* Logo & Marca Superior */}
        <div className="mb-8 text-center flex flex-col items-center">
          <Image
            src="/logo-atlas-blanco.png"
            alt="ATLAS GYM"
            width={240}
            height={135}
            className="h-16 w-auto object-contain mb-3 drop-shadow-[0_10px_25px_rgba(37,99,235,0.2)]"
            priority
          />
          <p className="mt-1 text-sm font-medium text-slate-400">
            Plataforma integral de gestión y entrenamiento
          </p>
        </div>

        {/* Tarjeta Principal de Login */}
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Selector de Rol */}
          <div className="mb-6 grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-950/60 p-1.5 border border-slate-800/60">
            <button
              type="button"
              onClick={() => setRol('ADMIN')}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-[color,background-color,box-shadow] duration-200 ${
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
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-[color,background-color,box-shadow] duration-200 ${
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
              <label htmlFor="login-email" className="block text-xs font-bold text-slate-300 mb-1.5">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={rol === 'ADMIN' ? 'admin@atlasgym.com' : 'tu.email@ejemplo.com'}
                  className="h-12 w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-[border-color,box-shadow] duration-200 focus:border-blue-500/60 focus:bg-slate-950 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            {/* Input Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="text-xs font-bold text-slate-300">Contraseña</label>
                <button
                  type="button"
                  onClick={() => alert('Contactá al administrador para restablecer tu clave.')}
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-10 pr-11 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-[border-color,box-shadow] duration-200 focus:border-blue-500/60 focus:bg-slate-950 focus:ring-4 focus:ring-blue-500/10"
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

            {/* Mensaje de error */}
            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-400">
                {error}
              </div>
            )}

            {/* Botón Submit */}
            <button
              type="submit"
              disabled={cargando}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 font-bold text-white shadow-lg shadow-blue-600/25 transition-[color,background-color,transform,box-shadow] duration-200 hover:bg-blue-500 hover:-translate-y-0.5 hover:shadow-blue-500/30 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
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

          {/* Botones de Acceso Rápido DEMO + Botón de Instalación Móvil */}
          <div className="mt-7 space-y-3">
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mb-2.5">
                <Sparkles className="size-3.5 text-blue-400" />
                Acceso rápido para probar (Demo):
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemo('ADMIN')}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 transition-[color,background-color,border-color] duration-200 hover:border-blue-500/40 hover:bg-slate-800 hover:text-white text-left cursor-pointer"
                >
                  👑 <strong>Admin</strong>
                  <span className="block text-[10px] text-slate-500 font-normal">admin@atlasgym</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAlumnoDemo('lucia.fernandez@mail.com')}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 transition-[color,background-color,border-color] duration-200 hover:border-blue-500/40 hover:bg-slate-800 hover:text-white text-left cursor-pointer"
                >
                  🏋️ <strong>Lucía F.</strong>
                  <span className="block text-[10px] text-slate-500 font-normal">lucia.fernandez@</span>
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/60 text-[10px]">
                <span className="font-semibold text-slate-500 mr-1">Otros socios:</span>
                <button
                  type="button"
                  onClick={() => handleSelectAlumnoDemo('carlos.gomez@mail.com')}
                  className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 font-medium text-slate-400 hover:text-white hover:border-blue-500/40 transition-colors cursor-pointer"
                >
                  Carlos Gómez
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAlumnoDemo('valentina.rossi@mail.com')}
                  className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 font-medium text-slate-400 hover:text-white hover:border-blue-500/40 transition-colors cursor-pointer"
                >
                  Valentina Rossi
                </button>
              </div>
            </div>

            {/* Botón ¿Cómo agregar un acceso directo en tu celular? (Auditoría M6) */}
            <button
              type="button"
              onClick={abrirModalTutorial}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 py-2.5 px-4 text-xs font-bold text-blue-300 hover:text-white transition-all duration-300 group cursor-pointer shadow-sm active:scale-[0.99]"
            >
              <Smartphone className="size-4 text-blue-400 group-hover:scale-110 transition-transform duration-300 ease-out" />
              <span>¿Cómo agregar un acceso directo en tu celular?</span>
              <HelpCircle className="size-3.5 text-blue-400/80 group-hover:text-blue-300 ml-auto transition-colors" />
            </button>
          </div>
        </div>

        {/* Footer (Auditoría M9) */}
        <p className="mt-8 text-center text-xs font-medium text-slate-500">
          ATLAS Gym Platform · {APP_VERSION}
        </p>
      </div>

      {/* Modal Tutorial de Instalación PWA */}
      {mostrarModalTutorial && (
        <div
          onClick={cerrarModalTutorial}
          className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 transition-opacity duration-300 ease-out ${
            animandoCierre ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-7 shadow-2xl transition-all duration-300 ease-out ${
              animandoCierre
                ? 'opacity-0 scale-95 translate-y-3'
                : 'opacity-100 scale-100 translate-y-0'
            }`}
          >
            {/* Botón cerrar */}
            <button
              type="button"
              onClick={cerrarModalTutorial}
              className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X className="size-5" />
            </button>

            {/* Cabecera del Tutorial */}
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">
              <Smartphone className="size-4" />
              <span>Acceso Rápido al Móvil</span>
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Agregá un acceso directo en tu teléfono
            </h2>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
              Anclá ATLAS Gym a la pantalla de inicio de tu celular para abrir tus rutinas con <strong>1 toque</strong> sin usar el navegador cada vez.
            </p>

            {/* Selector de SO (Android / iPhone) */}
            <div className="mt-4 grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950/70 border border-slate-800">
              <button
                type="button"
                onClick={() => setPlataformaTutorial('ANDROID')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-[color,background-color] duration-150 cursor-pointer ${
                  plataformaTutorial === 'ANDROID'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Android (Chrome)
              </button>
              <button
                type="button"
                onClick={() => setPlataformaTutorial('IOS')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-[color,background-color] duration-150 cursor-pointer ${
                  plataformaTutorial === 'IOS'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                iPhone (Safari)
              </button>
            </div>

            {/* Pasos según la plataforma */}
            <div className="mt-5 space-y-3">
              {plataformaTutorial === 'ANDROID' ? (
                <>
                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
                    <span className="size-6 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div className="text-xs">
                      <p className="font-bold text-slate-200">Abrí en Google Chrome</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">Ingresá a la web de ATLAS Gym desde tu navegador Chrome.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
                    <span className="size-6 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div className="text-xs">
                      <p className="font-bold text-slate-200 flex items-center gap-1">
                        Tocá el menú <MoreVertical className="size-3 text-blue-400" /> (tres puntos)
                      </p>
                      <p className="text-slate-400 text-[11px] mt-0.5">Ubicado en la esquina superior derecha del navegador.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
                    <span className="size-6 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div className="text-xs">
                      <p className="font-bold text-slate-200 flex items-center gap-1">
                        Elegí <DownloadCloud className="size-3 text-blue-400" /> &quot;Instalar aplicación&quot;
                      </p>
                      <p className="text-slate-400 text-[11px] mt-0.5">O &quot;Agregar a la pantalla principal&quot; según tu versión.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                    <span className="size-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </span>
                    <div className="text-xs">
                      <p className="font-bold text-emerald-300">¡Listo! Acceso creado</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">Se creará el icono de ATLAS Gym junto a tus demás apps.</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
                    <span className="size-6 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div className="text-xs">
                      <p className="font-bold text-slate-200">Abrí en Safari</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">Es importante abrir la página desde el navegador Safari de iOS.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
                    <span className="size-6 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div className="text-xs">
                      <p className="font-bold text-slate-200 flex items-center gap-1">
                        Tocá el botón Compartir <Share2 className="size-3 text-blue-400" />
                      </p>
                      <p className="text-slate-400 text-[11px] mt-0.5">El ícono de cuadrado con flecha hacia arriba en la barra inferior.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
                    <span className="size-6 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div className="text-xs">
                      <p className="font-bold text-slate-200 flex items-center gap-1">
                        Deslizá y tocá <PlusSquare className="size-3 text-blue-400" /> &quot;Agregar al inicio&quot;
                      </p>
                      <p className="text-slate-400 text-[11px] mt-0.5">Buscá la opción con el símbolo más (+) en la lista.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                    <span className="size-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </span>
                    <div className="text-xs">
                      <p className="font-bold text-emerald-300">Tocá &quot;Agregar&quot; y ¡listo!</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">Tendrás el acceso directo a pantalla completa en tu iPhone.</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Ventajas destacadas al pie del modal */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Zap className="size-3 text-amber-400" /> Carga instantánea
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="size-3 text-emerald-400" /> Sin ocupar memoria
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
