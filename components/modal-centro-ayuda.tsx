'use client'

import { HelpCircle, X, Mail, Phone, ExternalLink } from 'lucide-react'

interface ModalCentroAyudaProps {
  abierto: boolean
  onCerrar: () => void
}

export function ModalCentroAyuda({ abierto, onCerrar }: ModalCentroAyudaProps) {
  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
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
          <a
            href="mailto:gonzalo5jesus@gmail.com"
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition-all hover:border-blue-500/50 hover:bg-slate-800/40 group"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex size-10 items-center justify-center rounded-lg bg-red-500/10 text-red-400 group-hover:scale-105 transition-transform">
                <Mail className="size-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Gmail / Correo</span>
                <p className="text-sm font-bold text-slate-100 group-hover:text-blue-400 transition-colors">
                  gonzalo5jesus@gmail.com
                </p>
              </div>
            </div>
            <ExternalLink className="size-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
          </a>

          <a
            href="https://wa.me/5492615665067"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition-all hover:border-emerald-500/50 hover:bg-slate-800/40 group"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-105 transition-transform">
                <Phone className="size-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Teléfono / WhatsApp</span>
                <p className="text-sm font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">
                  +54 9 261 566-5067
                </p>
              </div>
            </div>
            <ExternalLink className="size-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
          </a>

          <a
            href="https://www.instagram.com/atlasgymoficial_/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition-all hover:border-pink-500/50 hover:bg-slate-800/40 group"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex size-10 items-center justify-center rounded-lg bg-pink-500/10 text-pink-400 group-hover:scale-105 transition-transform">
                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Instagram</span>
                <p className="text-sm font-bold text-slate-100 group-hover:text-pink-400 transition-colors">
                  @atlasgymoficial_
                </p>
              </div>
            </div>
            <ExternalLink className="size-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
          </a>
        </div>

        <div className="mt-5 border-t border-slate-800/60 pt-3 text-center">
          <p className="text-xs text-slate-500">
            Horario de atención: Lunes a Sábados 08:00 a 22:00 hs
          </p>
        </div>
      </div>
    </div>
  )
}
