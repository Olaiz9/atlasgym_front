import { Button } from '@/components/ui/button'
import { Search, MoreHorizontal, Plus, Users } from 'lucide-react'

// Datos de prueba para la tabla
const alumnos = [
  { id: 1, nombre: 'Sofia Martinez', email: 'sofia@ejemplo.com', dni: '38.456.789', plan: 'Full', estado: 'Activo' },
  { id: 2, nombre: 'Liam Chen', email: 'liam@ejemplo.com', dni: '40.123.456', plan: 'Élite', estado: 'Activo' },
  { id: 3, nombre: 'Amelia Ross', email: 'amelia@ejemplo.com', dni: '41.987.654', plan: 'Flex', estado: 'Inactivo' },
  { id: 4, nombre: 'Noah Williams', email: 'noah@ejemplo.com', dni: '39.654.321', plan: 'Full', estado: 'Activo' },
]

export default function AlumnosPage() {
  return (
    <div className="p-5 md:p-8 max-w-[1500px] mx-auto">
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
            <Users className="size-8 text-primary" />
            Gestión de Alumnos
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Administrá las inscripciones, planes y datos personales de tus clientes.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar alumno..."
              className="h-10 w-full md:w-64 rounded-md border border-input bg-background pl-10 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <Button className="glow-violet gap-2">
            <Plus className="size-4" /> Nuevo
          </Button>
        </div>
      </header>

      <section className="rounded-md border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground border-b border-border">
              <tr>
                <th className="px-5 py-4 font-medium">Nombre Completo</th>
                <th className="px-5 py-4 font-medium">DNI</th>
                <th className="px-5 py-4 font-medium">Plan</th>
                <th className="px-5 py-4 font-medium">Estado</th>
                <th className="px-5 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {alumnos.map((alumno) => (
                <tr key={alumno.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-medium">{alumno.nombre}</p>
                    <p className="text-xs text-muted-foreground">{alumno.email}</p>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{alumno.dni}</td>
                  <td className="px-5 py-4 font-medium">{alumno.plan}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold ${alumno.estado === 'Activo' ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive'}`}>
                      {alumno.estado}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button className="text-muted-foreground hover:text-primary transition-colors p-2" aria-label="Opciones">
                      <MoreHorizontal className="size-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}