/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
    // Celulares con navegador viejo (Chrome < 99, Safari < 15.4, Samsung Internet viejo) no entienden
    // las capas @layer que genera Tailwind 4 y descartan TODO el CSS: la app se ve desarmada.
    // Este plugin las convierte en CSS clásico con el mismo orden de prioridad.
    '@csstools/postcss-cascade-layers': {},
  },
}

export default config
