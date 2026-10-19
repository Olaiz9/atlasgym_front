import { useState, useEffect, useCallback } from "react";
import { Aviso, UsuarioSesion } from "./types";
import { AVISOS_MOCK } from "./mock-data";
import {
  apiCrearAviso,
  apiEliminarAviso,
  apiMarcarAvisoLeido,
  getStoredJwtToken,
  isApiRuntimeEnabled,
} from "./api-client";
import {
  mapAvisoDtoToFront,
  mapAvisoFrontToRequestDto,
  parseNumericId,
} from "./api-mappers";

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
    const tempId = crypto.randomUUID();
    const nuevo: Aviso = {
      ...aviso,
      id: tempId,
      leidoPor: [],
    };
    setAvisos((prev) => [nuevo, ...prev]);

    if (isApiRuntimeEnabled() && getStoredJwtToken()) {
      apiCrearAviso(mapAvisoFrontToRequestDto(aviso))
        .then((creadoDto) => {
          const mapeado = mapAvisoDtoToFront(creadoDto);
          setAvisos((prev) =>
            prev.map((av) => (av.id === tempId ? mapeado : av))
          );
        })
        .catch(() => {});
    }

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

    const numId = parseNumericId(avisoId);
    if (numId != null && isApiRuntimeEnabled() && getStoredJwtToken()) {
      apiMarcarAvisoLeido(numId).catch(() => {});
    }
  }, []);

  const eliminarAviso = useCallback((avisoId: string) => {
    setAvisos((prev) => prev.filter((av) => av.id !== avisoId));

    const numId = parseNumericId(avisoId);
    if (numId != null && isApiRuntimeEnabled() && getStoredJwtToken()) {
      apiEliminarAviso(numId).catch(() => {});
    }
  }, []);

  const getAvisosParaUsuario = useCallback(
    (usuario: UsuarioSesion | null) => {
      if (!usuario) return [];
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
    (usuario: UsuarioSesion | null) => {
      if (!usuario) return 0;
      const aplicables = getAvisosParaUsuario(usuario);
      return aplicables.filter((av) => !av.leidoPor.includes(usuario.id)).length;
    },
    [getAvisosParaUsuario]
  );

  const marcarTodosAvisosLeidos = useCallback((usuarioId: string) => {
    setAvisos((prev) => {
      const hayNoLeidos = prev.some((av) => !av.leidoPor.includes(usuarioId));
      if (!hayNoLeidos) return prev;
      return prev.map((av) => {
        if (!av.leidoPor.includes(usuarioId)) {
          const numId = parseNumericId(av.id);
          if (numId != null && isApiRuntimeEnabled() && getStoredJwtToken()) {
            apiMarcarAvisoLeido(numId).catch(() => {});
          }
          return { ...av, leidoPor: [...av.leidoPor, usuarioId] };
        }
        return av;
      });
    });
  }, []);

  return {
    avisos,
    setAvisos,
    crearAviso,
    marcarAvisoLeido,
    marcarTodosAvisosLeidos,
    eliminarAviso,
    getAvisosParaUsuario,
    getCantidadAvisosNoLeidos,
  };
}
