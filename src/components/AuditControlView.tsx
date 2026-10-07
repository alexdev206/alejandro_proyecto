import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Shield, 
  Crown, 
  User, 
  Clock, 
  FileSpreadsheet, 
  ClipboardCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  RefreshCw, 
  UserPlus, 
  Trash2, 
  Key, 
  RotateCcw,
  Sparkles,
  Layers,
  Database
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getRolePermissions, ColumnDefinition, ExtractedRow, ScanOptions } from '../types';
import { downloadShiftReport } from '../utils/export';

interface AuditControlViewProps {
  shiftSeconds: number;
  sessionDocsScanned: number;
  sessionTotalRows: number;
  onResetShift: () => void;
  options: ScanOptions;
  onOptionsChange: (newOpts: ScanOptions) => void;
  scanColumns: ColumnDefinition[];
  scanRows: ExtractedRow[];
  lastScanLatencyMs: number | null;
  lastScanModel: string | null;
  onTriggerToast: (msg: string) => void;
}

export const AuditControlView: React.FC<AuditControlViewProps> = ({
  shiftSeconds,
  sessionDocsScanned,
  sessionTotalRows,
  onResetShift,
  options,
  onOptionsChange,
  scanColumns,
  scanRows,
  lastScanLatencyMs,
  lastScanModel,
  onTriggerToast,
}) => {
  const { user, token } = useAuth();
  const permissions = getRolePermissions(user?.role);

  // Admin audit stats
  const [adminStats, setAdminStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  // Create user form state
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchAdminData = async () => {
    if (!token || !permissions.isAdmin) return;
    setLoadingStats(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch('/api/admin/audit-stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/auth/users', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setAdminStats(statsData);
      }
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsersList(usersData.users || []);
      }
    } catch (e) {
      console.warn('Error fetching admin data:', e);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (permissions.isAdmin) {
      fetchAdminData();
    }
  }, [permissions.isAdmin]);

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${m < 10 ? '0' : ''}${m}m ${s < 10 ? '0' : ''}${s}s`;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const handleDownloadTurno = () => {
    if (!user) return;
    downloadShiftReport(
      user.name || user.username,
      user.role,
      sessionDocsScanned,
      sessionTotalRows,
      formatTime(shiftSeconds),
      scanColumns,
      scanRows
    );
    onTriggerToast('📋 Acta oficial de entrega de turno descargada con éxito.');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword) {
      setFormError('Usuario y contraseña son requeridos.');
      return;
    }
    setFormError(null);

    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword,
          name: newName.trim() || newUsername.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Error al crear usuario.');
        return;
      }

      onTriggerToast(`¡Usuario "${data.user.username}" creado exitosamente!`);
      setUsersList((prev) => [...prev, data.user]);
      setNewUsername('');
      setNewPassword('');
      setNewName('');
      setShowAddUser(false);
    } catch (err: any) {
      setFormError(err.message || 'Error de conexión.');
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`¿Confirmas eliminar al usuario "${username}" del sistema?`)) return;
    try {
      const res = await fetch(`/api/auth/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        onTriggerToast(`⚠️ ${data.error || 'Error al eliminar usuario.'}`);
        return;
      }
      onTriggerToast(`Usuario "${username}" eliminado.`);
      setUsersList((prev) => prev.filter((u) => u.id !== userId));
    } catch (err: any) {
      onTriggerToast('Error de conexión.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Module Title Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              permissions.isAdmin 
                ? 'bg-indigo-600/30 border border-indigo-500/40 text-amber-300' 
                : 'bg-blue-600/30 border border-blue-500/40 text-blue-400'
            }`}>
              {permissions.isAdmin ? <Crown className="w-6 h-6" /> : <Activity className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Centro de Control & Auditoría
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  permissions.isAdmin 
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' 
                    : 'bg-blue-400/20 text-blue-300 border border-blue-400/30'
                }`}>
                  {permissions.isAdmin ? 'Perfil Administrador' : 'Perfil Operador Clínico'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Monitoreo de actividad, control de jornada y gestión de accesos
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {permissions.isAdmin && (
              <button
                type="button"
                onClick={fetchAdminData}
                disabled={loadingStats}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin' : ''}`} />
                <span>Actualizar Datos</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadTurno}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Descargar Acta de Turno (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      {/* OPERATOR SHIFT CARD (Always visible for both, especially useful for operators) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2.5">
            <Clock className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900">
              Control de Jornada y Turno de Trabajo
            </h3>
          </div>
          <button
            type="button"
            onClick={onResetShift}
            className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reiniciar Turno</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <span className="text-xs text-slate-500 block font-medium">Tiempo Transcurrido</span>
            <span className="text-xl font-extrabold text-slate-900 font-mono mt-1 block">
              {formatTime(shiftSeconds)}
            </span>
            <span className="text-[10px] text-emerald-600 font-medium mt-1 block">● Turno activo</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <span className="text-xs text-slate-500 block font-medium">Documentos Escaneados</span>
            <span className="text-xl font-extrabold text-blue-600 font-mono mt-1 block">
              {sessionDocsScanned}
            </span>
            <span className="text-[10px] text-slate-500 mt-1 block">Archivos PDF / Imágenes</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <span className="text-xs text-slate-500 block font-medium">Pacientes Transcritos</span>
            <span className="text-xl font-extrabold text-indigo-600 font-mono mt-1 block">
              {sessionTotalRows}
            </span>
            <span className="text-[10px] text-slate-500 mt-1 block">Registros consolidados</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <span className="text-xs text-slate-500 block font-medium">Velocidad Promedio</span>
            <span className="text-xl font-extrabold text-purple-600 font-mono mt-1 block">
              {sessionDocsScanned > 0 && shiftSeconds > 0
                ? `${((sessionTotalRows / (shiftSeconds / 60)) || 0).toFixed(1)}/min`
                : '—'}
            </span>
            <span className="text-[10px] text-slate-500 mt-1 block">Filas por minuto</span>
          </div>
        </div>
      </div>

      {/* AI ENGINE CONFIGURATION CARD */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-4">
          <Zap className="w-5 h-5 text-amber-500" />
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              Motor de Inteligencia Artificial (Google Gemini)
            </h3>
            <p className="text-xs text-slate-500">
              Configuración de velocidad, precisión y auditoría de latencia
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Fast Mode */}
          <div 
            onClick={() => {
              onOptionsChange({ ...options, speedMode: 'fast' });
              onTriggerToast('⚡ Modo Rápido activado');
            }}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              options.speedMode === 'fast'
                ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-500'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-sm text-slate-900 flex items-center space-x-1.5">
                <span>⚡ Modo Rápido (Gemini 3.1 Flash Lite)</span>
              </span>
              {options.speedMode === 'fast' && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white">
                  Activo
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Respuesta en menos de 2 segundos. Ideal para digitalización continua en turnos de alto volumen de documentos legibles.
            </p>
          </div>

          {/* Precision Mode */}
          <div 
            onClick={() => {
              if (!permissions.isAdmin) {
                onTriggerToast('ℹ️ Modo Alta Precisión activado.');
              }
              onOptionsChange({ ...options, speedMode: 'precision' });
              onTriggerToast('🎯 Modo Alta Precisión activado');
            }}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              options.speedMode === 'precision'
                ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-500'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-sm text-slate-900 flex items-center space-x-1.5">
                <span>🎯 Modo Precisión & Thinking (Gemini 3.8 Flash)</span>
              </span>
              {options.speedMode === 'precision' && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white">
                  Activo
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Razonamiento profundo para manuscritos complejos, tablas desalineadas o firmas médicas borrosas.
            </p>
          </div>
        </div>

        {/* Latency diagnostic */}
        {lastScanLatencyMs !== null && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
            <span className="text-slate-600">
              Último escaneo ejecutado con éxito: <strong>{lastScanModel}</strong>
            </span>
            <span className="font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
              {(lastScanLatencyMs / 1000).toFixed(2)} segundos
            </span>
          </div>
        )}
      </div>

      {/* ADMIN-ONLY USER MANAGEMENT SECTION */}
      {permissions.isAdmin && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-2.5">
              <Shield className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Gestión de Cuentas y Usuarios (Servidor)
                </h3>
                <p className="text-xs text-slate-500">
                  Administración de operadores autorizados con acceso al aplicativo
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAddUser(!showAddUser)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{showAddUser ? 'Cancelar' : 'Nuevo Usuario'}</span>
            </button>
          </div>

          {/* Add User Form */}
          {showAddUser && (
            <form onSubmit={handleCreateUser} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 animate-in fade-in">
              <h4 className="text-xs font-bold text-slate-900">Registrar Nuevo Acceso</h4>
              {formError && (
                <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2 rounded-lg">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Usuario (Login)"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                />
                <input
                  type="text"
                  placeholder="Nombre Completo"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono"
                  required
                />
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                >
                  Guardar en Base de Datos
                </button>
              </div>
            </form>
          )}

          {/* User List Table */}
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {usersList.map((u) => {
              const isCurrent = u.username === user?.username;
              const isDefaultAdmin = u.username === 'admin';

              return (
                <div key={u.id} className="p-3.5 bg-white flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-blue-100 text-blue-700 border border-blue-200">
                      👤
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 flex items-center space-x-2">
                        <span>{u.username}</span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                            Tú
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">{u.name}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </span>
                    {!isDefaultAdmin && !isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u.id, u.username)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        title={`Eliminar usuario ${u.username}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
