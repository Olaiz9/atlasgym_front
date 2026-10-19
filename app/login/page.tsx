'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAppData } from '@/lib/store'
import { useEscapeKey } from '@/lib/use-escape-key'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Smartphone,
  X,
  KeyRound,
  Copy,
  Check,
  MessageCircle,
  ShieldCheck,
  Clock,
  ChevronRight,
  DownloadCloud,
  Share2,
  MoreVertical,
  PlusSquare,
  CheckCircle2,
  Zap,
} from 'lucide-react'
import { CONTACTO_ATLAS } from '@/lib/constants'

export default function LoginPage() {
  const router = useRouter()
  const { iniciarSesion } = useAppData()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [recordarme, setRecordarme] = useState(true)
  const [cargando, setCargando] = useState(false)
  const [plataformaTutorial, setPlataformaTutorial] = useState<'ANDROID' | 'IOS'>('ANDROID')
  const [mostrarModalTutorial, setMostrarModalTutorial] = useState(false)
  const [mostrarModalRecuperar, setMostrarModalRecuperar] = useState(false)
  const [copiadoSoporte, setCopiadoSoporte] = useState(false)
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

  const cerrarModalRecuperar = () => {
    setMostrarModalRecuperar(false)
    setCopiadoSoporte(false)
  }

  useEscapeKey(() => {
    if (mostrarModalTutorial) cerrarModalTutorial()
    if (mostrarModalRecuperar) cerrarModalRecuperar()
  }, mostrarModalTutorial || mostrarModalRecuperar)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Por favor ingresá tu usuario, DNI o email y contraseña.')
      return
    }

    setCargando(true)

    const resultado = await iniciarSesion(email.trim(), password)
    if (!resultado.ok) {
      setCargando(false)
      setError(resultado.error || 'Credenciales inválidas.')
      return
    }

    setTimeout(() => {
      setCargando(false)
      router.push('/')
    }, 300)
  }

  const copiarMensajeSoporte = async () => {
    const texto = `Hola ATLAS Gym, olvidé mi contraseña para ingresar a la plataforma ATLAS. ¿Podrían ayudarme a restablecerla? Mi usuario o DNI es: `
    try {
      await navigator.clipboard.writeText(texto)
      setCopiadoSoporte(true)
      setTimeout(() => setCopiadoSoporte(false), 2500)
    } catch {}
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12">
      {/* Imagen de fondo nítida y visible con atmósfera cinematográfica oscura */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <Image
          src="/login-bg.jpg"
          alt="Gimnasio Atlas"
          fill
          priority
          className="object-cover object-center opacity-55 filter blur-[1.5px] scale-105"
        />
        {/* Capa de viñeta oscura para garantizar legibilidad óptima de la tarjeta */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/65 to-slate-950/90" />
      </div>

      {/* Fondo con resplandores sutiles */}
      <div className="pointer-events-none absolute -top-40 left-1/4 -translate-x-1/2 size-[650px] rounded-full bg-blue-600/15 blur-[130px] z-0" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 -translate-x-1/2 size-[550px] rounded-full bg-blue-500/10 blur-[150px] z-0" />

      <div className="relative z-10 w-full max-w-[490px]">
        {/* Logo & Marca Superior */}
        <div className="mb-7 text-center flex flex-col items-center">
          <Image
            src="/logo-atlas-blanco.png"
            alt="ATLAS GYM"
            width={240}
            height={135}
            className="h-16 w-auto object-contain mb-3 drop-shadow-[0_10px_25px_rgba(37,99,235,0.25)]"
            priority
          />
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-950/40 px-3.5 py-1 text-[11px] font-semibold text-blue-300 backdrop-blur-md">
            <span className="size-1.5 rounded-full bg-blue-400 animate-pulse" />
            Portal Oficial de Gestión y Entrenamiento
          </div>
        </div>

        {/* Tarjeta Principal de Login */}
        <div className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-7 sm:p-9 shadow-[0_20px_50px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-white tracking-tight">Ingresá a tu cuenta</h1>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Accedé a tus rutinas personalizadas, estado de cuotas o gestión administrativa.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input Usuario / DNI / Email */}
            <div>
              <label htmlFor="login-email" className="block text-xs font-bold text-slate-300 mb-1.5">
                Usuario, DNI o correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  id="login-email"
                  type="text"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ej. admin@atlasgym.com, bruno272 o tu DNI"
                  className="h-12 w-full rounded-xl border border-slate-800 bg-slate-950/70 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:border-blue-500/70 focus:bg-slate-950 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            {/* Input Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="text-xs font-bold text-slate-300">Contraseña</label>
                <button
                  type="button"
                  onClick={() => setMostrarModalRecuperar(true)}
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
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
                  className="h-12 w-full rounded-xl border border-slate-800 bg-slate-950/70 pl-10 pr-11 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:border-blue-500/70 focus:bg-slate-950 focus:ring-4 focus:ring-blue-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1 cursor-pointer"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Recordar sesión */}
            <div className="flex items-center gap-2 pt-0.5">
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
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 font-bold text-white shadow-lg shadow-blue-600/25 transition-[color,background-color,transform,box-shadow] duration-200 hover:bg-blue-500 hover:-translate-y-0.5 hover:shadow-blue-500/30 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
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

          {/* Micro indicadores de seguridad y servicio (sin emojis) */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-[11px] text-slate-400">
            <div className="flex items-center gap-2 rounded-xl bg-slate-950/40 p-2.5 border border-slate-800/40">
              <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
              <span className="leading-tight">Acceso seguro y protegido</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-slate-950/40 p-2.5 border border-slate-800/40">
              <Clock className="size-4 text-blue-400 shrink-0" />
              <span className="leading-tight">Disponible 24/7 online</span>
            </div>
          </div>

          {/* Botón ¿Cómo anclarlo en mi celular? */}
          <div className="mt-4">
            <button
              type="button"
              onClick={abrirModalTutorial}
              className="w-full flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/60 hover:border-slate-700 py-3 px-4 text-xs font-semibold text-slate-300 hover:text-white transition-all duration-200 group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-105 transition-transform">
                  <Smartphone className="size-4" />
                </div>
                <span>¿Cómo anclar ATLAS a la pantalla de tu celular?</span>
              </div>
              <ChevronRight className="size-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-7 text-center text-xs font-medium text-slate-500">
          ATLAS Gym Platform · v2.5.0
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
              <span>Acceso rápido al móvil</span>
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Instalá la app en tu teléfono
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

      {/* Modal Recuperación de Contraseña */}
      {mostrarModalRecuperar && (
        <div
          onClick={cerrarModalRecuperar}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 transition-opacity duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-7 shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Botón cerrar */}
            <button
              type="button"
              onClick={cerrarModalRecuperar}
              className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              aria-label="Cerrar"
            >
              <X className="size-5" />
            </button>

            {/* Icono e Identificador */}
            <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 mb-4 border border-blue-500/20">
              <KeyRound className="size-6" />
            </div>

            <h3 className="text-xl font-extrabold text-white tracking-tight">
              ¿Olvidaste tu contraseña?
            </h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Por seguridad y para proteger tu plan y rutinas, la recuperación de credenciales se valida directamente con el equipo de administración de ATLAS Gym.
            </p>

            <div className="mt-5 space-y-3">
              {/* Opción 1: Recepción */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-blue-500" />
                  Presencial en recepción
                </div>
                <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                  Acercate al mostrador con tu <strong>DNI</strong> para que el administrador te restablezca la clave en el instante.
                </p>
              </div>

              {/* Opción 2: WhatsApp Oficial */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  Atención por WhatsApp
                </div>
                <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                  Comunicate con nuestro canal oficial de soporte para coordinar tu restablecimiento de acceso.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={`${CONTACTO_ATLAS.whatsappUrl}?text=${encodeURIComponent(
                      'Hola ATLAS Gym, olvidé mi contraseña para ingresar a la plataforma ATLAS. ¿Podrían ayudarme a restablecerla? Mi nombre o DNI es: '
                    )}`}
                    target="atlas_whatsapp_tab"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 transition-colors active:scale-95 cursor-pointer"
                  >
                    <MessageCircle className="size-4" />
                    Abrir WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={copiarMensajeSoporte}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors active:scale-95 cursor-pointer"
                  >
                    {copiadoSoporte ? (
                      <>
                        <Check className="size-3.5 text-emerald-400" />
                        <span className="text-emerald-400">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" />
                        <span>Copiar texto</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Botón Cerrar */}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={cerrarModalRecuperar}
                className="w-full sm:w-auto h-11 rounded-xl bg-slate-800 hover:bg-slate-700 px-6 text-xs font-bold text-slate-200 transition-colors active:scale-95 cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
