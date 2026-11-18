'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAppData } from '@/lib/store'
import { useEscapeKey } from '@/lib/use-escape-key'
import {
  Eye,
  EyeOff,
  Smartphone,
  X,
  KeyRound,
  Copy,
  Check,
  MessageCircle,
  ChevronRight,
  DownloadCloud,
  Share2,
  MoreVertical,
  PlusSquare,
  CheckCircle2,
  Zap,
} from 'lucide-react'
import { CONTACTO_ATLAS } from '@/lib/constants'
import { VERSION_APP } from '@/lib/version'

export default function LoginPage() {
  const router = useRouter()
  const { iniciarSesion } = useAppData()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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

  const claseCampo =
    'h-[54px] w-full rounded-[14px] border border-[#2A4677] bg-[#13254A] px-4 text-[17px] font-normal text-slate-100 outline-none placeholder:text-slate-500 focus:border-2 focus:border-blue-600'

  return (
    <div className="min-h-dvh bg-[#0A1530] text-slate-100">
      <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col gap-7 px-6 pb-7 pt-14">
        <Image src="/logo-atlas-blanco.png" alt="ATLAS Gym" width={160} height={90} className="h-10 w-auto self-start object-contain" priority />

        <div>
          <h1 className="text-[44px] font-extrabold uppercase leading-[.9] text-white">
            Tu entreno,
            <br />
            en tu bolsillo
          </h1>
          <p className="mt-3 text-base text-slate-400">Rutina, cuotas y avisos del gimnasio.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label htmlFor="login-email" className="flex flex-col gap-1.5 text-sm font-semibold text-slate-300">
            Usuario
            <input
              id="login-email"
              type="text"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ingresá tu usuario, DNI o correo"
              className={claseCampo}
            />
            <span className="text-[13px] font-normal text-slate-500">La primera vez, tu usuario es tu DNI.</span>
          </label>

          <label htmlFor="login-password" className="flex flex-col gap-1.5 text-sm font-semibold text-slate-300">
            Contraseña
            <span className="relative block">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`${claseCampo} pr-[52px]`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center text-slate-400 hover:text-slate-200"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </span>
          </label>

          {error && (
            <p role="alert" className="text-sm font-semibold text-rose-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="mt-1 flex h-14 items-center justify-center rounded-[14px] bg-blue-600 text-[17px] font-bold text-white transition-colors hover:bg-blue-500 disabled:pointer-events-none disabled:opacity-50"
          >
            {cargando ? (
              <span className="inline-block size-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            ) : (
              'Ingresar'
            )}
          </button>
          <button
            type="button"
            onClick={() => setMostrarModalRecuperar(true)}
            className="min-h-11 self-center px-2 text-sm font-semibold text-blue-400 hover:text-blue-300"
          >
            ¿Olvidaste tu contraseña? Pedila en recepción
          </button>
        </form>

        <div className="mt-auto flex flex-col gap-4">
          <button
            type="button"
            onClick={abrirModalTutorial}
            className="flex items-center gap-3.5 rounded-2xl border border-[#2A4677] bg-[#13254A] px-4 py-3.5 text-left text-slate-100 transition-colors hover:bg-[#162A50]"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#1E3663]">
              <Smartphone className="size-[22px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold">Agregá ATLAS a tu pantalla</span>
              <span className="block text-[13px] text-slate-400">
                Como una app, en 1 toque <span aria-hidden="true" className="mx-1 text-slate-600">|</span> Chrome o Safari
              </span>
            </span>
            <ChevronRight className="size-[18px] shrink-0 text-slate-400" />
          </button>

          <p className="text-center text-xs text-slate-500">
            ATLAS Gym Platform <span aria-hidden="true" className="mx-1 text-slate-600">|</span> {VERSION_APP}{' '}
            <span aria-hidden="true" className="mx-1 text-slate-600">|</span>{' '}
            <Link href="/privacidad" className="underline underline-offset-2 hover:text-slate-300">
              Política de privacidad
            </Link>
          </p>
        </div>
      </div>

      {/* Modal Tutorial de Instalación PWA */}
      {mostrarModalTutorial && (
        <div
          onClick={cerrarModalTutorial}
          className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 transition-opacity duration-200 ease-out ${
            animandoCierre ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-7 shadow-2xl transition-[color,background-color,border-color,opacity,transform,translate,scale,rotate] duration-200 ease-out ${
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
            <div className="flex items-center gap-2 text-xs font-bold text-blue-400 mb-1">
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
                      <p className="text-slate-400 text-xs mt-0.5">Ingresá a la web de ATLAS Gym desde tu navegador Chrome.</p>
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
                      <p className="text-slate-400 text-xs mt-0.5">Ubicado en la esquina superior derecha del navegador.</p>
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
                      <p className="text-slate-400 text-xs mt-0.5">O &quot;Agregar a la pantalla principal&quot; según tu versión.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                    <span className="size-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </span>
                    <div className="text-xs">
                      <p className="font-bold text-emerald-300">¡Listo! Acceso creado</p>
                      <p className="text-slate-400 text-xs mt-0.5">Se creará el icono de ATLAS Gym junto a tus demás apps.</p>
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
                      <p className="text-slate-400 text-xs mt-0.5">Es importante abrir la página desde el navegador Safari de iOS.</p>
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
                      <p className="text-slate-400 text-xs mt-0.5">El ícono de cuadrado con flecha hacia arriba en la barra inferior.</p>
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
                      <p className="text-slate-400 text-xs mt-0.5">Buscá la opción con el símbolo más (+) en la lista.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                    <span className="size-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </span>
                    <div className="text-xs">
                      <p className="font-bold text-emerald-300">Tocá &quot;Agregar&quot; y ¡listo!</p>
                      <p className="text-slate-400 text-xs mt-0.5">Tendrás el acceso directo a pantalla completa en tu iPhone.</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Ventajas destacadas al pie del modal */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
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
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Acercate al mostrador con tu <strong>DNI</strong> para que el administrador te restablezca la clave en el instante.
                </p>
              </div>

              {/* Opción 2: WhatsApp Oficial */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  Atención por WhatsApp
                </div>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
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
