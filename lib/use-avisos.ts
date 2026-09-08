import { useState, useEffect, useCallback } from "react";
import { Aviso, UsuarioSesion } from "./types";
import { AVISOS_MOCK } from "./mock-data";

export function useAvisosManager() {
  const [avisos, setAvisos] = useState<Aviso[]>(() => {
    if (typeof window !== "undefined") {
      const guardado = localStorage.getItem("atlas_avisos_v2");
      if (guardado) {
        try {
          return JSON.parse(guardado);
        } catch {}
      }
    }
    return AVISOS_MOCK;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("atlas_avisos_v2", JSON.stringify(avisos));
      } catch {}
    }
  }, [avisos]);

  const crearAviso = useCallback((aviso: Omit<Aviso, "id" | "leidoPor">) => {
    const nuevo: Aviso = {
      ...aviso,
      id: crypto.randomUUID(),
      leidoPor: [],
    };
    setAvisos((prev) => [nuevo, ...prev]);
    return nuevo;
  }, []);

  const marcarAvisoLeido = useCallback((avisoId: string, usuarioId: string) => {
    setAvisos((prev) =>
      prev.map((av) => {
        if (av.id === avisoId && !av.leidoPor.includes(usuarioId)) {
          return { ...av, leidoPor: [...av.leidoPor, usuarioId] };
        }
        return av;
      })
    );
  }, []);

  const eliminarAviso = useCallback((avisoId: string) => {
    setAvisos((prev) => prev.filter((av) => av.id !== avisoId));
  }, []);

  const getAvisosParaUsuario = useCallback(
    (usuario: UsuarioSesion) => {
      if (usuario.rol === "ADMIN") {
        return avisos;
      }
      return avisos.filter(
        (av) => av.paraTodos || (usuario.alumnoId && av.alumnoId === usuario.alumnoId)
      );
    },
    [avisos]
  );

  const getCantidadAvisosNoLeidos = useCallback(
    (usuario: UsuarioSesion) => {
      const aplicables = getAvisosParaUsuario(usuario);
      return aplicables.filter((av) => !av.leidoPor.includes(usuario.id)).length;
    },
    [getAvisosParaUsuario]
  );

  const marcarTodosAvisosLeidos = useCallback((usuarioId: string) => {
    setAvisos((prev) =>
      prev.map((av) => {
        if (!av.leidoPor.includes(usuarioId)) {
          return { ...av, leidoPor: [...av.leidoPor, usuarioId] };
        }
        return av;
      })
    );
  }, []);

  return {
    avisos,
    crearAviso,
    marcarAvisoLeido,
    marcarTodosAvisosLeidos,
    eliminarAviso,
    getAvisosParaUsuario,
    getCantidadAvisosNoLeidos,
  };
}
