import { expect, type APIRequestContext, type Page } from '@playwright/test'

/**
 * Datos y atajos compartidos por los tests E2E.
 * Los valores por defecto coinciden con scripts/e2e-local.ps1 y con el CI; solo sirven
 * para la base de pruebas descartable, nunca para produccion.
 */
export const E2E = {
  backend: process.env.E2E_BACKEND_URL ?? 'http://127.0.0.1:8080',
  titular: {
    email: process.env.E2E_ADMIN_EMAIL ?? 'titular1@e2e.local',
    password: process.env.E2E_ADMIN_PASSWORD ?? 'E2eTitular1!',
    nombre: process.env.E2E_ADMIN_NOMBRE ?? 'Titular E2E',
  },
  totemSecret: process.env.E2E_TOTEM_SECRET ?? 'secreto-totem-e2e',
  totemPin: process.env.NEXT_PUBLIC_TOTEM_PIN ?? '1234',
}

/** Sufijo unico por corrida, para que los nombres y DNIs no choquen entre tests. */
export function unico(): string {
  return `${Date.now()}`.slice(-6)
}

/**
 * Sufijo unico SOLO con letras: el formulario de alta filtra los numeros del nombre
 * (soloLetras), asi que "Socio 123" se guardaria como "Socio ".
 */
export function letrasUnicas(): string {
  return unico().replace(/\d/g, (d) => 'bcdfghjkmn'[Number(d)])
}

/** "31000" -> "31.000", como lo muestra la app (toLocaleString es-AR). */
export function pesos(monto: number): string {
  return monto.toLocaleString('es-AR')
}

/** DNI de 8 digitos distinto en cada llamada. */
export function dniUnico(): string {
  return `4${Date.now()}`.slice(-8)
}

export async function iniciarSesion(page: Page, usuario = E2E.titular.email, clave = E2E.titular.password) {
  await page.goto('/login')
  await page.getByPlaceholder('Ingresá tu usuario, DNI o correo').fill(usuario)
  await page.getByPlaceholder('••••••••').fill(clave)
  await page.locator('button[type="submit"]').click()
}

export async function iniciarSesionTitular(page: Page) {
  await iniciarSesion(page)
  await expect(page).not.toHaveURL(/\/login/)
}

// ---------- Preparacion de datos directo contra la API (mas rapido que por pantalla) ----------

export class ApiAtlas {
  private constructor(private request: APIRequestContext, private token: string) {}

  static async comoTitular(request: APIRequestContext): Promise<ApiAtlas> {
    const res = await request.post(`${E2E.backend}/api/auth/login`, {
      data: { email: E2E.titular.email, password: E2E.titular.password },
    })
    expect(res.ok(), `login del titular por API (${res.status()})`).toBeTruthy()
    return new ApiAtlas(request, (await res.json()).token)
  }

  private async llamar(metodo: 'get' | 'post' | 'put' | 'delete', ruta: string, data?: unknown) {
    const res = await this.request[metodo](`${E2E.backend}/api${ruta}`, {
      headers: { Authorization: `Bearer ${this.token}` },
      data,
    })
    expect(res.ok(), `${metodo.toUpperCase()} ${ruta} -> ${res.status()} ${await res.text()}`).toBeTruthy()
    return res.status() === 204 ? null : res.json()
  }

  estadoTotem() {
    return this.llamar('get', '/asistencias/totem/estado')
  }

  crearPlan(nombre: string, precio: number, diasPorSemana = '3') {
    return this.llamar('post', '/planes', { nombre, precio, diaPorSemana: diasPorSemana })
  }

  buscarPlan(id: number) {
    return this.llamar('get', `/planes/${id}`)
  }

  crearRutina(nombre: string) {
    return this.llamar('post', '/rutinas', {
      nombre,
      descripcion: '',
      objetivo: 'HIPERTROFIA',
      esGenerica: true,
      dias: [
        {
          nombre: 'Día 1',
          orden: 1,
          ejercicios: [
            { nombreEjercicio: 'Sentadilla', serie: 3, repeticiones: '10', descansoSegundos: '90', orden: 1, tipoSerie: 'NORMAL' },
          ],
          videoIds: [],
        },
      ],
    })
  }

  buscarRutina(id: number) {
    return this.llamar('get', `/rutinas/${id}`)
  }

  crearAlumno(nombre: string, dni: string, planId: number) {
    return this.llamar('post', '/alumnos', { nombre, dni, planId })
  }

  buscarAlumno(id: number) {
    return this.llamar('get', `/alumnos/${id}`)
  }

  registrarPago(alumnoId: number, planId: number, monto: number, metodo = 'EFECTIVO') {
    const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })
    return this.llamar('post', '/pagos', {
      alumnoId,
      planId,
      monto,
      metodo,
      periodoMes: hoy.slice(0, 7),
      fecha: hoy,
      estado: 'PAGADO',
      cantidadMeses: 1,
    })
  }

  async alumnoPorDni(dni: string): Promise<{ id: number; nombre: string; activo: boolean } | undefined> {
    const activos = await this.llamar('get', '/alumnos')
    const inactivos = await this.llamar('get', '/alumnos/inactivos')
    return [...activos, ...inactivos].find((a: { dni: string }) => a.dni === dni)
  }

  alumnosInactivos() {
    return this.llamar('get', '/alumnos/inactivos')
  }

  pagosDeAlumno(alumnoId: number) {
    return this.llamar('get', `/pagos/alumno/${alumnoId}`)
  }

  buscarPago(id: number) {
    return this.llamar('get', `/pagos/${id}`)
  }

  asistenciasDeHoy() {
    const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })
    return this.llamar('get', `/asistencias?fecha=${hoy}`)
  }
}
