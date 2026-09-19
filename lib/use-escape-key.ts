// lib/use-escape-key.ts
"use client";

import { useEffect, useRef } from "react";

type EscapeHandler = () => void;
const escapeStack: EscapeHandler[] = [];
let isGlobalListenerAttached = false;

function handleGlobalKeyDown(e: KeyboardEvent) {
  if (e.key === "Escape" && escapeStack.length > 0) {
    e.preventDefault();
    e.stopPropagation();
    // Ejecuta ÚNICAMENTE el modal al tope de la pila (el más recientemente abierto)
    const topHandler = escapeStack[escapeStack.length - 1];
    if (topHandler) {
      topHandler();
    }
  }
}

/**
 * Escucha la tecla Escape y ejecuta el callback correspondiente cuando está activo.
 * Implementa una estructura de pila (LIFO): si se abren múltiples modales superpuestos,
 * solo el modal superior responde al Escape sin cerrar la vista subyacente (Auditoría A6).
 */
export function useEscapeKey(onEscape: () => void, activo: boolean = true) {
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!activo) return;

    const handler: EscapeHandler = () => {
      onEscapeRef.current();
    };

    escapeStack.push(handler);

    if (!isGlobalListenerAttached && typeof window !== "undefined") {
      window.addEventListener("keydown", handleGlobalKeyDown);
      isGlobalListenerAttached = true;
    }

    return () => {
      const idx = escapeStack.lastIndexOf(handler);
      if (idx !== -1) {
        escapeStack.splice(idx, 1);
      }
      if (escapeStack.length === 0 && isGlobalListenerAttached && typeof window !== "undefined") {
        window.removeEventListener("keydown", handleGlobalKeyDown);
        isGlobalListenerAttached = false;
      }
    };
  }, [activo]);
}

/**
 * Exportaciones auxiliares para testing automatizado
 */
export const _escapeStackForTesting = {
  get length() {
    return escapeStack.length;
  },
  dispatch() {
    if (escapeStack.length > 0) {
      escapeStack[escapeStack.length - 1]();
    }
  },
  clear() {
    escapeStack.length = 0;
  },
};

