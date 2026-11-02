import Link from 'next/link'
import type { Metadata } from 'next'
import { DATOS_LEGALES, datosLegalesPendientes, nombreResponsable } from '@/lib/datos-legales'

export const metadata: Metadata = {
  title: `Política de privacidad · ${DATOS_LEGALES.nombreGimnasio}`,
}

/**
 * Política de privacidad (Ley 25.326). Pública: se puede leer sin iniciar sesión.
 * Los datos del responsable se completan en lib/datos-legales.ts.
 */
export default function PaginaPrivacidad() {
  const d = DATOS_LEGALES
  const pendientes = datosLegalesPendientes()
  const responsable = nombreResponsable(d)

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 text-slate-200 leading-relaxed">
      <Link href="/login" className="text-sm font-semibold text-blue-400 hover:text-blue-300">
        ← Volver al inicio de sesión
      </Link>

      <h1 className="mt-6 text-2xl font-black text-white">Política de privacidad</h1>
      <p className="mt-1 text-xs text-slate-400">Última actualización: {d.actualizada}</p>

      {pendientes.length > 0 && (
        <p role="alert" className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Datos pendientes de completar por el gimnasio: {pendientes.join(', ')}.
        </p>
      )}

      <Seccion titulo="1. Quién es responsable de tus datos">
        <p>
          El responsable de la base de datos es <strong>{responsable}</strong>
          {d.cuit && <> (CUIT {d.cuit})</>}
          {d.domicilio && <>, con domicilio en {d.domicilio}</>}. La plataforma {d.nombreGimnasio} es la herramienta
          que el gimnasio usa para administrar socios, cuotas y asistencias.
        </p>
      </Seccion>

      <Seccion titulo="2. Qué datos guardamos">
        <ul className="list-disc pl-5 space-y-1">
          <li>Datos de identificación y contacto: nombre, DNI, celular y, si lo das, correo electrónico.</li>
          <li>Datos de tu membresía: plan contratado, fecha de alta, estado de la cuota y, si te das de baja, esa condición.</li>
          <li>Pagos: importes, fechas, medio de pago y comprobantes de las cuotas abonadas o anuladas.</li>
          <li>Asistencias: el día y la hora en que registrás tu ingreso en el tótem del gimnasio.</li>
          <li>Entrenamiento: tus rutinas y, si las cargás, las series y pesos de tus sesiones.</li>
          <li>Cuenta de acceso: tu usuario y tu contraseña (guardada de forma irreversible: nadie, ni el gimnasio, puede leerla).</li>
        </ul>
        <p className="mt-2">No pedimos ni guardamos datos de tarjetas, datos de salud ni datos sensibles.</p>
      </Seccion>

      <Seccion titulo="3. Para qué los usamos">
        <ul className="list-disc pl-5 space-y-1">
          <li>Administrar tu membresía, registrar tus cuotas y emitir recordatorios de pago.</li>
          <li>Controlar el ingreso al gimnasio y el cumplimiento de los días de tu plan.</li>
          <li>Darte acceso a tu rutina, a tu historial de pagos y a los avisos del gimnasio.</li>
          <li>Comunicarnos con vos por WhatsApp o correo sobre tu cuota o tu cuenta.</li>
        </ul>
        <p className="mt-2">No vendemos ni cedemos tus datos a terceros con fines comerciales.</p>
      </Seccion>

      <Seccion titulo="4. Quién más puede acceder">
        <p>
          Solo los titulares del gimnasio. Los datos se alojan en servidores de un proveedor de servicios en la nube
          contratado para operar la plataforma, que actúa por cuenta del gimnasio y no puede usarlos para otros fines.
          Cada socio, desde su cuenta, ve únicamente su propia información.
        </p>
      </Seccion>

      <Seccion titulo="5. Cuánto tiempo los guardamos">
        <p>
          Mientras seas socio. Si te das de baja, tus datos pasan a inactivos por si volvés; podés pedir que se
          eliminen. Los registros de pagos se conservan sin tus datos personales durante el plazo que exijan las
          normas contables e impositivas.
        </p>
      </Seccion>

      <Seccion titulo="6. Cómo los protegemos">
        <p>
          La conexión está cifrada, las contraseñas se guardan cifradas de forma irreversible, la primera clave que
          te entrega el gimnasio debe cambiarse en tu primer ingreso, y cada acción sobre cobros queda registrada
          con el titular que la realizó. Se hacen copias de seguridad periódicas.
        </p>
      </Seccion>

      <Seccion titulo="7. Tus derechos">
        <p>
          Podés pedir en cualquier momento <strong>acceder</strong> a tus datos, <strong>rectificarlos</strong>,
          <strong> actualizarlos</strong> o <strong>suprimirlos</strong>, escribiendo a{' '}
          <strong>{d.contactoPrivacidad || 'recepción del gimnasio'}</strong> o pidiéndolo en recepción. Respondemos
          los pedidos de acceso dentro de los 10 días corridos y los de rectificación o supresión dentro de los 5
          días hábiles, como establece la Ley 25.326.
        </p>
        <p className="mt-3 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
          El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma
          gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto
          conforme lo establecido en el artículo 14, inciso 3 de la Ley Nº 25.326. La AGENCIA DE ACCESO A LA
          INFORMACIÓN PÚBLICA, Órgano de Control de la Ley Nº 25.326, tiene la atribución de atender las denuncias y
          reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas
          vigentes en materia de protección de datos personales.
        </p>
      </Seccion>

      <Seccion titulo="8. Cambios en esta política">
        <p>
          Si cambia la forma en que tratamos tus datos, vamos a actualizar esta página y la fecha de arriba.
        </p>
      </Seccion>
    </main>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="text-base font-bold text-white">{titulo}</h2>
      <div className="mt-2 text-sm text-slate-300">{children}</div>
    </section>
  )
}
