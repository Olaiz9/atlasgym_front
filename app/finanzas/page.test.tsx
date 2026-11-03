import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import FinanzasPage from "./page";

vi.mock("@/lib/store", () => ({
  useAppData: () => ({
    alumnos: [], planes: [],
    pagos: [{ id: "7", alumnoId: "2", alumnoNombreHistorico: "Socio historico",
      alumnoActivo: false, plan: "Mensual", monto: 20000, fecha: "2026-06-05",
      periodoMes: "2026-06", metodo: "Efectivo", estado: "PAGADO" }],
    getAlumno: () => undefined,
    usuarioActual: { id: "admin", nombre: "Admin", rol: "ADMIN" },
    agregarPago: vi.fn(), actualizarEstadoPago: vi.fn(), eliminarPago: vi.fn(),
    asignarCredencialesAlumno: vi.fn(),
    datosCobro: { alias: "", titular: "" }, guardarDatosCobro: vi.fn(),
  }),
}));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

describe("Finanzas del administrador", () => {
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
});