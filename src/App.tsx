import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Split, 
  Table as TableIcon, 
  FileText, 
  Download, 
  Sparkles,
  Info,
  ShieldAlert,
  ArrowRight,
  Shield,
  User,
  LogIn,
  KeyRound,
  UserCheck
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { UploadZone } from './components/UploadZone';
import { ScanningProgress } from './components/ScanningProgress';
import { DataTable } from './components/DataTable';
import { DocumentViewer } from './components/DocumentViewer';
import { ExportBar } from './components/ExportBar';
import { AuthModal } from './components/AuthModal';
import { useAuth } from './context/AuthContext';
import { ScanResult, ScanOptions, ExtractedRow } from './types';
import { validateAllRows, TEMPLATES } from './utils/validation';
import { downloadCsv } from './utils/export';
import { SampleDocument } from './data/samplePdfs';
import { optimizeFileForUpload } from './utils/imageOptimizer';

export default function App() {
  const { user, isAuthenticated, isAuthModalOpen, setIsAuthModalOpen, setAuthModalTab, token, login } = useAuth();
  const [hasApiKey, setHasApiKey] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [isOptimizedUpload, setIsOptimizedUpload] = useState(false);

  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'split' | 'document'>('table');

  const [options, setOptions] = useState<ScanOptions>({
    template: 'AUTO',
    delimiter: ';',
    autoExportCsv: true,
    normalizeDates: true,
    cleanDocumentNumbers: true,
    speedMode: 'fast',
  });

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

  // Show temporary toast message
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Handle uploaded file scanning with client-side bandwidth optimization
  const handleFileSelected = async (file: File) => {
    setError(null);
    setIsScanning(true);
    setUploadedFile(file);

    const url = URL.createObjectURL(file);
    setUploadedFileUrl(url);

    try {
      // Optimize images/payload client-side to drastically reduce upload time over slow connections
      const optimized = await optimizeFileForUpload(file);
      setIsOptimizedUpload(optimized.isOptimized);

      if (optimized.isOptimized) {
        triggerToast(`⚡ Archivo optimizado (${(optimized.originalSize / 1024 / 1024).toFixed(1)}MB → ${(optimized.optimizedSize / 1024).toFixed(0)}KB) para transferencia inmediata`);
      }

      const response = await fetch('/api/scan-pdf', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

      // Extract columns and rows defensibly
      const columns = rawResult.columns || [];
      const rawRows = (rawResult.rows || [])
        .map((r: any) => {
          if (r.data && typeof r.data === 'object') return r.data;
          if (Array.isArray(r.cells)) {
            const map: Record<string, string> = {};
            r.cells.forEach((c: any) => {
              if (c && c.key) map[c.key] = c.value !== undefined && c.value !== null ? String(c.value).trim() : '';
            });
            return map;
          }
          return r;
        })
        .filter((rowObj: any) => {
          // Keep rows that have at least one non-empty value
          return Object.values(rowObj || {}).some(
            val => val !== undefined && val !== null && String(val).trim() !== ''
          );
        });

      if (rawRows.length === 0) {
        throw new Error(
          'No se pudieron identificar filas con datos en este documento. Si la imagen está muy borrosa, prueba con mayor iluminación o selecciona una plantilla específica.'
        );
      }

      // Validate rows
      const validatedRows = validateAllRows(columns, rawRows);

      // Count statuses
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

      // Auto-export CSV if requested
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

  // Handle sample dataset loading
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

    // Auto-export CSV if requested
    if (options.autoExportCsv && validated.length > 0) {
      downloadCsv(sample.columns, validated, `muestra_${sample.category.toLowerCase()}.csv`, options.delimiter);
      triggerToast('¡Archivo CSV generado y descargado automáticamente con la muestra!');
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
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar hasApiKey={hasApiKey} />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center space-x-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-800 text-sm">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold">Aviso en el procesamiento del documento</h4>
                <p className="mt-0.5 text-xs text-rose-700">{error}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
              {uploadedFile && (
                <button
                  type="button"
                  onClick={() => handleFileSelected(uploadedFile)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                >
                  Reintentar escaneo
                </button>
              )}
              <button
                type="button"
                onClick={() => setError(null)}
                className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-900"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* State 1: Uploading / Idle */}
        {!scanResult && !isScanning && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center space-y-2 mb-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Digitalizador y Extractor de PDF a CSV
              </h2>
              <p className="text-sm text-slate-600 max-w-2xl mx-auto">
                Escanea, lee y transcribe automáticamente todos los datos y tablas de archivos PDF o imágenes escaneadas, validando cédulas, teléfonos y fechas, con exportación estructurada directa a CSV y Excel.
              </p>
            </div>

            {/* User Session Banner / Quick Login Card */}
            {isAuthenticated && user ? (
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs ${
                user.role === 'admin'
                  ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
                  : user.role === 'invitado'
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-blue-50/70 border-blue-200 text-blue-900'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    user.role === 'admin' 
                      ? 'bg-indigo-600 text-white' 
                      : user.role === 'invitado' 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-blue-600 text-white'
                  }`}>
                    {user.role === 'admin' ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-sm">{user.name}</span>
                      <span className="font-mono text-slate-500">(@{user.username})</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        user.role === 'admin' ? 'bg-indigo-600 text-white' : user.role === 'invitado' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                      }`}>
                        {user.role}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-0.5">
                      {user.role === 'admin'
                        ? 'Acceso administrativo total: digitalización masiva y control de trazabilidad institucional.'
                        : user.role === 'invitado'
                        ? 'Acceso de prueba y demostración: carga tus formatos o explora las muestras de salud pública.'
                        : 'Acceso de digitador y operador de caracterización.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className="inline-flex items-center space-x-1 text-[11px] text-emerald-700 bg-emerald-100/70 px-2 py-1 rounded-md font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Conectado a server.ts</span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <KeyRound className="w-4 h-4 text-blue-600" />
                    <h3 className="font-bold text-sm text-slate-900">
                      Identificación de Usuario Requerida
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Ingresa con las credenciales preconfiguradas o crea un registro de operador:
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => login('Sisvan', 'S15van39**')}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-800 hover:bg-indigo-100 hover:border-indigo-300 transition-all shadow-2xs"
                  >
                    <Shield className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Entrar como Admin (Sisvan)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => login('Invited', '1nvited39**')}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300 transition-all shadow-2xs"
                  >
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Entrar como Invitado (Invited)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthModalTab('login');
                      setIsAuthModalOpen(true);
                    }}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-2xs"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Otro / Registro</span>
                  </button>
                </div>
              </div>
            )}

            <UploadZone
              onFileSelected={handleFileSelected}
              onSampleSelected={handleSampleSelected}
              options={options}
              onOptionsChange={setOptions}
              isScanning={isScanning}
            />
          </div>
        )}

        {/* State 2: Active Scanning Progress */}
        {isScanning && (
          <ScanningProgress 
            fileName={uploadedFile?.name} 
            isOptimizedUpload={isOptimizedUpload} 
          />
        )}

        {/* State 3: Scan Complete - Results & Export Dashboard */}
        {scanResult && !isScanning && (
          <div className="space-y-6">
            {/* Top Bar with Title, Summary Metrics, View Mode */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase">
                    {scanResult.detectedTemplate}
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                    {scanResult.documentTitle}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Archivo procesado: <b>{uploadedFile?.name || 'Documento'}</b> · {scanResult.totalPages} página(s) analizadas
                </p>
              </div>

              {/* View Mode Toggle (Table / Split / Document) */}
              <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 self-start lg:self-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Tabla de Datos</span>
                </button>

                {uploadedFileUrl && (
                  <>
                    <button
                      type="button"
                      onClick={() => setViewMode('split')}
                      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        viewMode === 'split' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Split className="w-3.5 h-3.5" />
                      <span>Vista Dividida</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setViewMode('document')}
                      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        viewMode === 'document' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Documento Original</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Metric Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filas Extraídas</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">{scanResult.summary.totalRows}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Renglones digitalizados</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Columnas</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">{scanResult.columns.length}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Campos estructurados</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Registros Válidos</p>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">{scanResult.summary.validRows}</p>
                <p className="text-[11px] text-emerald-600/70 mt-0.5">Sin inconsistencias</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Para Revisar</p>
                <p className="text-2xl font-extrabold text-amber-600 mt-1">{scanResult.summary.reviewNeededCount}</p>
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
            />

            {/* Main Content Area based on ViewMode */}
            {viewMode === 'table' && (
              <DataTable
                columns={scanResult.columns}
                rows={scanResult.rows}
                onRowsChange={handleRowsChange}
                documentTitle={scanResult.documentTitle}
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

            {/* Regulatory and Quality Advisory Note */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-blue-950">Aviso sobre control de calidad y tratamiento de datos personales</h4>
                <p className="text-blue-800 leading-relaxed">
                  Bajo la Ley 1581 de 2012 y lineamientos de caracterización de salud pública (SISVAN), todo dato dudoso o ilegible debe cotejarse contra el soporte documental físico antes de incorporarse a bases de datos oficiales. Puedes editar cualquier celda directamente en la tabla antes de exportar.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Escáner y Transcriptor de PDF a CSV · Entorno Local y Seguro</span>
          <span>Cumplimiento Ley 1581 de 2012 · Transcripción multimodal con IA</span>
        </div>
      </footer>

      {/* Authentication Modal (Login / Register) */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </div>
  );
}
