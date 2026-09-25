import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  Table as TableIcon, 
  FileText, 
  Sparkles, 
  Clock, 
  Activity, 
  Zap, 
  RotateCcw,
  SlidersHorizontal,
  Split,
  Eye,
  ArrowRight,
  ShieldCheck,
  FolderOpen,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from './components/Navbar';
import { UploadZone } from './components/UploadZone';
import { ScanningProgress } from './components/ScanningProgress';
import { DataTable } from './components/DataTable';
import { DocumentViewer } from './components/DocumentViewer';
import { ExportBar } from './components/ExportBar';
import { AuthModal } from './components/AuthModal';
import { LoginPage } from './components/LoginPage';
import { ModuleBannerHub } from './components/ModuleBannerHub';
import { ConsultaPaiAdresView } from './components/ConsultaPaiAdresView';
import { PatientsDirectoryView } from './components/PatientsDirectoryView';
import { AuditControlView } from './components/AuditControlView';
import { PatientFieldInspector } from './components/PatientFieldInspector';
import { useAuth } from './context/AuthContext';
import { ScanResult, ScanOptions, ExtractedRow, AppModule, getRolePermissions } from './types';
import { validateAllRows } from './utils/validation';
import { downloadCsv, downloadExcel, downloadShiftReport } from './utils/export';
import { SampleDocument, SAMPLE_DOCUMENTS } from './data/samplePdfs';
import { optimizeFileForUpload } from './utils/imageOptimizer';

export default function App() {
  const { user, isAuthenticated, isLoading, isAuthModalOpen, setIsAuthModalOpen } = useAuth();
  const permissions = getRolePermissions(user?.role);

  // Core navigation state: 5 modules
  const [activeModule, setActiveModule] = useState<AppModule>('scanner');
  
  // Field-level direct access & filter state
  const [selectedFieldFilter, setSelectedFieldFilter] = useState<string | null>(null);
  const [inspectedRow, setInspectedRow] = useState<ExtractedRow | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  const [hasApiKey, setHasApiKey] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Operational metrics & Shift state
  const [shiftSeconds, setShiftSeconds] = useState(0);
  const [sessionDocsScanned, setSessionDocsScanned] = useState(0);
  const [sessionTotalRows, setSessionTotalRows] = useState(0);

  // Admin AI metrics
  const [lastScanLatencyMs, setLastScanLatencyMs] = useState<number | null>(null);
  const [lastScanModel, setLastScanModel] = useState<string | null>(null);

  // Document & Scan data
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [isOptimizedUpload, setIsOptimizedUpload] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'split' | 'document'>('table');
  const [databaseRows, setDatabaseRows] = useState<any[]>([]);

  const [options, setOptions] = useState<ScanOptions>({
    template: 'AUTO',
    delimiter: ';',
    autoExportCsv: true,
    normalizeDates: true,
    cleanDocumentNumbers: true,
    speedMode: 'fast',
  });

  // Shift timer running when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    const timer = setInterval(() => {
      setShiftSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isAuthenticated]);

  const formatShiftTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${m < 10 ? '0' : ''}${m}m ${s < 10 ? '0' : ''}${s}s`;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const handleResetShift = () => {
    if (window.confirm('¿Deseas reiniciar las estadísticas y el cronómetro de tu turno?')) {
      setShiftSeconds(0);
      setSessionDocsScanned(0);
      setSessionTotalRows(0);
      triggerToast('🔄 Contador de turno reiniciado.');
    }
  };

  // Check backend server status
  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.hasApiKey !== undefined) {
          setHasApiKey(data.hasApiKey);
        }
      })
      .catch(err => {
        console.warn('Health check warning:', err);
      });
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Scanning handler
  const handleFileSelected = async (file: File) => {
    setError(null);
    setIsScanning(true);
    setUploadedFile(file);

    const url = URL.createObjectURL(file);
    setUploadedFileUrl(url);

    try {
      const optimized = await optimizeFileForUpload(file);
      setIsOptimizedUpload(optimized.isOptimized);

      if (optimized.isOptimized) {
        triggerToast(`⚡ Archivo optimizado (${(optimized.originalSize / 1024 / 1024).toFixed(1)}MB → ${(optimized.optimizedSize / 1024).toFixed(0)}KB)`);
      }

      const startTime = Date.now();
      const response = await fetch('/api/scan-pdf', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
        },
        body: JSON.stringify({
          fileData: optimized.fileData,
          mimeType: optimized.mimeType,
          fileName: file.name,
          templateHint: options.template,
          speedMode: options.speedMode || 'fast',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en el procesamiento del documento.');
      }

      const resJson = await response.json();
      const rawResult = resJson.result;

      if (resJson.audit) {
        setLastScanLatencyMs(resJson.audit.latencyMs || Date.now() - startTime);
        setLastScanModel(resJson.audit.model || 'Gemini');
      }

      const columns = rawResult.columns || [];
      const rawRows = (rawResult.rows || [])
        .map((r: any) => (r.data ? r.data : r))
        .filter((rowObj: any) => {
          return Object.values(rowObj || {}).some(
            val => val !== undefined && val !== null && String(val).trim() !== ''
          );
        });

      if (rawRows.length === 0) {
        throw new Error('No se pudieron identificar filas con datos en este documento. Prueba con mayor iluminación o selecciona una plantilla específica.');
      }

      const validatedRows = validateAllRows(columns, rawRows);

      let reviewCount = 0;
      let illegibleCount = 0;
      validatedRows.forEach(row => {
        if (row.reviewFlags && row.reviewFlags.length > 0) reviewCount++;
        for (const k of Object.keys(row.validation || {})) {
          if (row.validation[k]?.status === 'ilegible') illegibleCount++;
        }
      });

      const structuredResult: ScanResult = {
        documentTitle: rawResult.documentTitle || file.name.replace(/\.[^/.]+$/, ''),
        detectedTemplate: rawResult.detectedTemplate || 'GENERAL',
        templateName: rawResult.templateName || rawResult.documentTitle || 'Formato Tabular',
        columns,
        rows: validatedRows,
        totalPages: rawResult.totalPages || 1,
        summary: {
          totalRows: validatedRows.length,
          validRows: validatedRows.length - reviewCount,
          reviewNeededCount: reviewCount,
          illegibleCount,
        },
      };

      setScanResult(structuredResult);
      setViewMode(structuredResult.rows.length > 0 ? 'table' : 'split');
      setSessionDocsScanned(prev => prev + 1);
      setSessionTotalRows(prev => prev + validatedRows.length);

      // Automatically jump to the Data Matrix module to review extracted fields!
      setActiveModule('table');

      if (options.autoExportCsv && validatedRows.length > 0) {
        const cleanName = structuredResult.documentTitle
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_')
          .slice(0, 30);
        downloadCsv(columns, validatedRows, `transcripcion_${cleanName}.csv`, options.delimiter);
        triggerToast('¡Archivo CSV generado y descargado automáticamente!');
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      setError(err.message || 'Ocurrió un error al procesar el archivo.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSampleSelected = (sample: SampleDocument) => {
    setError(null);
    setUploadedFile({ name: sample.fileName, size: 1024 * 180, type: 'application/pdf' } as any);
    setUploadedFileUrl(null);

    const validated = sample.sampleRows;
    let reviewCount = 0;
    let illegibleCount = 0;
    validated.forEach(row => {
      if (row.reviewFlags && row.reviewFlags.length > 0) reviewCount++;
      for (const k of Object.keys(row.validation || {})) {
        if (row.validation[k]?.status === 'ilegible') illegibleCount++;
      }
    });

    const structuredResult: ScanResult = {
      documentTitle: sample.title,
      detectedTemplate: sample.category,
      templateName: sample.title,
      columns: sample.columns,
      rows: validated,
      totalPages: 1,
      summary: {
        totalRows: validated.length,
        validRows: validated.length - reviewCount,
        reviewNeededCount: reviewCount,
        illegibleCount,
      },
    };

    setScanResult(structuredResult);
    setViewMode('table');
    setActiveModule('table');

    if (options.autoExportCsv && validated.length > 0) {
      downloadCsv(sample.columns, validated, `muestra_${sample.category.toLowerCase()}.csv`, options.delimiter);
      triggerToast('¡Archivo CSV generado y descargado automáticamente con la muestra!');
    }
  };

  const handleQuickLoadDefaultSample = () => {
    if (SAMPLE_DOCUMENTS.length > 0) {
      handleSampleSelected(SAMPLE_DOCUMENTS[0]);
      triggerToast('✨ Muestra oficial SISVAN Adultos cargada con éxito.');
    }
  };

  const handleRowsChange = (updatedRows: ExtractedRow[]) => {
    if (!scanResult) return;
    let reviewCount = 0;
    let illegibleCount = 0;
    updatedRows.forEach(row => {
      if (row.reviewFlags && row.reviewFlags.length > 0) reviewCount++;
      for (const k of Object.keys(row.validation || {})) {
        if (row.validation[k]?.status === 'ilegible') illegibleCount++;
      }
    });

    setScanResult({
      ...scanResult,
      rows: updatedRows,
      summary: {
        totalRows: updatedRows.length,
        validRows: updatedRows.length - reviewCount,
        reviewNeededCount: reviewCount,
        illegibleCount,
      },
    });
  };

  const handleReset = () => {
    if (uploadedFileUrl) {
      URL.revokeObjectURL(uploadedFileUrl);
    }
    setScanResult(null);
    setUploadedFile(null);
    setUploadedFileUrl(null);
    setError(null);
    setSelectedFieldFilter(null);
    setActiveModule('scanner');
  };

  const handleUpdateDatabaseRows = (updatedRows: any[]) => {
    setDatabaseRows(updatedRows);
    if (scanResult) {
      setScanResult({
        ...scanResult,
        rows: updatedRows as ExtractedRow[],
      });
    }
  };

  // Direct Field Inspector Handlers
  const handleOpenFieldInspector = () => {
    const targetRows = scanResult?.rows && scanResult.rows.length > 0 ? scanResult.rows : databaseRows;
    if (targetRows.length === 0) {
      triggerToast('ℹ️ Primero digitaliza un documento o carga una muestra para inspeccionar campos.');
      return;
    }
    setInspectedRow(targetRows[0]);
    setIsInspectorOpen(true);
  };

  const handleSaveInspectedRow = (updatedRow: ExtractedRow) => {
    if (scanResult) {
      const updated = scanResult.rows.map(r => r.id === updatedRow.id ? updatedRow : r);
      handleRowsChange(updated);
    }
    setInspectedRow(updatedRow);
    triggerToast('✅ Datos del paciente actualizados con éxito.');
  };

  // Speed mode toggle
  const handleToggleSpeedMode = () => {
    setOptions(prev => ({
      ...prev,
      speedMode: prev.speedMode === 'fast' ? 'precision' : 'fast',
    }));
    triggerToast(
      options.speedMode === 'fast'
        ? '🎯 Modo Alta Precisión activado (Gemini 3.8 Flash Thinking)'
        : '⚡ Modo Rápido activado (Gemini 3.1 Flash Lite)'
    );
  };

  const handleDownloadCsvClick = () => {
    if (!scanResult || scanResult.rows.length === 0) {
      triggerToast('⚠️ No hay datos para exportar.');
      return;
    }
    downloadCsv(scanResult.columns, scanResult.rows, `transcripcion_${scanResult.documentTitle}.csv`, options.delimiter);
    triggerToast('📥 Archivo CSV descargado.');
  };

  const handleDownloadExcelClick = () => {
    if (!scanResult || scanResult.rows.length === 0) {
      triggerToast('⚠️ No hay datos para exportar.');
      return;
    }
    downloadExcel(scanResult.columns, scanResult.rows, scanResult.documentTitle, `transcripcion_${scanResult.documentTitle}.xlsx`);
    triggerToast('📥 Archivo Excel (.xlsx) descargado.');
  };

  // Loading Session Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center animate-pulse shadow-xl border border-blue-400/30">
          <FileSpreadsheet className="w-7 h-7 text-white" />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-200">Verificando sesión SISVAN...</p>
          <p className="text-xs text-slate-400 mt-1">Conectando con el servidor seguro</p>
        </div>
      </div>
    );
  }

  // Authentication Guard
  if (!isAuthenticated || !user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. TOP BAR NAVIGATION */}
      <Navbar 
        hasApiKey={hasApiKey} 
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        scanResultCount={scanResult?.rows.length || 0}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* 2. MAIN WORKSPACE */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* EXECUTIVE MODULE BANNER HUB & FIELD ACCESS RIBBON */}
        <ModuleBannerHub
          activeModule={activeModule}
          onSelectModule={setActiveModule}
          userRole={user.role}
          userName={user.name || user.username}
          scanResult={scanResult}
          shiftSeconds={shiftSeconds}
          formatShiftTime={formatShiftTime}
          selectedFieldFilter={selectedFieldFilter}
          onSelectFieldFilter={setSelectedFieldFilter}
          onOpenFieldInspector={handleOpenFieldInspector}
          onLoadQuickSample={handleQuickLoadDefaultSample}
          onDownloadCsv={handleDownloadCsvClick}
          onDownloadExcel={handleDownloadExcelClick}
          speedMode={options.speedMode}
          onToggleSpeedMode={handleToggleSpeedMode}
        />

        {/* Global Error Banner if present */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-800 text-sm shadow-xs">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-rose-950">Aviso en el procesamiento</h4>
                <p className="mt-0.5 text-xs text-rose-700">{error}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {uploadedFile && (
                <button
                  type="button"
                  onClick={() => handleFileSelected(uploadedFile)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Reintentar escaneo
                </button>
              )}
              <button
                type="button"
                onClick={() => setError(null)}
                className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-900 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* MODULE 1: ESCÁNER OCR INTELIGENTE */}
        {activeModule === 'scanner' && (
          <motion.div
            key="module-scanner"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-6"
          >
            {isScanning ? (
              <ScanningProgress 
                fileName={uploadedFile?.name} 
                isOptimizedUpload={isOptimizedUpload} 
              />
            ) : (
              <UploadZone
                onFileSelected={handleFileSelected}
                onSampleSelected={handleSampleSelected}
                options={options}
                onOptionsChange={setOptions}
                isScanning={isScanning}
              />
            )}
          </motion.div>
        )}

        {/* MODULE 2: MATRIZ DE DATOS & CAMPOS */}
        {activeModule === 'table' && (
          <motion.div
            key="module-table"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-6"
          >
            {scanResult ? (
              <div className="space-y-6">
                {/* View Mode & Document Title Bar */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase font-mono">
                        {scanResult.detectedTemplate}
                      </span>
                      <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                        {scanResult.documentTitle}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Archivo: <b>{uploadedFile?.name || 'Documento'}</b> · {scanResult.totalPages} página(s) · {scanResult.columns.length} campos detectados
                    </p>
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start lg:self-auto">
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <TableIcon className="w-3.5 h-3.5" />
                      <span>Tabla Completa</span>
                    </button>

                    {uploadedFileUrl && (
                      <>
                        <button
                          type="button"
                          onClick={() => setViewMode('split')}
                          className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            viewMode === 'split' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Split className="w-3.5 h-3.5" />
                          <span>Vista Dividida</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setViewMode('document')}
                          className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            viewMode === 'document' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Soporte Original</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Metric Summary Counters */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filas Extraídas</p>
                    <p className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-1">{scanResult.summary.totalRows}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Renglones digitalizados</p>
                  </div>

                  <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Columnas Activas</p>
                    <p className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-1">{scanResult.columns.length}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Campos clínicos</p>
                  </div>

                  <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Registros Válidos</p>
                    <p className="text-2xl font-extrabold text-emerald-600 font-mono tabular-nums mt-1">{scanResult.summary.validRows}</p>
                    <p className="text-[11px] text-emerald-600/70 mt-0.5">Sin inconsistencias</p>
                  </div>

                  <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Para Revisar</p>
                    <p className="text-2xl font-extrabold text-amber-600 font-mono tabular-nums mt-1">{scanResult.summary.reviewNeededCount}</p>
                    <p className="text-[11px] text-amber-600/70 mt-0.5">Cotejar con documento físico</p>
                  </div>
                </div>

                {/* Export Toolbar */}
                <ExportBar
                  columns={scanResult.columns}
                  rows={scanResult.rows}
                  documentTitle={scanResult.documentTitle}
                  options={options}
                  onOptionsChange={setOptions}
                  onReset={handleReset}
                  onOpenConsultaPaiAdres={() => setActiveModule('consulta_pai_adres')}
                />

                {/* Main Views */}
                {viewMode === 'table' && (
                  <DataTable
                    columns={scanResult.columns}
                    rows={scanResult.rows}
                    onRowsChange={handleRowsChange}
                    documentTitle={scanResult.documentTitle}
                    selectedFieldFilter={selectedFieldFilter}
                    onSelectFieldFilter={setSelectedFieldFilter}
                  />
                )}

                {viewMode === 'split' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    <div className="lg:col-span-5">
                      <DocumentViewer
                        fileUrl={uploadedFileUrl}
                        fileType={uploadedFile?.type || 'application/pdf'}
                        fileName={uploadedFile?.name || 'Documento'}
                      />
                    </div>
                    <div className="lg:col-span-7">
                      <DataTable
                        columns={scanResult.columns}
                        rows={scanResult.rows}
                        onRowsChange={handleRowsChange}
                        documentTitle={scanResult.documentTitle}
                        selectedFieldFilter={selectedFieldFilter}
                        onSelectFieldFilter={setSelectedFieldFilter}
                      />
                    </div>
                  </div>
                )}

                {viewMode === 'document' && (
                  <DocumentViewer
                    fileUrl={uploadedFileUrl}
                    fileType={uploadedFile?.type || 'application/pdf'}
                    fileName={uploadedFile?.name || 'Documento'}
                  />
                )}
              </div>
            ) : (
              /* High-End Empty State */
              <div className="bg-white border border-slate-200/90 rounded-3xl p-12 text-center shadow-xs max-w-2xl mx-auto space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner border border-emerald-100">
                  <TableIcon className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-900">
                    Aún no hay datos cargados en la Matriz
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    Digitaliza un documento PDF o una imagen de caracterización en el Módulo 1, o carga de inmediato la muestra institucional para explorar todas las funciones de edición y validación campo a campo.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleQuickLoadDefaultSample}
                    className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Cargar Muestra Rápida SISVAN</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveModule('scanner')}
                    className="inline-flex items-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    <FolderOpen className="w-4 h-4 text-slate-500" />
                    <span>Ir a Digitalizador</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* MODULE 3: CONSULTA PAI / ADRES */}
        {activeModule === 'consulta_pai_adres' && (
          <motion.div
            key="module-consulta-pai-adres"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-4"
          >
            <ConsultaPaiAdresView
              excelDatabaseRows={scanResult?.rows && scanResult.rows.length > 0 ? scanResult.rows : databaseRows}
              onUpdateDatabaseRows={handleUpdateDatabaseRows}
              onTriggerToast={triggerToast}
              userRole={user.role}
            />
          </motion.div>
        )}

        {/* MODULE 4: DIRECTORIO CLÍNICO SISVESO */}
        {activeModule === 'patients' && (
          <motion.div
            key="module-patients"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-4"
          >
            <PatientsDirectoryView
              rows={scanResult?.rows && scanResult.rows.length > 0 ? scanResult.rows : databaseRows}
              columns={scanResult?.columns || []}
              onUpdateRows={handleRowsChange}
              onOpenConsultaPaiAdres={() => setActiveModule('consulta_pai_adres')}
              onTriggerToast={triggerToast}
            />
          </motion.div>
        )}

        {/* MODULE 5: AUDITORÍA, TURNO & CONTROL */}
        {activeModule === 'audit' && (
          <motion.div
            key="module-audit"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-4"
          >
            <AuditControlView
              shiftSeconds={shiftSeconds}
              sessionDocsScanned={sessionDocsScanned}
              sessionTotalRows={sessionTotalRows}
              onResetShift={handleResetShift}
              options={options}
              onOptionsChange={setOptions}
              scanColumns={scanResult?.columns || []}
              scanRows={scanResult?.rows || []}
              lastScanLatencyMs={lastScanLatencyMs}
              lastScanModel={lastScanModel}
              onTriggerToast={triggerToast}
            />
          </motion.div>
        )}
      </main>

      {/* FOOTER: Minimal, Anti-Slop, Strict Legal Notice */}
      <footer className="border-t border-slate-200 bg-white py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Escáner y Transcriptor de PDF a CSV · Sistema Integrado SISVAN & SISVESO 2026</span>
          <span>Cumplimiento Ley Estatutaria 1581 de 2012 · Transcripción Multimodal</span>
        </div>
      </footer>

      {/* Modal: Patient Field Inspector (Ficha Detallada de Campos) */}
      <PatientFieldInspector
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        row={inspectedRow}
        columns={scanResult?.columns || []}
        allRows={scanResult?.rows || []}
        onSaveRow={handleSaveInspectedRow}
        onSelectRow={(row) => setInspectedRow(row)}
      />

      {/* Modal: Authentication / Profile */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </div>
  );
}
