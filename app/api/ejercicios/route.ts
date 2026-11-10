// app/api/ejercicios/route.ts
import { NextResponse } from 'next/server'
import { CATALOGO_EJERCICIOS_GIF } from '@/lib/catalogo-ejercicios'

const TOTALES_POR_GRUPO: Record<string, number> = {
  Pecho: 0,
  Espalda: 0,
  Piernas: 0,
  Hombros: 0,
  Brazos: 0,
  Core: 0,
}
for (const e of CATALOGO_EJERCICIOS_GIF) {
  if (TOTALES_POR_GRUPO[e.grupoMuscular] !== undefined) {
    TOTALES_POR_GRUPO[e.grupoMuscular]++
  }
}

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const resumen = searchParams.get('resumen') === 'true'

  if (resumen) {
    return NextResponse.json(
      {
        totales: TOTALES_POR_GRUPO,
        total: CATALOGO_EJERCICIOS_GIF.length,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        },
      }
    )
  }

  const grupo = searchParams.get('grupo')
  const q = searchParams.get('q')
  const limitParam = searchParams.get('limit')
  const limit = limitParam ? parseInt(limitParam, 10) : 50

  let resultados = [...CATALOGO_EJERCICIOS_GIF]

  if (grupo && grupo.toUpperCase() !== 'TODOS') {
    resultados = resultados.filter(
      (e) => e.grupoMuscular.toLowerCase() === grupo.toLowerCase()
    )
  }

  // Cada palabra tiene que aparecer en algún campo, sin importar el orden ni los acentos:
  // "press banca" encuentra "Press de Banca Plano con Barra" y "triceps" encuentra "Tríceps".
  const palabras = normalizar(q ?? '').split(/\s+/).filter(Boolean)
  if (palabras.length > 0) {
    resultados = resultados.filter((e) => {
      const texto = normalizar(
        [
          e.titulo,
          e.nombreIngles,
          e.descripcion,
          e.grupoMuscular,
          ...e.musculosPrincipales,
          ...(e.musculosSecundarios ?? []),
        ]
          .filter(Boolean)
          .join(' ')
      )
      return palabras.every((p) => texto.includes(p))
    })
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
