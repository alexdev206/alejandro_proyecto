import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Baby,
  User,
  Users,
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
  Globe,
  SlidersHorizontal,
  Table,
  Plus,
  Zap,
  Terminal,
  Clock,
  Shield,
  ShieldCheck,
  Phone,
  MapPin,
  Calendar,
  HeartHandshake,
  FileText,
  AlertTriangle,
  ChevronRight,
  Filter,
  Copy,
  Lock,
  LogOut,
  Key,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ConsultaPaiViewProps {
  excelDatabaseRows?: any[];
  onUpdateDatabaseRows?: (rows: any[]) => void;
  onTriggerToast?: (msg: string) => void;
}

export const ConsultaPaiView: React.FC<ConsultaPaiViewProps> = ({
  excelDatabaseRows = [],
  onUpdateDatabaseRows,
  onTriggerToast,
}) => {
  // Pestañas activas: 'web' (Portal Web Integrado en Pantalla), 'individual', 'lote', 'pegado'
  const [activeTab, setActiveTabState] = useState<'web' | 'individual' | 'lote' | 'pegado'>('web');

  const setActiveTab = (tab: 'web' | 'individual' | 'lote' | 'pegado') => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('pai_active_tab', tab);
    } catch (_e) {}
  };

  // Estado del Portal Web Oficial Embebido (Sin ventanas emergentes ni scripts externos)
  const [portalIframeDoc, setPortalIframeDoc] = useState('');
  const [portalIframeTipo, setPortalIframeTipo] = useState('RC');
  const [portalIframeUrl, setPortalIframeUrl] = useState('/api/external/portal-web-embed?portal=pai');
  const [lastExtractedRecord, setLastExtractedRecord] = useState<any | null>(null);

  // Integración y Pegado Inteligente (Solución al bloqueo de WAF)
  const [pastedPaiText, setPastedPaiText] = useState('');
  const [isParsingPasted, setIsParsingPasted] = useState(false);

  // Modo PAI para lote: 'menores' (pág. 2) o 'mayores' (pág. 3)
  const [modoLote, setModoLote] = useState<'menores' | 'mayores'>('menores');

  // Opción de campos para lote ('1': Básicos, '2': Teléfono, '3': Dirección, '4': EAPB, '5': Madre)
  const [opcionLote, setOpcionLote] = useState<string>('1');

  // ==========================================
  // 1. ESTADO DE CONSULTA INDIVIDUAL
  // ==========================================
  const [singleDocType, setSingleDocType] = useState('RC');
  const [singleDocNumber, setSingleDocNumber] = useState('');
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

  // Ejecución por lote
  const [isRunningBatch, setIsRunningBatch] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  // Contadores
  const [cargadosEnBase, setCargadosEnBase] = useState<any[]>([]);
  const [descartadosNoMenores, setDescartadosNoMenores] = useState<any[]>([]);

  // Filtro de tabla de resultados
  const [tableFilter, setTableFilter] = useState<'all' | 'al_dia' | 'incompleto' | 'rezagado'>('all');
  const [searchTableQuery, setSearchTableQuery] = useState('');

  // Cronómetro
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // ==========================================
  // ESTADO DE SESIÓN PAIWEB (SIN SEDE NI ROL)
  // ==========================================
  const [operatorInfo, setOperatorInfo] = useState<{ username: string; authenticated: boolean }>(() => {
    try {
      const stored = localStorage.getItem('pai_user_session');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return {
      username: '',
      authenticated: false,
    };
  });

  const [savedUsernames, setSavedUsernames] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('pai_saved_usernames');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const notify = (msg: string) => {
    if (onTriggerToast) onTriggerToast(msg);
  };

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-300), msg]);
  };

  // Abrir portal oficial de PAIWEB en ventana nueva
  const handleOpenOfficialPai = () => {
    window.open('https://appb.saludcapital.gov.co/pai/inicio/login.aspx', '_blank');
    notify('🌐 Abriendo portal oficial PAIWEB (Salud Capital)...');
  };

  // Switch to an existing saved username
  const handleSelectSavedUsername = (username: string) => {
    const updated = {
      username,
      authenticated: true,
    };
    setOperatorInfo(updated);
    localStorage.setItem('pai_user_session', JSON.stringify(updated));
    notify(`👤 Sesión cambiada a: ${username}`);
    addLog(`🔄 Cambio de usuario PAI: ${username}`);
    setIsLoginModalOpen(false);
  };

  // Remove username from saved list
  const handleRemoveSavedUsername = (userToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedUsernames.filter(u => u !== userToRemove);
    setSavedUsernames(updated);
    localStorage.setItem('pai_saved_usernames', JSON.stringify(updated));
    notify('🗑️ Usuario eliminado.');
  };

  // Login handler for PAI
  const handlePaiLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loginUser.trim()) {
      setLoginError('Ingresa tu usuario o cédula PAI.');
      return;
    }

    setIsAuthenticating(true);
    setLoginError(null);

    try {
      const cleanUser = loginUser.trim();
      const res = await fetch('/api/external/pai/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUser,
          password: loginPass.trim() || 'PaiWeb2026*',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Credenciales no válidas.');
      }

      const newOp = {
        username: cleanUser,
        authenticated: true,
      };

      setOperatorInfo(newOp);
      localStorage.setItem('pai_user_session', JSON.stringify(newOp));
      if (data.paiToken) {
        localStorage.setItem('pai_active_token', data.paiToken);
      }

      // Store in saved usernames
      if (!savedUsernames.includes(cleanUser)) {
        const updatedList = [cleanUser, ...savedUsernames];
        setSavedUsernames(updatedList);
        localStorage.setItem('pai_saved_usernames', JSON.stringify(updatedList));
      }

      notify(`🎉 Sesión PAI iniciada como: ${cleanUser}`);
      addLog(`🔐 Usuario PAI conectado: ${cleanUser}`);
      setIsLoginModalOpen(false);
      setLoginUser('');
      setLoginPass('');
    } catch (err: any) {
      setLoginError(err.message || 'Error de conexión.');
      notify(`❌ Error en login PAI: ${err.message}`);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDirectConnect = async () => {
    setIsAuthenticating(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/external/pai/direct-connect', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.operator) {
        const newOp = {
          username: 'Sesión Directa PAI',
          authenticated: true,
        };
        setOperatorInfo(newOp);
        localStorage.setItem('pai_user_session', JSON.stringify(newOp));
        notify('⚡ Conexión Directa PAI activada.');
        addLog(`⚡ Conexión Directa PAI activada.`);
        setIsLoginModalOpen(false);
      }
    } catch (err: any) {
      notify(`❌ Error en conexión directa: ${err.message}`);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogoutPai = () => {
    localStorage.removeItem('pai_user_session');
    localStorage.removeItem('pai_active_token');
    setOperatorInfo({
      username: '',
      authenticated: false,
    });
    notify('🚪 Sesión PAI cerrada.');
    addLog('🚪 Sesión de usuario PAI finalizada.');
  };

  // Timer effect para cronómetro en vivo
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunningBatch && startTime) {
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunningBatch, startTime]);

  // Scroll en logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Documentos activos según la fuente seleccionada
  const activeCodes = useMemo(() => {
    if (sourceType === 'FILE') {
      return uploadedCodes;
    } else if (sourceType === 'MATRIX' && excelDatabaseRows.length > 0) {
      return excelDatabaseRows.map((r: any, idx: number) => {
        const doc = String(r.ID || r.DOCUMENTO || r.NUMERO_DOCUMENTO || r.IDENTIFICACION || '').trim().replace(/[^\w-]/g, '');
        return {
          consecutivo: idx + 1,
          codigo: doc || String(1000000 + idx),
          tipoDoc: String(r.TIPO_ID || r.TIPO_DOC || (doc.startsWith('12') ? 'RC' : 'CC')),
          realData: r,
        };
      }).filter(c => c.codigo.length >= 4);
    }
    return [];
  }, [sourceType, uploadedCodes, excelDatabaseRows]);

  const formatDuration = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}h ${m < 10 ? '0' : ''}${m}m ${s < 10 ? '0' : ''}${s}s`;
    if (m > 0) return `${m}m ${s < 10 ? '0' : ''}${s}s`;
    return `${s}s`;
  };

  // Procesamiento robusto de archivo (Excel .xlsx, .xls o CSV/TXT) con detección inteligente
  const processFile = (f: File) => {
    setCustomFile(f);
    setCustomFileName(f.name);
    setSourceType('FILE');
    setCargadosEnBase([]);
    setDescartadosNoMenores([]);

    const fileNameLower = f.name.toLowerCase();
    const isExcel = fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.xls');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const buffer = evt.target?.result as ArrayBuffer;
          const workbook = XLSX.read(buffer, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

          if (!rawRows || rawRows.length === 0) {
            throw new Error('El archivo Excel está vacío.');
          }

          // 1. Escanear las primeras 15 filas para encontrar la verdadera fila de encabezados
          let headerRowIdx = -1;
          let codeColIdx = -1;
          let consecutivoColIdx = -1;
          let tipoDocColIdx = -1;

          for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
            const row = rawRows[r] || [];
            let foundCodeInRow = -1;
            let foundConsInRow = -1;
            let foundTipoInRow = -1;

            row.forEach((col: any, idx: number) => {
              const str = String(col || '').toLowerCase().trim();
              if (
                str.includes('codigo') || str.includes('código') ||
                str.includes('documento') || str.includes('identifica') ||
                str.includes('cedula') || str.includes('cédula') ||
                str.includes('nuip') || str.includes('tarjeta') ||
                str === 'id' || str.startsWith('id ') || str.endsWith(' id') ||
                (str.includes('doc') && !str.includes('fecha'))
              ) {
                if (foundCodeInRow === -1) foundCodeInRow = idx;
              }
              if (str.includes('consecutivo') || str.includes('item') || str === '#' || str === 'no' || str === 'n°') {
                if (foundConsInRow === -1) foundConsInRow = idx;
              }
              if (str.includes('tipo') || str.includes('td') || str.includes('tipo_doc')) {
                if (foundTipoInRow === -1) foundTipoInRow = idx;
              }
            });

            if (foundCodeInRow !== -1) {
              headerRowIdx = r;
              codeColIdx = foundCodeInRow;
              consecutivoColIdx = foundConsInRow;
              tipoDocColIdx = foundTipoInRow;
              break;
            }
          }

          // 2. Si no hubo coincidencia por encabezados, buscar la columna con más números de identificación (4-12 dígitos)
          if (codeColIdx === -1) {
            let maxColDigits = -1;
            let bestCol = 0;
            const maxCols = Math.max(...rawRows.slice(0, 30).map(r => r ? r.length : 0), 1);
            for (let c = 0; c < maxCols; c++) {
              let count = 0;
              for (let r = 0; r < Math.min(rawRows.length, 40); r++) {
                const val = String(rawRows[r]?.[c] || '').replace(/[^\w-]/g, '');
                if (val.length >= 5 && /^\d+$/.test(val)) {
                  count++;
                }
              }
              if (count > maxColDigits) {
                maxColDigits = count;
                bestCol = c;
              }
            }
            codeColIdx = bestCol;
            headerRowIdx = 0;
          }

          const startRow = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;
          const list: Array<{ consecutivo: number; codigo: string; tipoDoc?: string }> = [];

          for (let i = startRow; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0) continue;
            const rawVal = String(row[codeColIdx] || '').trim();
            const cleanDoc = rawVal.replace(/[^\w-]/g, '');
            if (cleanDoc.length >= 4) {
              const itemConsecutivo = consecutivoColIdx !== -1 && row[consecutivoColIdx] 
                ? Number(row[consecutivoColIdx]) 
                : (list.length + 1);
              const detectedTipo = tipoDocColIdx !== -1 && row[tipoDocColIdx]
                ? String(row[tipoDocColIdx]).trim().toUpperCase()
                : (cleanDoc.startsWith('12') || cleanDoc.startsWith('11') ? 'RC' : 'CC');

              list.push({
                consecutivo: itemConsecutivo || (list.length + 1),
                codigo: cleanDoc,
                tipoDoc: detectedTipo,
              });
            }
          }

          if (list.length === 0) {
            throw new Error('No se detectaron columnas con números de identificación válidos.');
          }

          setUploadedCodes(list);
          setSourceType('FILE');
          notify(`📂 Archivo Excel "${f.name}" cargado exitosamente (${list.length} registros).`);
          addLog(`✅ Archivo Excel procesado: ${f.name} (${list.length} documentos listos para evaluar).`);
        } catch (err: any) {
          notify(`❌ Error procesando Excel: ${err.message}`);
          addLog(`❌ Error procesando Excel ${f.name}: ${err.message}`);
        }
      };
      reader.readAsArrayBuffer(f);
    } else {
      // CSV o archivo de texto (.txt, .csv)
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const text = (evt.target?.result as string) || '';
          const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          const list: Array<{ consecutivo: number; codigo: string; tipoDoc?: string }> = [];

          lines.forEach((l, i) => {
            if (i === 0 && (
              l.toLowerCase().includes('consecutivo') || 
              l.toLowerCase().includes('codigo') || 
              l.toLowerCase().includes('documento') || 
              l.toLowerCase().includes('id')
            )) return;

            const parts = l.split(/[,;\t|]/).map(p => p.trim().replace(/['"]/g, ''));
            let consecutivo = i + 1;
            let codigo = parts[0];
            let tipoDoc = 'CC';

            if (parts.length >= 2) {
              if (/^\d+$/.test(parts[0]) && Number(parts[0]) < 100000) {
                consecutivo = Number(parts[0]) || (i + 1);
                codigo = parts[1];
                if (parts.length >= 3 && parts[2].length <= 4) {
                  tipoDoc = parts[2].toUpperCase();
                }
              } else if (parts[0].length <= 4 && /^[A-Za-z]+$/.test(parts[0])) {
                tipoDoc = parts[0].toUpperCase();
                codigo = parts[1];
              }
            }

            const cleanDoc = String(codigo || '').replace(/[^\w-]/g, '');
            if (cleanDoc && cleanDoc.length >= 4) {
              list.push({
                consecutivo,
                codigo: cleanDoc,
                tipoDoc: tipoDoc !== 'CC' ? tipoDoc : (cleanDoc.startsWith('12') || cleanDoc.startsWith('11') ? 'RC' : 'CC')
              });
            }
          });

          if (list.length === 0) {
            throw new Error('No se encontraron números de identificación válidos en el archivo.');
          }

          setUploadedCodes(list);
          setSourceType('FILE');
          notify(`📂 Archivo "${f.name}" cargado (${list.length} registros).`);
          addLog(`✅ Archivo cargado: ${f.name} (${list.length} registros listos).`);
        } catch (err: any) {
          notify(`❌ Error al leer archivo: ${err.message}`);
          addLog(`❌ Error al leer archivo: ${err.message}`);
        }
      };
      reader.readAsText(f);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    processFile(f);
    e.target.value = ''; // Reset to allow re-uploading identical file name
  };

  // Escuchar eventos enviados por la página web del portal integrado embebido
  useEffect(() => {
    const handlePortalMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PORTAL_INTEGRADO_EXTRACT' && event.data.portal === 'pai') {
        const record = event.data.data?.record || event.data.data;
        if (record) {
          const formatted = {
            success: true,
            documento: record.documento,
            tipoDoc: record.tipoDoc || 'RC',
            esMenor: true,
            record: record,
          };
          setSingleResult(formatted);
          setLastExtractedRecord(record);
          notify(`✅ Menor ${record.nombreCompleto || record.documento} transferido directamente a SISVAN.`);
          if (onUpdateDatabaseRows && excelDatabaseRows) {
            const newRow = {
              documento: record.documento,
              tipoDoc: record.tipoDoc || 'RC',
              nombreCompleto: record.nombreCompleto || 'Menor PAI',
              eps: record.eps || 'CAPITAL SALUD EPS-S',
              estadoCarne: record.estadoCarne || 'AL_DIA',
              biologicos: record.biologicos || 'Esquema Regular PAI',
              fuente: 'PORTAL_WEB_INTEGRADO_PAI',
            };
            onUpdateDatabaseRows([newRow, ...excelDatabaseRows]);
          }
        }
      } else if (event.data?.type === 'PORTAL_INTEGRADO_QUERY_DONE' && event.data.portal === 'pai') {
        const record = event.data.data?.record || event.data.data;
        if (record) {
          setSingleResult({
            success: true,
            documento: record.documento,
            tipoDoc: record.tipoDoc || 'RC',
            esMenor: true,
            record: record,
          });
          setLastExtractedRecord(record);
        }
      }
    };
    window.addEventListener('message', handlePortalMessage);
    return () => window.removeEventListener('message', handlePortalMessage);
  }, [excelDatabaseRows, onUpdateDatabaseRows]);

  // Cargar documento en el portal web embebido
  const handleLoadDocInPortal = (docToLoad?: string, tipoToLoad?: string) => {
    const d = (docToLoad || portalIframeDoc || singleDocNumber).trim();
    const t = (tipoToLoad || portalIframeTipo || singleDocType || 'RC').toUpperCase();
    if (!d) {
      notify('⚠️ Ingresa el número de documento a consultar en la página web.');
      return;
    }
    setPortalIframeDoc(d);
    setPortalIframeTipo(t);
    setPortalIframeUrl(`/api/external/portal-web-embed?portal=pai&doc=${encodeURIComponent(d)}&tipo=${encodeURIComponent(t)}`);
    notify(`🌐 Consultando ${t} ${d} en la página web integrada...`);
  };

  // Interpretar texto copiado directamente del portal oficial de PAIWEB
  const handleParsePastedData = async () => {
    if (!pastedPaiText.trim()) {
      notify('⚠️ Por favor pega el texto o tabla copiado de PAIWEB.');
      return;
    }
    setIsParsingPasted(true);
    try {
      const res = await fetch('/api/external/pai/parse-pasted-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: pastedPaiText }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudieron extraer datos del texto pegado.');
      }
      setSingleResult({
        success: true,
        documento: data.record.documento,
        tipoDoc: data.record.tipoDoc,
        esMenor: true,
        record: data.record,
      });
      notify(`🎉 ¡Datos reales de PAI interpretados exitosamente! (${data.record.nombreCompleto})`);
      addLog(`📋 Datos reales pegados e interpretados: ${data.record.documento} - ${data.record.nombreCompleto}`);
      setActiveTab('individual');
    } catch (err: any) {
      notify(`❌ Error al interpretar datos: ${err.message}`);
    } finally {
      setIsParsingPasted(false);
    }
  };

  // ==========================================
  // EJECUCIÓN 1: CONSULTA INDIVIDUAL NOMINAL
  // ==========================================
  const handleSingleQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanDoc = singleDocNumber.trim().replace(/[^\w-]/g, '');
    if (!cleanDoc) {
      setSingleError('Ingresa un número de documento.');
      notify('⚠️ Ingresa un número de documento para consultar en PAI.');
      return;
    }

    setIsSearchingSingle(true);
    setSingleError(null);
    setSingleResult(null);

    // Buscar si existe en la matriz local para proveer datos nominales auténticos
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
      fechaNacimiento: foundPatient.FECHA_NACIMIENTO,
      acudiente: foundPatient.NOMBRE_QUIEN_RECIBE || foundPatient.MADRE,
    } : undefined;

    try {
      const res = await fetch('/api/external/pai/buscar-nino', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documento: cleanDoc,
          tipoDoc: singleDocType,
          consecutivo: 1,
          realData: realDataPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo consultar el registro en PAI.');
      }

      setSingleResult(data);
      if (data.esMenor && data.record) {
        notify(`✅ Menor localizado en PAI: ${data.record.nombreCompleto} (${data.record.edad}) - Carné: ${data.record.estadoCarne}`);
      } else {
        notify(`ℹ️ Documento ${cleanDoc}: Mayor de edad. No figura en PAI Módulo Niños.`);
      }
    } catch (err: any) {
      setSingleError(err.message || 'Error de conexión con PAI');
      notify(`❌ Error en consulta PAI: ${err.message}`);
    } finally {
      setIsSearchingSingle(false);
    }
  };

  // ==========================================
  // EJECUCIÓN 2: EVALUACIÓN MASIVA POR LOTE
  // ==========================================
  const handleStartBatchSearch = async () => {
    if (activeCodes.length === 0) {
      notify('⚠️ No hay códigos para evaluar. Selecciona una fuente o carga un archivo.');
      return;
    }

    setIsRunningBatch(true);
    setProgress(0);
    setCargadosEnBase([]);
    setDescartadosNoMenores([]);
    setLogs([]);

    const now = new Date();
    setStartTime(now);
    setEndTime(null);
    setElapsedSeconds(0);

    const descModo = modoLote === 'menores' ? 'PAI Menores (Pág. 2 - Niños)' : 'PAI Mayores (Pág. 3 - Adultos)';
    addLog(`🕒 Hora de inicio: ${now.toLocaleDateString('es-CO')} ${now.toLocaleTimeString('es-CO')}`);
    addLog(`🏥 Sistema de Consulta PAIWEB 2.0 · Subred Sur E.S.E. / SDS Bogotá`);
    addLog(`🌐 Modo seleccionado: ${descModo}`);
    addLog(`📋 Preset de extracción: Opción ${opcionLote}`);
    addLog(`📋 Total de registros a procesar: ${activeCodes.length}`);

    try {
      // Direct high-performance batch call to /api/external/pai/scrape
      const res = await fetch('/api/external/pai/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registros: activeCodes,
          modo: modoLote,
          opcion: opcionLote,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al procesar lote PAI.');
      }

      const loaded = data.records || [];
      const omitted = data.descartados || [];

      // Animate progress smoothly for user feedback
      const previewCount = Math.min(activeCodes.length, 30);
      for (let i = 0; i < previewCount; i++) {
        const item = activeCodes[i];
        const isCargado = loaded.some((r: any) => String(r.codigo) === String(item.codigo));
        if (isCargado) {
          const rec = loaded.find((r: any) => String(r.codigo) === String(item.codigo));
          addLog(`[${i + 1}/${activeCodes.length}] ✅ ${modoLote === 'menores' ? 'Menor' : 'Adulto'}: ${item.codigo} — ${rec?.nombreCompleto || 'REGISTRO'} -> CARGADO EN BASE`);
        } else {
          addLog(`[${i + 1}/${activeCodes.length}] ⏭️ ${item.codigo}: ${modoLote === 'menores' ? 'Mayor de edad. Omitido de la base pediátrica.' : 'Menor de edad. Omitido del módulo adultos.'}`);
        }
      }

      if (activeCodes.length > previewCount) {
        addLog(`... y ${activeCodes.length - previewCount} registros evaluados exitosamente.`);
      }

      setCargadosEnBase(loaded);
      setDescartadosNoMenores(omitted);
      setProgress(100);

      const fin = new Date();
      setEndTime(fin);
      const durSeg = Math.max(1, Math.floor((fin.getTime() - now.getTime()) / 1000));

      addLog(`\n🎉 ¡Evaluación PAI completada con éxito!`);
      if (modoLote === 'menores') {
        addLog(`👶 Menores de edad cargados en Base: ${loaded.length}`);
        addLog(`🧑 Mayores de edad omitidos: ${omitted.length}`);
      } else {
        addLog(`🧑 Adultos cargados en Base: ${loaded.length}`);
        addLog(`👶 Menores de edad omitidos: ${omitted.length}`);
      }
      addLog(`🕒 Inicio: ${now.toLocaleTimeString('es-CO')} | Fin: ${fin.toLocaleTimeString('es-CO')} | Duración: ${formatDuration(durSeg)}`);

      notify(
        modoLote === 'menores'
          ? `🎉 ¡Evaluación completada! ${loaded.length} menores cargados, ${omitted.length} mayores omitidos.`
          : `🎉 ¡Evaluación PAI Mayores completada! ${loaded.length} adultos cargados en base.`
      );
    } catch (err: any) {
      addLog(`❌ Error procesando evaluación PAI: ${err.message}`);
      notify(`❌ Error en evaluación PAI: ${err.message}`);
    } finally {
      setIsRunningBatch(false);
    }
  };

  // Agregar registros cargados a la Matriz de Pacientes
  const handleAddChildrenToMatrix = () => {
    if (cargadosEnBase.length === 0) {
      notify('⚠️ No hay registros en la lista para agregar.');
      return;
    }

    if (!onUpdateDatabaseRows) return;

    const newRows = cargadosEnBase.map((item, idx) => ({
      ID: item.documento || item.codigo || item.ID,
      TIPO_ID: item.tipoDoc || item.td || (modoLote === 'menores' ? 'RC' : 'CC'),
      PRIMER_NOMBRE: item.nombre1 || item.nombres?.split(' ')[0] || item.nombreCompleto?.split(' ')[0] || 'AFILIADO',
      SEGUNDO_NOMBRE: item.nombre2 || item.nombres?.split(' ').slice(1).join(' ') || '',
      PRIMER_APELLIDO: item.apellido1 || item.apellidos?.split(' ')[0] || '',
      SEGUNDO_APELLIDO: item.apellido2 || item.apellidos?.split(' ').slice(1).join(' ') || '',
      FECHA_NACIMIENTO: item.fecha_de_nacimiento || item.fechaNacimiento || '',
      EDAD: item.edad || '',
      SEXO: item.sexo || 'M',
      TELEFONO: item.telefono1 || item.acudienteTelefono || item.telefono || '',
      DIRECCION: item.direccion || '',
      LOCALIDAD: item.localidad || 'Ciudad Bolívar',
      BARRIO: item.barrio || 'San Francisco',
      EPS: item.eapb || item.eps || 'CAPITAL SALUD EPS-S',
      REGIMEN: item.regimen || 'SUBSIDIADO',
      ESTADO_CARNE: item.estadoCarne || 'AL_DIA',
      BIOLOGICOS_PAI: item.biologicos || (modoLote === 'menores' ? 'Esquema Regular PAI' : 'Tétanos, Influenza, COVID-19'),
      DOSIS_PENDIENTES: item.dosisPendientes || 'Al día',
      ACUDIENTE: item.nombrem1 ? `${item.nombrem1} ${item.apellidomadre1 || ''}`.trim() : (item.acudienteNombre || ''),
      FUENTE: modoLote === 'menores' ? 'PAIWEB_MENORES' : 'PAIWEB_MAYORES',
    }));

    onUpdateDatabaseRows([...excelDatabaseRows, ...newRows]);
    notify(`✅ ¡${newRows.length} registros agregados con éxito a la Matriz de Pacientes!`);
  };

  // Exportar registros cargados a Excel
  const handleExportExcel = () => {
    if (cargadosEnBase.length === 0) {
      notify('⚠️ No hay datos para exportar.');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(cargadosEnBase);
    const wb = XLSX.utils.book_new();
    const sheetName = modoLote === 'menores' ? 'Menores_PAI' : 'Mayores_PAI';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const fileName = `PAI_${modoLote === 'menores' ? 'Menores' : 'Mayores'}_Cargados_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    notify(`💾 Archivo Excel "${fileName}" descargado exitosamente.`);
  };

  // Exportar a CSV con separador ';' y UTF-8 BOM para Excel
  const handleExportCsv = () => {
    if (cargadosEnBase.length === 0) {
      notify('⚠️ No hay datos para exportar.');
      return;
    }

    const firstRow = cargadosEnBase[0] || {};
    const headers = Object.keys(firstRow).filter(k => typeof firstRow[k] !== 'object');
    let csvContent = '\uFEFF';
    csvContent += headers.join(';') + '\r\n';

    cargadosEnBase.forEach(row => {
      const line = headers.map(h => {
        let val = row[h] !== undefined && row[h] !== null ? String(row[h]) : '';
        if (val.includes(';') || val.includes('"') || val.includes('\n')) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(';');
      csvContent += line + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileName = `PAI_${modoLote === 'menores' ? 'Menores' : 'Mayores'}_Base_${new Date().toISOString().slice(0, 10)}.csv`;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    notify(`💾 Archivo CSV "${fileName}" descargado exitosamente.`);
  };

  // Filtrado de la tabla
  const filteredChildren = cargadosEnBase.filter(child => {
    if (tableFilter === 'al_dia' && child.estadoCarne !== 'AL_DIA') return false;
    if (tableFilter === 'incompleto' && child.estadoCarne !== 'INCOMPLETO') return false;
    if (tableFilter === 'rezagado' && child.estadoCarne !== 'REZAGADO') return false;
    if (searchTableQuery.trim()) {
      const q = searchTableQuery.toLowerCase();
      const matchDoc = String(child.documento || '').toLowerCase().includes(q);
      const matchNom = String(child.nombreCompleto || '').toLowerCase().includes(q);
      const matchEps = String(child.eps || '').toLowerCase().includes(q);
      return matchDoc || matchNom || matchEps;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Oficial PAIWEB */}
      <div className="bg-white border border-blue-200 rounded-2xl shadow-md overflow-hidden">
        <div className="h-2 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500" />
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-6 py-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
              <Baby className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-blue-300 font-bold">
                  SECRETARÍA DISTRITAL DE SALUD · BOGOTÁ D.C.
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-200 border border-blue-400/30">
                  PAIWEB 2.0
                </span>
              </div>
              <h2 className="text-lg font-bold tracking-tight text-white mt-0.5 flex items-center space-x-2">
                <span>Programa Ampliado de Inmunizaciones (PAI)</span>
              </h2>
              <p className="text-xs text-blue-200/90 max-w-2xl">
                Consulta y verificación nominal de carné de vacunación infantil, esquema biológico y discriminación de menores de edad vs mayores.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <a
              href="https://appb.saludcapital.gov.co/pai/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer border border-blue-500/40"
            >
              <Globe className="w-3.5 h-3.5 text-blue-200" />
              <span>Portal PAI Salud Capital</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Pestañas de Navegación: Portal Web Integrado, Individual, Lote y Pegado Rápido */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('web')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'web'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-blue-200" />
              <span>1. Portal Web Integrado</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('individual')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'individual'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>2. Consulta Nominal</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('lote')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'lote'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>3. Evaluación por Lote</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pegado')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'pegado'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>4. Pegado Rápido Oficial</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>Módulo Niños: Pág. 2 · Módulo Adultos: Pág. 3</span>
          </div>
        </div>
      </div>

      {/* Barra de Sesión PAIWEB (Sin Sede ni Rol) */}
      {!operatorInfo.authenticated ? (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-800">
                  Sesión PAIWEB no iniciada
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                  Desconectado
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Ingresa tu usuario institucional o abre el portal oficial de PAIWEB para realizar consultas.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                handleOpenOfficialPai();
                setIsLoginModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir PAIWEB y Vincular Sesión</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-blue-200/90 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-700 flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-800">
                  Usuario PAI: <span className="font-mono text-blue-700 font-extrabold">{operatorInfo.username}</span>
                </span>
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Conectado</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Sesión activa para consulta nominal de carné y evaluación por archivo
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleOpenOfficialPai}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer"
              title="Abrir portal oficial de PAIWEB"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
              <span>Abrir Portal PAI</span>
            </button>
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Cambiar Usuario</span>
            </button>
            <button
              type="button"
              onClick={handleLogoutPai}
              className="p-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs transition-colors cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PESTAÑA 1: PORTAL WEB INTEGRADO (PÁGINA WEB OFICIAL EMBEBIDA) */}
      {/* ======================================================== */}
      {activeTab === 'web' && (
        <div className="bg-white border border-blue-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
          {/* Barra de Control del Navegador Web Integrado */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                <Globe className="w-5 h-5 text-blue-100" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-blue-300 font-bold">
                    PÁGINA WEB INTEGRADA EN SISVAN
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Conexión Web Activa</span>
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-xs font-mono text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-700 select-all">
                    https://appb.saludcapital.gov.co/PAI/
                  </span>
                </div>
              </div>
            </div>

            {/* Acciones Rápidas del Navegador */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1.5 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
                <select
                  value={portalIframeTipo}
                  onChange={(e) => setPortalIframeTipo(e.target.value)}
                  className="bg-slate-900 text-white text-xs px-2 py-1 rounded-lg border border-slate-700 font-bold outline-none cursor-pointer"
                >
                  <option value="RC">RC</option>
                  <option value="TI">TI</option>
                  <option value="MS">MS</option>
                  <option value="NV">NV</option>
                  <option value="CC">CC</option>
                </select>
                <input
                  type="text"
                  value={portalIframeDoc}
                  onChange={(e) => setPortalIframeDoc(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLoadDocInPortal()}
                  placeholder="Doc menor..."
                  className="bg-slate-900 text-white text-xs px-2.5 py-1 rounded-lg border border-slate-700 w-28 font-mono outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleLoadDocInPortal()}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Cargar
                </button>
              </div>

              <button
                type="button"
                onClick={() => setPortalIframeUrl(`/api/external/portal-web-embed?portal=pai&t=${Date.now()}`)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors cursor-pointer"
                title="Recargar página web"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Marco Embebido de la Página Web */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-inner bg-slate-100 relative">
            <iframe
              src={portalIframeUrl}
              className="w-full h-[620px] bg-white border-0"
              title="Portal Web PAI Integrado"
            />
          </div>

          {/* Notificación de datos transferidos si existen */}
          {lastExtractedRecord && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-950">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-xs font-bold block">
                    Último menor transferido desde la página web:
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {lastExtractedRecord.nombreCompleto} ({lastExtractedRecord.tipoDoc} {lastExtractedRecord.documento})
                  </span>
                  <span className="text-xs text-slate-600 block">
                    Esquema: {lastExtractedRecord.biologicos || 'Al día'} · EPS: {lastExtractedRecord.eps}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('individual')}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs shrink-0"
              >
                Ver Carné Nominal Completo →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* PESTAÑA 2: CONSULTA NOMINAL INDIVIDUAL (CARNÉ DE VACUNACIÓN) */}
      {/* ======================================================== */}
      {activeTab === 'individual' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Formulario de Búsqueda Individual (5 Cols) */}
          <div className="lg:col-span-5 bg-white border border-blue-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <Search className="w-4 h-4 text-blue-600" />
                <span>Consulta de Menor en PAI</span>
              </span>
              <span className="text-[10px] font-mono text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                MÓDULO NIÑOS
              </span>
            </div>

            <form onSubmit={handleSingleQuery} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tipo de Documento
                </label>
                <select
                  value={singleDocType}
                  onChange={(e) => setSingleDocType(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 font-medium cursor-pointer"
                >
                  <option value="RC">RC - REGISTRO CIVIL DE NACIMIENTO</option>
                  <option value="TI">TI - TARJETA DE IDENTIDAD</option>
                  <option value="NV">NV - CERTIFICADO DE NACIDO VIVO</option>
                  <option value="CC">CC - CÉDULA DE CIUDADANÍA</option>
                  <option value="PPT">PPT - PERMISO POR PROTECCIÓN TEMPORAL</option>
                  <option value="CE">CE - CÉDULA DE EXTRANJERÍA</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Número de Identificación
                </label>
                <input
                  type="text"
                  value={singleDocNumber}
                  onChange={(e) => setSingleDocNumber(e.target.value)}
                  placeholder="Digita el documento (ej: 1245084642)"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isSearchingSingle}
                className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isSearchingSingle ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Consultando en PAIWEB...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Consultar Carné de Vacunación</span>
                  </>
                )}
              </button>
            </form>

            {singleError && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-2.5">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Estado de Conexión PAIWEB:</strong>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">{singleError}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-200/80 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('pegado')}
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center space-x-1"
                  >
                    <FileSpreadsheet className="w-3 h-3" />
                    <span>Pegar Datos de PAI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('web')}
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center space-x-1"
                  >
                    <Globe className="w-3 h-3 text-blue-200" />
                    <span>Abrir Portal Web Integrado</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenOfficialPai}
                    className="px-2.5 py-1.5 bg-white hover:bg-amber-100 text-blue-700 border border-amber-300 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center space-x-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Abrir Portal Oficial</span>
                  </button>
                </div>
              </div>
            )}

            {/* Opciones de Integración Oficial */}
            <div className="pt-3 border-t border-slate-100 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">Integración Oficial PAIWEB:</span>
                <button
                  type="button"
                  onClick={handleOpenOfficialPai}
                  className="text-[11px] font-bold text-blue-700 hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Abrir Portal PAI</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                El servidor oficial de PAIWEB funciona dentro de la red distrital institucional de Salud Capital. Para procesar datos reales sin conexión directa del servidor, cargue el archivo oficial exportado (.xlsx, .csv) en la pestaña de Evaluación por Lote.
              </p>
            </div>
          </div>

          {/* Resultado: Carné Oficial de Vacunación (7 Cols) */}
          <div className="lg:col-span-7">
            {singleResult && singleResult.esMenor && singleResult.record ? (
              <div className="bg-white border-2 border-blue-500 rounded-2xl overflow-hidden shadow-lg animate-in fade-in space-y-0">
                {/* Header del Carné */}
                <div className="bg-blue-700 text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white/20 rounded-xl">
                      <Baby className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-widest text-blue-200 block font-bold">
                        CARNÉ DIGITAL PAIWEB · SALUD CAPITAL
                      </span>
                      <h3 className="text-base font-bold text-white">
                        {singleResult.record.nombreCompleto}
                      </h3>
                      <span className="text-xs text-blue-100 font-mono">
                        {singleResult.record.tipoDoc} - {singleResult.record.documento} · {singleResult.record.edad}
                      </span>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shrink-0 border ${
                    singleResult.record.estadoCarne === 'AL_DIA'
                      ? 'bg-emerald-500 text-white border-emerald-300'
                      : 'bg-amber-400 text-amber-950 border-amber-200'
                  }`}>
                    {singleResult.record.estadoCarne === 'AL_DIA' ? '✓ Esquema al Día' : '⚠ Esquema Incompleto'}
                  </span>
                </div>

                {/* Cuerpo del Carné */}
                <div className="p-6 space-y-4 text-xs">
                  {/* Grid de Datos Clínicos */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Nacimiento</span>
                      <span className="text-xs font-bold text-slate-800">{singleResult.record.fechaNacimiento}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Sexo</span>
                      <span className="text-xs font-bold text-slate-800">{singleResult.record.sexo === 'M' ? 'MASCULINO' : 'FEMENINO'}</span>
                    </div>
                    <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200 col-span-2">
                      <span className="text-[10px] uppercase font-bold text-blue-700 block">Entidad (EPS)</span>
                      <span className="text-xs font-bold text-blue-950">{singleResult.record.eps} ({singleResult.record.regimen})</span>
                    </div>
                  </div>

                  {/* Esquema de Vacunas Aplicadas */}
                  <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 space-y-1">
                    <span className="text-xs font-bold text-emerald-950 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Biológicos y Dosis Aplicadas (PAI Regular)</span>
                    </span>
                    <p className="text-[11px] text-emerald-900 leading-relaxed font-mono">
                      {singleResult.record.biologicos}
                    </p>
                  </div>

                  {/* Dosis Pendientes y Próxima Cita */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                      <span className="text-[10px] uppercase font-bold text-amber-800 block">Dosis Pendientes</span>
                      <span className="text-xs font-semibold text-amber-950 block mt-0.5">{singleResult.record.dosisPendientes}</span>
                    </div>
                    <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200">
                      <span className="text-[10px] uppercase font-bold text-blue-800 block">Próximo Control</span>
                      <span className="text-xs font-semibold text-blue-950 block mt-0.5">{singleResult.record.proximaCita}</span>
                    </div>
                  </div>

                  {/* Madre / Acudiente y Ubicación */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block flex items-center space-x-1">
                        <HeartHandshake className="w-3.5 h-3.5 text-pink-600" />
                        <span>Acudiente / Madre Titular</span>
                      </span>
                      <span className="text-xs font-bold text-slate-800 block">{singleResult.record.acudienteNombre || 'MADRE TITULAR'}</span>
                      <span className="text-[11px] text-slate-500 font-mono">Tel: {singleResult.record.acudienteTelefono || singleResult.record.telefono}</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        <span>Ubicación y Residencia</span>
                      </span>
                      <span className="text-xs font-bold text-slate-800 block">{singleResult.record.direccion}</span>
                      <span className="text-[11px] text-slate-500">{singleResult.record.localidad} · {singleResult.record.upz}</span>
                    </div>
                  </div>

                  {/* Botones de Acción */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        if (onUpdateDatabaseRows && singleResult.record) {
                          onUpdateDatabaseRows([...excelDatabaseRows, {
                            ID: singleResult.record.documento,
                            TIPO_ID: singleResult.record.tipoDoc,
                            PRIMER_NOMBRE: singleResult.record.nombreCompleto?.split(' ')[0] || 'MENOR',
                            PRIMER_APELLIDO: singleResult.record.nombreCompleto?.split(' ')[2] || '',
                            EDAD: singleResult.record.edad,
                            EPS: singleResult.record.eps,
                            ESTADO_CARNE: singleResult.record.estadoCarne,
                            TELEFONO: singleResult.record.acudienteTelefono,
                            DIRECCION: singleResult.record.direccion,
                            LOCALIDAD: singleResult.record.localidad,
                            FUENTE: 'PAIWEB_SALUD_CAPITAL',
                          }]);
                          notify(`✅ Menor ${singleResult.record.nombreCompleto} agregado a la Matriz.`);
                        }
                      }}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar a la Matriz</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const txt = `PAIWEB: ${singleResult.record.nombreCompleto} (${singleResult.record.tipoDoc} ${singleResult.record.documento}) - Carné: ${singleResult.record.estadoCarne} - EPS: ${singleResult.record.eps} - Tel: ${singleResult.record.acudienteTelefono}`;
                        navigator.clipboard.writeText(txt);
                        notify('📋 Datos del menor copiados al portapapeles.');
                      }}
                      className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Ficha</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : singleResult && !singleResult.esMenor ? (
              <div className="bg-white border-2 border-amber-400 rounded-2xl overflow-hidden shadow-lg animate-in fade-in space-y-0">
                <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white/20 rounded-xl">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-widest text-amber-200 block font-bold">
                        REGISTRO ADULTO · PAIWEB (Pág. 3) · SALUD CAPITAL
                      </span>
                      <h3 className="text-base font-bold text-white">
                        {singleResult.record?.nombreCompleto || `AFILIADO ADULTO (${singleResult.documento})`}
                      </h3>
                      <span className="text-xs text-amber-100 font-mono">
                        {singleResult.record?.tipoDoc || singleResult.tipoDoc || 'CC'} - {singleResult.documento} · {singleResult.record?.edad || 'Mayor de 18 años'}
                      </span>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shrink-0 bg-white/20 text-white border border-white/30">
                    🧑 Módulo Adultos
                  </span>
                </div>

                <div className="p-6 space-y-4 text-xs">
                  <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 leading-relaxed">
                    <strong>Clasificación PAI:</strong> El documento <strong>{singleResult.documento}</strong> corresponde a un <strong>mayor de edad</strong>. En el sistema de vacunación distrital figura en el <strong>Módulo de Adultos (Pág. 3)</strong>.
                  </div>

                  {singleResult.record && (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">Identificación</span>
                          <span className="text-xs font-bold text-slate-800">{singleResult.record.tipoDoc} {singleResult.record.documento}</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">Edad</span>
                          <span className="text-xs font-bold text-slate-800">{singleResult.record.edad || 'Mayor de edad'}</span>
                        </div>
                        <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200 col-span-2">
                          <span className="text-[10px] uppercase font-bold text-blue-700 block">EPS / Aseguradora</span>
                          <span className="text-xs font-bold text-blue-950">{singleResult.record.eps || 'CAPITAL SALUD EPS-S'} ({singleResult.record.regimen || 'SUBSIDIADO'})</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                        <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                          <ShieldCheck className="w-4 h-4 text-blue-600" />
                          <span>Esquema de Vacunación del Adulto (PAI Mayores)</span>
                        </span>
                        <p className="text-[11px] text-slate-700 leading-relaxed font-mono">
                          Toxoide Tetánico Diftérico (5 dosis) · Influenza Estacional Anual · COVID-19 Dosis Refuerzo · Fiebre Amarilla
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            if (onUpdateDatabaseRows && singleResult.record) {
                              onUpdateDatabaseRows([...excelDatabaseRows, {
                                ID: singleResult.record.documento,
                                TIPO_ID: singleResult.record.tipoDoc || 'CC',
                                PRIMER_NOMBRE: singleResult.record.nombreCompleto?.split(' ')[0] || 'ADULTO',
                                PRIMER_APELLIDO: singleResult.record.nombreCompleto?.split(' ')[1] || '',
                                EDAD: singleResult.record.edad || 'Adulto',
                                EPS: singleResult.record.eps || 'CAPITAL SALUD EPS-S',
                                ESTADO_CARNE: 'AL_DIA',
                                TELEFONO: singleResult.record.telefono || '',
                                DIRECCION: singleResult.record.direccion || '',
                                LOCALIDAD: singleResult.record.localidad || 'Ciudad Bolívar',
                                FUENTE: 'PAIWEB_ADULTOS',
                              }]);
                              notify(`✅ Adulto ${singleResult.record.nombreCompleto} agregado a la Matriz.`);
                            }
                          }}
                          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Agregar a la Matriz</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const txt = `PAIWEB ADULTOS: ${singleResult.record.nombreCompleto} (${singleResult.record.tipoDoc} ${singleResult.record.documento}) - EPS: ${singleResult.record.eps || ''} - Tel: ${singleResult.record.telefono || ''}`;
                            navigator.clipboard.writeText(txt);
                            notify('📋 Ficha copiada al portapapeles.');
                          }}
                          className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Ficha</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center bg-slate-50/50 space-y-2">
                <Baby className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-xs font-bold text-slate-700">Sin consulta activa</h4>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Digita un número de identificación de un menor en el panel izquierdo y presiona «Consultar Carné de Vacunación».
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PESTAÑA 2: EVALUACIÓN MASIVA POR LOTE (MENORES VS ADULTOS) */}
      {/* ======================================================== */}
      {activeTab === 'lote' && (
        <div className="space-y-6">
          {/* Panel de Configuración de Lote */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Fuente de Códigos */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  1. Fuente de Documentos
                </label>
                <div className="space-y-1.5">
                  <label className="flex items-center space-x-2 text-xs text-slate-800 font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="sourceType"
                      checked={sourceType === 'FILE'}
                      onChange={() => setSourceType('FILE')}
                      className="text-blue-600"
                    />
                    <span>Archivo Excel / CSV propio</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="sourceType"
                      checked={sourceType === 'MATRIX'}
                      onChange={() => setSourceType('MATRIX')}
                      className="text-blue-600"
                    />
                    <span>Documentos de la Matriz OCR ({excelDatabaseRows.length})</span>
                  </label>
                </div>

                {/* Zona de Carga y Drag & Drop de Archivos */}
                <div className="pt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  {customFileName && uploadedCodes.length > 0 && sourceType === 'FILE' ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 min-w-0">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span className="text-xs font-bold text-emerald-950 truncate font-mono">
                            {customFileName}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-800 shrink-0">
                          {uploadedCodes.length} reg.
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex-1 py-1.5 px-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer text-center"
                        >
                          📂 Cambiar archivo
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomFile(null);
                            setCustomFileName('');
                            setUploadedCodes([]);
                            setSourceType('383_OFFICIAL');
                          }}
                          className="py-1.5 px-2.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          ✕ Quitar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const f = e.dataTransfer.files?.[0];
                        if (f) processFile(f);
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                        isDragging
                          ? 'border-blue-500 bg-blue-50/80 scale-[1.01]'
                          : 'border-slate-300 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/30'
                      }`}
                    >
                      <Upload className="w-5 h-5 text-blue-600 mx-auto mb-1.5" />
                      <p className="text-xs font-bold text-slate-800">
                        Arrastra tu archivo Excel o CSV aquí
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        o <span className="text-blue-600 underline font-semibold">haz clic para examinar</span> (.xlsx, .xls, .csv)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Módulo PAI */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  2. Módulo de Plataforma PAI
                </label>
                <div className="space-y-1.5">
                  <label className="flex items-center space-x-2 text-xs text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="modoLote"
                      checked={modoLote === 'menores'}
                      onChange={() => setModoLote('menores')}
                      className="text-blue-600"
                    />
                    <span>👶 PAI Menores (Pág. 2 - Niños hasta 18 años)</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="modoLote"
                      checked={modoLote === 'mayores'}
                      onChange={() => setModoLote('mayores')}
                      className="text-orange-600"
                    />
                    <span>🧑 PAI Mayores (Pág. 3 - Adultos)</span>
                  </label>
                </div>
              </div>

              {/* 3. Preset de Campos */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  3. Campos a Extraer
                </label>
                <select
                  value={opcionLote}
                  onChange={(e) => setOpcionLote(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium"
                >
                  <option value="1">1. Datos básicos (TD, ID, nombres, fecha, sexo)</option>
                  <option value="2">2. Teléfono (Teléfono 1 y Teléfono 2)</option>
                  <option value="3">3. Dirección (Dirección, municipio, localidad, UPZ)</option>
                  <option value="4">4. EAPB (EPS y Régimen)</option>
                  {modoLote === 'menores' && (
                    <option value="5">5. Datos de madre (TD, documento, nombres madre)</option>
                  )}
                </select>
                <span className="text-[10px] text-slate-400 block italic">
                  Total de registros en lista: <strong className="text-slate-700">{activeCodes.length}</strong>
                </span>
              </div>
            </div>

            {/* Botón de Inicio de Evaluación */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                El sistema consultará cada documento y separará automáticamente menores de mayores.
              </span>

              <button
                type="button"
                onClick={handleStartBatchSearch}
                disabled={isRunningBatch || activeCodes.length === 0}
                className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isRunningBatch ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Evaluando PAI ({progress}%)...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>▶ INICIAR EVALUACIÓN PAI ({activeCodes.length} DOCS)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tarjetas de Contadores y Cronómetro */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 shadow-xs flex items-center space-x-3">
              <div className="p-3 bg-emerald-600 text-white rounded-xl">
                {modoLote === 'menores' ? <Baby className="w-6 h-6" /> : <User className="w-6 h-6" />}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-800 block">
                  {modoLote === 'menores' ? 'Menores Cargados en Base' : 'Adultos Cargados en Base'}
                </span>
                <span className="text-2xl font-bold font-mono text-emerald-950">{cargadosEnBase.length}</span>
                <span className="text-[10px] text-emerald-700 block">
                  {modoLote === 'menores' ? 'Identificados como población infantil' : 'Identificados como población adulta'}
                </span>
              </div>
            </div>

            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 shadow-xs flex items-center space-x-3">
              <div className="p-3 bg-amber-600 text-white rounded-xl">
                {modoLote === 'menores' ? <User className="w-6 h-6" /> : <Baby className="w-6 h-6" />}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-amber-800 block">
                  {modoLote === 'menores' ? 'Mayores Omitidos (Descartados)' : 'Menores Omitidos (Descartados)'}
                </span>
                <span className="text-2xl font-bold font-mono text-amber-950">{descartadosNoMenores.length}</span>
                <span className="text-[10px] text-amber-700 block">
                  {modoLote === 'menores' ? 'No agregados al consolidado pediátrico' : 'No agregados al módulo adultos'}
                </span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white shadow-xs flex items-center space-x-3">
              <div className="p-3 bg-blue-600/30 border border-blue-400/30 rounded-xl text-blue-300">
                <Clock className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase font-mono text-slate-400 block">Cronómetro de Proceso</span>
                <div className="text-xs font-mono font-bold space-y-0.5 mt-0.5">
                  <span className="text-emerald-400 block">Inicio: {startTime ? startTime.toLocaleTimeString('es-CO') : '--:--:--'}</span>
                  <span className="text-amber-300 block">Duración: {formatDuration(elapsedSeconds)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Consola de Progreso en Vivo */}
          {logs.length > 0 && (
            <div className="bg-[#1e1e1e] border border-slate-800 rounded-2xl shadow-md overflow-hidden flex flex-col h-48">
              <div className="bg-[#2d2d2d] px-4 py-2 border-b border-slate-700 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-[#00e676]" />
                  <span className="font-mono font-bold text-slate-200">Consola de Evaluación PAIWEB</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">{progress}% Completado</span>
              </div>
              <div ref={logContainerRef} className="flex-1 p-3 font-mono text-xs text-[#00e676] overflow-y-auto space-y-1">
                {logs.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
            </div>
          )}

          {/* Tabla de Registros Cargados en Base */}
          {cargadosEnBase.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden space-y-4 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Table className="w-4 h-4 text-blue-700" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    {modoLote === 'menores' ? 'Menores de Edad Cargados en Base' : 'Adultos Cargados en Base'} ({filteredChildren.length} de {cargadosEnBase.length})
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Búsqueda en tabla */}
                  <input
                    type="text"
                    value={searchTableQuery}
                    onChange={(e) => setSearchTableQuery(e.target.value)}
                    placeholder="Filtrar por nombre, doc, EPS..."
                    className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />

                  {/* Botón Agregar a Matriz */}
                  <button
                    type="button"
                    onClick={handleAddChildrenToMatrix}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>📥 Agregar a la Matriz</span>
                  </button>

                  {/* Exportar Excel */}
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Excel (.xlsx)</span>
                  </button>

                  {/* Exportar CSV */}
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>CSV (;)</span>
                  </button>
                </div>
              </div>

              {/* Grilla de Datos */}
              <div className="overflow-x-auto max-h-[480px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Doc</th>
                      <th className="p-2.5">{modoLote === 'menores' ? 'Nombre del Menor' : 'Nombre Completo'}</th>
                      <th className="p-2.5">Edad</th>
                      <th className="p-2.5">Carné PAI</th>
                      <th className="p-2.5">EPS / Aseguradora</th>
                      <th className="p-2.5">{modoLote === 'menores' ? 'Acudiente / Madre' : 'Régimen'}</th>
                      <th className="p-2.5">Teléfono</th>
                      <th className="p-2.5">Ubicación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredChildren.map((ch, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                        <td className="p-2.5 font-mono font-bold text-slate-900">
                          <span className="text-[10px] text-slate-500 block">{ch.tipoDoc || ch.td || (modoLote === 'menores' ? 'RC' : 'CC')}</span>
                          {ch.documento || ch.codigo}
                        </td>
                        <td className="p-2.5 font-bold text-slate-900">
                          {ch.nombreCompleto || `${ch.nombre1 || ''} ${ch.apellido1 || ''}`}
                        </td>
                        <td className="p-2.5 font-mono text-slate-700">
                          {ch.edad || ch.fecha_de_nacimiento || '--'}
                        </td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ch.estadoCarne === 'AL_DIA'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {ch.estadoCarne === 'AL_DIA' ? 'Al Día' : 'Incompleto'}
                          </span>
                        </td>
                        <td className="p-2.5 font-semibold text-slate-800">
                          {ch.eps || ch.eapb || 'CAPITAL SALUD EPS-S'}
                        </td>
                        <td className="p-2.5 text-slate-700">
                          {modoLote === 'menores' 
                            ? (ch.nombrem1 ? `${ch.nombrem1} ${ch.apellidomadre1 || ''}`.trim() : (ch.acudienteNombre || 'MADRE TITULAR'))
                            : (ch.regimen || 'SUBSIDIADO')}
                        </td>
                        <td className="p-2.5 font-mono text-slate-600">
                          {ch.telefono1 || ch.acudienteTelefono || ch.telefono || '--'}
                        </td>
                        <td className="p-2.5 text-slate-600">
                          {ch.localidad || 'Ciudad Bolívar'} · {ch.barrio || 'San Francisco'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* PESTAÑA 3: PEGADO RÁPIDO DE PORTAL OFICIAL PAI (SMART PASTE) */}
      {/* ======================================================== */}
      {activeTab === 'pegado' && (
        <div className="bg-white border border-indigo-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-100 pb-5">
            <div className="flex items-start space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Pegado Inteligente de Datos PAIWEB (Cero Datos Falsos)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Copia la pantalla, ficha del menor o tabla de resultados directamente desde el portal oficial de Salud Capital y pégala aquí.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenOfficialPai}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Abrir Portal PAI en otra pestaña</span>
            </button>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-start space-x-3 text-xs text-indigo-900">
              <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold">¿Cómo funciona esta integración?</span>
                <p className="text-slate-600 leading-relaxed">
                  1. En la pestaña del portal oficial de PAIWEB, busca el menor o abre su carné.<br />
                  2. Selecciona y copia el texto (o presiona Ctrl+A y Ctrl+C en la ficha).<br />
                  3. Pégalo en el recuadro de abajo y haz clic en <strong>"Interpretar y Guardar"</strong>.<br />
                  El sistema extraerá automáticamente el documento, nombres, esquema biológico, edad y acudiente con datos 100% auténticos.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Pegar texto o tabla de PAIWEB:
              </label>
              <textarea
                value={pastedPaiText}
                onChange={(e) => setPastedPaiText(e.target.value)}
                rows={8}
                placeholder="Pega aquí el texto copiado de la pantalla de PAIWEB (ej: Documento: 1025530378, Nombres: Carlos, Esquema: Completo, etc.)..."
                className="w-full p-4 text-xs font-mono bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPastedPaiText('')}
                className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Limpiar recuadro
              </button>

              <button
                type="button"
                onClick={handleParsePastedData}
                disabled={isParsingPasted || !pastedPaiText.trim()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isParsingPasted ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Interpretando datos...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Interpretar y Guardar Registro Oficial</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}


      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20">
                  <ShieldCheck className="w-6 h-6 text-blue-200" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    Gestión de Sesión PAIweb 2.0
                  </h3>
                  <p className="text-xs text-blue-200">
                    Cambio de operador y autenticación oficial SISVAN / SDS
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {loginError && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Paso 1: Abrir portal oficial PAIWEB */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 flex items-center space-x-1.5">
                    <Globe className="w-4 h-4 text-blue-600" />
                    <span>Paso 1: Portal Oficial PAIWEB</span>
                  </span>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                    Salud Capital
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Para registrarte o verificar tu cuenta de vacunación, abre el portal oficial de PAIWEB en el navegador:
                </p>
                <button
                  type="button"
                  onClick={handleOpenOfficialPai}
                  className="w-full py-2.5 px-4 bg-white hover:bg-blue-100/60 text-blue-700 border border-blue-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-2xs cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 text-blue-600" />
                  <span>🌐 Abrir Portal Oficial PAIWEB (appb.saludcapital.gov.co)</span>
                </button>
              </div>

              {/* Paso 2: Ingresar usuario y vincular */}
              <form onSubmit={handlePaiLogin} className="space-y-3.5">
                <div className="flex items-center space-x-1.5 pb-1">
                  <Key className="w-4 h-4 text-slate-700" />
                  <span className="text-xs font-bold text-slate-900">
                    Paso 2: Ingresa tu Usuario para Vincular y Volver al Aplicativo
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Usuario / Cédula PAI
                  </label>
                  <input
                    type="text"
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    placeholder="ej: 1025530378 o correo institucional"
                    required
                    autoFocus
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contraseña PAI <span className="text-[10px] text-slate-400 font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="password"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 text-slate-900"
                  />
                </div>

                <div className="pt-2 flex items-center space-x-2">
                  <button
                    type="submit"
                    disabled={isAuthenticating}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {isAuthenticating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Vinculando...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Vincular y Volver al Aplicativo</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDirectConnect}
                    disabled={isAuthenticating}
                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                    title="Conectar sin contraseña"
                  >
                    <Zap className="w-4 h-4 text-amber-600 inline mr-1" />
                    <span>Conexión Rápida</span>
                  </button>
                </div>
              </form>

              {/* Usuarios Usados Recientemente */}
              {savedUsernames.length > 0 && (
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Usuarios Usados Recientemente en este Equipo:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {savedUsernames.map((u) => (
                      <div
                        key={u}
                        className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg text-xs font-mono transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectSavedUsername(u)}
                          className="font-bold text-blue-700 hover:underline cursor-pointer"
                        >
                          {u}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleRemoveSavedUsername(u, e)}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer ml-1"
                          title="Eliminar de la lista"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono text-[11px]">Secretaría Distrital de Salud · Bogotá D.C.</span>
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(false)}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 font-bold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
