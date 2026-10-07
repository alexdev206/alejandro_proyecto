import React from 'react';
import { 
  FileSpreadsheet, 
  Table as TableIcon, 
  ShieldCheck, 
  Users, 
  Activity, 
  Sparkles, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Download, 
  Zap, 
  Crown, 
  UserCheck, 
  SlidersHorizontal,
  ChevronRight,
  Eye,
  FileCheck,
  Bot,
  Layers,
  ArrowUpRight,
  Baby,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppModule, ScanResult, ExtractedRow, ColumnDefinition, UserRole } from '../types';

interface ModuleBannerHubProps {
  activeModule: AppModule;
  onSelectModule: (module: AppModule) => void;
  userRole?: UserRole;
  userName?: string;
  scanResult: ScanResult | null;
  shiftSeconds: number;
  formatShiftTime: (sec: number) => void;
  selectedFieldFilter: string | null;
  onSelectFieldFilter: (fieldKey: string | null) => void;
  onOpenFieldInspector: () => void;
  onLoadQuickSample?: () => void;
  onDownloadCsv?: () => void;
  onDownloadExcel?: () => void;
  speedMode: 'fast' | 'precision';
  onToggleSpeedMode?: () => void;
}

export const ModuleBannerHub: React.FC<ModuleBannerHubProps> = ({
  activeModule,
  onSelectModule,
  userRole = 'usuario',
  userName = 'Usuario',
  scanResult,
  shiftSeconds,
  formatShiftTime,
  selectedFieldFilter,
  onSelectFieldFilter,
  onOpenFieldInspector,
  onLoadQuickSample,
  onDownloadCsv,
  onDownloadExcel,
  speedMode,
  onToggleSpeedMode,
}) => {
  const isAdmin = userRole === 'admin';

  // Module configuration definitions
  const modules = [
    {
      id: 'scanner' as AppModule,
      number: '01',
      title: 'Digitalizador & OCR',
      shortTitle: 'Escáner OCR',
      subtitle: 'Captura y lectura de archivos PDF o fotos de planillas físicas con IA',
      icon: FileSpreadsheet,
      accent: 'blue',
      badge: 'Multimodal',
    },
    {
      id: 'table' as AppModule,
      number: '02',
      title: 'Matriz & Campos',
      shortTitle: 'Matriz de Datos',
      subtitle: 'Explorador celda a celda, validación normativa y cotejo documental',
      icon: TableIcon,
      accent: 'emerald',
      badge: scanResult ? `${scanResult.rows.length} Registros` : 'Sin datos',
    },
    {
      id: 'consulta_pai' as AppModule,
      number: '03',
      title: 'PAIWEB · Vacunación Infantil',
      shortTitle: 'PAIWEB Vacunas',
      subtitle: 'Módulo pediátrico de inmunización, esquemas biológicos y registro SISVAN',
      icon: Baby,
      accent: 'blue',
      badge: 'PAIWEB 2.0',
    },
    {
      id: 'consulta_comprobador' as AppModule,
      number: '04',
      title: 'Comprobador Distrital de Derechos',
      shortTitle: 'Comprobador Bogotá',
      subtitle: 'Aseguramiento en Bogotá D.C., asignación a Subred Sur y clasificación SISBEN',
      icon: Database,
      accent: 'purple',
      badge: 'SDS Bogotá',
    },
    {
      id: 'patients' as AppModule,
      number: '05',
      title: 'Directorio Clínico',
      shortTitle: 'Directorio SISVAN',
      subtitle: 'Directorio consolidado de pacientes, alertas y ficha nominal',
      icon: Users,
      accent: 'cyan',
      badge: 'Nominal',
    },
    {
      id: 'audit' as AppModule,
      number: '06',
      title: 'Control & Turno',
      shortTitle: 'Turno & Auditoría',
      subtitle: isAdmin 
        ? 'Gestión institucional de usuarios, auditoría de latencia y control del sistema' 
        : 'Registro de jornada de digitación, métricas y acta oficial de entrega',
      icon: Activity,
      accent: 'amber',
      badge: isAdmin ? 'Admin Root' : 'Operador',
    },
  ];

  const currentMod = modules.find((m) => m.id === activeModule) || modules[0];

  // Calculate field statistics if data is present
  const fieldStats = React.useMemo(() => {
    if (!scanResult || scanResult.columns.length === 0) return [];
    
    return scanResult.columns.map((col) => {
      let filledCount = 0;
      let alertCount = 0;
      
      scanResult.rows.forEach((r) => {
        const val = r.data[col.key];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          filledCount++;
        }
        if (r.validation && r.validation[col.key]?.status && r.validation[col.key]?.status !== 'ok') {
          alertCount++;
        }
      });

      return {
        key: col.key,
        label: col.label || col.key,
        filledCount,
        alertCount,
        percentFilled: Math.round((filledCount / (scanResult.rows.length || 1)) * 100),
      };
    });
  }, [scanResult]);

  return (
    <div className="space-y-4">
      {/* 1. TOP MODULE NAVIGATION DOCK */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-1.5 shadow-xl backdrop-blur-md">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
          {modules.map((m) => {
            const isActive = activeModule === m.id;
            const Icon = m.icon;

            return (
              <motion.button
                key={m.id}
                type="button"
                onClick={() => onSelectModule(m.id)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className={`relative px-3.5 py-2.5 rounded-xl flex items-center space-x-3 transition-all text-left cursor-pointer overflow-hidden ${
                  isActive
                    ? 'bg-gradient-to-r from-slate-800 to-slate-850 text-white shadow-lg border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                {/* Active highlight glow indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeModuleIndicator"
                    className="absolute inset-0 bg-blue-500/10 border-b-2 border-blue-400 pointer-events-none"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}

                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                      {m.number}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase truncate max-w-[80px] ${
                        isActive
                          ? 'bg-blue-400/20 text-blue-300 border border-blue-400/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {m.badge}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-100 truncate mt-0.5">
                    {m.shortTitle}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* 2. DYNAMIC HERO BANNER PER ACTIVE MODULE */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeModule}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-800 text-white p-5 sm:p-6 shadow-xl"
        >
          {/* Subtle Ambient Background Mesh */}
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-16 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            {/* Left: Module Identity & Context */}
            <div className="space-y-2 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-blue-400 uppercase tracking-widest">
                  MÓDULO {currentMod.number} · {currentMod.title.toUpperCase()}
                </span>
                <span className="text-slate-600">/</span>
                <span className="text-[11px] font-medium text-slate-300 flex items-center space-x-1">
                  {isAdmin ? (
                    <>
                      <Crown className="w-3 h-3 text-amber-400" />
                      <span>Administrador: {userName}</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3 h-3 text-emerald-400" />
                      <span>Operador: {userName}</span>
                    </>
                  )}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>{currentMod.title}</span>
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {currentMod.subtitle}
              </p>

              {/* Status and Telemetry inline strip */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400 font-mono">
                <span className="inline-flex items-center space-x-1.5 text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/80">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Turno: <strong className="text-white font-mono">{formatShiftTime(shiftSeconds)}</strong></span>
                </span>

                {scanResult && (
                  <>
                    <span className="inline-flex items-center space-x-1.5 text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/80">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span><strong className="text-white font-mono">{scanResult.summary.validRows}</strong> Válidos</span>
                    </span>

                    {scanResult.summary.reviewNeededCount > 0 && (
                      <span className="inline-flex items-center space-x-1.5 text-amber-300 bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-800/60">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span><strong className="text-amber-200 font-mono">{scanResult.summary.reviewNeededCount}</strong> Por Revisar</span>
                      </span>
                    )}
                  </>
                )}

                <span className="inline-flex items-center space-x-1.5 text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/80">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>Modo: <strong className="text-white uppercase">{speedMode === 'precision' ? '3.8 Thinking' : '3.1 Lite'}</strong></span>
                </span>
              </div>
            </div>

            {/* Right: Quick Action Controls based on Module */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {activeModule === 'scanner' && (
                <>
                  {onLoadQuickSample && (
                    <button
                      type="button"
                      onClick={onLoadQuickSample}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all flex items-center space-x-2 cursor-pointer shadow-xs"
                    >
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Cargar Muestra SISVAN</span>
                    </button>
                  )}

                  {onToggleSpeedMode && isAdmin && (
                    <button
                      type="button"
                      onClick={onToggleSpeedMode}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 cursor-pointer shadow-xs"
                      title="Alternar motor de procesamiento IA"
                    >
                      <Zap className="w-4 h-4 text-yellow-300" />
                      <span>Alternar Modo IA ({speedMode === 'fast' ? 'Rápido' : 'Precisión'})</span>
                    </button>
                  )}
                </>
              )}

              {activeModule === 'table' && (
                <>
                  <button
                    type="button"
                    onClick={onOpenFieldInspector}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shadow-xs"
                    title="Examinar los datos campo a campo con el inspector interactivo"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-blue-200" />
                    <span>Inspeccionar Campos</span>
                  </button>

                  {onDownloadCsv && (
                    <button
                      type="button"
                      onClick={onDownloadCsv}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-400" />
                      <span>CSV</span>
                    </button>
                  )}

                  {onDownloadExcel && (
                    <button
                      type="button"
                      onClick={onDownloadExcel}
                      className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-white" />
                      <span>Excel (.xlsx)</span>
                    </button>
                  )}
                </>
              )}


              {activeModule === 'consulta_pai' && (
                <>
                  <div className="px-3.5 py-2 bg-blue-950/70 text-blue-200 border border-blue-800/80 rounded-xl text-xs flex items-center space-x-2">
                    <Baby className="w-4 h-4 text-blue-400" />
                    <span>PAIWEB 2.0 · Esquema de Vacunas Menores</span>
                  </div>
                </>
              )}

              {activeModule === 'consulta_comprobador' && (
                <>
                  <div className="px-3.5 py-2 bg-indigo-950/70 text-indigo-200 border border-indigo-800/80 rounded-xl text-xs flex items-center space-x-2">
                    <Database className="w-4 h-4 text-indigo-400" />
                    <span>Secretaría de Salud · Comprobador Capital</span>
                  </div>
                </>
              )}

              {activeModule === 'patients' && (
                <>
                  {onDownloadExcel && (
                    <button
                      type="button"
                      onClick={onDownloadExcel}
                      className="px-3.5 py-2 bg-cyan-700 hover:bg-cyan-600 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shadow-xs"
                    >
                      <Download className="w-4 h-4 text-white" />
                      <span>Exportar Directorio</span>
                    </button>
                  )}
                </>
              )}

              {activeModule === 'audit' && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-300 font-mono">
                    Sesión activa SISVAN Digital
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* 3. FIELD ACCESS BANNER / ATTR BAR (ACCESO DIRECTO A CADA CAMPO) */}
      {fieldStats.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 tracking-tight flex items-center space-x-1.5">
                  <span>Acceso Rápido a Cada Campo ({fieldStats.length} Campos Extraídos)</span>
                  <span className="text-[10px] font-normal text-slate-500">
                    · Haz clic en cualquier campo para inspeccionarlo o filtrarlo
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Exploración directa de cédulas, nombres, fechas, teléfonos, EAPB y observaciones
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {selectedFieldFilter && (
                <button
                  type="button"
                  onClick={() => onSelectFieldFilter(null)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                >
                  Limpiar Filtro ({selectedFieldFilter})
                </button>
              )}

              <button
                type="button"
                onClick={onOpenFieldInspector}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Abrir Ficha de Campos Fila a Fila</span>
              </button>
            </div>
          </div>

          {/* Interactive Horizontal Field Chips Strip */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {fieldStats.map((f) => {
              const isSelected = selectedFieldFilter === f.key;
              const hasAlerts = f.alertCount > 0;

              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => onSelectFieldFilter(isSelected ? null : f.key)}
                  className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer border shrink-0 ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : hasAlerts
                      ? 'bg-amber-50/70 hover:bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                  title={`${f.label}: ${f.filledCount} datos llenos, ${f.alertCount} alertas`}
                >
                  <span className="font-semibold">{f.label}</span>

                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                      isSelected
                        ? 'bg-blue-700 text-white'
                        : hasAlerts
                        ? 'bg-amber-200 text-amber-900'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {hasAlerts ? `⚠️ ${f.alertCount}` : `${f.percentFilled}%`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
