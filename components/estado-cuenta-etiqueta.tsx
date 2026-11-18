import { AlertCircle, Check, Clock, Minus } from 'lucide-react'
import { ESTADO_CUENTA_STYLES, EstadoCuenta } from '@/lib/types'

const VISTA = {
  AL_DIA: { texto: 'Al día', Icono: Check },
  PENDIENTE: { texto: 'Pendiente', Icono: Clock },
  MOROSO: { texto: 'Vencido', Icono: AlertCircle },
  INACTIVO: { texto: 'Inactivo', Icono: Minus },
} satisfies Record<EstadoCuenta, unknown>

/** Estado de cuenta sin relleno: ícono + texto, para no depender solo del color. */
export function EstadoCuentaEtiqueta({ estado, conSenia = false }: { estado: EstadoCuenta; conSenia?: boolean }) {
  const esSenia = conSenia && estado !== 'MOROSO' && estado !== 'INACTIVO'
  const { texto, Icono } = esSenia ? { texto: 'Seña', Icono: Clock } : VISTA[estado]
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap text-[13px] font-semibold ${
        esSenia ? 'text-amber-400' : ESTADO_CUENTA_STYLES[estado]
      }`}
    >
      <Icono className="size-3.5 shrink-0" aria-hidden="true" />
      {texto}
    </span>
  )
}
