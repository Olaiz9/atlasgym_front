import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import TotemPage from "./page";

const pushMock = vi.fn();
const cerrarSesionMock = vi.fn();
let usuarioActualMock: {
  id: string;
  nombre: string;
  rol: "ADMIN" | "ALUMNO";
} | null = null;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}));

vi.mock("next/image", () => ({
  default: ({ priority: _priority, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => (
    <img {...props} alt={props.alt || ""} />
  ),
}));

vi.mock("@/lib/store", () => ({
  useAppData: () => ({
    registrarAsistenciaPorDni: vi.fn(),
    usuarioActual: usuarioActualMock,
    cerrarSesion: cerrarSesionMock,
  }),
}));

vi.mock("@/lib/api-client", () => ({
  API_BASE_URL: "/backend-api",
  apiCheckInTotem: vi.fn(),
  apiSyncTotemOutbox: vi.fn(),
  apiTotemLatido: vi.fn().mockResolvedValue({ ok: true }),
  esErrorDeRed: () => false,
  esFallbackOfflineDemoPermitido: () => false,
  getStoredTotemSecret: () => "",
  isApiRuntimeEnabled: () => false,
  setStoredTotemSecret: vi.fn(),
}));

vi.mock("@/lib/totem-offline", () => ({
  encolarEventoOutboxTotem: vi.fn(),
  guardarPadronCacheTotem: vi.fn(),
  leerOutboxTotem: () => [],
  leerPadronCacheTotem: () => [],
  removerEventosSincronizadosOutbox: vi.fn(),
  resolverCheckInOfflineConPadron: vi.fn(),
  verificarClaveTerminal: vi.fn(),
}));

describe("TotemPage — Cierre de sesión en modo kiosco", () => {
  beforeEach(() => {
    usuarioActualMock = null;
    cerrarSesionMock.mockClear();
    pushMock.mockClear();
    localStorage.clear();
  });

  it("cierra automáticamente la sesión de ADMIN si la tablet ya está vinculada al abrir /totem", async () => {
    localStorage.setItem("atlas_totem_terminal_autorizada", "true");
    usuarioActualMock = {
      id: "admin-1",
      nombre: "Titular",
      rol: "ADMIN",
    };

    render(<TotemPage />);

    await waitFor(() => {
      expect(cerrarSesionMock).toHaveBeenCalledTimes(1);
    });
  });

  it("no cierra la sesión de ADMIN si la tablet todavía no está vinculada como tótem", async () => {
    usuarioActualMock = {
      id: "admin-1",
      nombre: "Titular",
      rol: "ADMIN",
    };

    render(<TotemPage />);

    await waitFor(() => {
      expect(cerrarSesionMock).not.toHaveBeenCalled();
    });
  });
});
