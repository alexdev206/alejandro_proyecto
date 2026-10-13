import type { ColumnDefinition, ExtractedRow, ScanOptions } from '../types.ts';

export const TEMPLATES = {
  ADULTOS: {
    nombre: 'Adultos (Consolidado de Caracterización)',
    claves: ['adulto', 'adultos'],
    columns: [
      { key: 'UPGD', label: 'UPGD', type: 'text' as const },
      { key: 'SUBRED', label: 'SUBRED', type: 'text' as const },
      { key: 'FECHA_CONSULTA', label: 'FECHA CONSULTA', type: 'date' as const },
      { key: 'TIPO_ID', label: 'TIPO ID', type: 'list' as const },
      { key: 'ID', label: 'N° IDENTIFICACIÓN', type: 'id' as const },
      { key: 'PRIMER_NOMBRE', label: 'PRIMER NOMBRE', type: 'text' as const },
      { key: 'SEGUNDO_NOMBRE', label: 'SEGUNDO NOMBRE', type: 'text' as const },
      { key: 'PRIMER_APELLIDO', label: 'PRIMER APELLIDO', type: 'text' as const },
      { key: 'SEGUNDO_APELLIDO', label: 'SEGUNDO APELLIDO', type: 'text' as const },
      { key: 'DIRECCION_RESIDENCIA', label: 'DIRECCIÓN RESIDENCIA', type: 'text' as const },
      { key: 'LOCALIDAD_RESIDENCIA', label: 'LOCALIDAD', type: 'list' as const },
      { key: 'TELEFONO', label: 'TELÉFONO', type: 'phone' as const },
      { key: 'FECHA_VISITA', label: 'FECHA VISITA', type: 'date' as const },
    ]
  },
  GESTANTES: {
    nombre: 'Gestantes (Consolidado de Caracterización)',
    claves: ['gestante', 'gestantes'],
    columns: [
      { key: 'UPGD', label: 'UPGD', type: 'text' as const },
      { key: 'SUBRED', label: 'SUBRED', type: 'text' as const },
      { key: 'FECHA_CONSULTA', label: 'FECHA CONSULTA', type: 'date' as const },
      { key: 'TIPO_ID', label: 'TIPO ID', type: 'list' as const },
      { key: 'ID', label: 'N° IDENTIFICACIÓN', type: 'id' as const },
      { key: 'PRIMER_NOMBRE', label: 'PRIMER NOMBRE', type: 'text' as const },
      { key: 'SEGUNDO_NOMBRE', label: 'SEGUNDO NOMBRE', type: 'text' as const },
      { key: 'PRIMER_APELLIDO', label: 'PRIMER APELLIDO', type: 'text' as const },
      { key: 'SEGUNDO_APELLIDO', label: 'SEGUNDO APELLIDO', type: 'text' as const },
      { key: 'DIRECCION_RESIDENCIA', label: 'DIRECCIÓN RESIDENCIA', type: 'text' as const },
      { key: 'LOCALIDAD_RESIDENCIA', label: 'LOCALIDAD', type: 'list' as const },
      { key: 'TELEFONO', label: 'TELÉFONO', type: 'phone' as const },
      { key: 'FECHA_VISITA', label: 'FECHA VISITA', type: 'date' as const },
      { key: 'SEMANAS_GESTACION', label: 'SEM. GESTACIÓN', type: 'number' as const },
      { key: 'NUM_CONTROLES', label: 'N° CONTROLES', type: 'number' as const },
      { key: 'FUM', label: 'F.U.M.', type: 'date' as const },
    ]
  },
  MENORES_5: {
    nombre: 'Menores de 5 Años (Consolidado)',
    claves: ['menores', 'menor de 5', '5 años'],
    columns: [
      { key: 'UPGD', label: 'UPGD', type: 'text' as const },
      { key: 'SUBRED', label: 'SUBRED', type: 'text' as const },
      { key: 'FECHA_CONSULTA', label: 'FECHA CONSULTA', type: 'date' as const },
      { key: 'TIPO_ID', label: 'TIPO ID', type: 'list' as const },
      { key: 'ID', label: 'N° IDENTIFICACIÓN', type: 'id' as const },
      { key: 'PRIMER_NOMBRE', label: 'PRIMER NOMBRE', type: 'text' as const },
      { key: 'SEGUNDO_NOMBRE', label: 'SEGUNDO NOMBRE', type: 'text' as const },
      { key: 'PRIMER_APELLIDO', label: 'PRIMER APELLIDO', type: 'text' as const },
      { key: 'SEGUNDO_APELLIDO', label: 'SEGUNDO APELLIDO', type: 'text' as const },
      { key: 'DIRECCION_RESIDENCIA', label: 'DIRECCIÓN RESIDENCIA', type: 'text' as const },
      { key: 'LOCALIDAD_RESIDENCIA', label: 'LOCALIDAD', type: 'list' as const },
      { key: 'TELEFONO', label: 'TELÉFONO', type: 'phone' as const },
      { key: 'FECHA_VISITA', label: 'FECHA VISITA', type: 'date' as const },
      { key: 'NOMBRE_QUIEN_RECIBE', label: 'QUIEN RECIBE', type: 'text' as const },
      { key: 'TIPO_ID_RECEPTOR', label: 'TIPO ID RECEPTOR', type: 'list' as const },
      { key: 'ID_RECEPTOR', label: 'ID RECEPTOR', type: 'id' as const },
    ]
  },
  RECIEN_NACIDOS: {
    nombre: 'Recién Nacidos (Consolidado)',
    claves: ['recien nacido', 'recien nacidos', 'nacidos'],
    columns: [
      { key: 'UPGD', label: 'UPGD', type: 'text' as const },
      { key: 'SUBRED', label: 'SUBRED', type: 'text' as const },
      { key: 'FECHA_CONSULTA', label: 'FECHA CONSULTA', type: 'date' as const },
      { key: 'TIPO_ID', label: 'TIPO ID', type: 'list' as const },
      { key: 'ID', label: 'N° IDENTIFICACIÓN', type: 'id' as const },
      { key: 'PRIMER_NOMBRE', label: 'PRIMER NOMBRE', type: 'text' as const },
      { key: 'SEGUNDO_NOMBRE', label: 'SEGUNDO NOMBRE', type: 'text' as const },
      { key: 'PRIMER_APELLIDO', label: 'PRIMER APELLIDO', type: 'text' as const },
      { key: 'SEGUNDO_APELLIDO', label: 'SEGUNDO APELLIDO', type: 'text' as const },
      { key: 'DIRECCION_RESIDENCIA', label: 'DIRECCIÓN RESIDENCIA', type: 'text' as const },
      { key: 'LOCALIDAD_RESIDENCIA', label: 'LOCALIDAD', type: 'list' as const },
      { key: 'TELEFONO', label: 'TELÉFONO', type: 'phone' as const },
      { key: 'FECHA_VISITA', label: 'FECHA VISITA', type: 'date' as const },
      { key: 'PESO_NACER_G', label: 'PESO NACER (g)', type: 'number' as const },
      { key: 'TALLA_NACER_CM', label: 'TALLA NACER (cm)', type: 'number' as const },
      { key: 'EDAD_GESTACIONAL_SEM', label: 'EDAD GEST. (sem)', type: 'number' as const },
      { key: 'NOMBRE_QUIEN_RECIBE', label: 'QUIEN RECIBE', type: 'text' as const },
      { key: 'TIPO_ID_RECEPTOR', label: 'TIPO ID RECEPTOR', type: 'list' as const },
      { key: 'ID_RECEPTOR', label: 'ID RECEPTOR', type: 'id' as const },
    ]
  }
};

export const TIPOS_ID = ['CC', 'TI', 'RC', 'CE', 'PA', 'PPT', 'PEP', 'MS', 'AS', 'DE', 'NV', 'NUIP'];
export const LOCALIDADES_BOGOTA = [
  'Ciudad Bolívar', 'Tunjuelito', 'Usme', 'Bosa', 'Sumapaz', 
  'Rafael Uribe Uribe', 'Kennedy', 'San Cristóbal', 'Suba', 'Engativá',
  'Fontibón', 'Santa Fe', 'San Cristobal', 'Los Mártires', 'Antonio Nariño',
  'Puente Aranda', 'La Candelaria', 'Teusaquillo', 'Chapinero', 'Barrios Unidos', 'Usaquén'
];

/**
 * Valida si día, mes y año forman una fecha real en el calendario (31/02 es inválido).
 */
export function isValidCalendarDate(day: number, month: number, year: number): boolean {
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

/**
 * Normaliza y valida una cadena de fecha.
 * Por defecto devuelve formato DD/MM/AAAA.
 * Si useIso es true, devuelve AAAA-MM-DD.
 */
export function normalizeDate(val: string, useIso = false): string | null {
  if (!val) return null;
  const clean = val.trim();

  // Caso 1: YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (!isValidCalendarDate(day, month, year)) return null;
    return useIso
      ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      : `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }

  // Caso 2: DD/MM/YYYY o DD-MM-YY
  const dmyMatch = clean.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    let yStr = dmyMatch[3];
    if (yStr.length === 2) {
      yStr = (parseInt(yStr, 10) > 40 ? '19' : '20') + yStr;
    }
    const year = parseInt(yStr, 10);
    if (!isValidCalendarDate(day, month, year)) return null;
    return useIso
      ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      : `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }

  return null;
}

export function isTipoIdColumn(key: string): boolean {
  return key === 'TIPO_ID' || key === 'TIPO_ID_RECEPTOR' || key === 'TIPO_DOCUMENTO' || key === 'TIPO_DOC';
}

export function isIdColumn(column: ColumnDefinition): boolean {
  if (isTipoIdColumn(column.key)) return false;
  return column.type === 'id' || column.key === 'ID' || column.key === 'ID_RECEPTOR' || column.key === 'DOCUMENTO' || column.key === 'NUMERO_DOCUMENTO';
}

export function isPhoneColumn(column: ColumnDefinition): boolean {
  return column.type === 'phone' || column.key === 'TELEFONO' || column.key.startsWith('TELEFONO_') || column.key === 'CELULAR';
}

export function isDateColumn(column: ColumnDefinition): boolean {
  return column.type === 'date' || column.key === 'FUM' || column.key === 'FECHA_CONSULTA' || column.key === 'FECHA_VISITA' || column.key.startsWith('FECHA_');
}

export function validateCell(
  column: ColumnDefinition,
  value: string,
  rowData: Record<string, string>,
  options?: Partial<ScanOptions>
): { status: 'ok' | 'dudoso' | 'ilegible' | 'vacio'; message?: string; normalized?: string } {
  const val = (value || '').trim();

  if (!val) {
    return {
      status: column.required ? 'dudoso' : 'vacio',
      message: column.required ? 'Campo requerido vacío' : undefined
    };
  }

  if (val.toUpperCase().includes('ILEGIBLE') || val === '[ILEGIBLE]' || val === '???') {
    return { status: 'ilegible', message: 'Dato marcado como ilegible en escaneo' };
  }

  // 1. TIPO_ID / TIPO_ID_RECEPTOR primero
  if (isTipoIdColumn(column.key)) {
    const upper = val.toUpperCase().replace(/[\.\s]/g, '');
    const match = TIPOS_ID.find(t => t === upper);
    if (match) return { status: 'ok', normalized: match };
    return { status: 'dudoso', message: `Tipo ID desconocido (${val}). Válidos: ${TIPOS_ID.join(', ')}` };
  }

  // 2. Columna de documento de identidad (coincidencia exacta o type === 'id')
  if (isIdColumn(column)) {
    const digits = val.replace(/\D/g, '');
    const docType = (rowData['TIPO_ID'] || rowData['TIPO_ID_RECEPTOR'] || '').toUpperCase();
    
    if (docType === 'RC' || docType === 'NUIP') {
      if (digits.length >= 10 && digits.length <= 11) {
        return { status: 'ok', normalized: options?.cleanDocumentNumbers === false ? val : digits };
      }
      return { status: 'dudoso', message: `Registro Civil debe tener 10 u 11 dígitos (detectados: ${digits.length})` };
    }

    if (docType === 'CC' || docType === 'TI') {
      if (digits.length >= 6 && digits.length <= 10) {
        return { status: 'ok', normalized: options?.cleanDocumentNumbers === false ? val : digits };
      }
      return { status: 'dudoso', message: `Cédula/Tarjeta debe tener entre 6 y 10 dígitos (detectados: ${digits.length})` };
    }

    if (digits.length >= 5) {
      return { status: 'ok', normalized: options?.cleanDocumentNumbers === false ? val : digits };
    }
    return { status: 'dudoso', message: 'Número de documento inusualmente corto' };
  }

  // 3. Teléfono (coincidencia exacta o prefijo)
  if (isPhoneColumn(column)) {
    const digits = val.replace(/\D/g, '');
    if (digits.length === 10 || digits.length === 7) {
      return { status: 'ok', normalized: digits };
    }
    return { status: 'dudoso', message: `Teléfono debe tener 10 (celular) o 7 dígitos (fijo). Detectados: ${digits.length}` };
  }

  // 4. Fechas (coincidencia exacta o prefijo FECHA_)
  if (isDateColumn(column)) {
    const norm = normalizeDate(val, (options as any)?.isoDates === true);
    if (norm) {
      return { 
        status: 'ok', 
        normalized: options?.normalizeDates === false ? val : norm 
      };
    }
    return { status: 'dudoso', message: 'Formato o fecha inválida (use DD/MM/AAAA)' };
  }

  // 5. Localidad
  if (column.key === 'LOCALIDAD_RESIDENCIA' || column.key === 'LOCALIDAD') {
    const match = LOCALIDADES_BOGOTA.find(l => l.toLowerCase() === val.toLowerCase());
    return { status: 'ok', normalized: match || val };
  }

  // 6. Apellidos, direcciones y cualquier otro texto general: conservar intacto sin alertas
  return { status: 'ok' };
}

export function validateAllRows(
  columns: ColumnDefinition[], 
  rawRows: Array<Record<string, string>>,
  options?: Partial<ScanOptions>
): ExtractedRow[] {
  const cleanDocs = options?.cleanDocumentNumbers !== false;
  const normDates = options?.normalizeDates !== false;

  return rawRows.map((data, index) => {
    const validation: Record<string, { status: 'ok' | 'dudoso' | 'ilegible' | 'vacio'; message?: string }> = {};
    const reviewFlags: string[] = [];
    const normalizedData: Record<string, string> = { ...data };

    for (const col of columns) {
      const val = data[col.key] || '';
      const res = validateCell(col, val, data, options);
      validation[col.key] = { status: res.status, message: res.message };

      // Solo sobrescribir con normalized en columnas específicas: id, phone, date o tipo_id
      if (res.normalized !== undefined) {
        if (isIdColumn(col)) {
          if (cleanDocs) normalizedData[col.key] = res.normalized;
        } else if (isDateColumn(col)) {
          if (normDates) normalizedData[col.key] = res.normalized;
        } else if (isPhoneColumn(col) || isTipoIdColumn(col.key)) {
          normalizedData[col.key] = res.normalized;
        }
      }

      if (res.status === 'dudoso' || res.status === 'ilegible') {
        reviewFlags.push(col.label || col.key);
      }
    }

    return {
      id: `row-${index + 1}`,
      rowNumber: index + 1,
      pageNumber: data['__PAGE'] ? parseInt(data['__PAGE'], 10) : 1,
      data: normalizedData,
      validation,
      reviewFlags
    };
  });
}
