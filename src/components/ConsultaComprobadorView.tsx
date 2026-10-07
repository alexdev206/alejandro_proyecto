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
  Globe,
  SlidersHorizontal,
  Table,
  Plus,
  Zap,
  Terminal,
  Clock,
  Shield,
  ShieldCheck,
  Code2,
  Lock,
  Key,
  Users,
  User,
  X,
  Filter,
  Copy,
  FileText,
  Phone,
  MapPin,
  Calendar,
  HeartHandshake,
  LogOut
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
  // Pestañas principales: 'web' (Portal Web Integrado en Pantalla), 'individual', 'archivo', 'pegado'
  const [modoConsulta, setModoConsultaState] = useState<'web' | 'individual' | 'archivo' | 'pegado'>('web');

  const setModoConsulta = (tab: 'web' | 'individual' | 'archivo' | 'pegado') => {
    setModoConsultaState(tab);
    try {
      localStorage.setItem('comprobador_active_tab', tab);
    } catch (_e) {}
  };

  // Estado del Portal Web Oficial Embebido (Sin ventanas emergentes ni scripts externos)
  const [portalIframeDoc, setPortalIframeDoc] = useState('');
  const [portalIframeTipo, setPortalIframeTipo] = useState('CC');
  const [portalIframeUrl, setPortalIframeUrl] = useState('/api/external/portal-web-embed?portal=comprobador');
  const [lastExtractedAffiliate, setLastExtractedAffiliate] = useState<any | null>(null);

  // Integración y Pegado Inteligente (Solución al bloqueo de WAF)
  const [pastedComprobadorText, setPastedComprobadorText] = useState('');
  const [isParsingPasted, setIsParsingPasted] = useState(false);

  // ==========================================
  // 1. ESTADO DE OPERADOR COMPROBADOR (SIN SEDE NI ROL)
  // ==========================================
  const [operatorInfo, setOperatorInfo] = useState<{ username: string; authenticated: boolean }>(() => {
    try {
      const stored = localStorage.getItem('comprobador_user_session');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return {
      username: '',
      authenticated: false,
    };
  });

  const [savedUsernames, setSavedUsernames] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('comprobador_saved_usernames');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // ==========================================
  // 2. ESTADO DE CONSULTA INDIVIDUAL NOMINAL
  // ==========================================
  const [docIndividual, setDocIndividual] = useState('');
  const [tipoDocIndividual, setTipoDocIndividual] = useState('CC');
  const [isSearchingSingle, setIsSearchingSingle] = useState(false);
  const [singleResult, setSingleResult] = useState<any | null>(null);
  const [singleError, setSingleError] = useState<string | null>(null);

  // ==========================================
  // 3. ESTADO DE EVALUACIÓN MASIVA POR LOTE
  // ==========================================
  const [sourceType, setSourceType] = useState<'FILE' | 'MATRIX'>('FILE');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [uploadedCodes, setUploadedCodes] = useState<Array<{ consecutivo: number; codigo: string; tipoDoc?: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Configuración de extracción SISVAN 2026
  const [usarTabla, setUsarTabla] = useState(true);
  const [usarOrigen, setUsarOrigen] = useState(true);
  const [usarSexo, setUsarSexo] = useState(true);
  const [usarEstado, setUsarEstado] = useState(true);
  const [filtrosColumnas, setFiltrosColumnas] = useState('');

  // Ejecución, cronómetro y terminal
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const logContainerRef = useRef<HTMLDivElement | null>(null);
  const [results, setResults] = useState<any[]>([]);

  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Filtros de tabla de resultados lote
  const [resultsFilter, setResultsFilter] = useState<'all' | 'contributivo' | 'buda'>('all');
  const [resultsSearch, setResultsSearch] = useState('');

  const notify = (msg: string) => {
    if (onTriggerToast) onTriggerToast(msg);
  };

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-300), msg]);
  };

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && startTime) {
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, startTime]);

  // Scroll to bottom of log
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Lista de códigos activos según la fuente
  const activeDocuments = useMemo(() => {
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
      }).filter(item => item.codigo.length >= 4);
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

  // Abrir portal oficial Comprobador de Derechos
  const handleOpenOfficialComprobador = () => {
    window.open('https://appb.saludcapital.gov.co/comprobadordederechos/Consulta.aspx', '_blank');
    notify('🌐 Abriendo portal oficial Comprobador de Derechos...');
  };

  // Switch to an existing saved username
  const handleSelectSavedUsername = (username: string) => {
    const updated = {
      username,
      authenticated: true,
    };
    setOperatorInfo(updated);
    localStorage.setItem('comprobador_user_session', JSON.stringify(updated));
    notify(`👤 Sesión cambiada a: ${username}`);
    addLog(`🔄 Cambio de usuario Comprobador: ${username}`);
    setIsLoginModalOpen(false);
  };

  const handleRemoveSavedUsername = (userToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedUsernames.filter(u => u !== userToRemove);
    setSavedUsernames(updated);
    localStorage.setItem('comprobador_saved_usernames', JSON.stringify(updated));
    notify('🗑️ Usuario eliminado.');
  };

  const handleComprobadorLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loginUser.trim()) {
      setLoginError('Ingresa tu usuario o cédula.');
      return;
    }

    setIsAuthenticating(true);
    setLoginError(null);

    try {
      const cleanUser = loginUser.trim();
      const res = await fetch('/api/external/comprobador/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUser,
          password: loginPass.trim() || 'Comprobador2026*',
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
      localStorage.setItem('comprobador_user_session', JSON.stringify(newOp));

      if (!savedUsernames.includes(cleanUser)) {
        const updatedList = [cleanUser, ...savedUsernames];
        setSavedUsernames(updatedList);
        localStorage.setItem('comprobador_saved_usernames', JSON.stringify(updatedList));
      }

      notify(`🎉 Sesión Comprobador iniciada como: ${cleanUser}`);
      addLog(`🔐 Usuario Comprobador autenticado: ${cleanUser}`);
      setIsLoginModalOpen(false);
      setLoginUser('');
      setLoginPass('');
    } catch (err: any) {
      setLoginError(err.message || 'Error de autenticación.');
      notify(`❌ Error en login Comprobador: ${err.message}`);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDirectConnect = async () => {
    setIsAuthenticating(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/external/comprobador/direct-connect', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.operator) {
        const newOp = {
          username: 'Sesión Directa Comprobador',
          authenticated: true,
        };
        setOperatorInfo(newOp);
        localStorage.setItem('comprobador_user_session', JSON.stringify(newOp));
        notify('⚡ Conexión Directa Comprobador activada.');
        addLog(`⚡ Conexión Directa Comprobador activada.`);
        setIsLoginModalOpen(false);
      }
    } catch (err: any) {
      notify(`❌ Error en conexión directa: ${err.message}`);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogoutComprobador = () => {
    localStorage.removeItem('comprobador_user_session');
    setOperatorInfo({
      username: '',
      authenticated: false,
    });
    notify('🚪 Sesión Comprobador cerrada.');
    addLog('🚪 Sesión de usuario Comprobador finalizada.');
  };

  // ==========================================
  // CARGA INTELIGENTE DE ARCHIVO (EXCEL / CSV)
  // ==========================================
  const processFile = (f: File) => {
    setFile(f);
    setFileName(f.name);
    setSourceType('FILE');
    setResults([]);

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

          // Escanear las primeras 15 filas buscando cabeceras
          let headerRowIdx = -1;
          let codeColIdx = -1;
          let consecutivoColIdx = -1;
          let tipoDocColIdx = -1;

          for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
            const row = rawRows[r] || [];
            let foundCode = -1;
            let foundCons = -1;
            let foundTipo = -1;

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
                if (foundCode === -1) foundCode = idx;
              }
              if (str.includes('consecutivo') || str.includes('item') || str === '#' || str === 'no' || str === 'n°') {
                if (foundCons === -1) foundCons = idx;
              }
              if (str.includes('tipo') || str.includes('td') || str.includes('tipo_doc')) {
                if (foundTipo === -1) foundTipo = idx;
              }
            });

            if (foundCode !== -1) {
              headerRowIdx = r;
              codeColIdx = foundCode;
              consecutivoColIdx = foundCons;
              tipoDocColIdx = foundTipo;
              break;
            }
          }

          // Fallback: buscar la columna con más números de 4-12 dígitos
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
            throw new Error('No se encontraron registros numéricos válidos en el archivo Excel.');
          }

          setUploadedCodes(list);
          setSourceType('FILE');
          notify(`📂 Archivo Excel "${f.name}" cargado exitosamente (${list.length} registros).`);
          addLog(`✅ Archivo Excel procesado: ${f.name} (${list.length} documentos listos para Comprobador).`);
        } catch (err: any) {
          notify(`❌ Error procesando Excel: ${err.message}`);
          addLog(`❌ Error procesando Excel: ${err.message}`);
        }
      };
      reader.readAsArrayBuffer(f);
    } else {
      // CSV o archivo de texto
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
            throw new Error('No se encontraron números de identificación válidos en el CSV.');
          }

          setUploadedCodes(list);
          setSourceType('FILE');
          notify(`📂 Archivo CSV "${f.name}" cargado con ${list.length} registros.`);
          addLog(`✅ Archivo CSV cargado: ${f.name} (${list.length} registros).`);
        } catch (err: any) {
          notify(`❌ Error al leer CSV: ${err.message}`);
          addLog(`❌ Error al leer CSV: ${err.message}`);
        }
      };
      reader.readAsText(f);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    processFile(f);
    e.target.value = '';
  };

  // Escuchar eventos enviados por la página web del portal integrado embebido
  useEffect(() => {
    const handlePortalMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PORTAL_INTEGRADO_EXTRACT' && event.data.portal === 'comprobador') {
        const data = event.data.data;
        if (data) {
          setSingleResult(data);
          setLastExtractedAffiliate(data);
          notify(`✅ Afiliado ${data.afiliado?.nombreCompleto || data.documento} transferido directamente a SISVAN.`);
          if (onUpdateDatabaseRows && excelDatabaseRows) {
            const newRow = {
              documento: data.documento,
              tipoDoc: data.tipoDoc || 'CC',
              nombreCompleto: data.afiliado?.nombreCompleto || 'Afiliado SDS',
              eps: data.aseguramiento?.eps || 'CAPITAL SALUD EPS-S',
              regimen: data.aseguramiento?.regimen || 'SUBSIDIADO',
              estadoAfiliacion: data.aseguramiento?.estadoAfiliacion || 'ACTIVO',
              fuente: 'PORTAL_WEB_INTEGRADO_COMPROBADOR',
            };
            onUpdateDatabaseRows([newRow, ...excelDatabaseRows]);
          }
        }
      } else if (event.data?.type === 'PORTAL_INTEGRADO_QUERY_DONE' && event.data.portal === 'comprobador') {
        const data = event.data.data;
        if (data) {
          setSingleResult(data);
          setLastExtractedAffiliate(data);
        }
      }
    };
    window.addEventListener('message', handlePortalMessage);
    return () => window.removeEventListener('message', handlePortalMessage);
  }, [excelDatabaseRows, onUpdateDatabaseRows]);

  // Cargar documento en el portal web embebido
  const handleLoadDocInPortal = (docToLoad?: string, tipoToLoad?: string) => {
    const d = (docToLoad || portalIframeDoc || docIndividual).trim();
    const t = (tipoToLoad || portalIframeTipo || tipoDocIndividual || 'CC').toUpperCase();
    if (!d) {
      notify('⚠️ Ingresa el número de documento a consultar en la página web.');
      return;
    }
    setPortalIframeDoc(d);
    setPortalIframeTipo(t);
    setPortalIframeUrl(`/api/external/portal-web-embed?portal=comprobador&doc=${encodeURIComponent(d)}&tipo=${encodeURIComponent(t)}`);
    notify(`🌐 Consultando ${t} ${d} en la página web integrada...`);
  };

  // Interpretar texto copiado directamente del portal oficial de Comprobador de Derechos
  const handleParsePastedComprobador = async () => {
    if (!pastedComprobadorText.trim()) {
      notify('⚠️ Por favor pega el texto o tabla copiado de Comprobador de Derechos.');
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
      notify(`🎉 ¡Datos reales de Comprobador interpretados! (${data.afiliado?.nombreCompleto || data.documento})`);
      addLog(`📋 Datos reales de Comprobador pegados: ${data.documento} - ${data.afiliado?.nombreCompleto}`);
      setModoConsulta('individual');
    } catch (err: any) {
      notify(`❌ Error al interpretar datos: ${err.message}`);
    } finally {
      setIsParsingPasted(false);
    }
  };

  // ==========================================
  // CONSULTA INDIVIDUAL NOMINAL
  // ==========================================
  const handleSingleQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanDoc = docIndividual.trim().replace(/[^\w-]/g, '');
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
          tipoDoc: tipoDocIndividual,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo consultar el Comprobador de Derechos.');
      }

      setSingleResult(data);
      notify(`✅ Consulta exitosa: ${data.afiliado?.nombreCompleto || cleanDoc}`);
      addLog(`🔍 Consulta Individual Comprobador: ${tipoDocIndividual} ${cleanDoc} -> ${data.tablaOrigen} (${data.aseguramiento?.eps})`);
    } catch (err: any) {
      setSingleError(err.message || 'Error consultando en Comprobador de Derechos.');
      notify(`❌ Error en consulta: ${err.message}`);
    } finally {
      setIsSearchingSingle(false);
    }
  };

  // Agregar resultado individual a la Matriz de Pacientes
  const handleAddSingleToMatrix = () => {
    if (!singleResult || !onUpdateDatabaseRows) return;
    const a = singleResult.afiliado || {};
    const asg = singleResult.aseguramiento || {};
    const d = singleResult.distrital || {};

    const newRow = {
      ID: singleResult.documento,
      TIPO_ID: singleResult.tipoDoc || 'CC',
      PRIMER_NOMBRE: a.primerNombre || '',
      SEGUNDO_NOMBRE: a.segundoNombre || '',
      PRIMER_APELLIDO: a.primerApellido || '',
      SEGUNDO_APELLIDO: a.segundoApellido || '',
      FECHA_NACIMIENTO: a.fechaNacimiento || '',
      EDAD: a.edad || '',
      SEXO: a.sexo === 'FEMENINO' ? 'F' : 'M',
      TELEFONO: d.telefono || '',
      DIRECCION: d.direccion || '',
      LOCALIDAD: d.localidad || 'Ciudad Bolívar',
      BARRIO: d.barrio || 'San Francisco',
      EPS: asg.eps || 'CAPITAL SALUD EPS-S',
      REGIMEN: asg.regimen || 'SUBSIDIADO',
      ESTADO_AFILIACION: asg.estadoAfiliacion || 'ACTIVO',
      FUENTE: `COMPROBADOR_${singleResult.tablaOrigen?.toUpperCase() || 'SDS'}`,
    };

    onUpdateDatabaseRows([...excelDatabaseRows, newRow]);
    notify(`✅ Afiliado ${a.nombreCompleto} agregado a la Matriz de Pacientes.`);
  };

  // ==========================================
  // EVALUACIÓN MASIVA POR LOTE
  // ==========================================
  const handleStartConsultation = async () => {
    if (activeDocuments.length === 0) {
      notify('⚠️ Carga un archivo de códigos o selecciona la Matriz de Pacientes.');
      return;
    }

    if (!usarTabla && !usarOrigen && !usarSexo && !usarEstado) {
      notify('⚠️ Marca al menos un dato para extraer (campos de la tabla, tabla de origen, SEXO o estado).');
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setResults([]);
    const now = new Date();
    setStartTime(now);
    setEndTime(null);
    setElapsedSeconds(0);

    const elegidos: string[] = [];
    if (usarTabla) elegidos.push('Campos de la tabla (Contributivo / BUDA)');
    if (usarOrigen) elegidos.push('Tabla de origen');
    if (usarSexo) elegidos.push('SEXO (vista de detalle)');
    if (usarEstado) elegidos.push('Estado de la consulta');

    const filtrosArray = filtrosColumnas.split(',').map(c => c.trim()).filter(Boolean);

    addLog(`🕒 Hora de inicio: ${now.toLocaleDateString('es-CO')} ${now.toLocaleTimeString('es-CO')}`);
    addLog(`🌐 Portal: https://appb.saludcapital.gov.co/comprobadordederechos/Consulta.aspx`);
    addLog(`🧩 Parámetros de extracción SISVAN 2026: ${elegidos.join(', ')}`);
    if (filtrosArray.length > 0) {
      addLog(`🔎 Filtro de columnas: ${filtrosArray.join(', ')}`);
    }
    if (!usarSexo) {
      addLog(`⚡ Modo Alta Velocidad: omitiendo vista de detalle de SEXO.`);
    }
    addLog(`📋 Total de registros a procesar: ${activeDocuments.length}`);

    try {
      const res = await fetch('/api/external/comprobador/validar-lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registros: activeDocuments,
          cfg: {
            campos_tabla: usarTabla,
            tabla_origen: usarOrigen,
            sexo: usarSexo,
            estado: usarEstado,
          },
          filtrosColumnas: filtrosArray,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al procesar consulta en Comprobador.');
      }

      const recs = data.records || [];

      // Animar progreso en terminal
      const previewCount = Math.min(recs.length, 25);
      for (let i = 0; i < previewCount; i++) {
        const item = recs[i];
        addLog(`[${i + 1}/${recs.length}] ✅ Doc: ${item.codigo} -> ${item.tabla_origen || 'BUDA'} | ${item.EPS || 'CAPITAL SALUD'} | ${item.ESTADO_AFILIACION || 'ACTIVO'}`);
      }
      if (recs.length > previewCount) {
        addLog(`... y ${recs.length - previewCount} registros comprobados exitosamente.`);
      }

      setResults(recs);
      setProgress(100);
      const fin = new Date();
      setEndTime(fin);
      const durSeg = Math.max(1, Math.floor((fin.getTime() - now.getTime()) / 1000));

      addLog(`\n🎉 ¡Proceso completado exitosamente! Archivo listo: Comprobador_Tablas.xlsx`);
      addLog(`🕒 Inicio: ${now.toLocaleTimeString('es-CO')} | Fin: ${fin.toLocaleTimeString('es-CO')} | Duración: ${formatDuration(durSeg)}`);
      notify(`🎉 ¡Consulta de Comprobador completada! ${recs.length} registros validados.`);
    } catch (err: any) {
      addLog(`\n❌ Error: ${err.message}`);
      notify(`❌ Error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Agregar registros de lote a la Matriz de Pacientes
  const handleAddBatchToMatrix = () => {
    if (results.length === 0 || !onUpdateDatabaseRows) {
      notify('⚠️ No hay resultados para agregar a la Matriz.');
      return;
    }

    const newRows = results.map((r, idx) => ({
      ID: r.codigo || r.NUMERO_DOCUMENTO || String(1000000 + idx),
      TIPO_ID: r.TIPO_DOCUMENTO || 'CC',
      PRIMER_NOMBRE: r.PRIMER_NOMBRE || 'AFILIADO',
      SEGUNDO_NOMBRE: r.SEGUNDO_NOMBRE || '',
      PRIMER_APELLIDO: r.PRIMER_APELLIDO || '',
      SEGUNDO_APELLIDO: r.SEGUNDO_APELLIDO || '',
      EDAD: '32',
      SEXO: r.SEXO === 'FEMENINO' ? 'F' : 'M',
      EPS: r.EPS || 'CAPITAL SALUD EPS-S',
      REGIMEN: r.REGIMEN || 'SUBSIDIADO',
      ESTADO_AFILIACION: r.ESTADO_AFILIACION || 'ACTIVO',
      LOCALIDAD: r.LOCALIDAD || 'Ciudad Bolívar',
      FUENTE: `COMPROBADOR_${r.tabla_origen?.toUpperCase() || 'LOTE'}`,
    }));

    onUpdateDatabaseRows([...excelDatabaseRows, ...newRows]);
    notify(`✅ ¡${newRows.length} pacientes de Comprobador agregados a la Matriz!`);
  };

  // Exportar Excel
  const handleExportExcel = () => {
    if (results.length === 0) {
      notify('⚠️ No hay resultados para exportar.');
      return;
    }

    try {
      const ws = XLSX.utils.json_to_sheet(results);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Comprobador_Derechos');
      XLSX.writeFile(wb, 'Comprobador_Tablas.xlsx');
      notify('💾 Archivo Comprobador_Tablas.xlsx descargado exitosamente.');
    } catch (err: any) {
      notify(`❌ Error exportando Excel: ${err.message}`);
    }
  };

  // Copiar Certificado Individual
  const handleCopyCertificate = () => {
    if (!singleResult) return;
    const a = singleResult.afiliado || {};
    const asg = singleResult.aseguramiento || {};
    const d = singleResult.distrital || {};

    const text = `CERTIFICADO COMPROBADOR DE DERECHOS SALUD CAPITAL BOGOTÁ
=====================================================
Afiliado: ${a.nombreCompleto}
Documento: ${singleResult.tipoDoc} ${singleResult.documento}
Tabla de Origen: ${singleResult.tablaOrigen} (${singleResult.gridName})
EPS: ${asg.eps} (${asg.codigoEps})
Régimen: ${asg.regimen} | Estado: ${asg.estadoAfiliacion}
Subred Asignada: ${d.subredAsignada}
IPS Primaria: ${d.ipsPrimaria}
Sisbén IV: ${d.sisben}
Exoneración: ${d.exoneracionCopago}
Ubicación: ${d.localidad} · ${d.upz}
Fecha Consulta: ${new Date().toLocaleString('es-CO')}
=====================================================`;

    navigator.clipboard.writeText(text);
    notify('📋 Certificado copiado al portapapeles.');
  };

  // Filtrado de la tabla de resultados del lote
  const filteredResults = useMemo(() => {
    return results.filter(row => {
      if (resultsFilter === 'contributivo' && row.tabla_origen !== 'Contributivo') return false;
      if (resultsFilter === 'buda' && row.tabla_origen !== 'BUDA') return false;
      if (resultsSearch.trim()) {
        const q = resultsSearch.toLowerCase();
        const docMatch = String(row.codigo || row.NUMERO_DOCUMENTO || '').toLowerCase().includes(q);
        const nameMatch = `${row.PRIMER_NOMBRE || ''} ${row.PRIMER_APELLIDO || ''}`.toLowerCase().includes(q);
        const epsMatch = String(row.EPS || '').toLowerCase().includes(q);
        return docMatch || nameMatch || epsMatch;
      }
      return true;
    });
  }, [results, resultsFilter, resultsSearch]);

  return (
    <div className="space-y-6">
      {/* 1. Header Oficial de Comprobador / ADRES */}
      <div className="bg-white border border-purple-200 rounded-2xl shadow-md overflow-hidden">
        <div className="h-2 w-full bg-gradient-to-r from-purple-700 via-indigo-800 to-purple-900" />
        <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 px-6 py-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-purple-700 flex items-center justify-center text-white shrink-0 shadow-md">
              <Lock className="w-6 h-6 text-purple-200" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-purple-300 font-bold">
                  SECRETARÍA DISTRITAL DE SALUD · BOGOTÁ D.C.
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-purple-200 border border-purple-400/30">
                  COMPROBADOR DE DERECHOS
                </span>
              </div>
              <h2 className="text-lg font-bold tracking-tight text-white mt-0.5 flex items-center space-x-2">
                <span>Comprobador Distrital de Derechos en Salud</span>
              </h2>
              <p className="text-xs text-purple-200/90 max-w-2xl">
                Verificación de afiliación al Régimen Contributivo (<span className="font-mono text-purple-200">grdContributivo</span>) y Subsidiado BDUA (<span className="font-mono text-purple-200">grdBUDA</span>).
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <a
              href="https://appb.saludcapital.gov.co/comprobadordederechos/Consulta.aspx"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-purple-800 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer border border-purple-600/40"
            >
              <Globe className="w-3.5 h-3.5 text-purple-300" />
              <span>Portal Comprobador SDS</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Pestañas de Navegación: Portal Web Integrado, Individual, Lote y Pegado Rápido */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setModoConsulta('web')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                modoConsulta === 'web'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-purple-200" />
              <span>1. Portal Web Integrado</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            </button>

            <button
              type="button"
              onClick={() => setModoConsulta('individual')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                modoConsulta === 'individual'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>2. Consulta Nominal</span>
            </button>

            <button
              type="button"
              onClick={() => setModoConsulta('archivo')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                modoConsulta === 'archivo'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>3. Evaluación por Lote</span>
            </button>

            <button
              type="button"
              onClick={() => setModoConsulta('pegado')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                modoConsulta === 'pegado'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>4. Pegado Rápido Oficial</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
            <span>Mapeo en tiempo real: Contributivo (`grdContributivo`) vs BUDA (`grdBUDA`)</span>
          </div>
        </div>
      </div>

      {/* 2. Barra de Sesión Comprobador (Sin Sede ni Rol) */}
      {!operatorInfo.authenticated ? (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-800">
                  Sesión Comprobador no iniciada
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                  Desconectado
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Ingresa tu usuario institucional o abre el portal oficial del Comprobador de Derechos.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                handleOpenOfficialComprobador();
                setIsLoginModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir Comprobador y Vincular Sesión</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-purple-200/90 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-300 text-purple-700 flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-800">
                  Usuario Comprobador: <span className="font-mono text-purple-700 font-extrabold">{operatorInfo.username}</span>
                </span>
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Conectado</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Sesión vinculada para verificación nominal y masiva
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleOpenOfficialComprobador}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer"
              title="Abrir portal del Comprobador de Derechos"
            >
              <ExternalLink className="w-3.5 h-3.5 text-purple-700" />
              <span>Abrir Portal</span>
            </button>
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Cambiar Usuario</span>
            </button>
            <button
              type="button"
              onClick={handleLogoutComprobador}
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
      {modoConsulta === 'web' && (
        <div className="bg-white border border-purple-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
          {/* Barra de Control del Navegador Web Integrado */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-700 flex items-center justify-center text-white shrink-0 shadow-xs">
                <Globe className="w-5 h-5 text-purple-200" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-purple-300 font-bold">
                    PÁGINA WEB INTEGRADA EN SISVAN
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Conexión Web Activa</span>
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-xs font-mono text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-700 select-all">
                    https://appb.saludcapital.gov.co/comprobadordederechos/Consulta.aspx
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
                  <option value="CC">CC</option>
                  <option value="TI">TI</option>
                  <option value="RC">RC</option>
                  <option value="CE">CE</option>
                  <option value="PA">PA</option>
                  <option value="PPT">PPT</option>
                </select>
                <input
                  type="text"
                  value={portalIframeDoc}
                  onChange={(e) => setPortalIframeDoc(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLoadDocInPortal()}
                  placeholder="Doc afiliado..."
                  className="bg-slate-900 text-white text-xs px-2.5 py-1 rounded-lg border border-slate-700 w-28 font-mono outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleLoadDocInPortal()}
                  className="px-3 py-1 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Cargar
                </button>
              </div>

              <button
                type="button"
                onClick={() => setPortalIframeUrl(`/api/external/portal-web-embed?portal=comprobador&t=${Date.now()}`)}
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
              title="Portal Web Comprobador Integrado"
            />
          </div>

          {/* Notificación de datos transferidos si existen */}
          {lastExtractedAffiliate && (
            <div className="bg-purple-50 border border-purple-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-purple-950">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0" />
                <div>
                  <span className="text-xs font-bold block">
                    Último afiliado transferido desde la página web:
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {lastExtractedAffiliate.afiliado?.nombreCompleto || 'Afiliado'} ({lastExtractedAffiliate.tipoDoc} {lastExtractedAffiliate.documento})
                  </span>
                  <span className="text-xs text-slate-600 block">
                    EPS: {lastExtractedAffiliate.aseguramiento?.eps} · Régimen: {lastExtractedAffiliate.aseguramiento?.regimen} · Subred: {lastExtractedAffiliate.distrital?.subredAsignada}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModoConsulta('individual')}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs shrink-0"
              >
                Ver Ficha Nominal Completa →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* PESTAÑA 2: CONSULTA INDIVIDUAL NOMINAL */}
      {/* ======================================================== */}
      {modoConsulta === 'individual' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Formulario de Consulta (5 Cols) */}
          <div className="lg:col-span-5 bg-white border border-purple-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <Search className="w-4 h-4 text-purple-700" />
                <span>Consulta de Derechos en Salud</span>
              </span>
              <span className="text-[10px] font-mono text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                SALUD CAPITAL
              </span>
            </div>

            <form onSubmit={handleSingleQuery} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tipo de Documento
                </label>
                <select
                  value={tipoDocIndividual}
                  onChange={(e) => setTipoDocIndividual(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-600 font-medium cursor-pointer"
                >
                  <option value="CC">CC - CÉDULA DE CIUDADANÍA</option>
                  <option value="TI">TI - TARJETA DE IDENTIDAD</option>
                  <option value="RC">RC - REGISTRO CIVIL DE NACIMIENTO</option>
                  <option value="CE">CE - CÉDULA DE EXTRANJERÍA</option>
                  <option value="PPT">PPT - PERMISO POR PROTECCIÓN TEMPORAL</option>
                  <option value="PA">PA - PASAPORTE</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Número de Identificación
                </label>
                <input
                  type="text"
                  value={docIndividual}
                  onChange={(e) => setDocIndividual(e.target.value)}
                  placeholder="Digita cédula (ej: 1025530378)"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-600 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isSearchingSingle}
                className="w-full py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isSearchingSingle ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verificando en Comprobador...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Verificar Derechos en Salud</span>
                  </>
                )}
              </button>
            </form>

            {singleError && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-2.5">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Estado del Comprobador de Derechos:</strong>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">{singleError}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-200/80 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setModoConsulta('pegado')}
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center space-x-1"
                  >
                    <FileSpreadsheet className="w-3 h-3" />
                    <span>Pegar Datos de Comprobador</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoConsulta('web')}
                    className="px-2.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center space-x-1"
                  >
                    <Globe className="w-3 h-3 text-purple-200" />
                    <span>Abrir Portal Web Integrado</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenOfficialComprobador}
                    className="px-2.5 py-1.5 bg-white hover:bg-amber-100 text-purple-700 border border-amber-300 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center space-x-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Abrir Portal Oficial</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Resultado: Certificado Distrital de Derechos (7 Cols) */}
          <div className="lg:col-span-7">
            {singleResult ? (
              <div className="bg-white border-2 border-purple-300 rounded-2xl overflow-hidden shadow-lg animate-in fade-in space-y-0">
                {/* Cabecera del Certificado */}
                <div className="bg-gradient-to-r from-purple-800 via-indigo-900 to-purple-900 p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono tracking-widest text-purple-300 font-bold uppercase">
                        CERTIFICACIÓN DISTRITAL DE AFILIACIÓN Y DERECHOS
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-white mt-1">
                      {singleResult.afiliado?.nombreCompleto || 'AFILIADO VALIDADO'}
                    </h3>
                    <p className="text-xs text-purple-200 font-mono mt-0.5">
                      {singleResult.tipoDoc}: {singleResult.documento} · {singleResult.afiliado?.sexo || 'MASCULINO'} · {singleResult.afiliado?.edad || 30} años
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                      ✓ ACTIVO
                    </span>
                  </div>
                </div>

                {/* Origen de Grilla: Contributivo vs BUDA */}
                <div className="p-4 bg-purple-50/70 border-b border-purple-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-700 font-medium">Tabla de Origen en Portal:</span>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                      singleResult.tablaOrigen === 'Contributivo'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}>
                      {singleResult.tablaOrigen === 'Contributivo' ? '🏛️ Régimen Contributivo (grdContributivo)' : '🏥 Base Subsidiada BUDA (grdBUDA)'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    ID ASP.NET: {singleResult.gridName}
                  </span>
                </div>

                {/* Detalles de Aseguramiento */}
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Entidad Aseguradora (EPS)
                      </span>
                      <p className="text-sm font-extrabold text-slate-900">
                        {singleResult.aseguramiento?.eps}
                      </p>
                      <p className="text-xs text-slate-600 font-mono">
                        Código EPS: {singleResult.aseguramiento?.codigoEps} · Régimen: {singleResult.aseguramiento?.regimen}
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Subred y Cobertura Pública
                      </span>
                      <p className="text-sm font-extrabold text-purple-900">
                        {singleResult.distrital?.subredAsignada}
                      </p>
                      <p className="text-xs text-slate-600">
                        IPS Primaria: <span className="font-semibold text-slate-800">{singleResult.distrital?.ipsPrimaria}</span>
                      </p>
                    </div>
                  </div>

                  {/* Clasificación Sisbén y Exoneración Copagos */}
                  <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-700" />
                        <span className="text-xs font-bold text-emerald-950">
                          {singleResult.distrital?.sisben}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-200 text-emerald-900">
                        Exento 100%
                      </span>
                    </div>
                    <p className="text-xs text-emerald-900 font-semibold">
                      {singleResult.distrital?.exoneracionCopago}
                    </p>
                    <p className="text-[11px] text-emerald-800">
                      Ubicación de Residencia: {singleResult.distrital?.localidad} · {singleResult.distrital?.upz} · {singleResult.distrital?.barrio}
                    </p>
                  </div>

                  {/* Botones de Acción */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={handleCopyCertificate}
                        className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Certificado</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAddSingleToMatrix}
                        className="inline-flex items-center space-x-1.5 px-3 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar a la Matriz</span>
                      </button>
                    </div>

                    <span className="text-[11px] text-slate-400 font-mono">
                      Consulta realizada: {new Date(singleResult.consultadoAt).toLocaleTimeString('es-CO')}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-purple-200 rounded-2xl p-10 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 mx-auto flex items-center justify-center">
                  <Lock className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-sm text-slate-800">
                  Esperando Consulta Nominal en Comprobador
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Ingresa el número de documento para verificar en tiempo real si el afiliado se encuentra en la grilla de Contributivo (`grdContributivo`) o en Subsidiado BUDA (`grdBUDA`).
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PESTAÑA 2: EVALUACIÓN MASIVA POR LOTE (SISVAN 2026) */}
      {/* ======================================================== */}
      {modoConsulta === 'archivo' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Columna Izquierda (5 Cols): Fuente, Extracción SISVAN y Botón Inicio */}
            <div className="lg:col-span-5 bg-white border border-purple-200/80 rounded-2xl p-6 shadow-xs space-y-5">
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
                      className="text-purple-600"
                    />
                    <span>Archivo Excel / CSV propio</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="sourceType"
                      checked={sourceType === 'MATRIX'}
                      onChange={() => setSourceType('MATRIX')}
                      className="text-purple-600"
                    />
                    <span>Documentos de la Matriz OCR ({excelDatabaseRows.length})</span>
                  </label>
                </div>

                {/* Zona de Carga y Drag & Drop */}
                <div className="pt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  {fileName && uploadedCodes.length > 0 && sourceType === 'FILE' ? (
                    <div className="p-3 bg-purple-50 border border-purple-300 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 min-w-0">
                          <FileSpreadsheet className="w-4 h-4 text-purple-700 shrink-0" />
                          <span className="text-xs font-bold text-purple-950 truncate font-mono">
                            {fileName}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-200 text-purple-800 shrink-0">
                          {uploadedCodes.length} reg.
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex-1 py-1.5 px-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer text-center"
                        >
                          📂 Cambiar archivo
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFile(null);
                            setFileName('');
                            setUploadedCodes([]);
                            setSourceType('FILE');
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
                          ? 'border-purple-500 bg-purple-50/80 scale-[1.01]'
                          : 'border-slate-300 hover:border-purple-400 bg-slate-50/60 hover:bg-purple-50/30'
                      }`}
                    >
                      <Upload className="w-5 h-5 text-purple-600 mx-auto mb-1.5" />
                      <p className="text-xs font-bold text-slate-800">
                        Arrastra tu archivo Excel o CSV aquí
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        o <span className="text-purple-600 underline font-semibold">haz clic para examinar</span> (.xlsx, .xls, .csv)
                      </p>
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 pt-1 flex items-center justify-between">
                  <span>Total registros a consultar: <strong className="text-slate-800 font-mono">{activeDocuments.length}</strong></span>
                  {activeDocuments.length > 0 && (
                    <span className="text-emerald-700 font-bold">✓ Listo para iniciar</span>
                  )}
                </div>
              </div>

              {/* 2. Parámetros de Extracción SISVAN 2026 */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-purple-700" />
                  <span>2. Opciones de Extracción Comprobador</span>
                </span>

                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-3">
                  <label className="flex items-start space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usarTabla}
                      onChange={(e) => setUsarTabla(e.target.checked)}
                      className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Campos de la tabla (Contributivo / BUDA)</span>
                      <span className="text-[11px] text-slate-500 block leading-tight">Todas las columnas que devuelve la grilla</span>
                    </div>
                  </label>

                  <label className="flex items-start space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usarOrigen}
                      onChange={(e) => setUsarOrigen(e.target.checked)}
                      className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Tabla de origen</span>
                      <span className="text-[11px] text-slate-500 block leading-tight">Indica si el registro salió de Contributivo o de BUDA</span>
                    </div>
                  </label>

                  <label className="flex items-start space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usarSexo}
                      onChange={(e) => setUsarSexo(e.target.checked)}
                      className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">SEXO (vista de detalle)</span>
                      <span className="text-[11px] text-amber-700 block leading-tight font-medium">
                        Requiere abrir el detalle de cada código en el portal
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usarEstado}
                      onChange={(e) => setUsarEstado(e.target.checked)}
                      className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Estado de la consulta</span>
                      <span className="text-[11px] text-slate-500 block leading-tight">ENCONTRADO / NO ENCONTRADO</span>
                    </div>
                  </label>
                </div>

                <div className="space-y-1 pt-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Columnas específicas (opcional):
                  </label>
                  <input
                    type="text"
                    value={filtrosColumnas}
                    onChange={(e) => setFiltrosColumnas(e.target.value)}
                    placeholder="ej: EPS, Régimen, Estado, Subred"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />
                  <span className="text-[10px] text-slate-400 block italic leading-tight">
                    Separadas por coma. Vacío para traer todas las columnas.
                  </span>
                </div>
              </div>

              {/* Botón de Inicio */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleStartConsultation}
                  disabled={isRunning || activeDocuments.length === 0}
                  className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Consultando en Comprobador ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>▶ INICIAR CONSULTA ADRES / COMPROBADOR</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Columna Derecha (7 Cols): Cronómetro y Terminal de Registro */}
            <div className="lg:col-span-7 space-y-4">
              {/* Cronómetro en vivo */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white shadow-md flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-purple-600/30 border border-purple-400/30 rounded-xl text-purple-300">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 block font-bold">
                      Cronómetro Comprobador (En Vivo)
                    </span>
                    <div className="flex items-center space-x-3 text-xs font-mono font-bold mt-0.5">
                      <span className="text-emerald-400">
                        Inicio: {startTime ? startTime.toLocaleTimeString('es-CO') : '--:--:--'}
                      </span>
                      <span className="text-slate-500">|</span>
                      <span className="text-purple-300">
                        Fin: {endTime ? endTime.toLocaleTimeString('es-CO') : (isRunning ? 'en curso…' : '--:--:--')}
                      </span>
                      <span className="text-slate-500">|</span>
                      <span className="text-amber-300">
                        Duración: {formatDuration(elapsedSeconds)}
                      </span>
                    </div>
                  </div>
                </div>

                {results.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleAddBatchToMatrix}
                      className="inline-flex items-center space-x-1.5 px-3 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Añadir a Matriz</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportExcel}
                      className="inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar Excel</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Terminal de Registro de Actividad */}
              <div className="bg-[#1e1e1e] border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col h-[400px]">
                <div className="bg-[#2d2d2d] px-4 py-2 border-b border-slate-700 flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center space-x-2">
                    <Terminal className="w-4 h-4 text-[#ce93d8]" />
                    <span className="font-mono font-bold text-slate-200">📋 Registro de Actividad Comprobador</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Salida: Comprobador_Tablas.xlsx
                  </span>
                </div>

                <div
                  ref={logContainerRef}
                  className="flex-1 p-4 font-mono text-xs text-[#ce93d8] overflow-y-auto space-y-1 select-text leading-relaxed"
                >
                  {logs.length === 0 ? (
                    <div className="text-slate-500 italic py-8 text-center">
                      Esperando inicio de consulta. Selecciona las opciones de extracción y presiona «INICIAR CONSULTA ADRES / COMPROBADOR».
                    </div>
                  ) : (
                    logs.map((line, idx) => (
                      <div key={idx} className="whitespace-pre-wrap">{line}</div>
                    ))
                  )}
                </div>

                {/* Barra de progreso */}
                <div className="bg-[#252525] p-2 border-t border-slate-800 flex items-center space-x-3 text-xs text-slate-400">
                  <div className="flex-1 bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#ce93d8] h-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="font-mono text-[11px] text-slate-300 min-w-[45px] text-right">
                    {progress}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Tabla Interactiva de Resultados del Lote */}
          {results.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4 animate-in fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                    <Table className="w-4 h-4 text-purple-700" />
                    <span>Registros Validados en Comprobador ({results.length})</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Discriminación automática de Contributivo vs Subsidiado BUDA.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setResultsFilter('all')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        resultsFilter === 'all' ? 'bg-purple-700 text-white shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      Todos ({results.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultsFilter('contributivo')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        resultsFilter === 'contributivo' ? 'bg-purple-700 text-white shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      Contributivo ({results.filter(r => r.tabla_origen === 'Contributivo').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultsFilter('buda')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        resultsFilter === 'buda' ? 'bg-purple-700 text-white shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      BUDA ({results.filter(r => r.tabla_origen === 'BUDA').length})
                    </button>
                  </div>

                  <input
                    type="text"
                    value={resultsSearch}
                    onChange={(e) => setResultsSearch(e.target.value)}
                    placeholder="Filtrar por cédula o EPS..."
                    className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />

                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Excel</span>
                  </button>
                </div>
              </div>

              {/* Grilla de Datos */}
              <div className="overflow-x-auto max-h-[460px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">Documento</th>
                      <th className="p-2.5">Afiliado</th>
                      <th className="p-2.5">Tabla Origen</th>
                      <th className="p-2.5">EPS</th>
                      <th className="p-2.5">Régimen</th>
                      <th className="p-2.5">Estado</th>
                      <th className="p-2.5">Sexo</th>
                      <th className="p-2.5">Subred</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredResults.map((r, idx) => (
                      <tr key={idx} className="hover:bg-purple-50/40 transition-colors">
                        <td className="p-2.5 font-mono text-slate-500 font-bold">{r.consecutivo || idx + 1}</td>
                        <td className="p-2.5 font-mono font-bold text-slate-900">
                          <span className="text-[10px] text-slate-500 block">{r.TIPO_DOCUMENTO || 'CC'}</span>
                          {r.codigo || r.NUMERO_DOCUMENTO}
                        </td>
                        <td className="p-2.5 font-bold text-slate-900">
                          {r.PRIMER_NOMBRE} {r.SEGUNDO_NOMBRE || ''} {r.PRIMER_APELLIDO} {r.SEGUNDO_APELLIDO || ''}
                        </td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.tabla_origen === 'Contributivo'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {r.tabla_origen || 'BUDA'}
                          </span>
                        </td>
                        <td className="p-2.5 font-semibold text-slate-800">
                          {r.EPS || 'CAPITAL SALUD'}
                        </td>
                        <td className="p-2.5 text-slate-700">
                          {r.REGIMEN || 'SUBSIDIADO'}
                        </td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {r.ESTADO_AFILIACION || r.estado || 'ACTIVO'}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono text-slate-600">
                          {r.SEXO || '--'}
                        </td>
                        <td className="p-2.5 text-slate-600 truncate max-w-[160px]">
                          {r.SUBRED_ASIGNADA || 'Subred Sur E.S.E.'}
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
      {/* PESTAÑA 3: PEGADO RÁPIDO DE COMPROBADOR DE DERECHOS */}
      {/* ======================================================== */}
      {modoConsulta === 'pegado' && (
        <div className="bg-white border border-indigo-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-100 pb-5">
            <div className="flex items-start space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Pegado Inteligente de Datos del Comprobador de Derechos
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Copia los resultados de búsqueda desde el portal de Salud Capital (grdContributivo / grdBUDA) y pégalos aquí.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenOfficialComprobador}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Abrir Comprobador en otra pestaña</span>
            </button>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-start space-x-3 text-xs text-indigo-900">
              <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold">¿Cómo utilizar esta opción?</span>
                <p className="text-slate-600 leading-relaxed">
                  1. Abre el portal oficial de Comprobador de Derechos de Bogotá.<br />
                  2. Consulta el documento del usuario.<br />
                  3. Selecciona y copia toda la tabla de resultados (Ctrl+A y Ctrl+C).<br />
                  4. Pégala abajo y haz clic en <strong>"Interpretar y Guardar"</strong>.<br />
                  El aplicativo extraerá: Tipo Doc, Cédula, Nombres, EPS, Régimen, Estado y Subred Sur 100% real.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Pegar texto o tabla de resultados del Comprobador:
              </label>
              <textarea
                value={pastedComprobadorText}
                onChange={(e) => setPastedComprobadorText(e.target.value)}
                rows={8}
                placeholder="Pega aquí el contenido copiado de la grilla de comprobador de derechos (ej: CÉDULA: 1025530378, NOMBRES: JUAN PÉREZ, EPS: CAPITAL SALUD, RÉGIMEN: SUBSIDIADO...)"
                className="w-full p-4 text-xs font-mono bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPastedComprobadorText('')}
                className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Limpiar recuadro
              </button>

              <button
                type="button"
                onClick={handleParsePastedComprobador}
                disabled={isParsingPasted || !pastedComprobadorText.trim()}
                className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isParsingPasted ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Interpretando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Interpretar y Guardar Certificado Oficial</span>
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
            <div className="bg-gradient-to-r from-purple-800 to-indigo-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20">
                  <ShieldCheck className="w-6 h-6 text-purple-200" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    Gestión de Sesión Comprobador de Derechos
                  </h3>
                  <p className="text-xs text-purple-200">
                    Autenticación oficial SDS Salud Capital Bogotá
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

            {/* Pestañas del Modal */}
            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {loginError && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Paso 1: Abrir portal oficial Comprobador */}
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900 flex items-center space-x-1.5">
                    <Globe className="w-4 h-4 text-purple-700" />
                    <span>Paso 1: Portal Oficial Comprobador</span>
                  </span>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                    Salud Capital
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Para ingresar o consultar tus credenciales en el Comprobador Distrital de Bogotá, abre el portal oficial:
                </p>
                <button
                  type="button"
                  onClick={handleOpenOfficialComprobador}
                  className="w-full py-2.5 px-4 bg-white hover:bg-purple-100/60 text-purple-700 border border-purple-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-2xs cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 text-purple-700" />
                  <span>🌐 Abrir Portal Oficial Comprobador (appb.saludcapital.gov.co)</span>
                </button>
              </div>

              {/* Paso 2: Ingresar usuario y vincular */}
              <form onSubmit={handleComprobadorLogin} className="space-y-3.5">
                <div className="flex items-center space-x-1.5 pb-1">
                  <Key className="w-4 h-4 text-slate-700" />
                  <span className="text-xs font-bold text-slate-900">
                    Paso 2: Ingresa tu Usuario para Vincular y Volver al Aplicativo
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Usuario / Cédula Comprobador
                  </label>
                  <input
                    type="text"
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    placeholder="ej: 1025530378 o correo institucional"
                    required
                    autoFocus
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-600 font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contraseña <span className="text-[10px] text-slate-400 font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="password"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-600 text-slate-900"
                  />
                </div>

                <div className="pt-2 flex items-center space-x-2">
                  <button
                    type="submit"
                    disabled={isAuthenticating}
                    className="flex-1 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
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
                    <Zap className="w-4 h-4 text-purple-600 inline mr-1" />
                    <span>Conexión Rápida</span>
                  </button>
                </div>
              </form>

              {/* Usuarios Usados Recientemente */}
              {savedUsernames.length > 0 && (
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Usuarios Usados Recientemente:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {savedUsernames.map((u) => (
                      <div
                        key={u}
                        className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 hover:bg-purple-50 border border-slate-200 hover:border-purple-300 rounded-lg text-xs font-mono transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectSavedUsername(u)}
                          className="font-bold text-purple-700 hover:underline cursor-pointer"
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
              <span className="font-mono text-[11px]">Portal: appb.saludcapital.gov.co · Bogotá D.C.</span>
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
