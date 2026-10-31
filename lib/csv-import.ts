// lib/csv-import.ts
// Parser CSV tolerante para migración "Día Cero" desde Excel en español (;), Google Sheets (,) o TSV.

export interface FilaImportacionAlumno {
  nombre: string;
  dni: string;
  celular?: string;
  email?: string;
  planNombre?: string;
  ultimoPeriodoPago?: string; // normalizado a "YYYY-MM" cuando es posible
  montoUltimoPago?: number;
  metodoPago?: string;
}

export interface ResultadoParseoCsvAlumnos {
  filasValidas: FilaImportacionAlumno[];
  erroresFila: string[];
  delimitadorDetectado: "," | ";" | "\t";
}

export const PLANTILLA_CSV_DIA_CERO = [
  "Nombre;DNI;Celular;Email;Plan;Ultimo_Mes_Pago;Monto;Metodo",
  "Camila Sosa;42111222;1144556677;camila@email.com;Pase Libre;2026-10;30000;Transferencia",
  "Nicolás Gómez;39888777;2614556677;;3 días;2026-09;25000;Efectivo",
  "Valentina Ruiz;44333111;3516112233;;Musculación;2026-08;25000;Efectivo",
].join("\n");

function normalizarClaveHeader(texto: string): string {
  return texto
    .replace(/^\uFEFF/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function detectarDelimitador(primeraLinea: string): "," | ";" | "\t" {
  let enComillas = false;
  let comas = 0;
  let puntoYComas = 0;
  let tabs = 0;

  for (let i = 0; i < primeraLinea.length; i++) {
    const ch = primeraLinea[i];
    if (ch === '"') {
      enComillas = !enComillas;
    } else if (!enComillas) {
      if (ch === ";") puntoYComas++;
      else if (ch === ",") comas++;
      else if (ch === "\t") tabs++;
    }
  }

  if (tabs > puntoYComas && tabs > comas) return "\t";
  if (puntoYComas >= comas && puntoYComas > 0) return ";";
  return ",";
}

export function dividirLineaCsv(linea: string, delimitador: string): string[] {
  const celdas: string[] = [];
  let actual = "";
  let enComillas = false;

  for (let i = 0; i < linea.length; i++) {
    const ch = linea[i];
    if (ch === '"') {
      if (enComillas && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else {
        enComillas = !enComillas;
      }
    } else if (ch === delimitador && !enComillas) {
      celdas.push(actual.trim());
      actual = "";
    } else {
      actual += ch;
    }
  }
  celdas.push(actual.trim());
  return celdas;
}

export function normalizarPeriodoCsv(valor?: string): string | undefined {
  if (!valor) return undefined;
  const limpio = valor.trim();
  if (!limpio) return undefined;

  if (/^\d{4}-\d{2}$/.test(limpio)) {
    return limpio;
  }
  if (/^\d{4}\/\d{2}$/.test(limpio)) {
    return limpio.replace("/", "-");
  }
  // Formato argentino MM/YYYY o M/YYYY
  const mBarraAnio = limpio.match(/^(\d{1,2})[/-](\d{4})$/);
  if (mBarraAnio) {
    const mes = Number(mBarraAnio[1]);
    const anio = Number(mBarraAnio[2]);
    if (mes >= 1 && mes <= 12) {
      return `${anio}-${String(mes).padStart(2, "0")}`;
    }
  }
  // Fecha ISO YYYY-MM-DD -> YYYY-MM
  if (/^\d{4}-\d{2}-\d{2}$/.test(limpio)) {
    return limpio.slice(0, 7);
  }
  // Fecha DD/MM/YYYY -> YYYY-MM
  const dmy = limpio.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const mes = Number(dmy[2]);
    const anio = Number(dmy[3]);
    if (mes >= 1 && mes <= 12) {
      return `${anio}-${String(mes).padStart(2, "0")}`;
    }
  }
  return limpio;
}

function parsearMontoCsv(valor?: string): number | undefined {
  if (!valor) return undefined;
  let limpio = valor.replace(/[$\s]/g, "").trim();
  if (!limpio) return undefined;

  // Si tiene punto de miles y coma decimal (ej: "28.500,00" o "28.500")
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(limpio)) {
    limpio = limpio.replace(/\./g, "").replace(",", ".");
  } else if (limpio.includes(",") && !limpio.includes(".")) {
    limpio = limpio.replace(",", ".");
  }

  const num = Number(limpio);
  return !isNaN(num) && num > 0 ? num : undefined;
}

export function parsearCsvPadronAlumnos(contenidoRaw: string): ResultadoParseoCsvAlumnos {
  const texto = (contenidoRaw || "").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lineas = texto
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lineas.length < 2) {
    return {
      filasValidas: [],
      erroresFila: ["El archivo debe incluir una fila de encabezados y al menos un socio."],
      delimitadorDetectado: ";",
    };
  }

  const delimitador = detectarDelimitador(lineas[0]);
  const headers = dividirLineaCsv(lineas[0], delimitador).map(normalizarClaveHeader);

  const buscarCol = (candidatos: string[]): number =>
    headers.findIndex((h) => candidatos.includes(h));

  const idxNombre = buscarCol([
    "nombre",
    "nombre_completo",
    "apellido_y_nombre",
    "nombre_y_apellido",
    "alumno",
    "socio",
  ]);
  const idxApellido = buscarCol(["apellido", "apellidos"]);
  const idxDni = buscarCol(["dni", "documento", "nro_documento", "numero_documento", "doc"]);
  const idxCelular = buscarCol(["celular", "telefono", "whatsapp", "tel", "movil", "cel"]);
  const idxEmail = buscarCol(["email", "correo", "mail", "e_mail"]);
  const idxPlan = buscarCol(["plan", "nombre_plan", "membresia", "abono", "tipo_plan"]);
  const idxPeriodo = buscarCol([
    "ultimo_mes_pago",
    "ultimo_periodo_pago",
    "ultimo_pago",
    "periodo_mes",
    "periodo",
    "mes_pago",
    "mes_abonado",
  ]);
  const idxMonto = buscarCol(["monto", "importe", "precio", "monto_ultimo_pago", "valor"]);
  const idxMetodo = buscarCol(["metodo", "metodo_pago", "medio_pago", "forma_pago"]);

  if (idxNombre === -1 || idxDni === -1) {
    return {
      filasValidas: [],
      erroresFila: [
        "No se encontraron las columnas obligatorias 'Nombre' y 'DNI' en el encabezado del CSV.",
      ],
      delimitadorDetectado: delimitador,
    };
  }

  const filasValidas: FilaImportacionAlumno[] = [];
  const erroresFila: string[] = [];

  for (let i = 1; i < lineas.length; i++) {
    const nroFila = i + 1;
    const cols = dividirLineaCsv(lineas[i], delimitador);
    if (cols.every((c) => !c.trim())) continue;

    const nombreBase = (cols[idxNombre] || "").trim();
    const apellidoExtra = idxApellido >= 0 ? (cols[idxApellido] || "").trim() : "";
    const nombreCompleto =
      apellidoExtra && !nombreBase.toLowerCase().includes(apellidoExtra.toLowerCase())
        ? `${nombreBase} ${apellidoExtra}`.trim()
        : nombreBase;

    const dniRaw = (cols[idxDni] || "").trim();
    const dniLimpio = dniRaw.replace(/\D/g, "");

    if (nombreCompleto.length < 2) {
      erroresFila.push(`Fila ${nroFila}: falta el nombre del socio.`);
      continue;
    }
    if (dniLimpio.length < 6 || dniLimpio.length > 10) {
      erroresFila.push(
        `Fila ${nroFila} (${nombreCompleto}): DNI inválido '${dniRaw || "-"}' (debe tener entre 6 y 10 dígitos).`
      );
      continue;
    }

    const celular = idxCelular >= 0 ? (cols[idxCelular] || "").trim() || undefined : undefined;
    const email = idxEmail >= 0 ? (cols[idxEmail] || "").trim() || undefined : undefined;
    const planNombre = idxPlan >= 0 ? (cols[idxPlan] || "").trim() || undefined : undefined;
    const ultimoPeriodoPago =
      idxPeriodo >= 0 ? normalizarPeriodoCsv(cols[idxPeriodo]) : undefined;
    const montoUltimoPago = idxMonto >= 0 ? parsearMontoCsv(cols[idxMonto]) : undefined;
    const metodoPago = idxMetodo >= 0 ? (cols[idxMetodo] || "").trim() || undefined : undefined;

    filasValidas.push({
      nombre: nombreCompleto,
      dni: dniLimpio,
      celular,
      email,
      planNombre,
      ultimoPeriodoPago,
      montoUltimoPago,
      metodoPago,
    });
  }

  return {
    filasValidas,
    erroresFila,
    delimitadorDetectado: delimitador,
  };
}
