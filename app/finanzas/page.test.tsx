import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import FinanzasPage from "./page";

const replaceMock = vi.fn();
let searchParamsActual = new URLSearchParams();
let alumnosActuales: Array<{ id: string; nombre: string; dni: string; plan: string; planId?: string; activo: boolean; fechaAlta: string }> = [];

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  useSearchParams: () => searchParamsActual,
}));

vi.mock("@/lib/store", () => ({
  useAppData: () => ({
    alumnos: alumnosActuales, planes: [{ id: "1", nombre: "Mensual", precio: 20000, activo: true }],
    pagos: [{ id: "7", alumnoId: "2", alumnoNombreHistorico: "Socio historico",
      alumnoActivo: false, plan: "Mensual", monto: 20000, fecha: "2026-06-05",
      periodoMes: "2026-06", metodo: "Efectivo", estado: "PAGADO" }],
    getAlumno: () => undefined,
    getEstadoCuenta: () => "PENDIENTE",
    usuarioActual: { id: "admin", nombre: "Admin", rol: "ADMIN" },
    agregarPago: vi.fn(), actualizarEstadoPago: vi.fn(), eliminarPago: vi.fn(),
    asignarCredencialesAlumno: vi.fn(),
    datosCobro: { alias: "", titular: "" }, guardarDatosCobro: vi.fn(),
  }),
}));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

describe("Finanzas del administrador", () => {
  beforeEach(() => {
    replaceMock.mockClear();
    searchParamsActual = new URLSearchParams();
    alumnosActuales = [];
  });

  it("muestra el pago historico y su baja aunque la ficha no este en el listado", () => {
    render(<FinanzasPage />);
    fireEvent.click(screen.getByRole("button", { name: "Ver todos" }));
    const fila = screen.getByText("Socio historico").closest("tr")!;
    expect(within(fila).getByText("Alumno dado de baja")).toBeInTheDocument();
    expect(within(fila).getByText("$20.000")).toBeInTheDocument();
    expect(within(fila).getByRole("combobox")).toHaveValue("PAGADO");
    expect(screen.getByText("Ingresos netos totales")).toBeInTheDocument();
  });

  it("sin alias cargado, el formulario no sugiere un alias que parezca real", () => {
    render(<FinanzasPage />);
    fireEvent.click(screen.getByRole("button", { name: /Cargar alias/ }));
    const input = screen.getByLabelText("Alias de transferencia") as HTMLInputElement;
    expect(input.value).toBe("");
    // Un ejemplo con forma de alias (palabra.palabra) se confunde con el alias vigente.
    expect(input.placeholder).not.toMatch(/\w+\.\w+/);
  });

  it("entrar con ?cobrar=99999999 (DNI inexistente) no abre el modal de cobro ni rompe", () => {
    searchParamsActual = new URLSearchParams("cobrar=99999999");
    alumnosActuales = [{ id: "10", nombre: "Socio Existente", dni: "30111222", plan: "Mensual", planId: "1", activo: true, fechaAlta: "2026-11-01" }];
    render(<FinanzasPage />);
    expect(screen.queryByRole("button", { name: "Guardar pago" })).not.toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("entrar con ?cobrar=<dni> existente abre el modal de cobro con ese socio preseleccionado y limpia la URL", () => {
    searchParamsActual = new URLSearchParams("cobrar=30222333");
    alumnosActuales = [
      { id: "10", nombre: "Primer Socio", dni: "30111222", plan: "Mensual", planId: "1", activo: true, fechaAlta: "2026-11-01" },
      { id: "11", nombre: "Socio Recien Creado", dni: "30222333", plan: "Mensual", planId: "1", activo: true, fechaAlta: "2026-11-01" },
    ];
    render(<FinanzasPage />);
    const selectAlumno = screen.getByRole("listbox", { name: "Alumno" }) as HTMLSelectElement;
    expect(selectAlumno.value).toBe("11");
    expect(replaceMock).toHaveBeenCalledWith("/finanzas", { scroll: false });
  });
});
