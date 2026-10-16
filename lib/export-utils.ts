// lib/export-utils.ts

/**
 * Exporta una matriz de datos a un archivo .CSV compatible con Microsoft Excel y Google Sheets.
 * Incluye BOM (\uFEFF) para garantizar la lectura correcta de tildes, caracteres especiales y ñ en español.
 */
export function descargarCSV(
  nombreArchivo: string,
  encabezados: string[],
  filas: (string | number | undefined | null)[][]
) {
  if (typeof window === "undefined") return;

  const escaparCampo = (valor: string | number | undefined | null): string => {
    if (valor === undefined || valor === null) return '""';
    const str = String(valor).replace(/"/g, '""');
    return `"${str}"`;
  };

  const lineas = [
    encabezados.map(escaparCampo).join(";"),
    ...filas.map((fila) => fila.map(escaparCampo).join(";")),
  ];

  const contenidoCSV = "\uFEFF" + lineas.join("\r\n");
  const blob = new Blob([contenidoCSV], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.setAttribute(
    "download",
    nombreArchivo.endsWith(".csv") ? nombreArchivo : `${nombreArchivo}.csv`
  );
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}
