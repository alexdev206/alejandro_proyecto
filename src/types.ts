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

export type UserRole = 'admin' | 'usuario' | 'operador' | 'invitado';

export interface RolePermissions {
  isAdmin: boolean;
  isUsuario: boolean;
  canManageUsers: boolean;
  canUsePrecisionMode: boolean;
  canDownloadPythonScript: boolean;
  canSyncDatabase: boolean;
  canViewAuditStats: boolean;
  canAddColumns: boolean;
}

export const getRolePermissions = (role?: UserRole | string): RolePermissions => {
  const isAdmin = role === 'admin';
  const isUsuario = role === 'usuario' || role === 'operador' || role === 'invitado';

  return {
    isAdmin,
    isUsuario,
    canManageUsers: isAdmin,
    canUsePrecisionMode: isAdmin,
    canDownloadPythonScript: isAdmin,
    canSyncDatabase: true,
    canViewAuditStats: isAdmin,
    canAddColumns: isAdmin,
  };
};

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  token?: string;
}

export type AppModule = 'scanner' | 'table' | 'consulta_pai_adres' | 'patients' | 'audit';

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface PacienteConsulta {
  id?: string;
  documento: string;
  tipoDocumento?: string;
  primerNombre?: string;
  segundoNombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  observaciones?: string;
  updatedAt?: string;
  [key: string]: any;
}

export type ExcelBaseRow = PacienteConsulta;

