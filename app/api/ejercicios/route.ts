// app/api/ejercicios/route.ts
import { NextResponse } from 'next/server'
import { CATALOGO_EJERCICIOS_GIF } from '@/lib/catalogo-ejercicios'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const grupo = searchParams.get('grupo')
  const q = searchParams.get('q')?.toLowerCase()
  const limitParam = searchParams.get('limit')
  const limit = limitParam ? parseInt(limitParam, 10) : 50

  let resultados = [...CATALOGO_EJERCICIOS_GIF]

  if (grupo && grupo.toUpperCase() !== 'TODOS') {
    resultados = resultados.filter(
      (e) => e.grupoMuscular.toLowerCase() === grupo.toLowerCase()
    )
  }

  if (q) {
    resultados = resultados.filter(
      (e) =>
        e.titulo.toLowerCase().includes(q) ||
        (e.nombreIngles && e.nombreIngles.toLowerCase().includes(q)) ||
        (e.descripcion && e.descripcion.toLowerCase().includes(q)) ||
        e.grupoMuscular.toLowerCase().includes(q) ||
        e.musculosPrincipales.some((m) => m.toLowerCase().includes(q)) ||
        (e.musculosSecundarios && e.musculosSecundarios.some((m) => m.toLowerCase().includes(q)))
    )
  }

  const offsetParam = searchParams.get('offset')
  const offset = offsetParam ? Math.max(0, parseInt(offsetParam, 10)) : 0

  return NextResponse.json(
    {
      total: resultados.length,
      offset,
      limit,
      hasMore: offset + limit < resultados.length,
      ejercicios: resultados.slice(offset, offset + limit),
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    }
  )
}
