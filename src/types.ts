/**
 * Types for the PDF Scanner and Data Extractor
 */

export interface ColumnDefinition {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'id' | 'phone' | 'number' | 'list';
  required?: boolean;
}

export interface CellStatus {
  value: string;
  originalValue?: string;
  status: 'ok' | 'dudoso' | 'ilegible' | 'vacio';
  message?: string;
}

export interface ExtractedRow {
  id: string;
  rowNumber: number;
  pageNumber?: number;
  data: Record<string, string>;
  validation: Record<string, { status: 'ok' | 'dudoso' | 'ilegible' | 'vacio'; message?: string }>;
  reviewFlags: string[];
}

export interface ScanResult {
  documentTitle: string;
  detectedTemplate: 'ADULTOS' | 'GESTANTES' | 'MENORES_5' | 'RECIEN_NACIDOS' | 'GENERAL';
  templateName: string;
  columns: ColumnDefinition[];
  rows: ExtractedRow[];
  totalPages: number;
  summary: {
    totalRows: number;
    validRows: number;
    reviewNeededCount: number;
    illegibleCount: number;
  };
  rawJson?: string;
}

export interface ScanOptions {
  template: 'AUTO' | 'ADULTOS' | 'GESTANTES' | 'MENORES_5' | 'RECIEN_NACIDOS' | 'GENERAL';
  delimiter: ';' | ',' | '\t';
  autoExportCsv: boolean;
  normalizeDates: boolean;
  cleanDocumentNumbers: boolean;
  speedMode: 'fast' | 'precision';
}

export type UserRole = 'admin' | 'invitado' | 'operador';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  token?: string;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

