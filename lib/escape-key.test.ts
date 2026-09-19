import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useEscapeKey, _escapeStackForTesting } from "./use-escape-key";

describe("[Auditoría A6] Pila de Modales para Tecla Escape", () => {
  beforeEach(() => {
    _escapeStackForTesting.clear();
  });

  it("despacha únicamente el modal superior en la pila cuando hay modales anidados", () => {
    const cerrarModalRutina = vi.fn();
    const cerrarBuscadorEjercicios = vi.fn();

    // 1. Abre el modal de edición de rutina
    const hookRutina = renderHook(() => useEscapeKey(cerrarModalRutina, true));
    expect(_escapeStackForTesting.length).toBe(1);

    // 2. Encima, abre el buscador de ejercicios
    const hookBuscador = renderHook(() => useEscapeKey(cerrarBuscadorEjercicios, true));
    expect(_escapeStackForTesting.length).toBe(2);

    // 3. El usuario presiona Escape
    _escapeStackForTesting.dispatch();

    // Debe cerrarse SOLO el buscador superior, no la rutina
    expect(cerrarBuscadorEjercicios).toHaveBeenCalledTimes(1);
    expect(cerrarModalRutina).not.toHaveBeenCalled();

    // 4. El buscador se desmonta al cerrarse
    hookBuscador.unmount();
    expect(_escapeStackForTesting.length).toBe(1);

    // 5. El usuario presiona Escape nuevamente
    _escapeStackForTesting.dispatch();

    // Ahora sí responde el modal subyacente de la rutina
    expect(cerrarModalRutina).toHaveBeenCalledTimes(1);

    hookRutina.unmount();
    expect(_escapeStackForTesting.length).toBe(0);
  });

  it("no registra callbacks si el modal no está activo", () => {
    const fn = vi.fn();
    const { unmount } = renderHook(() => useEscapeKey(fn, false));
    expect(_escapeStackForTesting.length).toBe(0);
    _escapeStackForTesting.dispatch();
    expect(fn).not.toHaveBeenCalled();
    unmount();
  });
});

