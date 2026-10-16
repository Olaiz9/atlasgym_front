// lib/use-escape-key.ts
"use client";

import { useEffect } from "react";

/**
 * Escucha la tecla Escape y ejecuta el callback correspondiente cuando esta activo.
 */
export function useEscapeKey(onEscape: () => void, activo: boolean = true) {
  useEffect(() => {
    if (!activo) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onEscape();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onEscape, activo]);
}
