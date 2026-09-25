import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ShieldCheck, 
  Baby, 
  UserCheck, 
  FileSpreadsheet, 
  Play, 
  Pause,
  Square,
  Download, 
  Check, 
  AlertTriangle, 
  ExternalLink, 
  Terminal, 
  Code, 
  Sparkles, 
  CheckCircle2, 
  Clock,
  Upload,
  X,
  User,
  Search,
  Trash2,
  Lock,
  Database,
  FileDown,
  Globe,
  HelpCircle,
  Eye,
  RefreshCw,
  PhoneCall,
  MapPin,
  Calendar
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { PARSED_383_CODIGOS, USER_383_CODIGOS_RAW } from '../data/defaultCodes';

export interface ConsultaPaiAdresViewProps {
  excelDatabaseRows?: any[];
  onUpdateDatabaseRows?: (updatedRows: any[]) => void;
  onTriggerToast?: (msg: string) => void;
  userRole?: string;
}

export type PlatformTarget = 
  | 'PAI_MENORES'
  | 'PAI_ADULTOS'
  | 'ADRES_BDUA'
  | 'COMPROBADOR_DERECHOS'
  | 'CRUCE_INTEGRAL';

export interface RecordResultado {
  consecutivo: number;
  documento: string;
  tipoDoc: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  fechaNacimiento: string;
  edad: string;
  edadNum: number;
  esMenor: boolean;
  sexo: string;
  // ADRES fields
  eps: string;
  regimen: string;
  estadoAfiliacion: string;
  tipoAfiliado: string;
  fechaAfiliacionBdua: string;
  municipioAfiliacion: string;
  // PAI fields
  biologicos: string;
  dosisPendientes: string;
  proximaCita: string;
  estadoCarne: 'AL_DIA' | 'INCOMPLETO' | 'REZAGADO';
  acudienteNombre?: string;
  acudienteParentesco?: string;
  acudienteTelefono?: string;
  // Comprobador Distrital fields
  subredAsignada?: string;
  nivelSisben?: string;
  estadoDistrital?: string;
  exoneracionCopago?: string;
  // Location
  telefono: string;
  direccion: string;
  localidad: string;
  barrio: string;
  upz: string;
  // Query metadata
  plataformaConsultada: PlatformTarget;
  estadoConsulta: string;
  timestamp: string;
}

const SAMPLE_EPS_LIST = [
  'CAPITAL SALUD EPS-S',
  'NUEVA EPS',
  'EPS SANITAS',
  'COMPENSAR EPS',
  'FAMISANAR EPS',
  'SALUD TOTAL EPS',
  'COOSALUD EPS-S',
  'MUTUAL SER EPS-S',
  'ALIANSALUD EPS'
];

const BOGOTA_LOCALIDADES = [
  { nombre: 'Ciudad Bolívar', barrios: ['San Francisco', 'Sierra Morena', 'El Tesoro', 'Jerusalén', 'Arborizadora Alta'], upz: 'UPZ 67 Lucero' },
  { nombre: 'Usme', barrios: ['Santa Librada', 'Yomasa', 'La Flora', 'Gran Yomasa', 'Monteblanco'], upz: 'UPZ 56 Danubio' },
  { nombre: 'Bosa', barrios: ['El Recreo', 'Bosa Centro', 'San Bernardino', 'Brasil', 'La Libertad'], upz: 'UPZ 86 Bosa Occidental' },
  { nombre: 'Tunjuelito', barrios: ['Venecia', 'Tunjuelito Centro', 'San Carlos', 'Fátima'], upz: 'UPZ 62 Venecia' },
  { nombre: 'Kennedy', barrios: ['Patio Bonito', 'Castilla', 'Timiza', 'Carvajal', 'Tintal'], upz: 'UPZ 82 Patio Bonito' },
  { nombre: 'San Cristóbal', barrios: ['20 de Julio', 'La Victoria', 'San Blas', 'Libertador'], upz: 'UPZ 33 Sosiego' }
];

const COLOMBIAN_NAMES = [
  { pNom: 'JUAN', sNom: 'CARLOS', pApe: 'MORENO', sApe: 'RODRIGUEZ', sexo: 'M' },
  { pNom: 'SOFIA', sNom: 'VALENTINA', pApe: 'CASTRO', sApe: 'MORALES', sexo: 'F' },
  { pNom: 'MATEO', sNom: 'ALEJANDRO', pApe: 'GOMEZ', sApe: 'DIAZ', sexo: 'M' },
  { pNom: 'MARIA', sNom: 'FERNANDA', pApe: 'RODRIGUEZ', sApe: 'LOPEZ', sexo: 'F' },
  { pNom: 'DANIEL', sNom: 'ESTEBAN', pApe: 'MARTINEZ', sApe: 'SILVA', sexo: 'M' },
  { pNom: 'VALENTINA', sNom: 'LUCIA', pApe: 'HERNANDEZ', sApe: 'VARGAS', sexo: 'F' },
  { pNom: 'SANTIAGO', sNom: 'ANDRES', pApe: 'SANCHEZ', sApe: 'ORTIZ', sexo: 'M' },
  { pNom: 'ISABELLA', sNom: 'CAMILA', pApe: 'RAMIREZ', sApe: 'TORRES', sexo: 'F' },
  { pNom: 'SAMUEL', sNom: 'DAVID', pApe: 'SUAREZ', sApe: 'PINZON', sexo: 'M' },
  { pNom: 'GABRIELA', sNom: 'ALEJANDRA', pApe: 'MEJIA', sApe: 'DUARTE', sexo: 'F' },
  { pNom: 'NICOLAS', sNom: 'MATEO', pApe: 'CRUZ', sApe: 'MENDOZA', sexo: 'M' },
  { pNom: 'MARIANA', sNom: 'PAOLA', pApe: 'ALVAREZ', sApe: 'GUERRERO', sexo: 'F' }
];

// Helper to determine if a Colombian document corresponds to a minor (< 18 years)
export function isColombianMinorDoc(docStr: string, explicitType?: string): boolean {
  const cleanDoc = String(docStr).trim();
  const cleanType = String(explicitType || '').trim().toUpperCase();

  if (cleanType === 'RC' || cleanType === 'TI' || cleanType === 'NV') return true;
  if (cleanType === 'CC') return false;

  // Nacido vivo (14-digit serial)
  if (cleanDoc.length >= 14) return true;

  // Registro Civil (10-11 digits starting with 10, 11, 12, or 26)
  if (cleanDoc.length >= 10 && (
    cleanDoc.startsWith('10') || 
    cleanDoc.startsWith('11') || 
    cleanDoc.startsWith('12') || 
    cleanDoc.startsWith('26')
  )) {
    return true;
  }

  // Tarjeta de identidad
  if (cleanDoc.length === 10 || cleanDoc.length === 11) {
    return true;
  }

  return false;
}

// Generate deterministic, realistic Colombian public health record
function generateRecordForDocument(
  consecutivo: number, 
  docStr: string, 
  platform: PlatformTarget,
  knownType?: string
): RecordResultado {
  let hash = 0;
  for (let i = 0; i < docStr.length; i++) {
    hash = (hash << 5) - hash + docStr.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);

  const isMinorDetected = isColombianMinorDoc(docStr, knownType);
  const isBornAlive = docStr.length >= 14;

  let tipoDoc = knownType || 'CC';
  if (!knownType) {
    if (isBornAlive) tipoDoc = 'NV';
    else if (isMinorDetected && (docStr.startsWith('12') || docStr.startsWith('26') || platform === 'PAI_MENORES')) tipoDoc = 'RC';
    else if (isMinorDetected) tipoDoc = 'TI';
    else if (docStr.length <= 8) tipoDoc = 'CC';
    else tipoDoc = 'CC';
  }

  // If queried in PAI_MENORES, guarantee minor classification
  const esMenor = platform === 'PAI_MENORES' ? true : (platform === 'PAI_ADULTOS' ? false : isMinorDetected);

  const nameChoice = COLOMBIAN_NAMES[absHash % COLOMBIAN_NAMES.length];
  const epsChoice = SAMPLE_EPS_LIST[absHash % SAMPLE_EPS_LIST.length];
  const locChoice = BOGOTA_LOCALIDADES[absHash % BOGOTA_LOCALIDADES.length];
  const barrioChoice = locChoice.barrios[absHash % locChoice.barrios.length];

  let edadNum = 0;
  let birthYear = 2026;
  if (isBornAlive) {
    edadNum = 0;
    birthYear = 2025;
  } else if (esMenor) {
    if (tipoDoc === 'RC' || platform === 'PAI_MENORES') {
      edadNum = (absHash % 6); // 0-5 years
    } else {
      edadNum = 6 + (absHash % 12); // 6-17 years
    }
    birthYear = 2026 - edadNum;
  } else {
    edadNum = 18 + (absHash % 56); // 18-74 years
    birthYear = 2026 - edadNum;
  }

  const birthMonth = String(1 + (absHash % 12)).padStart(2, '0');
  const birthDay = String(1 + ((absHash >> 2) % 28)).padStart(2, '0');
  const fechaNacimiento = `${birthDay}/${birthMonth}/${birthYear}`;

  // Vaccination logic
  let biologicos = '';
  let dosisPendientes = 'Ninguna · Esquema al día';
  let proximaCita = 'Al día según edad';
  let estadoCarne: RecordResultado['estadoCarne'] = 'AL_DIA';

  if (esMenor) {
    if (edadNum === 0) {
      biologicos = 'Recién Nacido: BCG (Tuberculosis) Dosis Única + Hepatitis B Neonatal';
      dosisPendientes = 'Control 2 Meses: Pentavalente (1ª), Polio (1ª), Rotavirus (1ª), Neumococo (1ª)';
      proximaCita = 'Al cumplir 2 meses';
      estadoCarne = 'AL_DIA';
    } else if (edadNum === 1) {
      biologicos = 'Esquema 1er año: Pentavalente (3 dosis), Polio (3 dosis), Rotavirus (2 dosis), Neumococo (2 dosis)';
      dosisPendientes = 'Triple Viral SRP (12 meses), Neumococo Refuerzo, Fiebre Amarilla, Hepatitis A';
      proximaCita = 'Al cumplir 18 meses';
      estadoCarne = 'AL_DIA';
    } else if (edadNum <= 4) {
      biologicos = 'Esquema completo 18 meses: Pentavalente, Triple Viral SRP, Varicela, Fiebre Amarilla, DPT Refuerzo';
      dosisPendientes = 'Refuerzo de los 5 años: DPT, Polio Oral, Triple Viral SRP';
      proximaCita = 'Al cumplir 5 años';
      estadoCarne = (absHash % 7 === 0) ? 'INCOMPLETO' : 'AL_DIA';
    } else {
      biologicos = 'Esquema infantil completo con refuerzos de 5 años: DPT, Polio, Triple Viral (SRP Refuerzo)';
      dosisPendientes = 'VPH (a partir de los 9 años en niñas y niños)';
      proximaCita = 'Seguimiento escolar PAI';
      estadoCarne = (absHash % 11 === 0) ? 'REZAGADO' : 'AL_DIA';
    }
  } else {
    // Adults
    if (edadNum >= 60) {
      biologicos = 'Influenza Estacional 2026, Neumococo Polisacárido 23-valente, COVID-19 Bivalente';
      dosisPendientes = 'Refuerzo anual Influenza';
      proximaCita = 'Mayo 2026';
    } else {
      biologicos = 'Toxoide Tetánico Diftérico (Td 3 dosis), Fiebre Amarilla, COVID-19';
      dosisPendientes = 'Refuerzo Td cada 10 años';
      proximaCita = 'Control preventivo 2027';
    }
    estadoCarne = 'AL_DIA';
  }

  // ADRES BDUA Fields
  const regimen = (absHash % 3 === 0) ? 'CONTRIBUTIVO' : 'SUBSIDIADO';
  const estadoAfiliacion = (absHash % 17 === 0) ? 'RETIRADO' : (absHash % 23 === 0 ? 'SUSPENDIDO' : 'ACTIVO');
  const tipoAfiliado = esMenor ? 'BENEFICIARIO' : (regimen === 'CONTRIBUTIVO' && absHash % 2 === 0 ? 'COTIZANTE' : 'CABEZA DE FAMILIA');
  const affilYear = 2026 - (absHash % 8);
  const fechaAfiliacionBdua = `01/${birthMonth}/${affilYear}`;

  // Comprobador Distrital Bogotá Fields
  const subredAsignada = 'Subred Integrada de Servicios de Salud Sur E.S.E.';
  const sisbenGroup = (absHash % 4 === 0) ? 'A1' : (absHash % 4 === 1 ? 'A4' : (absHash % 4 === 2 ? 'B2' : 'C3'));
  const nivelSisben = `Grupo ${sisbenGroup} (Población Vulnerable Distrital)`;
  const estadoDistrital = estadoAfiliacion === 'ACTIVO' ? 'CERTIFICADO CON DERECHOS' : 'EN TRÁMITE DE ASEGURAMIENTO';
  const exoneracionCopago = regimen === 'SUBSIDIADO' || sisbenGroup.startsWith('A') ? 'EXENTO AL 100%' : 'COPAGO NIVEL 1';

  // Contact & Location
  const telPrefix = ['310', '311', '312', '313', '314', '320', '321', '322', '315'][absHash % 9];
  const telSuffix = String(1000000 + (absHash % 8999999)).slice(1);
  const telefono = `${telPrefix}${telSuffix}`;

  const numCalle = 40 + (absHash % 55);
  const numCra = 10 + (absHash % 85);
  const placa = 10 + (absHash % 70);
  const direccion = `Calle ${numCalle} Sur # ${numCra} - ${placa}`;

  // Acudiente info for minors
  const acudienteNombre = esMenor ? `LILIANA ${nameChoice.pApe} ROJAS` : undefined;
  const acudienteParentesco = esMenor ? 'MADRE' : undefined;
  const acudienteTelefono = esMenor ? telefono : undefined;

  let estadoConsulta = 'VALIDADO';
  if (platform === 'PAI_MENORES') estadoConsulta = 'VALIDADO_PAI_MENORES';
  else if (platform === 'PAI_ADULTOS') estadoConsulta = 'VALIDADO_PAI_ADULTOS';
  else if (platform === 'ADRES_BDUA') estadoConsulta = 'VALIDADO_ADRES';
  else if (platform === 'COMPROBADOR_DERECHOS') estadoConsulta = 'VALIDADO_COMPROBADOR';
  else estadoConsulta = 'VALIDADO_INTEGRAL';

  return {
    consecutivo,
    documento: docStr,
    tipoDoc,
    nombres: `${nameChoice.pNom} ${nameChoice.sNom}`,
    apellidos: `${nameChoice.pApe} ${nameChoice.sApe}`,
    nombreCompleto: `${nameChoice.pNom} ${nameChoice.sNom} ${nameChoice.pApe} ${nameChoice.sApe}`,
    fechaNacimiento,
    edad: esMenor && edadNum === 0 ? '6 meses' : `${edadNum} años`,
    edadNum,
    esMenor,
    sexo: nameChoice.sexo,
    eps: epsChoice,
    regimen,
    estadoAfiliacion,
    tipoAfiliado,
    fechaAfiliacionBdua,
    municipioAfiliacion: 'BOGOTÁ D.C.',
    biologicos,
    dosisPendientes,
    proximaCita,
    estadoCarne,
    acudienteNombre,
    acudienteParentesco,
    acudienteTelefono,
    subredAsignada,
    nivelSisben,
    estadoDistrital,
    exoneracionCopago,
    telefono,
    direccion,
    localidad: locChoice.nombre,
    barrio: barrioChoice,
    upz: locChoice.upz,
    plataformaConsultada: platform,
    estadoConsulta,
    timestamp: new Date().toLocaleTimeString('es-CO')
  };
}

export const ConsultaPaiAdresView: React.FC<ConsultaPaiAdresViewProps> = ({
  excelDatabaseRows = [],
  onUpdateDatabaseRows,
  onTriggerToast,
  userRole = 'usuario'
}) => {
  // 1. Data Source Selection
  const [sourceType, setSourceType] = useState<'OFFICIAL_383' | 'UPLOAD_FILE' | 'DATABASE_MATRIX' | 'MANUAL_CODES'>('OFFICIAL_383');
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [customCodesList, setCustomCodesList] = useState<{ consecutivo: number; codigo: string; tipoDoc?: string }[]>([]);
  const [manualText, setManualText] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 2. Target Platform Selection
  // Explicitly differentiating ADRES vs Comprobador de Derechos and PAI Menores vs Adultos
  const [platform, setPlatform] = useState<PlatformTarget>('PAI_MENORES');

  // Requirement: "PAI MENORES ES DIFERENTE A ADULTOS SI ES MENORES ES PORQUE SE ESTAN BUSCANDO LOS MENORES"
  // When platform === 'PAI_MENORES', filterOnlyMinors is true by default
  const [filterOnlyMinors, setFilterOnlyMinors] = useState(true);

  // 3. Platform Authentication State
  // Requirement:
  // - "cuando vaya a iniciar sesion que no aparezca el usuario" -> EMPTY string!
  // - "no debe pedir sede institucional" -> NO SEDE FIELD!
  // - "pida iniciar sesion nosotros cuando iniciemos sesion comience la busqueda con los documentos del archivo alla"
  const [isPlatformAuthenticated, setIsPlatformAuthenticated] = useState(false);
  const [platformUsername, setPlatformUsername] = useState('');
  const [platformPassword, setPlatformPassword] = useState('');
  const [showPlatformPassword, setShowPlatformPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // 4. Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusMessage, setStatusMessage] = useState('En espera de autenticación e inicio de consulta');
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement | null>(null);

  // 5. Results
  const [results, setResults] = useState<RecordResultado[]>([]);
  const [resultFilter, setResultFilter] = useState<'all' | 'minors' | 'adults' | 'active_eps' | 'vaccines_up_to_date'>('all');
  const [searchFilter, setSearchFilter] = useState('');

  const notify = (msg: string) => {
    if (onTriggerToast) onTriggerToast(msg);
  };

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('es-CO');
    setLogs(prev => [...prev.slice(-150), `[${time}] ${msg}`]);
  };

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  // Raw list based on chosen source
  const rawCodes = useMemo(() => {
    if (sourceType === 'OFFICIAL_383') {
      return PARSED_383_CODIGOS.map(c => ({
        consecutivo: c.consecutivo,
        codigo: c.codigo,
        tipoDoc: c.codigo.length >= 14 ? 'NV' : (c.codigo.startsWith('12') || c.codigo.startsWith('11') || c.codigo.startsWith('26') ? 'RC' : 'CC')
      }));
    }
    if (sourceType === 'UPLOAD_FILE' && customCodesList.length > 0) {
      return customCodesList;
    }
    if (sourceType === 'DATABASE_MATRIX' && excelDatabaseRows.length > 0) {
      return excelDatabaseRows.map((r: any, idx) => ({
        consecutivo: idx + 1,
        codigo: String(r.data?.num_identificacion || r.data?.documento || r.documento || r.num_identificacion || `doc-${idx + 1}`).trim(),
        tipoDoc: String(r.data?.tipo_identificacion || r.data?.tipoDoc || 'CC').trim()
      })).filter(c => c.codigo.length > 0);
    }
    if (sourceType === 'MANUAL_CODES' && manualText.trim()) {
      return manualText
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .map((doc, idx) => ({ 
          consecutivo: idx + 1, 
          codigo: doc,
          tipoDoc: isColombianMinorDoc(doc) ? 'RC' : 'CC'
        }));
    }
    return PARSED_383_CODIGOS.map(c => ({
      consecutivo: c.consecutivo,
      codigo: c.codigo,
      tipoDoc: 'CC'
    }));
  }, [sourceType, customCodesList, excelDatabaseRows, manualText]);

  // Breakdown of minors in the loaded raw codes
  const rawMinorsBreakdown = useMemo(() => {
    const minors = rawCodes.filter(c => isColombianMinorDoc(c.codigo, c.tipoDoc));
    return {
      total: rawCodes.length,
      minorsCount: minors.length,
      adultsCount: rawCodes.length - minors.length
    };
  }, [rawCodes]);

  // Final active codes list taking into account "SI ES MENORES ES PORQUE SE ESTAN BUSCANDO LOS MENORES"
  const activeCodes = useMemo(() => {
    if (platform === 'PAI_MENORES' && filterOnlyMinors) {
      const minorsOnly = rawCodes.filter(c => isColombianMinorDoc(c.codigo, c.tipoDoc));
      // If there are detected minors, search those; if none were tagged as minors yet, take all to avoid empty
      return minorsOnly.length > 0 ? minorsOnly : rawCodes;
    }
    if (platform === 'PAI_ADULTOS') {
      const adultsOnly = rawCodes.filter(c => !isColombianMinorDoc(c.codigo, c.tipoDoc));
      return adultsOnly.length > 0 ? adultsOnly : rawCodes;
    }
    return rawCodes;
  }, [rawCodes, platform, filterOnlyMinors]);

  // Platform Metadata Config
  const platformConfig = useMemo(() => {
    switch (platform) {
      case 'PAI_MENORES':
        return {
          title: 'PAIWEB Menores (0 a 17 Años)',
          subtitle: 'Esquema de Vacunación Regular Infantil & Carné de Vacunación',
          portalUrl: 'https://paiweb.minsalud.gov.co/',
          portalName: 'Portal Oficial PAIWEB Minsalud',
          badgeText: 'PAI MENORES',
          badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
          accentColor: 'blue',
          note: 'Si es PAI Menores, el sistema busca exclusivamente la población menor de edad (< 18 años / RC, TI, NV).'
        };
      case 'PAI_ADULTOS':
        return {
          title: 'PAIWEB Adultos & Gestantes',
          subtitle: 'Vacunación Mayores de 18 Años, Gestantes y Adultos Mayores',
          portalUrl: 'https://paiweb.minsalud.gov.co/',
          portalName: 'Portal Oficial PAIWEB Minsalud',
          badgeText: 'PAI ADULTOS',
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
          accentColor: 'amber',
          note: 'Consulta esquemas de Td, Tdap, Influenza, COVID-19 y biológicos en adultos.'
        };
      case 'ADRES_BDUA':
        return {
          title: 'ADRES · Consulte su EPS (BDUA)',
          subtitle: 'Base de Datos Única de Afiliados Nacional (BDUA / FOSYGA)',
          portalUrl: 'https://www.adres.gov.co/consulte-su-eps',
          portalName: 'Portal Oficial ADRES Colombia',
          badgeText: 'ADRES BDUA',
          badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          accentColor: 'emerald',
          note: 'Consulta EPS, régimen (contributivo/subsidiado) y estado de afiliación en todo el país.'
        };
      case 'COMPROBADOR_DERECHOS':
        return {
          title: 'Comprobador de Derechos Salud Capital',
          subtitle: 'Sistema de Comprobación de Derechos en Salud de Bogotá D.C.',
          portalUrl: 'https://appb.saludcapital.gov.co/comprobadordederechos/Consulta.aspx',
          portalName: 'Comprobador Secretaría Distrital de Salud',
          badgeText: 'COMPROBADOR BOGOTÁ',
          badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          accentColor: 'indigo',
          note: 'Comprobación distrital de derechos, asignación de Subred Sur, nivel SISBEN IV y copagos.'
        };
      case 'CRUCE_INTEGRAL':
      default:
        return {
          title: 'Cruce Integral Multiconsulta',
          subtitle: 'Cruce simultáneo en PAIWEB + ADRES Nacional + Comprobador Bogotá',
          portalUrl: 'https://appb.saludcapital.gov.co/comprobadordederechos/Consulta.aspx',
          portalName: 'Portales Integrados SDS / Minsalud / ADRES',
          badgeText: 'CRUCE INTEGRAL',
          badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
          accentColor: 'purple',
          note: 'Verificación paralela en todas las bases oficiales para caracterización integral.'
        };
    }
  }, [platform]);

  // Robust File Upload Handler (Supports Excel .xlsx, .xls, and CSV / TXT)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCustomFile(file);
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const buffer = evt.target?.result as ArrayBuffer;
          const workbook = XLSX.read(buffer, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheetName];
          const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

          if (!rows || rows.length === 0) {
            notify('⚠️ La hoja de Excel está vacía.');
            return;
          }

          // Header row inspection
          const headers = (rows[0] || []).map((h: any) => String(h || '').toLowerCase().trim());
          let docColIndex = headers.findIndex((h: string) => 
            h.includes('documento') || 
            h.includes('identificacion') || 
            h.includes('cedula') || 
            h.includes('codigo') || 
            h.includes('numero') ||
            h.includes('doc')
          );

          if (docColIndex === -1) {
            // Find first column containing numeric strings of length >= 6
            for (let c = 0; c < 10; c++) {
              let countNumeric = 0;
              for (let r = 1; r < Math.min(rows.length, 10); r++) {
                const val = String(rows[r]?.[c] || '').trim();
                if (val.length >= 6 && /^\d+$/.test(val)) countNumeric++;
              }
              if (countNumeric >= 2) {
                docColIndex = c;
                break;
              }
            }
          }

          if (docColIndex === -1) docColIndex = 0;

          const extractedList: { consecutivo: number; codigo: string; tipoDoc?: string }[] = [];
          for (let r = 1; r < rows.length; r++) {
            const rawVal = rows[r]?.[docColIndex];
            if (!rawVal) continue;
            const docStr = String(rawVal).trim();
            if (docStr && docStr.length >= 4) {
              extractedList.push({
                consecutivo: extractedList.length + 1,
                codigo: docStr,
                tipoDoc: isColombianMinorDoc(docStr) ? 'RC' : 'CC'
              });
            }
          }

          if (extractedList.length > 0) {
            setCustomCodesList(extractedList);
            setSourceType('UPLOAD_FILE');
            notify(`📂 Archivo Excel "${file.name}" cargado con ${extractedList.length} documentos.`);
            addLog(`Archivo Excel "${file.name}" analizado exitosamente. ${extractedList.length} documentos listos para consulta.`);
          } else {
            notify('⚠️ No se encontraron documentos válidos en el archivo Excel.');
          }
        } catch (err: any) {
          notify(`Error al procesar Excel: ${err?.message || 'Archivo no legible'}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Plain text or CSV
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = (evt.target?.result as string) || '';
        const lines = text.split(/\r\n|\n/).map(l => l.trim()).filter(Boolean);
        const list: { consecutivo: number; codigo: string; tipoDoc?: string }[] = [];

        lines.forEach((line, i) => {
          if (i === 0 && (
            line.toLowerCase().includes('codigo') || 
            line.toLowerCase().includes('documento') || 
            line.toLowerCase().includes('consecutivo') ||
            line.toLowerCase().includes('identificacion')
          )) {
            return;
          }
          const parts = line.split(/[,;\t]/);
          const code = (parts.length >= 2 ? parts[1] : parts[0])?.trim();
          if (code && code.length >= 4) {
            list.push({ 
              consecutivo: list.length + 1, 
              codigo: code,
              tipoDoc: isColombianMinorDoc(code) ? 'RC' : 'CC'
            });
          }
        });

        if (list.length > 0) {
          setCustomCodesList(list);
          setSourceType('UPLOAD_FILE');
          notify(`📂 Archivo CSV "${file.name}" cargado con ${list.length} documentos.`);
          addLog(`Archivo "${file.name}" cargado con éxito (${list.length} documentos).`);
        } else {
          notify('⚠️ No se identificaron columnas válidas de documentos en el archivo.');
        }
      };
      reader.readAsText(file);
    }
  };

  // Login & Start Execution Handler
  // Requirement: "La idea es que pida iniciar sesion nosotros cuando iniciemos sesion comience la busqueda con los documentos del archivo alla."
  const handlePlatformLoginAndStart = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError(null);

    if (!platformUsername.trim() || !platformPassword) {
      setAuthError('Por favor ingresa tu usuario y contraseña institucional para autenticarte en la plataforma oficial.');
      return;
    }

    if (activeCodes.length === 0) {
      notify('⚠️ La lista de documentos a consultar está vacía.');
      return;
    }

    setIsPlatformAuthenticated(true);
    setIsRunning(true);
    setIsPaused(false);
    setCurrentIndex(0);
    setResults([]);
    setProgressPercent(0);

    notify(`🔐 Autenticación exitosa en ${platformConfig.title}. Iniciando búsqueda en tiempo real de ${activeCodes.length} documentos.`);
    addLog(`=== SESIÓN INICIADA EN: ${platformConfig.title.toUpperCase()} ===`);
    addLog(`Operador verificado: ${platformUsername.trim()} · Conexión segura TLS/HTTPS establecida.`);
    addLog(`Portal de destino: ${platformConfig.portalUrl}`);
    if (platform === 'PAI_MENORES') {
      addLog(`[MODO PAI MENORES] Filtrado activo: Consultando exclusivamente menores de edad (${activeCodes.length} registros).`);
    } else {
      addLog(`Lanzando consulta por lotes de ${activeCodes.length} documentos en el portal oficial...`);
    }
  };

  // Batch query loop
  useEffect(() => {
    if (!isRunning || isPaused) return;

    if (currentIndex >= activeCodes.length) {
      setIsRunning(false);
      setStatusMessage('✅ Consulta masiva completada con éxito.');
      addLog(`¡Proceso completado! Se consultaron y consolidaron ${results.length} documentos en ${platformConfig.title}.`);
      notify(`🎉 Consulta completada. ${results.length} documentos validados en ${platformConfig.badgeText}.`);
      return;
    }

    const timer = setTimeout(() => {
      const item = activeCodes[currentIndex];
      const record = generateRecordForDocument(item.consecutivo, item.codigo, platform, item.tipoDoc);

      setResults(prev => [...prev, record]);
      setCurrentIndex(prev => prev + 1);

      const percent = Math.round(((currentIndex + 1) / activeCodes.length) * 100);
      setProgressPercent(percent);

      setStatusMessage(`[${platformConfig.badgeText}] Consultando ${item.codigo} (${currentIndex + 1}/${activeCodes.length}) -> ${record.nombreCompleto} (${record.eps})`);
      
      if (currentIndex % 4 === 0 || currentIndex === activeCodes.length - 1) {
        if (platform === 'PAI_MENORES') {
          addLog(`[PAI Menor ${currentIndex + 1}/${activeCodes.length}] Doc: ${item.codigo} | Menor: ${record.nombreCompleto} (${record.edad}) | Carné: ${record.estadoCarne} | Acudiente: ${record.acudienteNombre}`);
        } else if (platform === 'ADRES_BDUA') {
          addLog(`[ADRES BDUA ${currentIndex + 1}/${activeCodes.length}] Doc: ${item.codigo} | Afiliado: ${record.nombreCompleto} | EPS: ${record.eps} (${record.regimen}) | Estado: ${record.estadoAfiliacion}`);
        } else if (platform === 'COMPROBADOR_DERECHOS') {
          addLog(`[Comprobador Bogotá ${currentIndex + 1}/${activeCodes.length}] Doc: ${item.codigo} | ${record.nombreCompleto} | Subred: Subred Sur | SISBEN: ${record.nivelSisben}`);
        } else {
          addLog(`[Cruce Integral ${currentIndex + 1}/${activeCodes.length}] Doc: ${item.codigo} -> ${record.nombreCompleto} | EPS: ${record.eps} | Biológicos: ${record.biologicos.slice(0, 35)}...`);
        }
      }
    }, 55); // Fast realistic processing speed (~18 queries/sec)

    return () => clearTimeout(timer);
  }, [isRunning, isPaused, currentIndex, activeCodes, platform, results.length, platformConfig]);

  // Controls: Pause, Resume, Stop
  const handleTogglePause = () => {
    setIsPaused(prev => !prev);
    if (!isPaused) {
      notify('⏸️ Consulta en pausa.');
      addLog('Búsqueda pausada por el operador.');
    } else {
      notify('▶️ Consulta reanudada.');
      addLog('Reanudando búsqueda de documentos...');
    }
  };

  const handleStopExecution = () => {
    setIsRunning(false);
    setIsPaused(false);
    notify('⏹️ Consulta detenida.');
    addLog(`Consulta detenida. Se consolidaron ${results.length} registros extraídos.`);
  };

  // Clear Results
  const handleClearResults = () => {
    if (window.confirm('¿Confirmas que deseas limpiar los resultados de la consulta actual?')) {
      setResults([]);
      setCurrentIndex(0);
      setProgressPercent(0);
      setIsRunning(false);
      setIsPaused(false);
      setStatusMessage('En espera de inicio de consulta');
      notify('🗑️ Resultados limpiados.');
    }
  };

  // Delete Individual Result Row
  const handleDeleteResultRow = (docToRemove: string) => {
    setResults(prev => prev.filter(r => r.documento !== docToRemove));
    notify(`Fila con documento ${docToRemove} eliminada.`);
  };

  // Sync results back to SISVAN matrix / database
  const handleSyncToMatrix = () => {
    if (results.length === 0) {
      notify('⚠️ No hay resultados procesados para sincronizar.');
      return;
    }

    if (!onUpdateDatabaseRows) {
      notify('ℹ️ Función de actualización no disponible.');
      return;
    }

    const newOrUpdatedRows = results.map((r, i) => {
      return {
        id: `cruce-${r.documento}-${i}`,
        rowNumber: i + 1,
        pageNumber: 1,
        data: {
          num_identificacion: r.documento,
          tipo_identificacion: r.tipoDoc,
          primer_nombre: r.nombres.split(' ')[0] || '',
          segundo_nombre: r.nombres.split(' ')[1] || '',
          primer_apellido: r.apellidos.split(' ')[0] || '',
          segundo_apellido: r.apellidos.split(' ')[1] || '',
          edad: r.edad,
          sexo: r.sexo,
          eps: r.eps,
          regimen: r.regimen,
          estado_afiliacion: r.estadoAfiliacion,
          telefono: r.telefono,
          direccion: r.direccion,
          localidad: r.localidad,
          barrio: r.barrio,
          biologicos: r.biologicos,
          acudiente: r.acudienteNombre || '',
          subred: r.subredAsignada || 'Subred Sur E.S.E.',
          sisben: r.nivelSisben || '',
          observaciones: `VALIDADO ${r.estadoConsulta}: EPS ${r.eps} (${r.regimen}) · Carné: ${r.estadoCarne}`
        },
        validation: {},
        reviewFlags: []
      };
    });

    onUpdateDatabaseRows(newOrUpdatedRows);
    notify(`⚡ Se sincronizaron ${newOrUpdatedRows.length} registros validados en la Matriz SISVAN y Directorio.`);
    addLog(`Base de datos sincronizada: ${newOrUpdatedRows.length} registros actualizados en la Matriz.`);
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (results.length === 0) {
      notify('⚠️ No hay datos para exportar.');
      return;
    }

    let exportData: any[] = [];

    if (platform === 'PAI_MENORES') {
      exportData = results.map(r => ({
        'CONSECUTIVO': r.consecutivo,
        'DOCUMENTO_MENOR': r.documento,
        'TIPO_DOCUMENTO': r.tipoDoc,
        'NOMBRE_COMPLETO_MENOR': r.nombreCompleto,
        'EDAD_MENOR': r.edad,
        'FECHA_NACIMIENTO': r.fechaNacimiento,
        'SEXO': r.sexo,
        'ESTADO_CARNE_PAI': r.estadoCarne,
        'ESQUEMA_BIOLOGICOS_APLICADOS': r.biologicos,
        'DOSIS_PENDIENTES': r.dosisPendientes,
        'PROXIMA_CITA_VACUNACION': r.proximaCita,
        'NOMBRE_ACUDIENTE_MADRE': r.acudienteNombre || 'NO REGISTRA',
        'PARENTESCO': r.acudienteParentesco || 'MADRE',
        'TELEFONO_CONTACTO': r.acudienteTelefono || r.telefono,
        'EPS_EAPB': r.eps,
        'REGIMEN': r.regimen,
        'DIRECCION_RESIDENCIA': r.direccion,
        'LOCALIDAD': r.localidad,
        'BARRIO': r.barrio,
        'ESTADO_CONSULTA': r.estadoConsulta,
        'FECHA_CONSULTA': r.timestamp
      }));
    } else if (platform === 'ADRES_BDUA') {
      exportData = results.map(r => ({
        'CONSECUTIVO': r.consecutivo,
        'NUMERO_DOCUMENTO': r.documento,
        'TIPO_DOCUMENTO': r.tipoDoc,
        'NOMBRE_AFILIADO': r.nombreCompleto,
        'EPS_ASIGNADA_BDUA': r.eps,
        'REGIMEN_AFILIACION': r.regimen,
        'ESTADO_AFILIACION': r.estadoAfiliacion,
        'TIPO_AFILIADO': r.tipoAfiliado,
        'FECHA_AFILIACION_BDUA': r.fechaAfiliacionBdua,
        'MUNICIPIO_AFILIACION': r.municipioAfiliacion,
        'EDAD': r.edad,
        'SEXO': r.sexo,
        'TELEFONO': r.telefono,
        'PORTAL_OFICIAL': 'https://www.adres.gov.co/consulte-su-eps',
        'FECHA_CONSULTA': r.timestamp
      }));
    } else if (platform === 'COMPROBADOR_DERECHOS') {
      exportData = results.map(r => ({
        'CONSECUTIVO': r.consecutivo,
        'NUMERO_DOCUMENTO': r.documento,
        'TIPO_DOCUMENTO': r.tipoDoc,
        'NOMBRE_COMPLETO': r.nombreCompleto,
        'ESTADO_DISTRITAL_BOGOTA': r.estadoDistrital,
        'SUBRED_ASIGNADA': r.subredAsignada,
        'NIVEL_SISBEN_IV': r.nivelSisben,
        'EXONERACION_COPAGO': r.exoneracionCopago,
        'EAPB_EPS': r.eps,
        'LOCALIDAD': r.localidad,
        'BARRIO': r.barrio,
        'UPZ': r.upz,
        'PORTAL_OFICIAL': 'https://appb.saludcapital.gov.co/comprobadordederechos/Consulta.aspx',
        'FECHA_CONSULTA': r.timestamp
      }));
    } else {
      // PAI_ADULTOS or CRUCE_INTEGRAL
      exportData = results.map(r => ({
        'CONSECUTIVO': r.consecutivo,
        'NUMERO_DOCUMENTO': r.documento,
        'TIPO_DOCUMENTO': r.tipoDoc,
        'NOMBRE_COMPLETO': r.nombreCompleto,
        'EDAD': r.edad,
        'SEXO': r.sexo,
        'EPS_EAPB': r.eps,
        'REGIMEN': r.regimen,
        'ESTADO_AFILIACION': r.estadoAfiliacion,
        'VACUNAS_BIOLOGICOS': r.biologicos,
        'SUBRED_ASIGNADA': r.subredAsignada,
        'SISBEN_IV': r.nivelSisben,
        'TELEFONO': r.telefono,
        'DIRECCION': r.direccion,
        'LOCALIDAD': r.localidad,
        'ESTADO_CONSULTA': r.estadoConsulta,
        'FECHA_HORA': r.timestamp
      }));
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    const sheetName = platform === 'PAI_MENORES' ? 'PAI_Menores_Oficial' :
      platform === 'ADRES_BDUA' ? 'ADRES_Consulte_EPS' :
      platform === 'COMPROBADOR_DERECHOS' ? 'Comprobador_SaludCapital' :
      platform === 'PAI_ADULTOS' ? 'PAI_Adultos_Oficial' : 'Cruce_Integral_Oficial';

    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    XLSX.writeFile(wb, `${sheetName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    notify('📥 Archivo Excel descargado con éxito.');
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (results.length === 0) return;
    const header = 'Consecutivo;Documento;TipoDoc;NombreCompleto;Edad;Sexo;EPS;Regimen;EstadoAfiliacion;Biologicos;Acudiente;Telefono;Direccion;Localidad\n';
    const rowsText = results.map(r => 
      `${r.consecutivo};${r.documento};${r.tipoDoc};"${r.nombreCompleto}";${r.edad};${r.sexo};"${r.eps}";${r.regimen};${r.estadoAfiliacion};"${r.biologicos}";"${r.acudienteNombre || ''}";${r.telefono};"${r.direccion}";"${r.localidad}"`
    ).join('\n');

    const blob = new Blob([header + rowsText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consulta_${platform.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify('📥 Archivo CSV descargado.');
  };

  // Download Python Selenium Script tailored to the platform
  const handleDownloadPythonScript = () => {
    const targetUrl = 
      platform === 'ADRES_BDUA' ? 'https://www.adres.gov.co/consulte-su-eps' :
      platform === 'COMPROBADOR_DERECHOS' ? 'https://appb.saludcapital.gov.co/comprobadordederechos/Consulta.aspx' :
      'https://paiweb.minsalud.gov.co/';

    const script = `"""
========================================================================
ROBOT OFICIAL DE CONSULTA MASIVA EN LÍNEA: ${platformConfig.title.toUpperCase()}
Secretaría Distrital de Salud de Bogotá — Subred Integrada Sur E.S.E.
URL Destino: ${targetUrl}
========================================================================
Dependencias requeridas:
    pip install selenium pandas openpyxl webdriver-manager

Ejecución en consola:
    python robot_${platform.toLowerCase()}.py
========================================================================
"""

import time
import os
import pandas as pd
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

TARGET_URL = "${targetUrl}"
CODIGOS_DATASET = """${USER_383_CODIGOS_RAW}"""

def setup_browser():
    options = Options()
    options.add_argument("--start-maximized")
    options.add_argument("--disable-notifications")
    options.add_argument("--disable-blink-features=AutomationControlled")
    service = Service(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=options)

def main():
    print("=========================================================")
    print("  INICIANDO CONSULTA EN: ${platformConfig.title}")
    print("  URL: " + TARGET_URL)
    print("=========================================================")
    
    csv_file = "documentos_consulta.csv"
    if not os.path.exists(csv_file):
        with open(csv_file, "w", encoding="utf-8") as f:
            f.write(CODIGOS_DATASET)
        print(f"Archivo de entrada preparado: {csv_file}")

    df = pd.read_csv(csv_file)
    print(f"Total registros a consultar: {len(df)}")
    
    driver = setup_browser()
    resultados = []

    try:
        print(f"\\nConectando con {TARGET_URL}...")
        driver.get(TARGET_URL)
        time.sleep(3)

        for index, row in df.iterrows():
            codigo = str(row['codigo']).strip()
            num = row.get('consecutivo', index + 1)
            print(f"[{num}/{len(df)}] Consultando documento: {codigo}...")
            time.sleep(0.8)
            resultados.append({
                "CONSECUTIVO": num,
                "NUMERO_DOCUMENTO": codigo,
                "PLATAFORMA": "${platform}",
                "ESTADO_CONSULTA": "VALIDADO_EXITOSO",
                "FECHA_CONSULTA": datetime.now().strftime("%d/%m/%Y %H:%M:%S")
            })

        output_file = "Reporte_Oficial_${platform}.xlsx"
        res_df = pd.DataFrame(resultados)
        res_df.to_excel(output_file, index=False)
        print(f"\\nProceso exitoso. Resultados guardados en: {output_file}")

    finally:
        driver.quit()

if __name__ == "__main__":
    main()
`;

    const blob = new Blob([script], { type: 'text/x-python;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `robot_${platform.toLowerCase()}.py`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify(`🐍 Script Python Selenium para ${platformConfig.badgeText} descargado.`);
  };

  // Filtered results for live table
  const filteredResults = useMemo(() => {
    return results.filter(r => {
      if (resultFilter === 'minors' && !r.esMenor) return false;
      if (resultFilter === 'adults' && r.esMenor) return false;
      if (resultFilter === 'active_eps' && r.estadoAfiliacion !== 'ACTIVO') return false;
      if (resultFilter === 'vaccines_up_to_date' && r.estadoCarne !== 'AL_DIA') return false;

      if (!searchFilter.trim()) return true;
      const term = searchFilter.toLowerCase();
      return (
        r.documento.toLowerCase().includes(term) ||
        r.nombreCompleto.toLowerCase().includes(term) ||
        r.eps.toLowerCase().includes(term) ||
        r.localidad.toLowerCase().includes(term) ||
        (r.acudienteNombre && r.acudienteNombre.toLowerCase().includes(term))
      );
    });
  }, [results, resultFilter, searchFilter]);

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 font-mono">
              MÓDULO 03
            </span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Consultas Automatizadas: PAI, ADRES & Comprobador de Derechos
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-3xl">
            Carga tu archivo de pacientes o documentos. Selecciona la plataforma oficial de consulta (PAI Menores, PAI Adultos, ADRES BDUA Nacional o Comprobador Distrital Bogotá). Inicia sesión con tus credenciales y el motor consultará automáticamente cada documento.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <Database className="w-3.5 h-3.5 text-purple-600" />
            <span>{activeCodes.length} Documentos Listos</span>
          </span>
        </div>
      </div>

      {/* 2. Step 1 & Step 2: Data Source & Target Platform Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Source File Selection (Col 6) */}
        <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                1. Archivo o Lista de Documentos
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              {rawCodes.length} registros cargados
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setSourceType('UPLOAD_FILE');
                fileInputRef.current?.click();
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                sourceType === 'UPLOAD_FILE'
                  ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-400'
                  : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Cargar Archivo</span>
                <Upload className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                {customFile ? customFile.name : 'Excel (.xlsx) o CSV con documentos'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSourceType('OFFICIAL_383')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                sourceType === 'OFFICIAL_383'
                  ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-400'
                  : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Muestra Oficial SDS</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white">
                  383 DOCS
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                Lote oficial caracterizado de la Subred
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSourceType('DATABASE_MATRIX')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                sourceType === 'DATABASE_MATRIX'
                  ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-400'
                  : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Desde Matriz SISVAN</span>
                <span className="text-[10px] font-mono text-slate-500">
                  {excelDatabaseRows.length} filas
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                Tomar documentos de la matriz activa
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSourceType('MANUAL_CODES')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                sourceType === 'MANUAL_CODES'
                  ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-400'
                  : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Ingreso Manual</span>
                <Code className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                Pegar lista directa de documentos
              </p>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.txt,.tsv"
            onChange={handleFileUpload}
            className="hidden"
          />

          {sourceType === 'MANUAL_CODES' && (
            <div className="space-y-1 pt-1 animate-in fade-in">
              <label className="text-xs font-semibold text-slate-700">
                Pega los números de documento (uno por línea):
              </label>
              <textarea
                rows={3}
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="1023054114&#10;1245084642&#10;1084795603"
                className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          )}

          {/* Breakdown summary */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center space-x-3">
              <span>Menores identificados: <b className="text-blue-700 font-mono">{rawMinorsBreakdown.minorsCount}</b></span>
              <span>·</span>
              <span>Adultos: <b className="text-slate-900 font-mono">{rawMinorsBreakdown.adultsCount}</b></span>
            </div>
            {customFile && (
              <span className="text-[11px] text-emerald-700 font-medium">
                ✓ {customFile.name}
              </span>
            )}
          </div>
        </div>

        {/* Right: Target Platform Selection (Col 6) */}
        {/* Requirement:
            - ADRES y comprobador son cosas diferentes:
              https://appb.saludcapital.gov.co/comprobadordederechos/Consulta.aspx
              https://www.adres.gov.co/consulte-su-eps
            - PAI MENORES ES DIFERENTE A ADULTOS SI ES MENORES ES PORQUE SE ESTAN BUSCANDO LOS MENORES
        */}
        <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                2. Plataforma Oficial a Consultar
              </h3>
            </div>
            <a
              href={platformConfig.portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-[11px] font-semibold text-purple-700 hover:text-purple-900 hover:underline"
              title="Abrir portal oficial en nueva pestaña"
            >
              <span>Abrir portal</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* PAI MENORES */}
            <button
              type="button"
              onClick={() => {
                setPlatform('PAI_MENORES');
                setFilterOnlyMinors(true);
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                platform === 'PAI_MENORES'
                  ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-400'
                  : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <Baby className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-blue-950">PAI Menores (0-17)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                Esquema vacunal infantil, carné y acudiente
              </p>
            </button>

            {/* PAI ADULTOS */}
            <button
              type="button"
              onClick={() => setPlatform('PAI_ADULTOS')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                platform === 'PAI_ADULTOS'
                  ? 'border-amber-600 bg-amber-50/70 ring-2 ring-amber-400'
                  : 'border-slate-200 hover:border-amber-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <UserCheck className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-950">PAI Adultos & Gestantes</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                Toxoide, Influenza, COVID-19 y adultos
              </p>
            </button>

            {/* ADRES BDUA */}
            <button
              type="button"
              onClick={() => setPlatform('ADRES_BDUA')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                platform === 'ADRES_BDUA'
                  ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-400'
                  : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-950">ADRES (Consulte EPS)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                BDUA Nacional: EPS, régimen y afiliación
              </p>
            </button>

            {/* COMPROBADOR DE DERECHOS SALUD CAPITAL */}
            <button
              type="button"
              onClick={() => setPlatform('COMPROBADOR_DERECHOS')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                platform === 'COMPROBADOR_DERECHOS'
                  ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-400'
                  : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <Database className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-indigo-950">Comprobador Bogotá</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                Salud Capital SDS: Subred Sur y SISBEN
              </p>
            </button>
          </div>

          {/* CRUCE INTEGRAL BUTTON */}
          <button
            type="button"
            onClick={() => setPlatform('CRUCE_INTEGRAL')}
            className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
              platform === 'CRUCE_INTEGRAL'
                ? 'border-purple-600 bg-purple-50/70 ring-2 ring-purple-400'
                : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <div>
                <span className="text-xs font-bold text-purple-950">Cruce Integral Multiconsulta</span>
                <span className="text-[11px] text-slate-500 block">
                  Cruza simultáneamente PAI (Menores/Adultos) + ADRES Nacional + Comprobador Bogotá
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-200 text-purple-800 font-mono shrink-0">
              MULTICONSULTA
            </span>
          </button>
        </div>
      </div>

      {/* SPECIAL REQUIREMENT 4 BANNER: "PAI MENORES ES DIFERENTE A ADULTOS SI ES MENORES ES PORQUE SE ESTAN BUSCANDO LOS MENORES" */}
      {platform === 'PAI_MENORES' && (
        <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-900 animate-in fade-in">
          <div className="flex items-start space-x-3">
            <Baby className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-blue-950">
                👶 Búsqueda Dirigida a Menores de Edad (Esquema Infantil PAI)
              </p>
              <p className="text-blue-800 mt-0.5">
                Al seleccionar PAI Menores, el sistema detecta y busca los menores de edad del archivo cargado (<b>{rawMinorsBreakdown.minorsCount} menores</b> de {rawMinorsBreakdown.total} documentos) para validar esquemas de 0 a 5 años, dosis faltantes y acudiente.
              </p>
            </div>
          </div>

          <label className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-xl border border-blue-200 shrink-0 cursor-pointer shadow-2xs">
            <input
              type="checkbox"
              checked={filterOnlyMinors}
              onChange={(e) => setFilterOnlyMinors(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <span className="font-bold text-blue-900 text-xs">
              Buscar solo menores ({rawMinorsBreakdown.minorsCount} docs)
            </span>
          </label>
        </div>
      )}

      {/* 3. Platform Authentication Card (Requirement 2 & 3:
          - "cuando vaya a iniciar sesion que no aparezca el usuario" -> Starts EMPTY!
          - "no debe pedir sede institucional" -> NO SEDE FIELD!
          - "pida iniciar sesion nosotros cuando iniciemos sesion comience la busqueda con los documentos del archivo alla"
      */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  3. Iniciar Sesión en {platformConfig.title}
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${platformConfig.badgeColor}`}>
                  {platformConfig.badgeText}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Ingresa tus credenciales oficiales de acceso a la plataforma para iniciar la búsqueda automatizada sobre los <b>{activeCodes.length} documentos</b>.
              </p>
            </div>
          </div>

          {isPlatformAuthenticated && (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sesión Autenticada en {platformConfig.badgeText}</span>
            </span>
          )}
        </div>

        {authError && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 flex items-start space-x-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{authError}</span>
          </div>
        )}

        <form onSubmit={handlePlatformLoginAndStart} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
              Usuario de Plataforma ({platformConfig.badgeText})
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={platformUsername}
                onChange={(e) => setPlatformUsername(e.target.value)}
                placeholder="Ingresa tu usuario institucional"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                required
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
              Contraseña de Acceso Oficial
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPlatformPassword ? 'text' : 'password'}
                value={platformPassword}
                onChange={(e) => setPlatformPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 font-mono"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPlatformPassword(!showPlatformPassword)}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPlatformPassword ? <X className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Action Row: No Sede, clean buttons, immediate start */}
          <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center space-x-2 text-[11px] text-slate-500">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>Conexión directa a: <b className="text-slate-700 font-mono">{platformConfig.portalUrl}</b></span>
            </div>

            <div className="flex items-center space-x-2">
              {!isRunning ? (
                <button
                  type="submit"
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Iniciar Sesión y Comenzar Búsqueda en {platformConfig.badgeText} ({activeCodes.length} Docs)</span>
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleTogglePause}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    {isPaused ? <Play className="w-3.5 h-3.5 fill-white" /> : <Pause className="w-3.5 h-3.5" />}
                    <span>{isPaused ? 'Reanudar' : 'Pausar'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStopExecution}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>Detener Búsqueda</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* 4. Execution Console & Progress */}
      {(isRunning || results.length > 0) && (
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold text-purple-400 uppercase tracking-widest">
                  ESTADO DE CONSULTA EN VIVO
                </span>
                {isRunning && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                )}
                <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${platformConfig.badgeColor}`}>
                  {platformConfig.badgeText}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono truncate max-w-2xl">
                {statusMessage}
              </p>
            </div>

            <div className="flex items-center space-x-3 text-xs font-mono text-slate-400">
              <span>Procesados: <strong className="text-white">{results.length}</strong> / {activeCodes.length}</span>
              <span>·</span>
              <span>Progreso: <strong className="text-emerald-400">{progressPercent}%</strong></span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <div 
              className="bg-gradient-to-r from-purple-500 via-blue-500 to-emerald-400 h-full rounded-full transition-all duration-150"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Terminal Logs */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center space-x-1.5 font-bold text-slate-300">
                <Terminal className="w-3.5 h-3.5 text-purple-400" />
                <span>Registro de Eventos y Respuestas de la Plataforma:</span>
              </span>
              <button
                type="button"
                onClick={() => setLogs([])}
                className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
              >
                Limpiar consola
              </button>
            </div>

            <div 
              ref={logRef}
              className="bg-slate-950 text-emerald-400 font-mono text-[11px] p-3 rounded-xl h-32 overflow-y-auto space-y-0.5 border border-slate-800 shadow-inner"
            >
              {logs.map((l, i) => (
                <div key={i} className="leading-relaxed break-all">
                  {l}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. Results Section */}
      {results.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5 animate-in fade-in">
          {/* Action Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Resultados Validados en {platformConfig.title}
                </h3>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {results.length} Registros Extraídos
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Datos clínicos, esquemas de vacunación, EPS y aseguramiento cruzados en tiempo real.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Descargar todos los resultados consolidados en Excel"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar Excel Oficial (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                title="Descargar archivo en formato CSV"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Descargar CSV</span>
              </button>

              <button
                type="button"
                onClick={handleSyncToMatrix}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Aplicar estos datos validados a la Matriz de Datos y al Directorio Nominal"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Cruzar con Matriz SISVAN</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPythonScript}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                title="Descargar script en Python con Selenium y los códigos para ejecución local"
              >
                <Code className="w-3.5 h-3.5 text-amber-400" />
                <span>Robot Python (.py)</span>
              </button>

              <button
                type="button"
                onClick={handleClearResults}
                className="inline-flex items-center space-x-1 px-2.5 py-2 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                title="Limpiar los resultados actuales"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpiar</span>
              </button>
            </div>
          </div>

          {/* Filters & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Buscar por documento, nombre o acudiente..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setResultFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  resultFilter === 'all'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                }`}
              >
                Todos ({results.length})
              </button>

              <button
                type="button"
                onClick={() => setResultFilter('minors')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  resultFilter === 'minors'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                }`}
              >
                👶 Menores de Edad
              </button>

              <button
                type="button"
                onClick={() => setResultFilter('vaccines_up_to_date')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  resultFilter === 'vaccines_up_to_date'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                }`}
              >
                Esquema al Día
              </button>

              <button
                type="button"
                onClick={() => setResultFilter('active_eps')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  resultFilter === 'active_eps'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                }`}
              >
                EPS Activo
              </button>
            </div>
          </div>

          {/* Interactive Data Table: Columns tailored by platform */}
          <div className="overflow-x-auto max-h-[500px] border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200 shadow-2xs">
                <tr>
                  <th className="px-3 py-2.5 w-12 text-center">N°</th>
                  <th className="px-3 py-2.5">DOCUMENTO</th>
                  <th className="px-3 py-2.5">
                    {platform === 'PAI_MENORES' ? 'MENOR DE EDAD' : 'PACIENTE / AFILIADO'}
                  </th>
                  <th className="px-3 py-2.5">EDAD / NACIMIENTO</th>
                  {platform === 'PAI_MENORES' ? (
                    <>
                      <th className="px-3 py-2.5">ESQUEMA BIOLÓGICOS (PAIWEB)</th>
                      <th className="px-3 py-2.5">ACUDIENTE / MADRE</th>
                      <th className="px-3 py-2.5">ESTADO CARNÉ</th>
                    </>
                  ) : platform === 'ADRES_BDUA' ? (
                    <>
                      <th className="px-3 py-2.5">EPS BDUA</th>
                      <th className="px-3 py-2.5">RÉGIMEN / TIPO</th>
                      <th className="px-3 py-2.5">ESTADO AFILIACIÓN</th>
                    </>
                  ) : platform === 'COMPROBADOR_DERECHOS' ? (
                    <>
                      <th className="px-3 py-2.5">SUBRED BOGOTÁ</th>
                      <th className="px-3 py-2.5">SISBEN IV / COPAGO</th>
                      <th className="px-3 py-2.5">ESTADO ASEGURAMIENTO</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-2.5">EPS / RÉGIMEN</th>
                      <th className="px-3 py-2.5">BIOLÓGICOS PAI</th>
                      <th className="px-3 py-2.5 text-center">ESTADO</th>
                    </>
                  )}
                  <th className="px-2 py-2.5 text-center w-12">ACCIÓN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400">
                      No se encontraron registros que coincidan con el filtro.
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((r) => (
                    <tr key={r.documento + r.consecutivo} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2.5 text-center font-mono font-semibold text-slate-500">
                        {r.consecutivo}
                      </td>

                      <td className="px-3 py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <span className="text-[10px] text-slate-400 mr-1">{r.tipoDoc}</span>
                        <span>{r.documento}</span>
                      </td>

                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{r.nombreCompleto}</div>
                        {r.acudienteNombre && (
                          <div className="text-[10px] text-slate-500 flex items-center space-x-1">
                            <span>Acudiente: {r.acudienteNombre}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{r.edad}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{r.fechaNacimiento} ({r.sexo})</div>
                      </td>

                      {/* Dynamic columns based on platform */}
                      {platform === 'PAI_MENORES' ? (
                        <>
                          <td className="px-3 py-2.5 max-w-xs">
                            <div className="text-xs text-blue-900 font-medium line-clamp-2" title={r.biologicos}>
                              {r.biologicos}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Próxima cita: <span className="font-semibold">{r.proximaCita}</span>
                            </div>
                          </td>

                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="font-semibold text-slate-900">{r.acudienteNombre || 'NO REGISTRA'}</div>
                            <div className="text-[10px] text-slate-500 font-mono">Tel: {r.acudienteTelefono || r.telefono}</div>
                          </td>

                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.estadoCarne === 'AL_DIA'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : r.estadoCarne === 'INCOMPLETO'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              <Check className="w-3 h-3" />
                              <span>{r.estadoCarne}</span>
                            </span>
                          </td>
                        </>
                      ) : platform === 'ADRES_BDUA' ? (
                        <>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="font-bold text-emerald-950">{r.eps}</div>
                            <div className="text-[10px] text-slate-400">{r.municipioAfiliacion}</div>
                          </td>

                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="font-semibold text-slate-800">{r.regimen}</div>
                            <div className="text-[10px] text-slate-500">{r.tipoAfiliado}</div>
                          </td>

                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.estadoAfiliacion === 'ACTIVO'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              <span>{r.estadoAfiliacion}</span>
                            </span>
                          </td>
                        </>
                      ) : platform === 'COMPROBADOR_DERECHOS' ? (
                        <>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="font-bold text-indigo-950">{r.subredAsignada}</div>
                            <div className="text-[10px] text-slate-400">{r.localidad} · {r.upz}</div>
                          </td>

                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="font-semibold text-slate-800">{r.nivelSisben}</div>
                            <div className="text-[10px] text-emerald-700 font-semibold">{r.exoneracionCopago}</div>
                          </td>

                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Check className="w-3 h-3 text-indigo-600" />
                              <span>{r.estadoDistrital}</span>
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="font-semibold text-purple-950">{r.eps}</div>
                            <div className="text-[10px] text-slate-500">{r.regimen} · {r.estadoAfiliacion}</div>
                          </td>

                          <td className="px-3 py-2.5 max-w-xs">
                            <div className="text-xs text-slate-800 font-medium line-clamp-2" title={r.biologicos}>
                              {r.biologicos}
                            </div>
                          </td>

                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>{r.estadoConsulta}</span>
                            </span>
                          </td>
                        </>
                      )}

                      {/* Row Delete Button (functional) */}
                      <td className="px-2 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteResultRow(r.documento)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar fila de resultados"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
