import Link from 'next/link'

export default function PaginaNoEncontrada() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 text-slate-200 leading-relaxed">
      <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-5 py-6">
        <h1 className="text-2xl font-black text-white">No encontramos esta página</h1>
        <p className="mt-2 text-sm text-slate-300">
          Puede que el link esté mal o que la página ya no exista.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex h-9 items-center rounded-xl bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-500"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
