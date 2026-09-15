// lib/use-debounce.ts
"use client";

import { useState, useEffect } from "react";

/**
 * Retrasa la actualizacion de un valor hasta que haya pasado delay ms desde el ultimo cambio.
 * Ideal para inputs de busqueda y filtros.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
