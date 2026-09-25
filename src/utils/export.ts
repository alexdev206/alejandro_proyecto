import * as XLSX from 'xlsx';
import { ColumnDefinition, ExtractedRow } from '../types';

/**
 * Escapes a field according to CSV standards
 */
function escapeCsvField(field: string | number | undefined, delimiter: string): string {
  if (field === null || field === undefined) return '';
  const str = String(field);
  // If the field contains delimiter, quotes, or newlines, quote it and escape internal quotes
  if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates a structured CSV string with UTF-8 BOM for Excel compatibility
 */
export function generateCsvContent(
  columns: ColumnDefinition[],
  rows: ExtractedRow[],
  delimiter: ';' | ',' | '\t' = ';',
  includeReviewColumn: boolean = true
): string {
  const headers = ['N°', ...columns.map(c => c.label || c.key)];
  if (includeReviewColumn) {
    headers.push('REVISAR_CAMPOS');
  }

  const lines: string[] = [
    headers.map(h => escapeCsvField(h, delimiter)).join(delimiter)
  ];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowValues = [
      escapeCsvField(row.rowNumber || i + 1, delimiter),
      ...columns.map(c => escapeCsvField(row.data[c.key] ?? '', delimiter))
    ];

    if (includeReviewColumn) {
      const flagged = row.reviewFlags && row.reviewFlags.length > 0 ? row.reviewFlags.join('; ') : 'OK';
      rowValues.push(escapeCsvField(flagged, delimiter));
    }

    lines.push(rowValues.join(delimiter));
  }

  // Prepend UTF-8 BOM
  return '\uFEFF' + lines.join('\r\n');
}

/**
 * Triggers an automatic download of a CSV file in the browser
 */
export function downloadCsv(
  columns: ColumnDefinition[],
  rows: ExtractedRow[],
  filename: string = 'transcripcion_escaneo.csv',
  delimiter: ';' | ',' | '\t' = ';'
): void {
  const csvContent = generateCsvContent(columns, rows, delimiter, true);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads an Excel workbook (.xlsx)
 */
export function downloadExcel(
  columns: ColumnDefinition[],
  rows: ExtractedRow[],
  docTitle: string = 'Datos_Transcritos',
  filename: string = 'transcripcion_escaneo.xlsx'
): void {
  const headers = ['N°', ...columns.map(c => c.label || c.key), 'REVISAR_CAMPOS'];
  const aoa: any[][] = [headers];

  let doubtfulCount = 0;
  let illegibleCount = 0;

  rows.forEach((row, idx) => {
    const flagged = row.reviewFlags && row.reviewFlags.length > 0 ? row.reviewFlags.join('; ') : '';
    const rowVals = [
      idx + 1,
      ...columns.map(c => row.data[c.key] ?? ''),
      flagged
    ];
    aoa.push(rowVals);

    // Count issues
    for (const k of Object.keys(row.validation || {})) {
      if (row.validation[k]?.status === 'dudoso') doubtfulCount++;
      if (row.validation[k]?.status === 'ilegible') illegibleCount++;
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Set column widths
  ws['!cols'] = headers.map(h => ({ wch: Math.min(32, Math.max(12, h.length + 3)) }));

  const wb = XLSX.utils.book_new();
  const safeSheetName = docTitle.replace(/[\/\\?*\[\]:]/g, ' ').slice(0, 28) || 'Registros';
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

  // Control / Metadata sheet
  const metaSheetData = [
    ['Digitalizador y Escáner de Documentos'],
    ['Sistema de Transcripción y Estructuración Automática'],
    [],
    ['Documento Origen', docTitle],
    ['Fecha de Transcripción', new Date().toLocaleString()],
    ['Total de Filas Procesadas', rows.length],
    ['Celdas con Alertas para Revisar', doubtfulCount],
    ['Celdas con Datos Ilegibles', illegibleCount],
    [],
    ['Instrucciones de Auditoría:'],
    ['1. Los valores marcados en la columna REVISAR_CAMPOS deben verificarse contra el documento original físico.'],
    ['2. Ningún número de identificación o teléfono debe cargarse a sistemas definitivos sin verificación si presenta dudas.']
  ];
  const metaWs = XLSX.utils.aoa_to_sheet(metaSheetData);
  metaWs['!cols'] = [{ wch: 32 }, { wch: 48 }];
  XLSX.utils.book_append_sheet(wb, metaWs, 'Control y Auditoría');

  XLSX.writeFile(wb, filename);
}

/**
 * Downloads a specialized Shift Delivery Report for Operators
 */
export function downloadShiftReport(
  operatorName: string,
  role: string,
  docsCount: number,
  rowsCount: number,
  shiftDuration: string,
  columns: ColumnDefinition[],
  rows: ExtractedRow[]
) {
  const wb = XLSX.utils.book_new();

  // 1. Shift Summary Sheet
  const summaryData = [
    ['ACTA DE ENTREGA DE TURNO — DIGITADOR SISVAN'],
    ['Subred Integrada de Servicios de Salud Sur E.S.E.'],
    [],
    ['Operador / Responsable:', operatorName],
    ['Rol en Sistema:', role.toUpperCase()],
    ['Fecha de Entrega:', new Date().toLocaleDateString('es-CO')],
    ['Hora de Cierre:', new Date().toLocaleTimeString('es-CO')],
    ['Duración de la Jornada:', shiftDuration],
    ['Documentos Procesados:', docsCount],
    ['Total Pacientes / Filas Transcritas:', rowsCount],
    [],
    ['ESTADO DE CALIDAD DE DIGITACIÓN:'],
    ['Filas 100% Válidas:', rows.filter(r => !r.reviewFlags || r.reviewFlags.length === 0).length],
    ['Filas con Alertas Pendientes:', rows.filter(r => r.reviewFlags && r.reviewFlags.length > 0).length],
    [],
    ['FIRMA DE CONFORMIDAD:'],
    ['Firma Digital:', `CERT-SISVAN-${Date.now().toString(36).toUpperCase()}`],
  ];

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWs['!cols'] = [{ wch: 35 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen de Turno');

  // 2. Extracted Data Sheet if available
  if (columns.length > 0 && rows.length > 0) {
    const headers = ['N°', ...columns.map(c => c.label || c.key), 'ESTADO_REVISION'];
    const aoa: any[][] = [headers];

    rows.forEach((row, idx) => {
      const flagged = row.reviewFlags && row.reviewFlags.length > 0 ? row.reviewFlags.join('; ') : 'OK';
      aoa.push([
        idx + 1,
        ...columns.map(c => row.data[c.key] ?? ''),
        flagged
      ]);
    });

    const dataWs = XLSX.utils.aoa_to_sheet(aoa);
    dataWs['!cols'] = headers.map(h => ({ wch: Math.min(30, Math.max(12, h.length + 2)) }));
    XLSX.utils.book_append_sheet(wb, dataWs, 'Lote_Procesado');
  }

  const cleanOperator = operatorName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const filename = `entrega_turno_${cleanOperator}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

