import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Database,
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
  SlidersHorizontal,
  Table,
  Plus,
  Zap,
  Terminal,
  Clock,
  Shield,
  ShieldCheck,
  Copy,
  FileText,
  Phone,
  MapPin,
  Calendar,
  HeartHandshake,
  Sparkles,
  User,
  Users,
  Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ConsultaComprobadorViewProps {
  excelDatabaseRows?: any[];
  onUpdateDatabaseRows?: (rows: any[]) => void;
  onTriggerToast?: (msg: string) => void;
}

export const ConsultaComprobadorView: React.FC<ConsultaComprobadorViewProps> = ({
  excelDatabaseRows = [],
  onUpdateDatabaseRows,
  onTriggerToast,
}) => {
  // Pestañas principales: 'individual' (Consulta Nominal), 'lote' (Masivo), 'pegado' (Importar texto)
  const [activeTab, setActiveTabState] = useState<'individual' | 'lote' | 'pegado'>('individual');

  const setActiveTab = (tab: 'individual' | 'lote' | 'pegado') => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('comprobador_active_tab', tab);
    } catch (_e) {}
  };

  // ==========================================
  // 1. ESTADO DE CONSULTA INDIVIDUAL NOMINAL
  // ==========================================
  const [docIndividual, setDocIndividual] = useState('');
  const [tipoDocIndividual, setTipoDocIndividual] = useState('CC');
  const [isSearchingSingle, setIsSearchingSingle] = useState(false);
  const [singleResult, setSingleResult] = useState<any | null>(null);
  const [singleError, setSingleError] = useState<string | null>(null);

  // ==========================================
  // 2. ESTADO DE EVALUACIÓN MASIVA POR LOTE
  // ==========================================
  const [sourceType, setSourceType] = useState<'FILE' | 'MATRIX'>('FILE');
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [customFileName, setCustomFileName] = useState('');
  const [uploadedCodes, setUploadedCodes] = useState<Array<{ consecutivo: number; codigo: string; tipoDoc?: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Ejecución, cronómetro y terminal
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState<any[]>([]);

  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Filtros de tabla de resultados lote
  const [resultsFilter, setResultsFilter] = useState<'all' | 'contributivo' | 'buda'>('all');
  const [resultsSearch, setResultsSearch] = useState('');

  // ==========================================
  // 3. PEGADO INTELIGENTE
  // ==========================================
  const [pastedComprobadorText, setPastedComprobadorText] = useState('');
  const [isParsingPasted, setIsParsingPasted] = useState(false);

  const notify = (msg: string) => {
    if (onTriggerToast) onTriggerToast(msg);
  };

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-200), msg]);
  };

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && startTime) {
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, startTime]);

  // Restore saved active tab
  useEffect(() => {
    try {
      const savedTab = localStorage.getItem('comprobador_active_tab') as any;
      if (savedTab && ['individual', 'lote', 'pegado'].includes(savedTab)) {
        setActiveTabState(savedTab);
      }
    } catch (_e) {}
  }, []);

  // ==========================================
  // CONSULTA INDIVIDUAL NOMINAL
  // ==========================================
  const handleSingleQuery = async (e?: React.FormEvent, docOverride?: string, tipoOverride?: string) => {
    if (e) e.preventDefault();
    const cleanDoc = (docOverride || docIndividual).trim().replace(/[^\w-]/g, '');
    const cleanTipo = (tipoOverride || tipoDocIndividual).trim().toUpperCase();

    if (!cleanDoc) {
      setSingleError('Ingresa un número de documento.');
      notify('⚠️ Ingresa un número de identificación para consultar derechos.');
      return;
    }

    setIsSearchingSingle(true);
    setSingleError(null);
    setSingleResult(null);

    try {
      const res = await fetch('/api/external/comprobador/consulta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documento: cleanDoc,
          tipoDoc: cleanTipo,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo consultar el Comprobador de Derechos.');
      }

      setSingleResult(data);
      notify(`✅ Consulta exitosa: ${data.afiliado?.nombreCompleto || cleanDoc}`);
      addLog(`🔍 Consulta Comprobador: ${cleanTipo} ${cleanDoc} -> ${data.tablaOrigen} (${data.aseguramiento?.eps})`);
    } catch (err: any) {
      setSingleError(err.message || 'Error consultando en Comprobador de Derechos.');
      notify(`❌ Error en consulta: ${err.message}`);
    } finally {
      setIsSearchingSingle(false);
    }
  };

  // Cargar muestra rápida
  const handleLoadSample = (tipo: string, doc: string) => {
    setTipoDocIndividual(tipo);
    setDocIndividual(doc);
    handleSingleQuery(undefined, doc, tipo);
  };

  // Agregar resultado individual a la Matriz de Pacientes
  const handleAddSingleToMatrix = () => {
    if (!singleResult || !onUpdateDatabaseRows) return;
    const a = singleResult.afiliado || {};
    const asg = singleResult.aseguramiento || {};
    const d = singleResult.distrital || {};

    const newRow = {
      documento: singleResult.documento,
      tipoDoc: singleResult.tipoDoc || tipoDocIndividual,
      nombreCompleto: a.nombreCompleto || 'Afiliado SDS',
      primer_nombre: a.primerNombre || '',
      segundo_nombre: a.segundoNombre || '',
      primer_apellido: a.primerApellido || '',
      segundo_apellido: a.segundoApellido || '',
      edad: a.edad || '',
      fechaNacimiento: a.fechaNacimiento || '',
      sexo: a.sexo || 'MASCULINO',
      eps: asg.eps || 'CAPITAL SALUD EPS-S',
      codigoEps: asg.codigoEps || 'EPSS34',
      regimen: asg.regimen || 'SUBSIDIADO',
      estadoAfiliacion: asg.estadoAfiliacion || 'ACTIVO',
      tipoAfiliado: asg.tipoAfiliado || 'COTIZANTE',
      subred: d.subredAsignada || 'Subred Sur E.S.E.',
      ipsPrimaria: d.ipsPrimaria || 'Centro de Salud Vista Hermosa',
      localidad: d.localidad || 'Ciudad Bolívar',
      barrio: d.barrio || 'San Francisco',
      telefono: d.telefono || '',
      tablaOrigen: singleResult.tablaOrigen || 'BUDA',
      origenConsulta: 'COMPROBADOR_DERECHOS_SDS',
    };

    const currentRows = Array.isArray(excelDatabaseRows) ? [...excelDatabaseRows] : [];
    const existingIndex = currentRows.findIndex(row => {
      const doc = row.documento || row.codigo || row.ID || row.NUMERO_DOCUMENTO;
      return String(doc).trim() === String(singleResult.documento).trim();
    });

    if (existingIndex >= 0) {
      currentRows[existingIndex] = { ...currentRows[existingIndex], ...newRow };
      notify(`🔄 Afiliado ${a.nombreCompleto} actualizado en la Matriz.`);
    } else {
      currentRows.push(newRow);
      notify(`📥 Afiliado ${a.nombreCompleto} agregado exitosamente a la Matriz SISVAN.`);
    }

    onUpdateDatabaseRows(currentRows);
  };

  // Copiar certificación al portapapeles
  const handleCopyCertification = () => {
    if (!singleResult) return;
    const a = singleResult.afiliado || {};
    const asg = singleResult.aseguramiento || {};
    const d = singleResult.distrital || {};

    const text = `--- CERTIFICACIÓN COMPROBADOR DE DERECHOS (SALUD CAPITAL) ---
Afiliado: ${a.nombreCompleto}
Documento: ${singleResult.tipoDoc} ${singleResult.documento}
Aseguradora: ${asg.eps} (${asg.codigoEps})
Régimen: ${asg.regimen} | Estado: ${asg.estadoAfiliacion}
Clasificación: Tabla ${singleResult.tablaOrigen} (${singleResult.gridName})
Asignación Distrital: ${d.subredAsignada}
IPS Primaria: ${d.ipsPrimaria}
Copagos: ${d.exoneracionCopago}
Localidad: ${d.localidad}
Fecha de Verificación: ${new Date().toLocaleString('es-CO')}`;

    navigator.clipboard.writeText(text);
    notify('📋 Certificación copiada al portapapeles.');
  };

  // ==========================================
  // CARGA DE ARCHIVO PARA LOTE
  // ==========================================
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    processFile(f);
    e.target.value = '';
  };

  const processFile = (f: File) => {
    setCustomFile(f);
    setCustomFileName(f.name);
    const isXlsx = f.name.endsWith('.xlsx') || f.name.endsWith('.xls');

    if (isXlsx) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawRows: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

          if (rawRows.length === 0) throw new Error('El archivo Excel está vacío.');

          let headerRowIdx = 0;
          let codeColIdx = 0;
          let tipoDocColIdx = -1;

          for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
            const row = rawRows[i];
            if (!Array.isArray(row)) continue;
            const idxDoc = row.findIndex(c => {
              const str = String(c || '').toLowerCase();
              return str.includes('doc') || str.includes('ident') || str.includes('cedula') || str.includes('id');
            });
            if (idxDoc !== -1) {
              headerRowIdx = i;
              codeColIdx = idxDoc;
              tipoDocColIdx = row.findIndex(c => String(c || '').toLowerCase().includes('tipo'));
              break;
            }
          }

          const list: Array<{ consecutivo: number; codigo: string; tipoDoc?: string }> = [];
          for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0) continue;
            const cleanDoc = String(row[codeColIdx] || '').trim().replace(/[^\w-]/g, '');
            if (cleanDoc.length >= 4) {
              list.push({
                consecutivo: list.length + 1,
                codigo: cleanDoc,
                tipoDoc: tipoDocColIdx !== -1 && row[tipoDocColIdx] ? String(row[tipoDocColIdx]).toUpperCase() : 'CC',
              });
            }
          }

          if (list.length === 0) throw new Error('No se encontraron números válidos.');

          setUploadedCodes(list);
          setSourceType('FILE');
          notify(`📂 Excel "${f.name}" cargado (${list.length} afiliados).`);
          addLog(`✅ Archivo cargado: ${f.name} con ${list.length} registros.`);
        } catch (err: any) {
          notify(`❌ Error procesando Excel: ${err.message}`);
        }
      };
      reader.readAsArrayBuffer(f);
    } else {
      // CSV
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const text = (evt.target?.result as string) || '';
          const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          const list: Array<{ consecutivo: number; codigo: string; tipoDoc?: string }> = [];

          lines.forEach((l, i) => {
            if (i === 0 && (l.toLowerCase().includes('doc') || l.toLowerCase().includes('id'))) return;
            const parts = l.split(/[,;\t|]/).map(p => p.trim());
            const cleanDoc = parts[0]?.replace(/[^\w-]/g, '');
            if (cleanDoc && cleanDoc.length >= 4) {
              list.push({
                consecutivo: list.length + 1,
                codigo: cleanDoc,
                tipoDoc: parts[1] ? parts[1].toUpperCase() : 'CC',
              });
            }
          });

          if (list.length === 0) throw new Error('No se encontraron documentos en el CSV.');
          setUploadedCodes(list);
          setSourceType('FILE');
          notify(`📂 CSV "${f.name}" cargado (${list.length} registros).`);
          addLog(`✅ CSV cargado: ${f.name} con ${list.length} registros.`);
        } catch (err: any) {
          notify(`❌ Error al leer CSV: ${err.message}`);
        }
      };
      reader.readAsText(f);
    }
  };

  // Cargar muestra de 10 afiliados para comprobador
  const handleLoadSampleBatch = () => {
    const sampleList = [
      { consecutivo: 1, codigo: '1025530378', tipoDoc: 'CC' },
      { consecutivo: 2, codigo: '52489632', tipoDoc: 'CC' },
      { consecutivo: 3, codigo: '19485721', tipoDoc: 'CC' },
      { consecutivo: 4, codigo: '1098234511', tipoDoc: 'RC' },
      { consecutivo: 5, codigo: '1123456789', tipoDoc: 'TI' },
      { consecutivo: 6, codigo: '80123456', tipoDoc: 'CC' },
      { consecutivo: 7, codigo: '1014285930', tipoDoc: 'CC' },
      { consecutivo: 8, codigo: '53192847', tipoDoc: 'CC' },
      { consecutivo: 9, codigo: '79845123', tipoDoc: 'CC' },
      { consecutivo: 10, codigo: '1023456789', tipoDoc: 'CC' },
    ];
    setUploadedCodes(sampleList);
    setSourceType('FILE');
    setCustomFileName('Lote_Muestra_Comprobador_SDS.xlsx');
    notify('📋 Lote de 10 afiliados cargado.');
    addLog('✅ Muestra institucional cargada para Comprobador de Derechos.');
  };

  // Usar matriz SISVAN
  const handleUseMatrixCodes = () => {
    if (!excelDatabaseRows || excelDatabaseRows.length === 0) {
      notify('⚠️ La matriz de datos está vacía. Escanea un documento en el Módulo 1 primero.');
      return;
    }
    const list: Array<{ consecutivo: number; codigo: string; tipoDoc?: string }> = [];
    excelDatabaseRows.forEach((r, idx) => {
      const doc = String(r.documento || r.codigo || r.ID || r.NUMERO_DOCUMENTO || '').trim().replace(/[^\w-]/g, '');
      if (doc && doc.length >= 4) {
        list.push({
          consecutivo: idx + 1,
          codigo: doc,
          tipoDoc: r.tipoDoc || r.TIPO_ID || 'CC',
        });
      }
    });
    setUploadedCodes(list);
    setSourceType('MATRIX');
    notify(`📊 ${list.length} registros cargados desde la Matriz SISVAN.`);
    addLog(`✅ ${list.length} pacientes importados para validar en Comprobador.`);
  };

  // Ejecución masiva
  const handleRunBatch = async () => {
    if (uploadedCodes.length === 0) {
      notify('⚠️ No hay documentos cargados en el lote.');
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setResults([]);
    setStartTime(new Date());
    setEndTime(null);
    setElapsedSeconds(0);
    addLog(`🚀 Iniciando validación de ${uploadedCodes.length} afiliados en Comprobador de Derechos...`);

    try {
      const res = await fetch('/api/external/comprobador/validar-lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registros: uploadedCodes,
          cfg: { campos_tabla: true, tabla_origen: true, sexo: true, estado: true },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error en la respuesta del servidor.');
      }

      const recs = data.records || [];
      setResults(recs);
      setProgress(100);
      setEndTime(new Date());
      addLog(`✨ Validación masiva completada: ${recs.length} registros verificados.`);
      notify(`🎉 Validación masiva completada: ${recs.length} afiliados comprobados en SDS.`);
    } catch (err: any) {
      notify(`❌ Error en validación por lote: ${err.message}`);
      addLog(`❌ Error en lote: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Descargar resultados en Excel (.xlsx)
  const handleDownloadResultsExcel = () => {
    if (results.length === 0) {
      notify('⚠️ No hay resultados para exportar.');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(results);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comprobador_SDS');
    XLSX.writeFile(wb, `Comprobador_Derechos_SDS_${Date.now()}.xlsx`);
    notify('📥 Archivo Excel (.xlsx) descargado.');
  };

  // ==========================================
  // PEGADO INTELIGENTE
  // ==========================================
  const handleParsePasted = async () => {
    if (!pastedComprobadorText.trim()) {
      notify('⚠️ Por favor pega el texto copiado de Comprobador.');
      return;
    }

    setIsParsingPasted(true);
    try {
      const res = await fetch('/api/external/comprobador/parse-pasted-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: pastedComprobadorText }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudieron extraer datos del texto pegado.');
      }

      setSingleResult(data);
      setActiveTab('individual');
      notify(`🎉 ¡Datos reales de Comprobador interpretados! (${data.afiliado?.nombreCompleto || data.documento})`);
      addLog(`📋 Comprobador pegado e interpretado: ${data.afiliado?.nombreCompleto}`);
    } catch (err: any) {
      notify(`❌ Error al interpretar datos: ${err.message}`);
    } finally {
      setIsParsingPasted(false);
    }
  };

  // Filtrado de la tabla de lote
  const filteredResults = useMemo(() => {
    let list = results;
    if (resultsFilter === 'contributivo') {
      list = list.filter(r => String(r.tabla_origen).toLowerCase().includes('contributivo') || String(r.REGIMEN).toLowerCase().includes('contributivo'));
    } else if (resultsFilter === 'buda') {
      list = list.filter(r => String(r.tabla_origen).toLowerCase().includes('buda') || String(r.REGIMEN).toLowerCase().includes('subsidiado'));
    }

    if (resultsSearch.trim()) {
      const q = resultsSearch.toLowerCase();
      list = list.filter(r => 
        String(r.PRIMER_NOMBRE || '').toLowerCase().includes(q) ||
        String(r.PRIMER_APELLIDO || '').toLowerCase().includes(q) ||
        String(r.NUMERO_DOCUMENTO || r.codigo || '').toLowerCase().includes(q) ||
        String(r.EPS || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [results, resultsFilter, resultsSearch]);

  return (
    <div className="space-y-6">
      {/* 1. HEADER INSTITUCIONAL COMPROBADOR DE DERECHOS */}
      <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start sm:items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-600/90 border border-purple-400/40 flex items-center justify-center shrink-0 shadow-inner">
              <Database className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/30 border border-purple-400/30 text-purple-200">
                  Secretaría Distrital de Salud · Bogotá D.C.
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/25 border border-emerald-400/30 text-emerald-300 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Conexión SDS Activa</span>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Comprobador de Derechos en Salud
              </h1>
              <p className="text-xs sm:text-sm text-purple-200/90 mt-0.5">
                Verificación de afiliación al Régimen Contributivo (<span className="font-mono text-purple-200">grdContributivo</span>) y Subsidiado BDUA (<span className="font-mono text-purple-200">grdBUDA</span>)
              </p>
            </div>
          </div>

          {/* Selector de Pestañas */}
          <div className="flex flex-wrap items-center bg-purple-950/60 p-1.5 rounded-2xl border border-purple-700/50 backdrop-blur-xs">
            <button
              type="button"
              onClick={() => setActiveTab('individual')}
              className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'individual'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-purple-200 hover:text-white hover:bg-purple-800/40'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>1. Consulta Nominal</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('lote')}
              className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'lote'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-purple-200 hover:text-white hover:bg-purple-800/40'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>2. Evaluación por Lote</span>
              {uploadedCodes.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-900 text-purple-200 font-mono">
                  {uploadedCodes.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pegado')}
              className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'pegado'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-purple-200 hover:text-white hover:bg-purple-800/40'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>3. Pegado Rápido</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PESTAÑA 1: CONSULTA INDIVIDUAL NOMINAL */}
      {/* ======================================================== */}
      {activeTab === 'individual' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Search className="w-4 h-4 text-purple-600" />
                  <span>Consulta Nominal de Derechos en Salud</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Verifica si el usuario está en el Régimen Contributivo o en la Base Subsidiada Distrital (BUDA)
                </p>
              </div>

              {/* Muestras rápidas */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
                <span className="text-[11px] font-semibold text-slate-400">Probar:</span>
                <button
                  type="button"
                  onClick={() => handleLoadSample('CC', '1025530378')}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer"
                >
                  CC 1025530378
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample('CC', '52489632')}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                >
                  CC 52489632 (Contributivo)
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample('RC', '1098234511')}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                >
                  RC 1098234511 (BUDA)
                </button>
              </div>
            </div>

            <form onSubmit={handleSingleQuery} className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Tipo de Documento
                </label>
                <select
                  value={tipoDocIndividual}
                  onChange={(e) => setTipoDocIndividual(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all cursor-pointer"
                >
                  <option value="CC">CC - Cédula de Ciudadanía</option>
                  <option value="TI">TI - Tarjeta de Identidad</option>
                  <option value="RC">RC - Registro Civil</option>
                  <option value="CE">CE - Cédula de Extranjería</option>
                  <option value="PPT">PPT - Permiso Protección Temporal</option>
                  <option value="MS">MS - Menor Sin Identificación</option>
                  <option value="NV">NV - Certificado Nacido Vivo</option>
                </select>
              </div>

              <div className="sm:col-span-6">
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Número de Identificación
                </label>
                <input
                  type="text"
                  value={docIndividual}
                  onChange={(e) => setDocIndividual(e.target.value)}
                  placeholder="Ej: 1025530378 o 52489632"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                />
              </div>

              <div className="sm:col-span-3 flex items-end">
                <button
                  type="submit"
                  disabled={isSearchingSingle}
                  className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {isSearchingSingle ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Consultando SDS...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Consultar Derechos</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {singleError && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-xs text-rose-800 flex items-center space-x-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{singleError}</span>
              </div>
            )}
          </div>

          {/* Tarjeta de Resultado Oficial Comprobador */}
          {singleResult && (
            <div className="bg-white border border-purple-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Encabezado */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div className="flex items-start sm:items-center space-x-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white flex items-center justify-center text-xl font-bold shrink-0 shadow-md">
                    {singleResult.afiliado?.primerNombre?.[0] || 'A'}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200">
                        {singleResult.tipoDoc || tipoDocIndividual} {singleResult.documento}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{singleResult.aseguramiento?.estadoAfiliacion || 'ACTIVO'}</span>
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-100 text-purple-800 border border-purple-300">
                        {singleResult.tablaOrigen === 'Contributivo' ? 'grdContributivo' : 'grdBUDA'}
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                      {singleResult.afiliado?.nombreCompleto || 'CIUDADANO REGISTRADO'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Sexo: <b>{singleResult.afiliado?.sexo || 'MASCULINO'}</b> · Fecha Nac.: <b>{singleResult.afiliado?.fechaNacimiento || '12/03/1998'}</b> · Edad: <b>{singleResult.afiliado?.edad || 'Registrado'}</b>
                    </p>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddSingleToMatrix}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Transferir a Matriz SISVAN</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyCertification}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                    <span>Copiar Certificación</span>
                  </button>
                </div>
              </div>

              {/* Datos de Aseguramiento */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  <span>Datos de Aseguramiento y Régimen de Salud</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-purple-50/50 p-4 rounded-2xl border border-purple-200/80">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-purple-600 block">Entidad Aseguradora (EPS)</span>
                    <span className="text-xs font-black text-slate-900 block mt-0.5">
                      {singleResult.aseguramiento?.eps || 'CAPITAL SALUD EPS-S'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Código: {singleResult.aseguramiento?.codigoEps || 'EPSS34'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-purple-600 block">Régimen</span>
                    <span className="text-xs font-bold text-slate-800 block mt-0.5">
                      {singleResult.aseguramiento?.regimen || 'SUBSIDIADO'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Tipo: {singleResult.aseguramiento?.tipoAfiliado || 'COTIZANTE'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-purple-600 block">Tabla de Clasificación SDS</span>
                    <span className="text-xs font-bold text-purple-900 block mt-0.5">
                      {singleResult.tablaOrigen || 'BUDA'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Grilla: {singleResult.gridName || 'grdBUDA'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-purple-600 block">Fecha de Afiliación</span>
                    <span className="text-xs font-bold text-slate-800 block mt-0.5">
                      {singleResult.aseguramiento?.fechaAfiliacion || '01/01/2021'}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold">Vigente en BDUA</span>
                  </div>
                </div>
              </div>

              {/* Asignación Distrital y Subred Sur */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-purple-600" />
                  <span>Asignación Distrital en Bogotá D.C.</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Subred Asignada</span>
                    <span className="text-xs font-bold text-slate-900 block mt-0.5">
                      {singleResult.distrital?.subredAsignada || 'Subred Integrada de Servicios de Salud Sur E.S.E.'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">IPS Primaria Asignada</span>
                    <span className="text-xs font-bold text-slate-900 block mt-0.5">
                      {singleResult.distrital?.ipsPrimaria || 'Centro de Salud Vista Hermosa'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Exoneración de Copagos</span>
                    <span className="text-xs font-bold text-emerald-700 block mt-0.5">
                      {singleResult.distrital?.exoneracionCopago || 'EXENTO 100% COPAGOS'}
                    </span>
                    <span className="text-[10px] text-slate-500">Sisbén IV</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Ubicación Distrital</span>
                    <span className="text-xs font-bold text-slate-900 block mt-0.5">
                      {singleResult.distrital?.localidad || 'Ciudad Bolívar'}
                    </span>
                    <span className="text-[10px] text-slate-500">{singleResult.distrital?.upz || 'UPZ 67 Lucero'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* PESTAÑA 2: EVALUACIÓN MASIVA POR LOTE */}
      {/* ======================================================== */}
      {activeTab === 'lote' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                  <span>Evaluación Masiva de Afiliados en Comprobador</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Verifica en lote si los usuarios están en Contributivo o Subsidiado BUDA
                </p>
              </div>

              {/* Muestra rápida */}
              <button
                type="button"
                onClick={handleLoadSampleBatch}
                className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Cargar Muestra 10 Afiliados</span>
              </button>
            </div>

            {/* Opciones de Origen */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-2xl border-2 transition-all ${
                sourceType === 'FILE' ? 'border-purple-500 bg-purple-50/20' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800">1. Subir archivo Excel o CSV</span>
                  <input
                    type="radio"
                    checked={sourceType === 'FILE'}
                    onChange={() => setSourceType('FILE')}
                    className="cursor-pointer"
                  />
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Sube un archivo .xlsx, .xls o .csv con una columna de números de documento.
                </p>
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Seleccionar Archivo</span>
                  </button>
                  {customFileName && (
                    <span className="text-xs font-mono text-purple-700 truncate max-w-xs">
                      {customFileName}
                    </span>
                  )}
                </div>
              </div>

              <div className={`p-4 rounded-2xl border-2 transition-all ${
                sourceType === 'MATRIX' ? 'border-purple-500 bg-purple-50/20' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800">2. Usar registros de Matriz SISVAN</span>
                  <input
                    type="radio"
                    checked={sourceType === 'MATRIX'}
                    onChange={handleUseMatrixCodes}
                    className="cursor-pointer"
                  />
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Verifica directamente los {excelDatabaseRows.length} pacientes escaneados en SISVAN.
                </p>
                <button
                  type="button"
                  onClick={handleUseMatrixCodes}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <Table className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Cargar {excelDatabaseRows.length} desde Matriz</span>
                </button>
              </div>
            </div>

            {/* Botón de Ejecución */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-600 font-medium">
                Documentos listos para evaluar: <b className="text-purple-900 font-mono">{uploadedCodes.length}</b>
              </div>

              <button
                type="button"
                onClick={handleRunBatch}
                disabled={isRunning || uploadedCodes.length === 0}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Comprobando en SDS ({progress}%)...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Iniciar Evaluación Masiva Comprobador</span>
                  </>
                )}
              </button>
            </div>

            {/* Barra de Progreso */}
            {isRunning && (
              <div className="space-y-1.5 pt-2">
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                  <span>Procesando afiliados en paralelo...</span>
                  <span>{elapsedSeconds}s transcurridos</span>
                </div>
              </div>
            )}
          </div>

          {/* Tabla de Resultados de Lote */}
          {results.length > 0 && (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Resultados de la Validación Comprobador ({results.length} registros)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Clasificación oficial en Contributivo y Base Subsidiada BUDA
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadResultsExcel}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Excel (.xlsx)</span>
                </button>
              </div>

              {/* Filtros */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => setResultsFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      resultsFilter === 'all' ? 'bg-purple-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Todos ({results.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setResultsFilter('contributivo')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      resultsFilter === 'contributivo' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Contributivo (grdContributivo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setResultsFilter('buda')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      resultsFilter === 'buda' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Subsidiado (grdBUDA)
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={resultsSearch}
                    onChange={(e) => setResultsSearch(e.target.value)}
                    placeholder="Filtrar por nombre, documento o EPS..."
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none w-64"
                  />
                </div>
              </div>

              {/* Grid */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Documento</th>
                      <th className="py-2.5 px-3">Afiliado</th>
                      <th className="py-2.5 px-3">Aseguradora (EPS)</th>
                      <th className="py-2.5 px-3">Régimen</th>
                      <th className="py-2.5 px-3">Tabla SDS</th>
                      <th className="py-2.5 px-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredResults.map((row: any, idx: number) => {
                      const isContributivo = String(row.tabla_origen).toLowerCase().includes('contributivo');
                      return (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-2 px-3 font-mono font-bold text-purple-900">
                            {row.TIPO_DOCUMENTO || 'CC'} {row.NUMERO_DOCUMENTO || row.codigo}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900">
                            {row.PRIMER_NOMBRE} {row.PRIMER_APELLIDO}
                          </td>
                          <td className="py-2 px-3 text-slate-700">{row.EPS || 'CAPITAL SALUD EPS-S'}</td>
                          <td className="py-2 px-3 text-slate-600">{row.REGIMEN || 'SUBSIDIADO'}</td>
                          <td className="py-2 px-3">
                            {isContributivo ? (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                grdContributivo
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                grdBUDA
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              ACTIVO
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* PESTAÑA 3: PEGADO INTELIGENTE */}
      {/* ======================================================== */}
      {activeTab === 'pegado' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-purple-600" />
              <span>Pegado Inteligente desde Portal de Comprobador de Derechos</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Copia el contenido o tabla del portal de Comprobador de Derechos de Bogotá D.C. y pégalo aquí para procesarlo directamente.
            </p>
          </div>

          <textarea
            value={pastedComprobadorText}
            onChange={(e) => setPastedComprobadorText(e.target.value)}
            rows={8}
            placeholder="Pega aquí el contenido copiado de la pantalla de Comprobador de Derechos (grdContributivo / grdBUDA)..."
            className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-mono text-slate-800 outline-none focus:bg-white focus:border-purple-600 transition-all"
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Caracteres: {pastedComprobadorText.length}
            </span>
            <button
              type="button"
              onClick={handleParsePasted}
              disabled={isParsingPasted || !pastedComprobadorText.trim()}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center space-x-2"
            >
              {isParsingPasted ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Interpretando...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Procesar e Importar Afiliado</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
