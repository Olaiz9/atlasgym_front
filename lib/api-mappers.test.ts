import { describe, it, expect } from "vitest";
import {
  mapAlumnoDtoToFront,
  mapAlumnoFrontToRequestDto,
  mapAsistenciaDtoToFront,
  mapAvisoDtoToFront,
  mapLoginResponseToUsuarioSesion,
  mapObjetivoToBack,
  mapObjetivoToFront,
  mapPagoDtoToFront,
  mapPagoFrontToRequestDto,
  mapPlanDtoToFront,
  mapRutinaDtoToFront,
  mapRutinaFrontToRequestDto,
  mapSesionDtoToFront,
  mapVideoDtoToFront,
} from "./api-mappers";

describe("API Mappers (Spring Boot DTO <-> Frontend Model)", () => {
  it("convierte LoginResponse de ADMIN y ALUMNO a UsuarioSesion con IDs string", () => {
    const admin = mapLoginResponseToUsuarioSesion({
      token: "jwt-123",
      id: 1,
      nombre: "admin@atlasgym.com",
      email: "admin@atlasgym.com",
      rol: "ADMIN",
      alumnoId: null,
      fotoUrl: null,
    });
    expect(admin.id).toBe("1");
    expect(admin.nombre).toBe("Julián Pérez");
    expect(admin.rol).toBe("ADMIN");

    const alumno = mapLoginResponseToUsuarioSesion({
      token: "jwt-456",
      id: 3,
      nombre: "Lucía Fernández",
      email: "lucia.fernandez@mail.com",
      rol: "ALUMNO",
      alumnoId: 2,
      fotoUrl: null,
    });
    expect(alumno.id).toBe("3");
    expect(alumno.alumnoId).toBe("2");
  });

  it("mapea AlumnoResponseDto incluyendo ultimaAsistencia y rutinaId", () => {
    const front = mapAlumnoDtoToFront({
      id: 2,
      nombre: "Lucía Fernández",
      dni: "39482910",
      email: "lucia.fernandez@mail.com",
      celular: "+54 9 11 5544-3322",
      planId: 2,
      planNombre: "Plan Full Pass",
      fechaAlta: "2026-09-12",
      ultimaAsistencia: "2026-10-12",
      activo: true,
      estadoCuenta: "AL_DIA",
      rutinaId: 1,
      rutinaNombre: "Rutina Hipertrofia A/B",
    });

    expect(front.id).toBe("2");
    expect(front.planId).toBe("2");
    expect(front.plan).toBe("Plan Full Pass");
    expect(front.ultimaAsistencia).toBe("2026-10-12");
    expect(front.tieneRutina).toBe(true);
    expect(front.rutinaId).toBe("1");

    const req = mapAlumnoFrontToRequestDto(front);
    expect(req.planId).toBe(2);
    expect(req.rutinaId).toBe(1);
  });

  it("mapea AsistenciaResponseDto con alumnoDni, planNombre y control de cupo semanal", () => {
    const asist = mapAsistenciaDtoToFront({
      id: 10,
      alumnoId: 2,
      nombreAlumno: "Lucía Fernández",
      alumnoDni: "39482910",
      planNombre: "Plan 3 Días",
      fecha: "2026-10-12",
      hora: "20:52:08",
      metodo: "DNI_TOTEM",
      estadoCuenta: "AL_DIA",
      asistenciasSemana: 4,
      limiteDiasSemana: 3,
      excedeLimiteSemanal: true,
    });

    expect(asist.id).toBe("10");
    expect(asist.alumnoId).toBe("2");
    expect(asist.alumnoNombre).toBe("Lucía Fernández");
    expect(asist.alumnoDni).toBe("39482910");
    expect(asist.planNombre).toBe("Plan 3 Días");
    expect(asist.hora).toBe("20:52");
    expect(asist.estadoCuenta).toBe("AL_DIA");
    expect(asist.asistenciasSemana).toBe(4);
    expect(asist.limiteDiasSemana).toBe(3);
    expect(asist.excedeLimiteSemanal).toBe(true);
  });

  it("mapea Rutina bidireccionalmente conservando tipos de serie (BI_SERIE, DROP_SET)", () => {
    const front = mapRutinaDtoToFront({
      id: 1,
      nombre: "Rutina Hipertrofia A/B",
      descripcion: "Desc",
      objetivo: "HIPERTROFIA",
      esGenerica: true,
      dias: [
        {
          id: 5,
          nombre: "Día 1 - Torso",
          orden: 1,
          ejercicios: [
            {
              id: 11,
              nombreEjercicio: "Press Banca",
              serie: 4,
              repeticiones: "8-10",
              descansoSegundos: "90",
              notas: "RPE 8",
              orden: 1,
              tipoSerie: "DROP_SET",
            },
          ],
        },
      ],
    });

    expect(front.id).toBe("1");
    expect(front.objetivo).toBe("Hipertrofia");
    expect(front.dias[0].ejercicios[0].tipoSerie).toBe("DROP_SET");
    expect(front.dias[0].ejercicios[0].descansoSegundos).toBe(90);

    const backReq = mapRutinaFrontToRequestDto(front);
    expect(backReq.objetivo).toBe("HIPERTROFIA");
    expect(backReq.dias[0].ejercicios[0].tipoSerie).toBe("DROP_SET");
    expect(backReq.dias[0].ejercicios[0].serie).toBe(4);
  });

  it("mapea Pagos (incluyendo alumnoNombreHistorico, fecha, estado y cantidadMeses), Planes, Videoteca, Avisos y Sesiones", () => {
    const pago = mapPagoDtoToFront({
      id: 7,
      alumnoId: 2,
      alumnoNombreHistorico: "Lucía Fernández",
      planNombre: "Plan Full Pass",
      monto: 75000,
      fecha: "2026-10-05",
      metodo: "TRANSFERENCIA",
      estado: "PENDIENTE",
      periodoMes: "2026-10",
      cantidadMeses: 3,
    });
    expect(pago.alumnoNombreHistorico).toBe("Lucía Fernández");
    expect(pago.metodo).toBe("Transferencia");
    expect(pago.estado).toBe("PENDIENTE");
    expect(pago.cantidadMeses).toBe(3);

    const pagoReq = mapPagoFrontToRequestDto(pago);
    expect(pagoReq.metodo).toBe("TRANSFERENCIA");
    expect(pagoReq.alumnoId).toBe(2);
    expect(pagoReq.fecha).toBe("2026-10-05");
    expect(pagoReq.estado).toBe("PENDIENTE");
    expect(pagoReq.cantidadMeses).toBe(3);

    const plan = mapPlanDtoToFront({
      id: 3,
      nombre: "Plan Estudiante",
      precio: 17500,
      diaPorSemana: "3 días",
      activo: true,
    });
    expect(plan.diasPorSemana).toBe("3 días");

    const video = mapVideoDtoToFront({
      id: 4,
      titulo: "Sentadilla",
      grupoMuscularVideo: "PIERNAS",
      formato: "GIF",
      urlVideo: "https://example.com/squat.gif",
    });
    expect(video.grupoMuscular).toBe("Piernas");

    const aviso = mapAvisoDtoToFront(
      {
        id: 9,
        titulo: "Feriado",
        mensaje: "Cerrado",
        categoria: "HORARIO",
        fecha: "2026-10-12",
        paraTodos: true,
        leido: true,
      },
      "3"
    );
    expect(aviso.leidoPor).toEqual(["3"]);

    const sesion = mapSesionDtoToFront({
      id: 12,
      alumnoId: 2,
      rutinaId: 1,
      diaRutinaId: 5,
      fecha: "2026-10-12",
      ejercicios: [
        {
          id: 20,
          ejercicioId: 11,
          nombreEjercicio: "Press Banca",
          series: [{ serieNumero: 1, kg: 60, reps: 10, completada: true }],
        },
      ],
    });
    expect(sesion.id).toBe("12");
    expect(sesion.diaId).toBe("5");
    expect(sesion.ejercicios[0].series[0].kg).toBe(60);

    expect(mapObjetivoToBack("Definición")).toBe("DEFINICION");
    expect(mapObjetivoToFront("DEFINICION")).toBe("Definición");
  });
});
