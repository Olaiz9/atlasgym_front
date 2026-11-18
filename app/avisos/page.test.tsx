// @vitest-environment jsdom
import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mapAvisoDtoToFront, type BackendAvisoDto } from "@/lib/api-mappers";
import type { UsuarioSesion } from "@/lib/types";
import { useAvisosManager } from "@/lib/use-avisos";
import AvisosPage from "./page";

const usuario: UsuarioSesion = { id: "7", nombre: "Socio", email: "socio@example.com", rol: "ALUMNO", alumnoId: "3" };

let store: ReturnType<typeof useAvisosManager>;

vi.mock("@/lib/store", () => ({
  useAppData: () => ({ ...store, usuarioActual: usuario, alumnos: [] }),
}));

function Pantalla() {
  store = useAvisosManager();
  return <AvisosPage />;
}

const avisoDelServidor = (id: number) =>
  mapAvisoDtoToFront(
    { id, titulo: `Aviso ${id}`, mensaje: "Mensaje", categoria: "NOVEDAD", fecha: "2026-11-18", paraTodos: true, leido: false } as BackendAvisoDto,
    usuario.id
  );

describe("AvisosPage: marcar leídos", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("atlas_backend_synced_v1", "1");
    localStorage.setItem("atlas_avisos_v2", JSON.stringify([avisoDelServidor(1)]));
  });

  it("marca los avisos al entrar", () => {
    render(<Pantalla />);
    expect(store.getCantidadAvisosNoLeidos(usuario)).toBe(0);
  });

  it("no vuelve a mostrar sin leer un aviso si llega una respuesta anterior del servidor", () => {
    render(<Pantalla />);
    act(() => store.setAvisos([avisoDelServidor(1)]));
    expect(store.getCantidadAvisosNoLeidos(usuario)).toBe(0);
  });

  it("marca un aviso nuevo que llega con la pantalla abierta", () => {
    render(<Pantalla />);
    act(() => store.setAvisos([avisoDelServidor(2), avisoDelServidor(1)]));
    expect(store.getCantidadAvisosNoLeidos(usuario)).toBe(0);
  });
});
