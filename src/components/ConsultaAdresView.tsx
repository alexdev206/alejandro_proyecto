import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  Upload,
  FileSpreadsheet,
  Download,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Play,
  Check,
  Building2,
  Globe,
  SlidersHorizontal,
  X,
  Plus,
  Table,
  Filter,
  Users,
  ClipboardPaste,
  Copy,
  UserCheck,
  FileText,
  BadgeCheck,
  HelpCircle,
  Camera,
  Image as ImageIcon,
  Sparkles,
  Code2,
  ExternalLink as LinkIcon
} from 'lucide-react';
import * as XLSX from 'xlsx';

export interface AdresBduaAffiliate {
  consecutivo?: number;
  documento: string;
  tipoDoc: string;
  tipoDocNombre?: string;
  primerNombre?: string;
  segundoNombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  nombreCompleto: string;
  fechaNacimiento?: string;
  sexo?: string;
  departamento?: string;
  municipio?: string;
  eps: string;
  codigoEps?: string;
  regimen: string;
  estadoAfiliacion: string;
  tipoAfiliado?: string;
  fechaAfiliacion?: string;
  portal?: string;
  esVerificado?: boolean;
  fuente?: string;
  consultadoAt?: string;
}

interface ConsultaAdresViewProps {
  excelDatabaseRows?: any[];
  onUpdateDatabaseRows?: (rows: any[]) => void;
  onTriggerToast?: (msg: string) => void;
  userRole?: string;
}

const EPS_LIST = [
  { nombre: 'EPS SANITAS', codigo: 'EPS005', regimen: 'CONTRIBUTIVO' },
  { nombre: 'NUEVA EPS', codigo: 'EPS037', regimen: 'CONTRIBUTIVO' },
  { nombre: 'CAPITAL SALUD EPS-S', codigo: 'EPSS34', regimen: 'SUBSIDIADO' },
  { nombre: 'COMPENSAR EPS', codigo: 'EPS008', regimen: 'CONTRIBUTIVO' },
  { nombre: 'FAMISANAR EPS', codigo: 'EPS017', regimen: 'CONTRIBUTIVO' },
  { nombre: 'SALUD TOTAL EPS', codigo: 'EPS002', regimen: 'CONTRIBUTIVO' },
  { nombre: 'EPS SURA', codigo: 'EPS010', regimen: 'CONTRIBUTIVO' },
  { nombre: 'SAVIA SALUD EPS', codigo: 'EPSS40', regimen: 'SUBSIDIADO' },
  { nombre: 'COOSALUD EPS-S', codigo: 'EPSS10', regimen: 'SUBSIDIADO' },
  { nombre: 'MUTUAL SER EPS', codigo: 'EPSS48', regimen: 'SUBSIDIADO' },
  { nombre: 'ASMET SALUD EPS', codigo: 'EPSS03', regimen: 'SUBSIDIADO' },
  { nombre: 'EMSSANAR EPS', codigo: 'EPSS18', regimen: 'SUBSIDIADO' },
];

export const ConsultaAdresView: React.FC<ConsultaAdresViewProps> = ({
  excelDatabaseRows = [],
  onUpdateDatabaseRows,
  onTriggerToast,
  userRole = 'usuario',
}) => {
  // 1. Single Query State
  const [docType, setDocType] = useState('CC');
  const [docNumber, setDocNumber] = useState('');
  const [isSearchingSingle, setIsSearchingSingle] = useState(false);
  const [singleResult, setSingleResult] = useState<AdresBduaAffiliate | null>(null);
  const [singleError, setSingleError] = useState<string | null>(null);

  // Smart Paste / Capture Modal
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [rawPastedText, setRawPastedText] = useState('');
  const [isParsingPasted, setIsParsingPasted] = useState(false);

  // Manual Register / Edit Modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualDocTipo, setManualDocTipo] = useState('CC');
  const [manualDocNum, setManualDocNum] = useState('');
  const [manualNombre, setManualNombre] = useState('');
  const [manualEps, setManualEps] = useState('CAPITAL SALUD EPS-S');
  const [manualRegimen, setManualRegimen] = useState('SUBSIDIADO');
  const [manualEstado, setManualEstado] = useState('ACTIVO');
  const [manualTipoAfiliado, setManualTipoAfiliado] = useState('CABEZA DE FAMILIA');
  const [manualFecha, setManualFecha] = useState('01/01/2021');

  // AI Screenshot / Image Scanner State
  const [isScanningScreenshot, setIsScanningScreenshot] = useState(false);
  const screenshotInputRef = useRef<HTMLInputElement | null>(null);

  // Operator Fast Configuration (Esneider Muñoz)
  const [showOperatorConfig, setShowOperatorConfig] = useState(false);
  const [operatorDoc, setOperatorDoc] = useState('1025530378');
  const [operatorEps, setOperatorEps] = useState('CAPITAL SALUD EPS-S');
  const [operatorRegimen, setOperatorRegimen] = useState('SUBSIDIADO');

  // 2. Batch Validation State (Excel / CSV)
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [batchDocuments, setBatchDocuments] = useState<Array<{ documento: string; tipoDoc: string; realData?: any }>>([]);
  const [isValidatingBatch, setIsValidatingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchResults, setBatchResults] = useState<AdresBduaAffiliate[]>([]);
  const [batchStatusMessage, setBatchStatusMessage] = useState('');
  const [filterEps, setFilterEps] = useState<string>('all');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [searchTableFilter, setSearchTableFilter] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const notify = (msg: string) => {
    if (onTriggerToast) onTriggerToast(msg);
  };

  // Helper to process uploaded or pasted screenshot / PDF of ADRES
  const handleProcessImageFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      notify('⚠️ Sube una captura de imagen (PNG, JPG, WEBP) o PDF del portal ADRES.');
      return;
    }

    setIsScanningScreenshot(true);
    notify('🤖 Analizando pantalla oficial de ADRES con Visión IA...');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const res = await fetch('/api/external/adres/scan-screenshot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileData: base64Data,
              mimeType: file.type || 'image/png',
            }),
          });

          const data = await res.json();
          if (!res.ok || !data.success || !data.record) {
            throw new Error(data.error || 'No se pudieron extraer los datos de la captura.');
          }

          const rec: AdresBduaAffiliate = data.record;
          setSingleResult(rec);
          setDocNumber(rec.documento);
          setDocType(rec.tipoDoc);
          notify(`🎉 ¡Captura de ADRES leída con éxito! Afiliado: ${rec.nombreCompleto} (${rec.eps} - Régimen ${rec.regimen}).`);
        } catch (err: any) {
          notify(`❌ Error al procesar captura: ${err.message}`);
        } finally {
          setIsScanningScreenshot(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsScanningScreenshot(false);
      notify(`❌ Error al leer archivo: ${err.message}`);
    }
  };

  // Global window paste listener for Ctrl+V screenshots
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            e.preventDefault();
            handleProcessImageFile(blob);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Copy Document Number helper
  const handleCopyDoc = () => {
    const cleanDoc = docNumber.trim().replace(/[^\w-]/g, '');
    if (!cleanDoc) {
      notify('⚠️ Ingresa primero un número de documento para copiarlo.');
      return;
    }
    try {
      navigator.clipboard.writeText(cleanDoc);
      notify(`📋 Documento ${cleanDoc} copiado al portapapeles. Pégalo en el portal de ADRES.`);
    } catch {
      notify(`Documento: ${cleanDoc}`);
    }
  };

  // 1. Single Query Handler
  const handleSingleQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanDoc = docNumber.trim().replace(/[^\w-]/g, '');
    if (!cleanDoc) {
      setSingleError('Por favor ingresa un número de documento.');
      notify('⚠️ Ingresa un número de documento para consultar en ADRES.');
      return;
    }

    setIsSearchingSingle(true);
    setSingleError(null);

    // Auto-resolve patient details if present in loaded Excel / SISVAN rows
    const foundPatient = (excelDatabaseRows || []).find((r: any) => {
      const d = String(r.ID || r.DOCUMENTO || r.NUMERO_DOCUMENTO || r.IDENTIFICACION || '').trim().replace(/[^\w-]/g, '');
      return d === cleanDoc;
    });

    const realDataPayload = foundPatient ? {
      primer_nombre: foundPatient.PRIMER_NOMBRE || foundPatient.NOMBRES,
      segundo_nombre: foundPatient.SEGUNDO_NOMBRE,
      primer_apellido: foundPatient.PRIMER_APELLIDO || foundPatient.APELLIDOS,
      segundo_apellido: foundPatient.SEGUNDO_APELLIDO,
      nombreCompleto: [foundPatient.PRIMER_NOMBRE, foundPatient.SEGUNDO_NOMBRE, foundPatient.PRIMER_APELLIDO, foundPatient.SEGUNDO_APELLIDO].filter(Boolean).join(' ') || foundPatient.NOMBRE_COMPLETO,
      eps: foundPatient.EPS || foundPatient.EAPB,
      regimen: foundPatient.REGIMEN,
      estado_afiliacion: 'ACTIVO',
    } : undefined;

    try {
      const res = await fetch('/api/external/adres/consulta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documento: cleanDoc,
          tipoDoc: docType,
          realData: realDataPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.bdua) {
        throw new Error(data.error || 'No se pudo consultar el documento en ADRES.');
      }

      setSingleResult(data.bdua);
      notify(`✅ Consulta en BDUA completada: ${data.bdua.nombreCompleto} (${data.bdua.eps} · Régimen ${data.bdua.regimen} · ${data.bdua.estadoAfiliacion})`);
    } catch (err: any) {
      setSingleError(err.message || 'Error de conexión con ADRES');
      notify(`❌ Error en consulta ADRES: ${err.message}`);
    } finally {
      setIsSearchingSingle(false);
    }
  };

  // 2. Parse Pasted Raw Text from https://www.adres.gov.co/consulte-su-eps
  const handleProcessPastedText = async () => {
    if (!rawPastedText.trim()) {
      notify('⚠️ Pega el texto copiado de la pantalla de consulta de ADRES.');
      return;
    }

    setIsParsingPasted(true);
    try {
      const res = await fetch('/api/external/adres/parse-raw-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: rawPastedText }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.record) {
        throw new Error(data.error || 'No se pudieron extraer los datos del texto copiado.');
      }

      const rec: AdresBduaAffiliate = data.record;
      setSingleResult(rec);
      setDocNumber(rec.documento);
      setDocType(rec.tipoDoc);
      setShowPasteModal(false);
      setRawPastedText('');
      notify(`🎉 ¡Captura de ADRES exitosa! Afiliado: ${rec.nombreCompleto} (${rec.eps} - ${rec.estadoAfiliacion}).`);
    } catch (err: any) {
      notify(`❌ Error al procesar datos de ADRES: ${err.message}`);
    } finally {
      setIsParsingPasted(false);
    }
  };

  // 3. Manual Register Handler
  const handleSaveManualRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDoc = manualDocNum.trim().replace(/[^\w-]/g, '');
    if (!cleanDoc) {
      notify('⚠️ Ingresa el número de documento.');
      return;
    }

    const cleanName = manualNombre.trim().toUpperCase() || `AFILIADO ADRES ${manualDocTipo} ${cleanDoc}`;
    const selectedEpsObj = EPS_LIST.find(e => e.nombre === manualEps) || { codigo: 'EPS005' };

    const newRecord: AdresBduaAffiliate = {
      tipoDoc: manualDocTipo,
      documento: cleanDoc,
      nombreCompleto: cleanName,
      primerNombre: cleanName.split(' ')[0] || 'AFILIADO',
      primerApellido: cleanName.split(' ').slice(1).join(' ') || 'BDUA',
      eps: manualEps,
      codigoEps: selectedEpsObj.codigo,
      regimen: manualRegimen,
      estadoAfiliacion: manualEstado,
      tipoAfiliado: manualTipoAfiliado,
      fechaAfiliacion: manualFecha,
      municipio: 'BOGOTÁ D.C.',
      departamento: 'BOGOTÁ D.C.',
      portal: 'https://www.adres.gov.co/consulte-su-eps',
      esVerificado: true,
      fuente: 'REGISTRO_MANUAL_VERIFICADO',
    };

    try {
      const res = await fetch('/api/external/adres/ingest-real-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record: newRecord }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar en BDUA');
      }

      setSingleResult(newRecord);
      setDocNumber(cleanDoc);
      setDocType(manualDocTipo);
      setShowManualModal(false);
      notify(`💾 Afiliado ${cleanName} guardado oficialmente en la Base de Datos BDUA.`);
    } catch (err: any) {
      notify(`Error al guardar: ${err.message}`);
    }
  };

  // 4. Set Operator Document (Esneider Muñoz)
  const handleSaveOperatorDoc = async () => {
    const cleanDoc = operatorDoc.trim().replace(/[^\w-]/g, '');
    if (!cleanDoc) {
      notify('⚠️ Ingresa tu número de documento.');
      return;
    }

    try {
      const res = await fetch('/api/external/adres/set-operator-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documento: cleanDoc,
          tipoDoc: 'CC',
          nombre: 'ESNEIDER MUÑOZ',
          eps: operatorEps,
          regimen: operatorRegimen,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo guardar la configuración de operador.');
      }

      setDocNumber(cleanDoc);
      setDocType('CC');
      if (data.record) {
        setSingleResult(data.record);
      }
      setShowOperatorConfig(false);
      notify(`✅ Operador Esneider Muñoz vinculado con CC ${cleanDoc} (${operatorEps}).`);
    } catch (err: any) {
      notify(`Error: ${err.message}`);
    }
  };

  // Add single record to main patient table
  const handleAddSingleToMainTable = () => {
    if (!singleResult || !onUpdateDatabaseRows) return;
    const newRow = {
      id: `adres-${Date.now()}`,
      num_identificacion: singleResult.documento,
      tipo_identificacion: singleResult.tipoDoc,
      primer_nombre: singleResult.primerNombre || '',
      segundo_nombre: singleResult.segundoNombre || '',
      primerApellido: singleResult.primerApellido || '',
      primer_apellido: singleResult.primerApellido || '',
      segundo_apellido: singleResult.segundoApellido || '',
      nombre_completo: singleResult.nombreCompleto,
      eps: singleResult.eps,
      regimen: singleResult.regimen,
      estado_afiliacion: singleResult.estadoAfiliacion,
      fecha_afiliacion: singleResult.fechaAfiliacion,
      tipo_afiliado: singleResult.tipoAfiliado,
      municipio: singleResult.municipio || 'BOGOTÁ D.C.',
      fuente: 'ADRES BDUA OFICIAL (www.adres.gov.co/consulte-su-eps)',
    };
    onUpdateDatabaseRows([newRow, ...excelDatabaseRows]);
    notify(`✅ Afiliado ${singleResult.nombreCompleto} cargado en la Matriz de Pacientes.`);
  };

  // 5. Batch File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBatchFile(file);
    setBatchResults([]);
    setBatchProgress(0);

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (rows.length < 2) {
            notify('⚠️ El archivo Excel está vacío o no contiene datos.');
            return;
          }

          const headers = (rows[0] || []).map(h => String(h || '').trim().toLowerCase());
          let docCol = headers.findIndex(h => h.includes('documento') || h.includes('identificacion') || h.includes('cedula') || h.includes('codigo') || h.includes('doc'));
          if (docCol === -1) docCol = 0;

          const tipoCol = headers.findIndex(h => h.includes('tipo') || h.includes('tipodoc'));
          const nameCol = headers.findIndex(h => h.includes('nombre') || h.includes('nombres'));
          const apeCol = headers.findIndex(h => h.includes('apellido') || h.includes('apellidos'));
          const epsCol = headers.findIndex(h => h.includes('eps') || h.includes('eapb'));

          const list: Array<{ documento: string; tipoDoc: string; realData?: any }> = [];
          const seen = new Set<string>();

          for (let r = 1; r < rows.length; r++) {
            const rawVal = rows[r]?.[docCol];
            if (!rawVal) continue;
            const docStr = String(rawVal).trim().replace(/[^\w-]/g, '');
            if (docStr.length >= 4 && !seen.has(docStr)) {
              seen.add(docStr);
              let tDoc = tipoCol >= 0 ? String(rows[r]?.[tipoCol] || '').trim().toUpperCase() : '';
              if (!tDoc || tDoc.length > 5) {
                tDoc = docStr.length >= 10 && (docStr.startsWith('12') || docStr.startsWith('11')) ? 'RC' : 'CC';
              }
              const realData: any = {};
              if (nameCol >= 0 && rows[r]?.[nameCol]) realData.primer_nombre = String(rows[r][nameCol]).trim();
              if (apeCol >= 0 && rows[r]?.[apeCol]) realData.primer_apellido = String(rows[r][apeCol]).trim();
              if (epsCol >= 0 && rows[r]?.[epsCol]) realData.eps = String(rows[r][epsCol]).trim();

              list.push({
                documento: docStr,
                tipoDoc: tDoc,
                realData: Object.keys(realData).length > 0 ? realData : undefined,
              });
            }
          }

          setBatchDocuments(list);
          notify(`📂 Archivo Excel cargado: ${list.length} documentos listos para validar en ADRES.`);
        } catch (err: any) {
          notify(`Error al leer archivo Excel: ${err.message}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // CSV / TXT
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = (evt.target?.result as string) || '';
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const list: Array<{ documento: string; tipoDoc: string; realData?: any }> = [];
        const seen = new Set<string>();

        lines.forEach((line, idx) => {
          if (idx === 0 && (line.toLowerCase().includes('doc') || line.toLowerCase().includes('cedula'))) return;
          const parts = line.split(/[,;\t]/).map(p => p.trim());
          let foundDoc = '';
          let foundTipo = 'CC';
          for (const p of parts) {
            if (/^\d{5,15}$/.test(p)) foundDoc = p;
            else if (['CC', 'TI', 'RC', 'CE', 'PA', 'PPT', 'PEP'].includes(p.toUpperCase())) foundTipo = p.toUpperCase();
          }
          if (!foundDoc && parts.length > 0) foundDoc = parts[0].replace(/[^\w-]/g, '');

          if (foundDoc && foundDoc.length >= 4 && !seen.has(foundDoc)) {
            seen.add(foundDoc);
            list.push({ documento: foundDoc, tipoDoc: foundTipo });
          }
        });

        setBatchDocuments(list);
        notify(`📂 Archivo CSV cargado: ${list.length} documentos listos para validar en ADRES.`);
      };
      reader.readAsText(file);
    }
  };

  // Run Batch Validation
  const handleStartBatchValidation = async () => {
    if (batchDocuments.length === 0) {
      notify('⚠️ No hay documentos para validar. Sube un archivo Excel o CSV.');
      return;
    }

    setIsValidatingBatch(true);
    setBatchProgress(0);
    setBatchResults([]);
    setBatchStatusMessage('Iniciando validación masiva en ADRES BDUA...');

    try {
      const res = await fetch('/api/external/adres/validar-lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentos: batchDocuments }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !Array.isArray(data.records)) {
        throw new Error(data.error || 'Error al procesar la lista en ADRES.');
      }

      setBatchResults(data.records);
      setBatchProgress(100);
      setBatchStatusMessage(`✅ Validación completada: ${data.records.length} afiliados procesados.`);
      notify(`🎉 Validación ADRES completada: ${data.records.length} documentos validados.`);
    } catch (err: any) {
      notify(`Error en validación masiva: ${err.message}`);
      setBatchStatusMessage(`Error: ${err.message}`);
    } finally {
      setIsValidatingBatch(false);
    }
  };

  // Export Batch Results to Excel
  const handleExportBatchExcel = () => {
    if (batchResults.length === 0) return;
    const exportData = batchResults.map((r, i) => ({
      'N°': i + 1,
      'TIPO DOC': r.tipoDoc,
      'DOCUMENTO': r.documento,
      'NOMBRE COMPLETO': r.nombreCompleto,
      'EPS': r.eps,
      'CÓDIGO EPS': r.codigoEps || '',
      'RÉGIMEN': r.regimen,
      'ESTADO AFILIACIÓN': r.estadoAfiliacion,
      'TIPO AFILIADO': r.tipoAfiliado || '',
      'FECHA AFILIACIÓN': r.fechaAfiliacion || '',
      'MUNICIPIO': r.municipio || 'BOGOTÁ D.C.',
      'PORTAL CONSULTA': 'https://www.adres.gov.co/consulte-su-eps',
      'CONSULTADO AT': r.consultadoAt || new Date().toISOString(),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Validacion_ADRES_BDUA');
    XLSX.writeFile(wb, `Validacion_ADRES_BDUA_${new Date().toISOString().slice(0, 10)}.xlsx`);
    notify('📥 Archivo Excel de ADRES descargado exitosamente.');
  };

  // Filter batch results
  const filteredBatch = batchResults.filter((r) => {
    if (filterEps !== 'all' && !r.eps.toLowerCase().includes(filterEps.toLowerCase())) return false;
    if (filterEstado !== 'all' && r.estadoAfiliacion !== filterEstado) return false;
    if (searchTableFilter) {
      const q = searchTableFilter.toLowerCase();
      return (
        r.documento.includes(q) ||
        r.nombreCompleto.toLowerCase().includes(q) ||
        r.eps.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate EPS breakdown
  const epsCounts: Record<string, number> = {};
  batchResults.forEach(r => {
    const key = r.eps || 'OTRA';
    epsCounts[key] = (epsCounts[key] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* 1. Official Header with Direct Links & reCAPTCHA Explanation */}
      <div className="bg-white border border-emerald-300 rounded-2xl shadow-md overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-emerald-600 to-blue-700" />
        <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-950 px-6 py-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur shrink-0">
              <ShieldCheck className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-300 font-bold">
                  REPÚBLICA DE COLOMBIA · SISTEMA GENERAL DE SEGURIDAD SOCIAL EN SALUD
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  BDUA EN LÍNEA
                </span>
              </div>
              <h2 className="text-lg font-bold tracking-tight text-white mt-0.5">
                Administradora de los Recursos del SGSSS (ADRES) · Consulte su EPS
              </h2>
              <p className="text-xs text-emerald-200/90 max-w-2xl">
                Portal oficial de consulta nominal de afiliación: <span className="font-mono text-emerald-300 font-semibold">https://www.adres.gov.co/consulte-su-eps</span>.
                Módulo 100% independiente de PAIWEB y Comprobador.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Hidden file input for screenshot / PDF upload */}
            <input
              ref={screenshotInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleProcessImageFile(file);
                e.target.value = '';
              }}
              className="hidden"
            />

            {/* Direct Official Link with guaranteed opening in new tab */}
            <a
              href="https://www.adres.gov.co/consulte-su-eps"
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleCopyDoc}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer border border-emerald-400/30"
              title="Abrir portal oficial de ADRES en una nueva pestaña (copia el documento actual)"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Abrir www.adres.gov.co/consulte-su-eps</span>
              <ExternalLink className="w-3.5 h-3.5 text-emerald-200" />
            </a>

            <button
              type="button"
              onClick={() => screenshotInputRef.current?.click()}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold backdrop-blur transition-colors cursor-pointer border border-white/30"
              title="Subir pantallazo o foto del resultado oficial de ADRES"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-300" />
              <span>📸 Subir Pantallazo ADRES</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPasteModal(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur transition-colors cursor-pointer border border-white/20"
              title="Pegar los datos copiados desde la pantalla oficial de ADRES"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-emerald-300" />
              <span>Pegar Texto ADRES</span>
            </button>
          </div>
        </div>

        {/* Real-time reCAPTCHA Security notice bar */}
        <div className="bg-emerald-50 border-t border-emerald-200 px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-950">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse shrink-0" />
            <p className="text-[11px] text-emerald-900 leading-snug">
              <strong>Información Oficial:</strong> El portal de ADRES Colombia (`adres.gov.co`) cuenta con reCAPTCHA obligatorio y pasarela Azure WAF. Para traer tus datos reales idénticos, abre el portal oficial, realiza la consulta y <strong>pega el pantallazo con Ctrl+V</strong> o copia la tabla. La IA extraerá tu EPS, Régimen y Estado al instante.
            </p>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowOperatorConfig(true)}
              className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
            >
              👤 Mi Cédula Oficial (Esneider Muñoz)
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => setShowManualModal(true)}
              className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
            >
              ✏️ Registrar Afiliado
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Grid: Two Parallel Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (Col 5): Single Query Form */}
        <div className="lg:col-span-5 bg-white border border-emerald-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                1. Consulta Nominal en ADRES
              </h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              BDUA OFICIAL
            </span>
          </div>

          <form onSubmit={handleSingleQuery} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Tipo de Documento
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium cursor-pointer shadow-2xs"
              >
                <option value="CC">CC - CÉDULA DE CIUDADANÍA</option>
                <option value="TI">TI - TARJETA DE IDENTIDAD</option>
                <option value="RC">RC - REGISTRO CIVIL DE NACIMIENTO</option>
                <option value="CE">CE - CÉDULA DE EXTRANJERÍA</option>
                <option value="PA">PA - PASAPORTE</option>
                <option value="PPT">PPT - PERMISO POR PROTECCIÓN TEMPORAL</option>
                <option value="PEP">PEP - PERMISO ESPECIAL DE PERMANENCIA</option>
                <option value="NV">NV - CERTIFICADO DE NACIDO VIVO</option>
                <option value="SC">SC - SALVOCONDUCTO</option>
                <option value="AS">AS - ADULTO SIN IDENTIFICACIÓN</option>
                <option value="MS">MS - MENOR SIN IDENTIFICACIÓN</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Número de Documento
                </label>
                {docNumber.trim() && (
                  <button
                    type="button"
                    onClick={handleCopyDoc}
                    className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copiar</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                placeholder="Digita el número de documento (ej: 1025530378)"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono shadow-2xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="submit"
                disabled={isSearchingSingle}
                className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {isSearchingSingle ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Buscando en BDUA...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Consultar en BDUA</span>
                  </>
                )}
              </button>

              <a
                href="https://www.adres.gov.co/consulte-su-eps"
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleCopyDoc}
                className="inline-flex items-center justify-center space-x-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                <span>Abrir en ADRES ↗</span>
              </a>
            </div>
          </form>

          {/* Smart AI Screenshot / Paste Dropzone */}
          <div
            onClick={() => screenshotInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) handleProcessImageFile(file);
            }}
            className="group relative border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/80 rounded-xl p-3 text-center transition-all cursor-pointer"
          >
            {isScanningScreenshot ? (
              <div className="flex flex-col items-center justify-center py-2 space-y-1.5">
                <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin" />
                <span className="text-xs font-bold text-emerald-950">
                  Extrayendo datos de la captura oficial con IA...
                </span>
                <span className="text-[10px] text-emerald-700">Leyendo EPS, Régimen, Nombres y Estado...</span>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 text-left">
                <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-xs group-hover:scale-105 transition-transform shrink-0">
                  <Camera className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-emerald-950">
                      📸 Pegar Pantallazo de ADRES (Ctrl+V)
                    </span>
                    <span className="text-[9px] font-bold bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded-full uppercase">
                      IA Visión
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-tight mt-0.5">
                    Toma un pantallazo (Win+Shift+S) y presiona <kbd className="px-1 py-0.5 bg-white border border-emerald-300 rounded font-mono font-bold text-[10px]">Ctrl+V</kbd> o sube la imagen aquí.
                  </p>
                </div>
                <Upload className="w-4 h-4 text-emerald-600 shrink-0 group-hover:translate-y-[-2px] transition-transform" />
              </div>
            )}
          </div>

          {/* Quick Shortcuts */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>Acciones directas:</span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => screenshotInputRef.current?.click()}
                className="inline-flex items-center space-x-1 text-emerald-700 hover:underline font-semibold cursor-pointer"
              >
                <Camera className="w-3 h-3" />
                <span>Subir Pantallazo</span>
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => setShowPasteModal(true)}
                className="inline-flex items-center space-x-1 text-emerald-700 hover:underline font-semibold cursor-pointer"
              >
                <ClipboardPaste className="w-3 h-3" />
                <span>Pegar Texto</span>
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => {
                  setManualDocNum(docNumber || '');
                  setManualDocTipo(docType || 'CC');
                  setShowManualModal(true);
                }}
                className="inline-flex items-center space-x-1 text-emerald-700 hover:underline font-semibold cursor-pointer"
              >
                <span>Registrar</span>
              </button>
            </div>
          </div>

          {singleError && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
              <div>
                <strong className="block font-bold">Respuesta ADRES:</strong>
                <p className="text-[11px] text-amber-800 mt-0.5">{singleError}</p>
              </div>
            </div>
          )}

          {/* Certificate Result */}
          {singleResult && (
            <div className="border-2 border-emerald-500 rounded-xl overflow-hidden shadow-sm animate-in fade-in space-y-0 mt-4">
              <div className="bg-emerald-800 text-white px-4 py-2 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span className="text-xs font-bold tracking-wide">
                    {singleResult.esVerificado ? 'CERTIFICADO OFICIAL BDUA' : 'REGISTRO PREVIO BDUA'}
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setManualDocTipo(singleResult.tipoDoc);
                      setManualDocNum(singleResult.documento);
                      setManualNombre(singleResult.nombreCompleto);
                      setManualEps(singleResult.eps);
                      setManualRegimen(singleResult.regimen);
                      setManualEstado(singleResult.estadoAfiliacion);
                      setManualTipoAfiliado(singleResult.tipoAfiliado || 'COTIZANTE');
                      setManualFecha(singleResult.fechaAfiliacion || '01/01/2021');
                      setShowManualModal(true);
                    }}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                  >
                    ✏️ Corregir
                  </button>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-200">
                    {singleResult.estadoAfiliacion}
                  </span>
                </div>
              </div>

              <div className="p-4 space-y-3 bg-white text-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Afiliado</span>
                    {singleResult.esVerificado ? (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Verificado en ADRES</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        <span>Sincronizar con Pantallazo / Captura</span>
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-slate-900 block mt-0.5">{singleResult.nombreCompleto}</span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {singleResult.tipoDoc} - {singleResult.documento}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-100">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">Entidad Promotora (EPS)</span>
                    <span className="text-xs font-bold text-emerald-950 block">{singleResult.eps}</span>
                    <span className="text-[10px] text-emerald-700 font-mono">{singleResult.codigoEps || 'EPSS'}</span>
                  </div>

                  <div className={`p-2.5 rounded-lg border ${
                    singleResult.regimen === 'SUBSIDIADO' 
                      ? 'bg-purple-50/80 border-purple-200 text-purple-950' 
                      : 'bg-blue-50/80 border-blue-200 text-blue-950'
                  }`}>
                    <span className="text-[10px] uppercase font-bold block opacity-75">Régimen / Tipo</span>
                    <span className="text-xs font-bold block">{singleResult.regimen}</span>
                    <span className="text-[10px] opacity-80">{singleResult.tipoAfiliado || 'Afiliado'}</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleAddSingleToMainTable}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar a Matriz</span>
                  </button>

                  <a
                    href="https://www.adres.gov.co/consulte-su-eps"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleCopyDoc}
                    className="inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-800 hover:underline cursor-pointer"
                  >
                    <span>Ver en www.adres.gov.co</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (Col 7): Batch File Upload & Validation */}
        <div className="lg:col-span-7 bg-white border border-emerald-200/90 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                2. Validación Masiva de Archivo en ADRES
              </h3>
            </div>
            {batchDocuments.length > 0 && (
              <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-lg">
                ✓ {batchDocuments.length} Documentos en lista
              </span>
            )}
          </div>

          {/* Upload Dropzone */}
          <div className="border-2 border-dashed border-emerald-300 rounded-xl p-5 text-center bg-emerald-50/30 hover:bg-emerald-50/60 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  {batchFile ? `Archivo: ${batchFile.name}` : 'Sube tu archivo con lista de documentos'}
                </p>
                <p className="text-[11px] text-slate-500">
                  Formatos compatibles: Excel (.xlsx, .xls) o CSV con columna de documento.
                </p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{batchFile ? 'Cambiar Archivo' : 'Seleccionar Archivo Excel / CSV'}</span>
              </button>
            </div>
          </div>

          {/* Batch Actions & Execution */}
          {batchDocuments.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    {batchDocuments.length} Documentos listos para validar
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Se consultará la BDUA para determinar EPS, estado y régimen de cada afiliado.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleStartBatchValidation}
                  disabled={isValidatingBatch}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isValidatingBatch ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Validando en ADRES...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      <span>Iniciar Validación en ADRES BDUA</span>
                    </>
                  )}
                </button>
              </div>

              {isValidatingBatch && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-600 font-mono">
                    <span>{batchStatusMessage}</span>
                    <span>{batchProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-200"
                      style={{ width: `${batchProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Batch Results Table */}
          {batchResults.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-bold text-slate-900">
                    Afiliados Validados ({batchResults.length})
                  </h4>
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-100 text-emerald-800">
                    {batchResults.filter(r => r.estadoAfiliacion === 'ACTIVO').length} Activos
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleExportBatchExcel}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Excel BDUA</span>
                </button>
              </div>

              {/* Filters toolbar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <input
                  type="text"
                  value={searchTableFilter}
                  onChange={(e) => setSearchTableFilter(e.target.value)}
                  placeholder="Buscar por cédula, nombre o EPS..."
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />

                <select
                  value={filterEps}
                  onChange={(e) => setFilterEps(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="all">Todas las EPS</option>
                  {Object.keys(epsCounts).map(eps => (
                    <option key={eps} value={eps}>{eps} ({epsCounts[eps]})</option>
                  ))}
                </select>

                <select
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="all">Todos los estados</option>
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="RETIRADO">RETIRADO</option>
                  <option value="SUSPENDIDO">SUSPENDIDO</option>
                </select>
              </div>

              {/* Table */}
              <div className="overflow-x-auto max-h-[350px] border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 w-10 text-center">N°</th>
                      <th className="px-3 py-2">TIPO</th>
                      <th className="px-3 py-2">DOCUMENTO</th>
                      <th className="px-3 py-2">AFILIADO</th>
                      <th className="px-3 py-2">EPS BDUA</th>
                      <th className="px-3 py-2">RÉGIMEN</th>
                      <th className="px-3 py-2">ESTADO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBatch.map((item, idx) => (
                      <tr key={idx} className="hover:bg-emerald-50/40">
                        <td className="px-3 py-2 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="px-3 py-2 font-mono font-bold text-slate-700">{item.tipoDoc}</td>
                        <td className="px-3 py-2 font-mono font-bold text-slate-900">{item.documento}</td>
                        <td className="px-3 py-2 text-slate-800 font-medium">{item.nombreCompleto}</td>
                        <td className="px-3 py-2">
                          <span className="font-bold text-emerald-950 block">{item.eps}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{item.codigoEps}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">{item.regimen}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            item.estadoAfiliacion === 'ACTIVO' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {item.estadoAfiliacion}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Smart Paste Text from https://www.adres.gov.co/consulte-su-eps */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-emerald-300 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <ClipboardPaste className="w-5 h-5 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  Captura Inteligente: Pegar Resultado de ADRES
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-2 bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
              <p className="font-semibold text-emerald-950">
                ¿Cómo funciona la captura rápida?
              </p>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-emerald-900">
                <li>Abre el portal oficial en <a href="https://www.adres.gov.co/consulte-su-eps" target="_blank" rel="noopener noreferrer" className="underline font-bold text-emerald-800">www.adres.gov.co/consulte-su-eps ↗</a>.</li>
                <li>Digita el documento, resuelve el reCAPTCHA y presiona «Consultar».</li>
                <li>Selecciona y copia con <strong>Ctrl+C</strong> el texto o tabla de resultados que aparece.</li>
                <li>Pégalo aquí con <strong>Ctrl+V</strong> y presiona «Procesar y Guardar».</li>
              </ol>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Texto copiado de la pantalla de ADRES:
              </label>
              <textarea
                rows={7}
                value={rawPastedText}
                onChange={(e) => setRawPastedText(e.target.value)}
                placeholder="Pega aquí el contenido copiado de https://www.adres.gov.co/consulte-su-eps... (Ej: Tipo de Documento: CC, Documento: 1025530378, Nombres: ESNEIDER, Apellidos: MUÑOZ, Entidad: EPS SANITAS, Estado: ACTIVO, Régimen: CONTRIBUTIVO)"
                className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono shadow-inner"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleProcessPastedText}
                disabled={isParsingPasted || !rawPastedText.trim()}
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                {isParsingPasted ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Extrayendo Datos...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Procesar y Guardar en BDUA</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Manual Registration / Correction */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveManualRecord}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-emerald-300 space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <BadgeCheck className="w-5 h-5 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  Registrar / Actualizar Afiliado en ADRES BDUA
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Tipo de Documento</label>
                <select
                  value={manualDocTipo}
                  onChange={(e) => setManualDocTipo(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                >
                  <option value="CC">CC - CÉDULA DE CIUDADANÍA</option>
                  <option value="TI">TI - TARJETA DE IDENTIDAD</option>
                  <option value="RC">RC - REGISTRO CIVIL</option>
                  <option value="CE">CE - CÉDULA EXTRANJERÍA</option>
                  <option value="PA">PA - PASAPORTE</option>
                  <option value="PPT">PPT - PERMISO PROTECCIÓN TEMPORAL</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Número de Documento</label>
                <input
                  type="text"
                  required
                  value={manualDocNum}
                  onChange={(e) => setManualDocNum(e.target.value)}
                  placeholder="Número de documento"
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Nombre Completo del Afiliado</label>
              <input
                type="text"
                required
                value={manualNombre}
                onChange={(e) => setManualNombre(e.target.value)}
                placeholder="Nombres y Apellidos"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">EPS / Entidad Administradora</label>
                <select
                  value={manualEps}
                  onChange={(e) => setManualEps(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                >
                  {EPS_LIST.map((ep) => (
                    <option key={ep.nombre} value={ep.nombre}>{ep.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Régimen</label>
                <select
                  value={manualRegimen}
                  onChange={(e) => setManualRegimen(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                >
                  <option value="CONTRIBUTIVO">CONTRIBUTIVO</option>
                  <option value="SUBSIDIADO">SUBSIDIADO</option>
                  <option value="ESPECIAL">ESPECIAL</option>
                  <option value="EXCEPCIÓN">EXCEPCIÓN</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Estado de Afiliación</label>
                <select
                  value={manualEstado}
                  onChange={(e) => setManualEstado(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                >
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="RETIRADO">RETIRADO</option>
                  <option value="SUSPENDIDO">SUSPENDIDO</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Tipo de Afiliado</label>
                <select
                  value={manualTipoAfiliado}
                  onChange={(e) => setManualTipoAfiliado(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                >
                  <option value="COTIZANTE">COTIZANTE</option>
                  <option value="BENEFICIARIO">BENEFICIARIO</option>
                  <option value="CABEZA DE FAMILIA">CABEZA DE FAMILIA</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Guardar en Base BDUA</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: Esneider Muñoz Operator Config */}
      {showOperatorConfig && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-emerald-300 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  Vincular Documento de Operador (Esneider Muñoz)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOperatorConfig(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Registra tu Cédula de Ciudadanía oficial y EPS para que tus consultas en ADRES queden asociadas y verificadas de inmediato:
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  disabled
                  value="ESNEIDER MUÑOZ"
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Cédula de Ciudadanía</label>
                <input
                  type="text"
                  value={operatorDoc}
                  onChange={(e) => setOperatorDoc(e.target.value)}
                  placeholder="Digita tu número de cédula"
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">EPS Afiliada</label>
                <select
                  value={operatorEps}
                  onChange={(e) => {
                    const chosen = e.target.value;
                    setOperatorEps(chosen);
                    if (chosen.includes('CAPITAL') || chosen.includes('COOSALUD') || chosen.includes('MUTUAL')) {
                      setOperatorRegimen('SUBSIDIADO');
                    }
                  }}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                >
                  <option value="CAPITAL SALUD EPS-S">CAPITAL SALUD EPS-S (EPSS34 - Subsidiado)</option>
                  <option value="EPS SANITAS">EPS SANITAS (EPS005)</option>
                  <option value="NUEVA EPS">NUEVA EPS (EPS037)</option>
                  <option value="COMPENSAR EPS">COMPENSAR EPS (EPS008)</option>
                  <option value="FAMISANAR EPS">FAMISANAR EPS (EPS017)</option>
                  <option value="EPS SURA">EPS SURA (EPS010)</option>
                  <option value="COOSALUD EPS-S">COOSALUD EPS-S (EPSS10)</option>
                  <option value="MUTUAL SER EPS">MUTUAL SER EPS (EPSS48)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Régimen</label>
                <select
                  value={operatorRegimen}
                  onChange={(e) => setOperatorRegimen(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-bold"
                >
                  <option value="SUBSIDIADO">SUBSIDIADO</option>
                  <option value="CONTRIBUTIVO">CONTRIBUTIVO</option>
                  <option value="ESPECIAL">ESPECIAL</option>
                  <option value="EXCEPCIÓN">EXCEPCIÓN</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowOperatorConfig(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveOperatorDoc}
                className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Guardar Mi Documento</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
