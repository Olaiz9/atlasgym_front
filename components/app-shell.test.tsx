import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppShell } from "./app-shell";

let usuarioActualMock: {
  id: string;
  nombre: string;
  rol: "ADMIN" | "ALUMNO";
  requiereCambioPassword?: boolean;
} | null = null;

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/components/sidebar", () => ({
  Sidebar: () => <div data-testid="sidebar" />,
}));

vi.mock("@/components/mobile-nav", () => ({
  MobileNav: () => <div data-testid="mobile-nav" />,
}));

vi.mock("@/components/aviso-totem", () => ({
  AvisoTotemSinSenal: () => <div data-testid="aviso-totem" />,
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/store", () => ({
  useAppData: () => ({
    usuarioActual: usuarioActualMock,
    ultimoErrorSync: null,
    datosListos: true,
    limpiarErrorSync: vi.fn(),
    guardarPerfilUsuario: vi.fn(),
    cerrarSesion: vi.fn(),
  }),
}));

describe("AppShell — Cambio de clave provisoria obligatorio", () => {
  beforeEach(() => {
    usuarioActualMock = null;
  });

  it("muestra el texto de la instalación para un ADMIN con requiereCambioPassword", () => {
    usuarioActualMock = {
      id: "admin-1",
      nombre: "Titular",
      rol: "ADMIN",
      requiereCambioPassword: true,
    };

    render(
      <AppShell>
        <div>Contenido</div>
      </AppShell>
    );

    expect(
      screen.getByText(
        "Estás ingresando con la contraseña provisoria de la instalación. Definí una clave personal antes de continuar."
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/la que te pasó el gimnasio, o tu DNI si te cargaron desde la planilla/)
    ).not.toBeInTheDocument();
  });

  it("muestra el texto de socio para un ALUMNO con requiereCambioPassword", () => {
    usuarioActualMock = {
      id: "alumno-1",
      nombre: "Socio",
      rol: "ALUMNO",
      requiereCambioPassword: true,
    };

    render(
      <AppShell>
        <div>Contenido</div>
      </AppShell>
    );

    expect(
      screen.getByText(
        "Estás ingresando con tu contraseña provisoria (la que te pasó el gimnasio, o tu DNI si te cargaron desde la planilla). Por privacidad de tu cuenta y tus rutinas, definí una clave personal antes de continuar."
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/contraseña provisoria de la instalación/)
    ).not.toBeInTheDocument();
  });
});
