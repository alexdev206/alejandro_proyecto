import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Play, 
  Square, 
  Download, 
  FileSpreadsheet, 
  Terminal, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ExternalLink, 
  RefreshCw, 
  Search, 
  Database, 
  Baby, 
  User, 
  Zap, 
  FileDown, 
  SlidersHorizontal,
  Check,
  X,
  AlertCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  KeyRound
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ColumnDefinition, ExtractedRow } from '../types';
import { CAMPOS_PAI, PRESETS_PAI, OPCIONES_ADRES } from '../data/paiCatalog';
import { useAuth } from '../context/AuthContext';

export interface BusquedaModuloProps {
  scannedColumns?: ColumnDefinition[];
  scannedRows?: ExtractedRow[];
  onApplyEnrichment?: (updatedColumns: ColumnDefinition[], updatedRows: ExtractedRow[]) => void;
  onTriggerToast?: (msg: string) => void;
  isEmbedded?: boolean;
}

export type PlatformTarget = 'PAI_AUTO' | 'PAI_MENORES' | 'PAI_MAYORES' | 'ADRES' | 'CRUCE_INTEGRAL';

interface ActivityLogItem {
  id: string;
  time: string;
  type: 'info' | 'success' | 'warn' | 'error';
  text: string;
}

export const BusquedaModulo: React.FC<BusquedaModuloProps> = ({
  scannedColumns = [],
  scannedRows = [],
  onApplyEnrichment,
  onTriggerToast,
  isEmbedded = false,
}) => {
  const { user } = useAuth();

  // Sub-pestañas dentro del módulo unificado: 'pai' (PAIWEB), 'comprobador' (ADRES/SDS), 'cruce' o 'script_consola' (F12 sin instalación)
  const [subTab, setSubTab] = useState<'pai' | 'comprobador' | 'cruce' | 'script_consola'>('pai');
  const [copiedConsoleScript, setCopiedConsoleScript] = useState<boolean>(false);

  const handleCopyConsoleScript = async () => {
    try {
      const res = await fetch('/consulta-consola.js');
      if (res.ok) {
        const text = await res.text();
        await navigator.clipboard.writeText(text);
        setCopiedConsoleScript(true);
        setTimeout(() => setCopiedConsoleScript(false), 3500);
        if (onTriggerToast) onTriggerToast('✓ ¡Script de consola copiado! Pégalo con Ctrl+V en Chrome F12.');
        return;
      }
    } catch (_e) {}
    // Fallback si no está el fetch
    window.open('/consulta-consola.js', '_blank');
  };

  const handleDownloadSampleCsv = () => {
    const lineas = [
      'consecutivo;codigo',
      '1;1023456789',
      '2;1098765432',
      '3;1011122233',
      '4;1044455566',
      '5;1077788899'
    ];
    const blob = new Blob(['\uFEFF' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pacientes_ejemplo.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (onTriggerToast) onTriggerToast('✓ CSV de ejemplo descargado (pacientes_ejemplo.csv)');
  };

  // Credenciales y sesión del Operador PAIWEB solicitadas directamente dentro del aplicativo
  const [paiOperatorUser, setPaiOperatorUser] = useState<string>(() => {
    try {
      const sess = localStorage.getItem('pai_user_session');
      if (sess) {
        const parsed = JSON.parse(sess);
        return parsed.username || '';
      }
    } catch (_e) {}
    return '';
  });

  const [paiOperatorName, setPaiOperatorName] = useState<string>(() => {
    try {
      const sess = localStorage.getItem('pai_user_session');
      if (sess) {
        const parsed = JSON.parse(sess);
        return parsed.name || '';
      }
    } catch (_e) {}
    return '';
  });

  const [isPaiSaved, setIsPaiSaved] = useState<boolean>(false);

  const handleSavePaiSession = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUser = paiOperatorUser.trim();
    if (!cleanUser) {
      if (onTriggerToast) onTriggerToast('⚠️ Por favor ingresa tu usuario o número de cédula institucional.');
      return;
    }
    const sess = {
      username: cleanUser,
      name: paiOperatorName.trim() || cleanUser,
      authenticated: true,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem('pai_user_session', JSON.stringify(sess));
    localStorage.setItem('comprobador_user_session', JSON.stringify(sess));
    setIsPaiSaved(true);
    setTimeout(() => setIsPaiSaved(false), 3000);
    if (onTriggerToast) onTriggerToast(`✅ Operador PAIWEB "${cleanUser}" vinculado exitosamente.`);
    addLog('success', `✓ Operador PAIWEB configurado: ${cleanUser} (${paiOperatorName.trim() || 'Subred Sur'})`);
  };

  // Chrome Connection Status
  const [chromeActive, setChromeActive] = useState<boolean>(false);
  const [isCheckingChrome, setIsCheckingChrome] = useState<boolean>(false);
  const [isLaunchingChrome, setIsLaunchingChrome] = useState<boolean>(false);
  const [chromeMessage, setChromeMessage] = useState<string | null>(null);
  const [useSimulationFallback, setUseSimulationFallback] = useState<boolean>(true);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  // Search Target and Mode
  const [platform, setPlatform] = useState<PlatformTarget>('PAI_AUTO');
  const [inputSource, setInputSource] = useState<'scanned' | 'manual' | 'csv'>('scanned');
  
  // Custom input data
  const [manualCodesText, setManualCodesText] = useState<string>('');
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvRecords, setCsvRecords] = useState<Array<{ rowId: string; codigo: string; nombre?: string }>>([]);

  // PAI Presets & Fields
  const [activePreset, setActivePreset] = useState<string>('1');
  const [selectedPaiFields, setSelectedPaiFields] = useState<string[]>(PRESETS_PAI['1'] || []);
  const [showCustomPaiFields, setShowCustomPaiFields] = useState<boolean>(false);

  // ADRES Options
  const [includeAdresSexo, setIncludeAdresSexo] = useState<boolean>(true);
  const [includeAdresTablaOrigen, setIncludeAdresTablaOrigen] = useState<boolean>(true);

  // Execution & Streaming State
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [stats, setStats] = useState({ exitosos: 0, noEncontrados: 0, errores: 0 });
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  
  // Stopwatch & Metrics
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [estimatedSeconds, setEstimatedSeconds] = useState<number | null>(null);
  const [speedPerMin, setSpeedPerMin] = useState<number>(0);
  const timerRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Results & Partial Accumulation
  const [resultsMap, setResultsMap] = useState<Record<string, { estado: string; mensaje: string; data: Record<string, string> }>>({});
  const [appliedCount, setAppliedCount] = useState<number>(0);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Check Chrome status periodically
  const checkChromeStatus = async () => {
    setIsCheckingChrome(true);
    try {
      const res = await fetch('/api/chrome');
      if (res.ok) {
        const data = await res.json();
        setChromeActive(!!data.activo);
        if (!data.activo) {
          // If not active, default simulation mode is available
        }
      }
    } catch (_e) {
      setChromeActive(false);
    } finally {
      setIsCheckingChrome(false);
    }
  };

  useEffect(() => {
    checkChromeStatus();
    const interval = setInterval(checkChromeStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  // Handle Chrome launch
  const handleLaunchChrome = async () => {
    setIsLaunchingChrome(true);
    setChromeMessage(null);
    try {
      const res = await fetch('/api/chrome/iniciar', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setChromeMessage('Iniciando Google Chrome con perfil dedicado...');
        setTimeout(async () => {
          await checkChromeStatus();
          setIsLaunchingChrome(false);
          setChromeMessage('Chrome abierto. Por favor inicia sesión en PAIWEB y luego pulsa "Iniciar Consulta".');
        }, 2000);
      } else {
        setIsLaunchingChrome(false);
        setChromeMessage(data.error || 'No se pudo iniciar Chrome automáticamente.');
        // Suggest simulation fallback if Chrome is not local
        setUseSimulationFallback(true);
      }
    } catch (err: any) {
      setIsLaunchingChrome(false);
      setChromeMessage('Error de conexión al intentar lanzar Chrome.');
      setUseSimulationFallback(true);
    }
  };

  // Preset switch
  const handlePresetChange = (presetKey: string) => {
    setActivePreset(presetKey);
    if (PRESETS_PAI[presetKey]) {
      setSelectedPaiFields(PRESETS_PAI[presetKey]);
    }
  };

  const togglePaiField = (fieldKey: string) => {
    setSelectedPaiFields(prev => 
      prev.includes(fieldKey) 
        ? prev.filter(k => k !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  // Add Log Item
  const addLog = (type: 'info' | 'success' | 'warn' | 'error', text: string) => {
    const time = new Date().toLocaleTimeString();
    setActivityLogs(prev => [
      ...prev.slice(-300), // Mantener últimos 300 logs
      { id: `${Date.now()}-${Math.random()}`, time, type, text }
    ]);
  };

  // Auto-scroll terminal log
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [activityLogs]);

  // Compute Records to Process
  const getRecordsToProcess = (): Array<{ rowId: string; codigo: string; nombreOriginal?: string; isMinorDoc?: boolean }> => {
    if (inputSource === 'scanned') {
      return scannedRows
        .map(row => {
          const doc = row.data['ID'] || row.data['ID_RECEPTOR'] || row.data['DOCUMENTO'] || '';
          const tipoId = String(row.data['TIPO_ID'] || '').toUpperCase();
          const pNom = row.data['PRIMER_NOMBRE'] || '';
          const pApe = row.data['PRIMER_APELLIDO'] || '';
          const isMinor = ['RC', 'TI', 'NUIP'].includes(tipoId) || (tipoId === '' && doc.length === 11);
          return {
            rowId: row.id,
            codigo: doc.trim(),
            nombreOriginal: `${pNom} ${pApe}`.trim(),
            isMinorDoc: isMinor,
          };
        })
        .filter(item => item.codigo.length > 0);
    }

    if (inputSource === 'manual') {
      const lines = manualCodesText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      return lines.map((code, idx) => ({
        rowId: `manual-${idx + 1}`,
        codigo: code,
        nombreOriginal: `Registro #${idx + 1}`,
        isMinorDoc: code.length === 11,
      }));
    }

    if (inputSource === 'csv') {
      return csvRecords.map(r => ({
        rowId: r.rowId,
        codigo: r.codigo,
        nombreOriginal: r.nombre || `CSV #${r.rowId}`,
        isMinorDoc: r.codigo.length === 11,
      }));
    }

    return [];
  };

  // Handle CSV file upload
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = String(evt.target?.result || '');
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length < 2) {
          alert('El archivo CSV debe tener al menos una cabecera y una fila de datos.');
          return;
        }

        // Detect separator
        const sep = lines[0].includes(';') ? ';' : lines[0].includes('\t') ? '\t' : ',';
        const headers = lines[0].split(sep).map(h => h.trim().toLowerCase());
        
        let colIndex = headers.findIndex(h => h.includes('codigo') || h.includes('documento') || h.includes('id'));
        if (colIndex === -1) colIndex = 0; // fallback to first column

        const records = lines.slice(1).map((line, idx) => {
          const parts = line.split(sep).map(p => p.trim());
          const code = parts[colIndex] || '';
          return {
            rowId: `csv-${idx + 1}`,
            codigo: code,
            nombre: parts[colIndex + 1] || `CSV ${code}`,
          };
        }).filter(r => r.codigo.length > 0);

        setCsvRecords(records);
        addLog('info', `Cargados ${records.length} registros desde "${file.name}".`);
      } catch (err: any) {
        alert('Error al leer el archivo CSV: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Run the Query Job
  const handleStartQuery = async () => {
    const records = getRecordsToProcess();
    if (records.length === 0) {
      alert('No hay números de identificación válidos para consultar.');
      return;
    }

    const isSimulated = !chromeActive || useSimulationFallback;

    setIsRunning(true);
    setProgressPercent(0);
    setCurrentIndex(0);
    setTotalRecords(records.length);
    setStats({ exitosos: 0, noEncontrados: 0, errores: 0 });
    setResultsMap({});
    setActivityLogs([]);
    setElapsedSeconds(0);
    setEstimatedSeconds(null);
    setSpeedPerMin(0);

    const startTime = Date.now();
    addLog('info', `▶ Iniciando consulta para ${records.length} registros (${platform})...`);
    if (isSimulated) {
      addLog('info', 'ℹ️ Modo Simulación / Prueba activo (generando streaming en tiempo real).');
    }

    // Timer
    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => {
        const next = prev + 1;
        return next;
      });
    }, 1000);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      if (platform === 'CRUCE_INTEGRAL') {
        // Query both PAI and ADRES sequentially
        addLog('info', 'Paso 1 de 2: Consultando en portal PAIWEB...');
        await runEndpointQuery('/api/consulta/pai', {
          modo: 'auto',
          campos: selectedPaiFields,
          registros: records.map(r => ({ rowId: r.rowId, codigo: r.codigo })),
          simulado: isSimulated,
        }, abortController.signal, 1, 2);

        if (!abortController.signal.aborted) {
          addLog('info', 'Paso 2 de 2: Consultando en Comprobador de Derechos (ADRES)...');
          await runEndpointQuery('/api/consulta/adres', {
            cfg: { sexo: includeAdresSexo, tabla_origen: includeAdresTablaOrigen },
            filtros: [],
            registros: records.map(r => ({ rowId: r.rowId, codigo: r.codigo })),
            simulado: isSimulated,
          }, abortController.signal, 2, 2);
        }
      } else if (platform === 'ADRES') {
        await runEndpointQuery('/api/consulta/adres', {
          cfg: { sexo: includeAdresSexo, tabla_origen: includeAdresTablaOrigen },
          filtros: [],
          registros: records.map(r => ({ rowId: r.rowId, codigo: r.codigo })),
          simulado: isSimulated,
        }, abortController.signal);
      } else {
        // PAI
        const paiModo = platform === 'PAI_MENORES' ? 'menores' : platform === 'PAI_MAYORES' ? 'mayores' : 'auto';
        await runEndpointQuery('/api/consulta/pai', {
          modo: paiModo,
          campos: selectedPaiFields,
          registros: records.map(r => ({ rowId: r.rowId, codigo: r.codigo })),
          simulado: isSimulated,
        }, abortController.signal);
      }

      addLog('success', `✓ Proceso de consulta finalizado con éxito en ${(Date.now() - startTime) / 1000}s.`);
      if (onTriggerToast) {
        onTriggerToast('✅ Consulta completada. Puedes aplicar las columnas o descargar los reportes.');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        addLog('warn', '⏹ Consulta cancelada por el usuario.');
      } else {
        addLog('error', `Error general: ${err.message}`);
      }
    } finally {
      clearInterval(timerRef.current);
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  };

  // Streaming reader function
  const runEndpointQuery = async (
    endpoint: string, 
    bodyData: any, 
    signal: AbortSignal,
    stepNum = 1,
    totalSteps = 1
  ) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
      },
      body: JSON.stringify(bodyData),
      signal,
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `HTTP ${response.status}: Error en endpoint de consulta`);
    }

    if (!response.body) {
      throw new Error('Respuesta del servidor no contiene flujo de datos (ReadableStream).');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);
          handleStreamEvent(event, stepNum, totalSteps);
        } catch (_jsonErr) {
          // ignore malformed line
        }
      }
    }

    if (buffer.trim()) {
      try {
        const event = JSON.parse(buffer.trim());
        handleStreamEvent(event, stepNum, totalSteps);
      } catch (_jsonErr) {}
    }
  };

  // Handle individual stream event
  const handleStreamEvent = (event: any, stepNum = 1, totalSteps = 1) => {
    if (event.type === 'init') {
      addLog('info', `Conexión establecida. Procesando ${event.total} registros...`);
    } else if (event.type === 'progress') {
      const { index, total, rowId, codigo, estado, mensaje, data = {} } = event;
      
      const overallPercent = Math.round(
        (((stepNum - 1) * total + index) / (totalSteps * total)) * 100
      );
      setProgressPercent(overallPercent);
      setCurrentIndex(index);

      // Update metrics
      setStats(prev => ({
        exitosos: estado === 'ENCONTRADO' ? prev.exitosos + 1 : prev.exitosos,
        noEncontrados: estado === 'NO ENCONTRADO' ? prev.noEncontrados + 1 : prev.noEncontrados,
        errores: estado === 'ERROR' || estado === 'NO AUTORIZADO' ? prev.errores + 1 : prev.errores,
      }));

      // Accumulate results
      setResultsMap(prev => {
        const existing = prev[rowId] || { estado, mensaje, data: {} };
        return {
          ...prev,
          [rowId]: {
            estado,
            mensaje,
            data: { ...existing.data, ...data },
          }
        };
      });

      // Log event
      if (estado === 'ENCONTRADO') {
        const pNom = data.PAI_PRIMER_NOMBRE || data.ADRES_PRIMER_NOMBRE || '';
        const pApe = data.PAI_PRIMER_APELLIDO || data.ADRES_PRIMER_APELLIDO || '';
        const nombreInfo = pNom ? ` (${pNom} ${pApe})` : '';
        addLog('success', `[${index}/${total}] ${codigo}: ENCONTRADO${nombreInfo}`);
      } else if (estado === 'NO ENCONTRADO') {
        addLog('warn', `[${index}/${total}] ${codigo}: NO ENCONTRADO`);
      } else {
        addLog('error', `[${index}/${total}] ${codigo}: ${estado} - ${mensaje}`);
      }

      // Compute speed and estimate
      setElapsedSeconds(secs => {
        if (secs > 2 && index > 0) {
          const speed = (index / (secs / 60));
          setSpeedPerMin(Math.round(speed * 10) / 10);
          const rem = Math.max(0, Math.round(((total - index) / speed) * 60));
          setEstimatedSeconds(rem);
        }
        return secs;
      });
    } else if (event.type === 'complete') {
      addLog('info', `Paso completado: ${event.exitosos} encontrados, ${event.noEncontrados} no registrados.`);
    } else if (event.type === 'error') {
      addLog('error', `Alerta del portal: ${event.error}`);
    }
  };

  const handleStopQuery = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // Apply Results directly to Scanner DataTable
  const handleApplyToScanner = () => {
    if (!onApplyEnrichment || scannedRows.length === 0) return;

    // Determine all new columns from resultsMap
    const newColKeysSet = new Set<string>();
    Object.values(resultsMap).forEach((res: any) => {
      Object.keys(res?.data || {}).forEach(k => newColKeysSet.add(k));
    });

    if (newColKeysSet.size === 0) {
      alert('Aún no se han obtenido campos para integrar a la matriz.');
      return;
    }

    const newColumns: ColumnDefinition[] = Array.from(newColKeysSet).map(key => {
      let label = key;
      if (key.startsWith('PAI_')) {
        label = `PAI ${key.replace('PAI_', '').replace(/_/g, ' ')}`;
      } else if (key.startsWith('ADRES_')) {
        label = `ADRES ${key.replace('ADRES_', '').replace(/_/g, ' ')}`;
      }
      return {
        key,
        label,
        type: 'text',
      };
    });

    // Merge existing columns with new columns (avoid duplicates)
    const existingKeys = new Set(scannedColumns.map(c => c.key));
    const mergedColumns = [
      ...scannedColumns,
      ...newColumns.filter(c => !existingKeys.has(c.key)),
    ];

    // Merge rows
    let enrichedCount = 0;
    const mergedRows = scannedRows.map(row => {
      const res = resultsMap[row.id];
      if (!res || !res.data) return row;

      enrichedCount++;
      const updatedData = { ...row.data, ...res.data };
      const updatedReviewFlags = [...row.reviewFlags];

      // Discrepancy checks: Nombre, Apellido, Teléfono
      const scanNombre = String(row.data['PRIMER_NOMBRE'] || '').trim().toUpperCase();
      const paiNombre = String(res.data['PAI_PRIMER_NOMBRE'] || '').trim().toUpperCase();
      if (scanNombre && paiNombre && !paiNombre.includes(scanNombre) && !scanNombre.includes(paiNombre)) {
        updatedReviewFlags.push(`Discrepancia Nombre: Escaneado "${scanNombre}" vs PAI "${paiNombre}"`);
      }

      const scanApe = String(row.data['PRIMER_APELLIDO'] || '').trim().toUpperCase();
      const paiApe = String(res.data['PAI_PRIMER_APELLIDO'] || '').trim().toUpperCase();
      if (scanApe && paiApe && !paiApe.includes(scanApe) && !scanApe.includes(paiApe)) {
        updatedReviewFlags.push(`Discrepancia Apellido: Escaneado "${scanApe}" vs PAI "${paiApe}"`);
      }

      return {
        ...row,
        data: updatedData,
        reviewFlags: Array.from(new Set(updatedReviewFlags)),
      };
    });

    onApplyEnrichment(mergedColumns, mergedRows);
    setAppliedCount(enrichedCount);
    addLog('success', `✓ ${enrichedCount} filas enriquecidas con columnas PAI/ADRES en la matriz de datos.`);
    if (onTriggerToast) {
      onTriggerToast(`✨ ${enrichedCount} filas enriquecidas con datos PAI y ADRES.`);
    }
  };

  // Download Excel
  const handleDownloadExcel = () => {
    const records = getRecordsToProcess();
    if (records.length === 0) return;

    const dataToExport = records.map((r, idx) => {
      const res = resultsMap[r.rowId];
      return {
        'CONSECUTIVO': idx + 1,
        'DOCUMENTO': r.codigo,
        'NOMBRE_ORIGINAL': r.nombreOriginal || '',
        'ESTADO_CONSULTA': res?.estado || 'PENDIENTE',
        'MENSAJE': res?.mensaje || '',
        ...(res?.data || {}),
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Resultados_Consulta');
    XLSX.writeFile(wb, `Consulta_PAI_ADRES_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Download CSV
  const handleDownloadCsv = () => {
    const records = getRecordsToProcess();
    if (records.length === 0) return;

    const dataToExport = records.map((r, idx) => {
      const res = resultsMap[r.rowId];
      return {
        'CONSECUTIVO': idx + 1,
        'DOCUMENTO': r.codigo,
        'ESTADO_CONSULTA': res?.estado || 'PENDIENTE',
        ...(res?.data || {}),
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const csvContent = XLSX.utils.sheet_to_csv(ws, { FS: ';' });
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Consulta_PAI_ADRES_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const recordsCount = getRecordsToProcess().length;

  return (
    <div className={`space-y-6 ${isEmbedded ? 'mt-4 border-t border-slate-200 pt-6' : ''}`}>
      {/* 1. Header & Chrome Status Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Módulo de Búsqueda PAI & Comprobador de Derechos
                </h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  Puppeteer Bridge
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Conexión nativa por depuración a Chrome (puerto 9222) para consultar PAIWEB Distrital y ADRES.
              </p>
            </div>
          </div>

          {/* Chrome Status and Action */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
              chromeActive 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${chromeActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span>{chromeActive ? 'Chrome 9222 Activo' : 'Chrome Desconectado'}</span>
            </div>

            <button
              type="button"
              onClick={handleLaunchChrome}
              disabled={isLaunchingChrome}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Abrir Chrome con perfil dedicado y URL de login PAI"
            >
              {isLaunchingChrome ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
              <span>{chromeActive ? 'Reabrir Chrome PAIWEB' : 'Conectar Chrome PAIWEB'}</span>
            </button>

            <button
              type="button"
              onClick={checkChromeStatus}
              disabled={isCheckingChrome}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Comprobar estado del puerto 9222"
            >
              <RefreshCw className={`w-4 h-4 ${isCheckingChrome ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Informative notification message / Guide */}
        {chromeMessage && (
          <div className="mt-3 p-3.5 bg-blue-50/90 border border-blue-200 rounded-xl text-xs text-blue-950 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">{chromeMessage}</p>
                  <p className="text-[11px] text-blue-700 mt-1">
                    💡 <b>En esta versión en la nube (Cloud Run):</b> No necesitas abrir Chrome. El <b>Modo Demostración / Consulta Directa</b> está activo automáticamente. Puedes pulsar el botón azul <b>"Iniciar Consulta"</b> para procesar los registros de inmediato.
                  </p>
                  <p className="text-[11px] text-blue-700 mt-1">
                    💻 <i>(Opcional)</i> Si ejecutas este sistema de forma local en tu PC y deseas conectar el Chrome real de Windows con PAIWEB:
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('chrome.exe --remote-debugging-port=9222 --user-data-dir="%USERPROFILE%\\.pai_perfil_chrome"');
                        setCopiedCommand('chrome');
                        setTimeout(() => setCopiedCommand(null), 3000);
                      }}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white border border-blue-300 rounded text-[11px] font-mono text-blue-900 hover:bg-blue-100 cursor-pointer shadow-2xs"
                    >
                      <Copy className="w-3 h-3 text-blue-600" />
                      <span>{copiedCommand === 'chrome' ? '✓ ¡Comando Chrome copiado!' : 'Copiar comando Chrome (Windows)'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('msedge.exe --remote-debugging-port=9222 --user-data-dir="%USERPROFILE%\\.pai_perfil_chrome"');
                        setCopiedCommand('edge');
                        setTimeout(() => setCopiedCommand(null), 3000);
                      }}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white border border-blue-300 rounded text-[11px] font-mono text-blue-900 hover:bg-blue-100 cursor-pointer shadow-2xs"
                    >
                      <Copy className="w-3 h-3 text-blue-600" />
                      <span>{copiedCommand === 'edge' ? '✓ ¡Comando Edge copiado!' : 'Copiar comando Edge (Windows)'}</span>
                    </button>
                  </div>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setChromeMessage(null)}
                className="text-blue-500 hover:text-blue-800 p-1"
                title="Cerrar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Simulation fallback notice */}
        {!chromeActive && (
          <div className="mt-3 p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-950">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <b>Modo Demostración / Simulación Activo:</b> Puedes pulsar <b>"Iniciar Consulta"</b> directamente abajo para procesar los registros, ver la barra de progreso, la terminal en vivo y descargar los reportes en Excel/CSV.
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-200 text-emerald-900 shrink-0">
              Listo para probar
            </span>
          </div>
        )}
      </div>

      {/* 2. SUBPESTAÑAS UNIFICADAS: PAIWEB vs COMPROBADOR DE DERECHOS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-xs">
        <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => {
              setSubTab('pai');
              setPlatform('PAI_AUTO');
            }}
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
              subTab === 'pai'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Baby className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Pestaña 1: PAIWEB Vacunación</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-100 text-blue-800 hidden sm:inline">
              Nominal
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubTab('comprobador');
              setPlatform('ADRES');
            }}
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
              subTab === 'comprobador'
                ? 'bg-white text-purple-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Database className="w-4 h-4 text-purple-600 shrink-0" />
            <span>Pestaña 2: Comprobador de Derechos</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-100 text-purple-800 hidden sm:inline">
              ADRES / SDS
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubTab('cruce');
              setPlatform('CRUCE_INTEGRAL');
            }}
            className={`hidden md:flex py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all items-center justify-center space-x-2 cursor-pointer ${
              subTab === 'cruce'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Pestaña 3: Cruce Integral</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('script_consola')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
              subTab === 'script_consola'
                ? 'bg-emerald-600 text-white shadow-xs border border-emerald-500'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Terminal className="w-4 h-4 shrink-0" />
            <span>Pestaña 4: Script Consola F12</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              subTab === 'script_consola' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}>
              Sin Instalación
            </span>
          </button>
        </div>
      </div>

      {/* 3. PANEL DE INGRESO OPERADOR PAIWEB (SOLICITADO DENTRO DEL APLICATIVO) */}
      {subTab === 'pai' && (
        <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/80 border border-blue-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                  Ingreso de Operador PAIWEB (Configuración Interna)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Ingresa tu usuario institucional de PAIWEB para la auditoría y consulta nominal de vacunas.
                </p>
              </div>
            </div>

            {paiOperatorUser ? (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 self-start sm:self-auto">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Operador PAI: {paiOperatorUser}</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 self-start sm:self-auto">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Ingresa tu usuario PAI</span>
              </span>
            )}
          </div>

          <form onSubmit={handleSavePaiSession} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Usuario / Cédula PAIWEB
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  value={paiOperatorUser}
                  onChange={(e) => setPaiOperatorUser(e.target.value)}
                  placeholder="ej: 1025530378 o usuario"
                  className="w-full pl-8.5 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none shadow-2xs"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Nombre del Operador <span className="text-slate-400 font-normal">(Opcional)</span>
              </label>
              <input
                type="text"
                value={paiOperatorName}
                onChange={(e) => setPaiOperatorName(e.target.value)}
                placeholder="ej: Vacunador Subred Sur"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none shadow-2xs"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className={`w-full py-2 px-3.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer ${
                  isPaiSaved 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isPaiSaved ? '¡Operador Guardado!' : 'Guardar Operador PAI'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. SECCIÓN ESPECÍFICA SI SUBTAB ES SCRIPT CONSOLA F12 */}
      {subTab === 'script_consola' ? (
        <div className="space-y-6">
          {/* Tarjeta Principal de Presentación */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white border border-slate-700 rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cero Instalación · 100% Chrome F12</span>
                </div>
                <h3 className="text-xl font-extrabold text-white tracking-tight">
                  SISVAN Bogotá · Script Autocontenido de Consola (F12)
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  Diseñado para operadores en computadores institucionales de la <b>Secretaría de Salud de Bogotá</b> donde está restringida la instalación de programas (sin Node.js ni extensiones). Ejecuta la consulta de <b>PAIWEB y Comprobador de Derechos (ADRES)</b> directamente inyectando una interfaz flotante en la pestaña oficial.
                </p>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyConsoleScript}
                  className="inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-95"
                >
                  <Copy className="w-4 h-4 text-slate-950" />
                  <span>{copiedConsoleScript ? '✓ ¡Script Copiado al Portapapeles!' : 'Copiar Script para F12'}</span>
                </button>
                <a
                  href="https://appb.saludcapital.gov.co"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-600 transition-all cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ir a appb.saludcapital.gov.co ↗</span>
                </a>
              </div>
            </div>

            {/* Banner de Privacidad */}
            <div className="p-3.5 bg-slate-950/60 border border-emerald-500/30 rounded-xl text-xs text-slate-300 flex items-start space-x-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-300">Garantía de Privacidad y Seguridad Institucional:</p>
                <p className="text-[11.5px] text-slate-400 mt-0.5">
                  El script funciona <b>100% dentro de tu navegador</b> en el origen de Salud Capital. No realiza peticiones a servidores externos, no envía datos a internet, no usa CDNs externos ni analíticas, y no guarda contraseñas. Todo el procesamiento y la descarga del CSV son estrictamente locales.
                </p>
              </div>
            </div>
          </div>

          {/* Barra de Acciones y Descargas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href="/consulta-consola.js"
              download="consulta-consola.js"
              className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all shadow-2xs flex items-center space-x-3 group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <FileDown className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-900 truncate">Descargar consulta-consola.js</p>
                <p className="text-[11px] text-slate-500">Archivo JavaScript puro autocontenido</p>
              </div>
            </a>

            <a
              href="/standalone.html"
              download="index.html"
              className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all shadow-2xs flex items-center space-x-3 group"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-900 truncate">Descargar index.html (Offline)</p>
                <p className="text-[11px] text-slate-500">Página única publicable sin servidor</p>
              </div>
            </a>

            <button
              type="button"
              onClick={handleDownloadSampleCsv}
              className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all shadow-2xs flex items-center space-x-3 text-left group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Download className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-900 truncate">Descargar CSV de Ejemplo</p>
                <p className="text-[11px] text-slate-500">5 códigos de prueba listos para test</p>
              </div>
            </button>
          </div>

          {/* Guía Paso a Paso */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <span className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center text-xs">✓</span>
              <span>Guía Rápida de Ejecución en 5 Pasos</span>
            </h4>

            <div className="space-y-4">
              {/* Paso 1 */}
              <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-sm">1</div>
                <div className="space-y-1">
                  <h5 className="text-xs sm:text-sm font-bold text-slate-900">Ingresar a Salud Capital</h5>
                  <p className="text-xs text-slate-600">
                    Abre Google Chrome y dirígete a <a href="https://appb.saludcapital.gov.co" target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline">https://appb.saludcapital.gov.co</a>. Si vas a consultar PAIWEB, inicia sesión previamente en <code>/pai/inicio/login.aspx</code> con tu usuario institucional.
                  </p>
                </div>
              </div>

              {/* Paso 2 */}
              <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-sm">2</div>
                <div className="space-y-1">
                  <h5 className="text-xs sm:text-sm font-bold text-slate-900">Abrir la Consola de Desarrollador (F12)</h5>
                  <p className="text-xs text-slate-600">
                    Presiona la tecla <b>F12</b> en tu teclado (o <kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono text-[11px]">Ctrl+Shift+I</kbd>) y selecciona la pestaña superior llamada <b>Consola (Console)</b>.
                  </p>
                </div>
              </div>

              {/* Paso 3: ALERTA IMPORTANTE CHROME */}
              <div className="flex gap-4 p-4 rounded-xl bg-amber-50/90 border border-amber-300">
                <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center shrink-0 text-sm">3</div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <h5 className="text-xs sm:text-sm font-bold text-amber-950">Advertencia de Chrome: Desbloqueo "allow pasting"</h5>
                  </div>
                  <p className="text-xs text-amber-900">
                    Si es la primera vez que pegas código en la consola, Google Chrome bloqueará el pegado con una advertencia en letras rojas. Para desbloquearlo:
                  </p>
                  <div className="p-2.5 bg-amber-100/80 border border-amber-300 rounded-lg text-xs font-mono text-amber-950 space-y-1">
                    <p>1. Escribe en la consola: <b className="text-black bg-white px-1.5 py-0.5 rounded border border-amber-300">allow pasting</b> (o <b className="text-black bg-white px-1.5 py-0.5 rounded border border-amber-300">permitir pegar</b>)</p>
                    <p>2. Presiona la tecla <kbd className="bg-white px-1.5 py-0.5 rounded border border-amber-300 text-slate-800">Enter</kbd>.</p>
                  </div>
                </div>
              </div>

              {/* Paso 4 */}
              <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-sm">4</div>
                <div className="space-y-1">
                  <h5 className="text-xs sm:text-sm font-bold text-slate-900">Pegar el script y presionar Enter</h5>
                  <p className="text-xs text-slate-600">
                    Pulsa el botón <b>"Copiar Script para F12"</b> de arriba, haz clic en la consola de Chrome, presiona <kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono text-[11px]">Ctrl+V</kbd> y presiona <kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono text-[11px]">Enter</kbd>. Aparecerá de inmediato el <b>Panel Flotante SISVAN</b> sobre la página.
                  </p>
                </div>
              </div>

              {/* Paso 5 */}
              <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-sm">5</div>
                <div className="space-y-1">
                  <h5 className="text-xs sm:text-sm font-bold text-slate-900">Cargar CSV, consultar y descargar</h5>
                  <p className="text-xs text-slate-600">
                    Carga tu CSV con columnas <code>consecutivo</code> y <code>codigo</code>, selecciona el portal (PAI Menores, Mayores, Auto o Comprobador) y pulsa <b>"Iniciar"</b>. Podrás ver el cronómetro en vivo y descargar el resultado en CSV con formato UTF-8 y delimitador <code>;</code> listo para Excel.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Mini-Diagnóstico */}
          <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-slate-800 text-cyan-400 flex items-center justify-center shrink-0">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">Función de Mini-Diagnóstico Integrada</h4>
                <p className="text-[11px] text-slate-400">Verifica cookies, iframes, WebForms y conectividad con el portal distrital.</p>
              </div>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-slate-300">
              <p className="text-emerald-400">// Puedes invocar el diagnóstico en cualquier momento escribiendo en la consola:</p>
              <p className="mt-1 font-bold text-white">diagnostico();</p>
              <p className="mt-2 text-[11px] text-slate-400">O haciendo clic en el botón <span className="text-cyan-400 font-bold">🔍 Diag</span> directamente en el panel flotante.</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* 4. Configuration & Input Selection Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Input Source */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <span>1. Registros a Consultar</span>
            </h4>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {recordsCount} códigos
            </span>
          </div>

          {/* Source Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setInputSource('scanned')}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                inputSource === 'scanned' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Desde Escáner ({scannedRows.length})
            </button>
            <button
              type="button"
              onClick={() => setInputSource('manual')}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                inputSource === 'manual' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pegar Códigos
            </button>
            <button
              type="button"
              onClick={() => setInputSource('csv')}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                inputSource === 'csv' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Subir CSV
            </button>
          </div>

          {/* Source View Details */}
          {inputSource === 'scanned' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-2">
              <p className="text-slate-600">
                Se detectaron <b>{recordsCount}</b> números de documento (campos <code>ID</code> o <code>ID_RECEPTOR</code>) de la matriz de digitalización.
              </p>
              {recordsCount === 0 && (
                <p className="text-amber-700 font-semibold">
                  ⚠️ No hay filas con documento en la tabla actual. Escanea un documento o usa la opción "Pegar Códigos".
                </p>
              )}
            </div>
          )}

          {inputSource === 'manual' && (
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-500">
                Ingresa un número de documento por línea:
              </label>
              <textarea
                value={manualCodesText}
                onChange={(e) => setManualCodesText(e.target.value)}
                placeholder="1025530378&#10;52489632&#10;1018449900"
                rows={4}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          )}

          {inputSource === 'csv' && (
            <div className="space-y-3">
              <label className="block text-[11px] font-semibold text-slate-500">
                Archivo CSV con columnas <code>consecutivo</code> y <code>codigo</code>:
              </label>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleCsvUpload}
                className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              {csvFileName && (
                <p className="text-xs text-emerald-700 font-semibold">
                  ✓ {csvRecords.length} filas cargadas desde {csvFileName}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Center Column: Platform & Flow Target */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
            <span>2. Plataforma de Consulta</span>
          </h4>

          <div className="grid grid-cols-1 gap-2">
            {subTab === 'pai' && (
              <>
                <button
                  type="button"
                  onClick={() => setPlatform('PAI_AUTO')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    platform === 'PAI_AUTO'
                      ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">🤖 PAI Automático (Recomendado)</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">Menores / Mayores</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Enruta cada fila según el tipo de documento: RC/TI/NUIP a PAI Menores y CC/CE/PPT a PAI Mayores.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPlatform('PAI_MENORES')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    platform === 'PAI_MENORES'
                      ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">👶 PAI Menores (Página 2)</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">Pediátrico</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Búsqueda enfocada en esquemas de vacunación de primera infancia y niños.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPlatform('PAI_MAYORES')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    platform === 'PAI_MAYORES'
                      ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">🧑 PAI Mayores (Página 3)</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">Adultos</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Búsqueda para adultos, gestantes, adultos mayores y dosis de refuerzo.
                  </p>
                </button>
              </>
            )}

            {subTab === 'comprobador' && (
              <>
                <button
                  type="button"
                  onClick={() => setPlatform('ADRES')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    platform === 'ADRES'
                      ? 'bg-purple-50/80 border-purple-400 ring-2 ring-purple-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">🏛️ Comprobador de Derechos (ADRES / SDS)</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800">Activo</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Verifica EPS activa, régimen (contributivo/subsidiado), estado de afiliación y asignación Subred Sur.
                  </p>
                </button>

                <div className="p-3 bg-purple-50/60 border border-purple-200/80 rounded-xl space-y-1.5 text-xs">
                  <div className="font-bold text-purple-950 flex items-center space-x-1.5">
                    <Database className="w-3.5 h-3.5 text-purple-600" />
                    <span>Alcance del Comprobador de Derechos</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Coteja nominalmente cada cédula o tarjeta de identidad contra la Base de Datos Única de Afiliados (BDUA) de ADRES y el sistema Distrital de Bogotá.
                  </p>
                </div>
              </>
            )}

            {subTab === 'cruce' && (
              <>
                <button
                  type="button"
                  onClick={() => setPlatform('CRUCE_INTEGRAL')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    platform === 'CRUCE_INTEGRAL'
                      ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">⚡ Cruce Integral (PAI + ADRES)</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">Enriquecimiento Total</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Ejecuta la búsqueda secuencial en ambos portales para cotejar vacunación y aseguramiento completo.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSubTab('pai');
                    setPlatform('PAI_AUTO');
                  }}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-left text-xs transition-all cursor-pointer"
                >
                  <span className="font-bold text-slate-800">👶 Cambiar a solo PAIWEB</span>
                  <p className="text-[11px] text-slate-500">Consultar únicamente antecedentes de vacunas.</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSubTab('comprobador');
                    setPlatform('ADRES');
                  }}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-left text-xs transition-all cursor-pointer"
                >
                  <span className="font-bold text-slate-800">🏛️ Cambiar a solo Comprobador</span>
                  <p className="text-[11px] text-slate-500">Consultar únicamente estado de afiliación y EPS.</p>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Fields & Presets */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              3. Campos a Extraer
            </h4>
            <span className="text-[11px] text-slate-400">
              {selectedPaiFields.length} campos
            </span>
          </div>

          {/* Presets 1 to 5 (para PAI o Cruce) */}
          {(subTab === 'pai' || subTab === 'cruce') && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-500 block">Presets PAI Rápidos:</label>
              <div className="grid grid-cols-5 gap-1">
                {['1', '2', '3', '4', '5'].map((key) => {
                  const labels: Record<string, string> = {
                    '1': 'P1: Básicos',
                    '2': 'P2: Contacto',
                    '3': 'P3: Residencia',
                    '4': 'P4: EPS/Rég.',
                    '5': 'P5: Madre',
                  };
                  const isSelected = activePreset === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handlePresetChange(key)}
                      className={`py-1.5 px-1 rounded-lg text-[10px] font-bold text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {labels[key]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comprobador Column Information & Options */}
          {subTab === 'comprobador' && (
            <div className="space-y-3">
              <div className="bg-purple-50/70 border border-purple-200/90 rounded-xl p-3 text-xs space-y-1.5">
                <span className="font-bold text-purple-950 block">Columnas Retornadas:</span>
                <ul className="text-[11px] text-purple-900 list-disc list-inside space-y-0.5">
                  <li><code>ADRES_ESTADO</code> (Activo, Retirado, etc.)</li>
                  <li><code>ADRES_EPS</code> (Entidad Promotora de Salud)</li>
                  <li><code>ADRES_REGIMEN</code> (Subsidiado / Contributivo)</li>
                  <li><code>ADRES_MUNICIPIO</code> (Bogotá D.C. / Subred)</li>
                </ul>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                <label className="text-[11px] font-bold text-slate-700 block">Opciones Comprobador:</label>
                <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAdresSexo}
                    onChange={(e) => setIncludeAdresSexo(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span>Consultar Sexo (abrir ventana de detalle)</span>
                </label>
                <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAdresTablaOrigen}
                    onChange={(e) => setIncludeAdresTablaOrigen(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span>Incluir Tabla Origen (Contributivo / BDUA)</span>
                </label>
              </div>
            </div>
          )}

          {/* ADRES Options Checkboxes for Cruce */}
          {subTab === 'cruce' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
              <label className="text-[11px] font-bold text-slate-700 block">Opciones Comprobador:</label>
              <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAdresSexo}
                  onChange={(e) => setIncludeAdresSexo(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span>Consultar Sexo (abrir ventana de detalle)</span>
              </label>
              <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAdresTablaOrigen}
                  onChange={(e) => setIncludeAdresTablaOrigen(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span>Incluir Tabla Origen (Contributivo / BDUA)</span>
              </label>
            </div>
          )}

          {/* Custom field selector expander */}
          <div>
            <button
              type="button"
              onClick={() => setShowCustomPaiFields(!showCustomPaiFields)}
              className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              <span>{showCustomPaiFields ? 'Ocultar campos detallados' : 'Personalizar campos individuales (26 disponibles)'}</span>
              {showCustomPaiFields ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showCustomPaiFields && (
              <div className="mt-2 max-h-40 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                {Object.entries(CAMPOS_PAI).map(([k, cfg]) => (
                  <label key={k} className="flex items-center space-x-2 text-[11px] text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPaiFields.includes(k)}
                      onChange={() => togglePaiField(k)}
                      className="rounded text-blue-600"
                    />
                    <span>{cfg.label} (<code>{k}</code>)</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Action Button Bar */}
      <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
        <div>
          <h4 className="text-sm font-bold">
            {isRunning ? 'Consulta en ejecución por streaming...' : 'Listo para iniciar consulta'}
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            {isRunning 
              ? `Procesando registro ${currentIndex} de ${totalRecords}...`
              : `${recordsCount} registros preparados para ${platform}.`
            }
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {isRunning ? (
            <button
              type="button"
              onClick={handleStopQuery}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer"
            >
              <Square className="w-4 h-4" />
              <span>Detener Consulta</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartQuery}
              disabled={recordsCount === 0}
              className={`inline-flex items-center space-x-2 px-6 py-2.5 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 ${
                subTab === 'pai'
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : subTab === 'comprobador'
                  ? 'bg-purple-600 hover:bg-purple-500'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              <Play className="w-4 h-4 fill-white" />
              <span>
                {subTab === 'pai'
                  ? `Iniciar Consulta PAIWEB Nominal (${recordsCount})`
                  : subTab === 'comprobador'
                  ? `Iniciar Comprobador de Derechos (${recordsCount})`
                  : `Iniciar Cruce Integral PAI + ADRES (${recordsCount})`}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Live Progress, Stopwatch & Metric Cards */}
      {(isRunning || totalRecords > 0) && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-700">Cronómetro y Velocidad:</span>
              <span className="text-xs font-mono font-bold text-slate-900">
                {Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s
              </span>
              {speedPerMin > 0 && (
                <span className="text-xs text-slate-500 font-mono">
                  · ~{speedPerMin} reg/min
                </span>
              )}
              {estimatedSeconds !== null && (
                <span className="text-xs text-blue-600 font-medium">
                  · Est. restante: {Math.floor(estimatedSeconds / 60)}m {estimatedSeconds % 60}s
                </span>
              )}
            </div>

            <div className="text-xs font-mono font-bold text-slate-900">
              {progressPercent}% ({currentIndex} / {totalRecords})
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
            <div
              className="bg-linear-to-r from-blue-600 via-indigo-600 to-emerald-500 h-full transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Metric Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Códigos</span>
              <p className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">{totalRecords}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
              <span className="text-[11px] font-semibold text-emerald-700 uppercase">Encontrados</span>
              <p className="text-xl font-extrabold text-emerald-600 font-mono mt-0.5">{stats.exitosos}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
              <span className="text-[11px] font-semibold text-amber-700 uppercase">No Registrados</span>
              <p className="text-xl font-extrabold text-amber-600 font-mono mt-0.5">{stats.noEncontrados}</p>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
              <span className="text-[11px] font-semibold text-rose-700 uppercase">Errores</span>
              <p className="text-xl font-extrabold text-rose-600 font-mono mt-0.5">{stats.errores}</p>
            </div>
          </div>

          {/* 5. Terminal / Live Activity Log (like busqueda-js) */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 text-slate-200 shadow-inner">
            <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <div className="flex items-center space-x-2">
                <Terminal className="w-3.5 h-3.5 text-blue-400" />
                <span>Registro de Actividad en Vivo (Terminal)</span>
              </div>
              <span className="text-[10px] text-slate-500">{activityLogs.length} eventos</span>
            </div>
            <div
              ref={logContainerRef}
              className="p-3 font-mono text-[11px] h-48 overflow-y-auto space-y-1 select-text scrollbar-thin scrollbar-thumb-slate-700"
            >
              {activityLogs.length === 0 ? (
                <p className="text-slate-600 italic">Esperando inicio de consulta...</p>
              ) : (
                activityLogs.map((log) => {
                  let colorClass = 'text-slate-300';
                  if (log.type === 'success') colorClass = 'text-emerald-400';
                  if (log.type === 'warn') colorClass = 'text-amber-400';
                  if (log.type === 'error') colorClass = 'text-rose-400';
                  return (
                    <div key={log.id} className="leading-relaxed">
                      <span className="text-slate-500">[{log.time}]</span>{' '}
                      <span className={colorClass}>{log.text}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. Live Results Table & Final Integration Bar */}
      {Object.keys(resultsMap).length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Resultados Obtenidos ({Object.keys(resultsMap).length} filas)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Datos verificados listos para exportación o enriquecimiento de la matriz del escáner.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {onApplyEnrichment && scannedRows.length > 0 && (
                <button
                  type="button"
                  onClick={handleApplyToScanner}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Aplicar a la Matriz de Datos</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDownloadExcel}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Descargar Excel</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadCsv}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Descargar CSV</span>
              </button>
            </div>
          </div>

          {appliedCount > 0 && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2 font-medium">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>
                ¡Listo! Se agregaron las columnas <code>PAI_*</code> y <code>ADRES_*</code> a {appliedCount} filas en la tabla del escáner.
              </span>
            </div>
          )}

          {/* Results Preview Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-72">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">Documento</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-left">Nombre Completo PAI</th>
                  <th className="px-3 py-2 text-left">EAPB / EPS</th>
                  <th className="px-3 py-2 text-left">Régimen</th>
                  <th className="px-3 py-2 text-left">Teléfono</th>
                  <th className="px-3 py-2 text-left">Localidad / Residencia</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100 font-mono text-[11px]">
                {getRecordsToProcess().slice(0, 50).map((r) => {
                  const res = resultsMap[r.rowId];
                  if (!res) return null;
                  const isFound = res.estado === 'ENCONTRADO';
                  return (
                    <tr key={r.rowId} className={isFound ? 'hover:bg-blue-50/40' : 'bg-slate-50/60'}>
                      <td className="px-3 py-2 font-bold text-slate-800">{r.codigo}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isFound 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {res.estado}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-900 font-sans">
                        {res.data.PAI_NOMBRE_COMPLETO || `${res.data.ADRES_PRIMER_NOMBRE || ''} ${res.data.ADRES_PRIMER_APELLIDO || ''}`.trim() || '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-700 font-sans">
                        {res.data.PAI_EAPB || res.data.ADRES_ENTIDAD || '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-700 font-sans">
                        {res.data.PAI_REGIMEN || res.data.ADRES_REGIMEN || '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {res.data.PAI_TELEFONO1 || '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-700 font-sans">
                        {res.data.PAI_LOCALIDAD || res.data.ADRES_MUNICIPIO || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
