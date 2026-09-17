'use client'

import { HelpCircle, X, ExternalLink } from 'lucide-react'
import { CONTACTO_ATLAS } from '@/lib/constants'
import { useEscapeKey } from '@/lib/use-escape-key'
import { GmailIcon, WhatsAppIcon, InstagramIcon } from '@/components/icons/brand-icons'

interface ModalCentroAyudaProps {
  abierto: boolean
  onCerrar: () => void
}

export function ModalCentroAyuda({ abierto, onCerrar }: ModalCentroAyudaProps) {
  useEscapeKey(onCerrar, abierto)

  if (!abierto) return null

  return (
    <div
      onClick={onCerrar}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 transition-opacity duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <HelpCircle className="size-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Centro de Ayuda</h3>
              <p className="text-xs text-slate-400">Canales de atención de ATLAS Gym</p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            aria-label="Cerrar centro de ayuda"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          {/* Gmail */}
          <a
            href={`mailto:${CONTACTO_ATLAS.email}`}
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition-[border-color,background-color] duration-200 hover:border-red-500/40 hover:bg-slate-800/50 group"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex size-11 items-center justify-center rounded-xl bg-white/[0.06] border border-white/10 group-hover:border-red-500/30 group-hover:bg-white/[0.09] group-hover:scale-105 transition-all shadow-sm shrink-0">
                <GmailIcon className="size-5.5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Gmail / Correo</span>
                <p className="text-sm font-bold text-slate-100 group-hover:text-red-400 transition-colors">
                  {CONTACTO_ATLAS.email}
                </p>
              </div>
            </div>
            <ExternalLink className="size-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
          </a>

          {/* WhatsApp */}
          <a
            href={CONTACTO_ATLAS.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition-[border-color,background-color] duration-200 hover:border-[#25D366]/40 hover:bg-slate-800/50 group"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex size-11 items-center justify-center rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] group-hover:border-[#25D366]/40 group-hover:bg-[#25D366]/20 group-hover:scale-105 transition-all shadow-sm shrink-0">
                <WhatsAppIcon className="size-5.5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Teléfono / WhatsApp</span>
                <p className="text-sm font-bold text-slate-100 group-hover:text-[#25D366] transition-colors">
                  {CONTACTO_ATLAS.telefono}
                </p>
              </div>
            </div>
            <ExternalLink className="size-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
          </a>

          {/* Instagram */}
          <a
            href={CONTACTO_ATLAS.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition-[border-color,background-color] duration-200 hover:border-pink-500/40 hover:bg-slate-800/50 group"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-tr from-[#f09433]/15 via-[#dc2743]/15 to-[#bc1888]/15 border border-[#dc2743]/25 group-hover:border-[#dc2743]/50 group-hover:scale-105 transition-all shadow-sm shrink-0">
                <InstagramIcon className="size-5.5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Instagram</span>
                <p className="text-sm font-bold text-slate-100 group-hover:text-pink-400 transition-colors">
                  {CONTACTO_ATLAS.instagram}
                </p>
              </div>
            </div>
            <ExternalLink className="size-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
          </a>
        </div>

        <div className="mt-5 border-t border-slate-800/60 pt-3 text-center">
          <p className="text-xs text-slate-500">
            Horario de atención: Lunes a Viernes 07:00 a 22:00 hs · Sábados 09:00 a 14:00 hs
          </p>
        </div>
      </div>
    </div>
  )
}
