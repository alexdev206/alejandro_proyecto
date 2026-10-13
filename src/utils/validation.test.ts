import { describe, it, expect } from 'vitest';
import { validateCell, validateAllRows, normalizeDate, TEMPLATES } from './validation';
import { ColumnDefinition } from '../types';

describe('Validación de campos y reglas de negocio', () => {
  it('dirección "CL 45 SUR # 12-30" se conserva intacta sin alertar ni truncar dígitos', () => {
    const col: ColumnDefinition = { key: 'DIRECCION_RESIDENCIA', label: 'DIRECCIÓN', type: 'text' };
    const rowData = { DIRECCION_RESIDENCIA: 'CL 45 SUR # 12-30' };
    const res = validateCell(col, 'CL 45 SUR # 12-30', rowData);

    expect(res.status).toBe('ok');
    expect(res.message).toBeUndefined();

    const validatedRows = validateAllRows([col], [rowData]);
    expect(validatedRows[0].data['DIRECCION_RESIDENCIA']).toBe('CL 45 SUR # 12-30');
    expect(validatedRows[0].reviewFlags).toHaveLength(0);
  });

  it('localidad "Kennedy" es válida y no genera alerta ni error por contener ID', () => {
    const col: ColumnDefinition = { key: 'LOCALIDAD_RESIDENCIA', label: 'LOCALIDAD', type: 'list' };
    const rowData = { LOCALIDAD_RESIDENCIA: 'Kennedy' };
    const res = validateCell(col, 'Kennedy', rowData);

    expect(res.status).toBe('ok');

    const validatedRows = validateAllRows([col], [rowData]);
    expect(validatedRows[0].data['LOCALIDAD_RESIDENCIA']).toBe('Kennedy');
    expect(validatedRows[0].reviewFlags).toHaveLength(0);
  });

  it('TIPO_ID "CC" es reconocido como válido', () => {
    const col: ColumnDefinition = { key: 'TIPO_ID', label: 'TIPO ID', type: 'list' };
    const res = validateCell(col, 'CC', {});

    expect(res.status).toBe('ok');
    expect(res.normalized).toBe('CC');
  });

  it('APELLIDO no genera alerta a pesar de contener las letras ID', () => {
    const colPrimer: ColumnDefinition = { key: 'PRIMER_APELLIDO', label: 'PRIMER APELLIDO', type: 'text' };
    const colSegundo: ColumnDefinition = { key: 'SEGUNDO_APELLIDO', label: 'SEGUNDO APELLIDO', type: 'text' };
    const rowData = { PRIMER_APELLIDO: 'GÓMEZ', SEGUNDO_APELLIDO: 'MARTÍNEZ' };

    const res1 = validateCell(colPrimer, 'GÓMEZ', rowData);
    const res2 = validateCell(colSegundo, 'MARTÍNEZ', rowData);

    expect(res1.status).toBe('ok');
    expect(res2.status).toBe('ok');

    const validatedRows = validateAllRows([colPrimer, colSegundo], [rowData]);
    expect(validatedRows[0].data['PRIMER_APELLIDO']).toBe('GÓMEZ');
    expect(validatedRows[0].data['SEGUNDO_APELLIDO']).toBe('MARTÍNEZ');
    expect(validatedRows[0].reviewFlags).toHaveLength(0);
  });

  it('ID de 10 dígitos es válido para CC y no genera alerta', () => {
    const col: ColumnDefinition = { key: 'ID', label: 'N° IDENTIFICACIÓN', type: 'id' };
    const rowData = { TIPO_ID: 'CC', ID: '1025530378' };
    const res = validateCell(col, '1025530378', rowData);

    expect(res.status).toBe('ok');
    expect(res.normalized).toBe('1025530378');

    const validatedRows = validateAllRows([col], [rowData]);
    expect(validatedRows[0].reviewFlags).toHaveLength(0);
  });

  it('valida fechas reales y rechaza 31/02', () => {
    expect(normalizeDate('31/02/2024')).toBeNull();
    expect(normalizeDate('29/02/2024')).toBe('29/02/2024'); // Año bisiesto válido
    expect(normalizeDate('29/02/2023')).toBeNull(); // No bisiesto
    expect(normalizeDate('15/08/2023')).toBe('15/08/2023');
    expect(normalizeDate('2023-08-15', false)).toBe('15/08/2023');
    expect(normalizeDate('15/08/2023', true)).toBe('2023-08-15');
  });

  it('respeta opciones cleanDocumentNumbers y normalizeDates cuando están desactivadas', () => {
    const cols: ColumnDefinition[] = [
      { key: 'ID', label: 'ID', type: 'id' },
      { key: 'FECHA_CONSULTA', label: 'FECHA', type: 'date' }
    ];
    const row = { ID: '10.255.303-8', FECHA_CONSULTA: '15-08-2023' };

    // Con normalización desactivada
    const resOff = validateAllRows(cols, [row], { cleanDocumentNumbers: false, normalizeDates: false });
    expect(resOff[0].data['ID']).toBe('10.255.303-8');
    expect(resOff[0].data['FECHA_CONSULTA']).toBe('15-08-2023');

    // Con normalización activada
    const resOn = validateAllRows(cols, [row], { cleanDocumentNumbers: true, normalizeDates: true });
    expect(resOn[0].data['ID']).toBe('102553038');
    expect(resOn[0].data['FECHA_CONSULTA']).toBe('15/08/2023');
  });
});
