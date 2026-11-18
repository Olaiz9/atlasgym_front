import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ATLAS GYM',
    short_name: 'ATLAS',
    description: 'Plataforma de entrenamiento y gestión ATLAS GYM.',
    start_url: '/',
    display: 'standalone',
    lang: 'es',
    background_color: '#172554',
    theme_color: '#172554',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
