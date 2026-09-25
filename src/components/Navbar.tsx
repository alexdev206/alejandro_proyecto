import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  User, 
  Shield, 
  LogOut, 
  LogIn, 
  Users,
  ChevronDown,
  Crown,
  Plus,
  Trash2,
  Clock,
  Activity,
  Info,
  Lock,
  UserPlus,
  X,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getRolePermissions, AppModule } from '../types';
import { Table as TableIcon } from 'lucide-react';

interface NavbarProps {
  hasApiKey: boolean;
  activeModule?: AppModule;
  onSelectModule?: (module: AppModule) => void;
  // Backward compatibility
  activeView?: AppModule;
  onSelectView?: (view: any) => void;
  scanResultCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  hasApiKey, 
  activeModule, 
  onSelectModule,
  activeView,
  onSelectView,
  scanResultCount = 0,
}) => {
  const currentMod: AppModule = activeModule || activeView || 'scanner';
  const handleSelect = (mod: AppModule) => {
    if (onSelectModule) onSelectModule(mod);
    else if (onSelectView) onSelectView(mod);
  };
  const { user, isAuthenticated, logout, setIsAuthModalOpen, setAuthModalTab, token } = useAuth();
  const permissions = getRolePermissions(user?.role);

  const [showAdminUsersModal, setShowAdminUsersModal] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [adminUsersList, setAdminUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [adminStats, setAdminStats] = useState<any>(null);

  // New user form state
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'usuario'>('usuario');
  const [userActionError, setUserActionError] = useState<string | null>(null);
  const [userActionSuccess, setUserActionSuccess] = useState<string | null>(null);

  const fetchAdminUsers = async () => {
    if (!token) return;
    setLoadingUsers(true);
    setUserActionError(null);
    setUserActionSuccess(null);
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch('/api/auth/users', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/admin/audit-stats', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setAdminUsersList(data.users || []);
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setAdminStats(statsData);
      }
      setShowAdminUsersModal(true);
    } catch (e) {
      console.warn('Error fetching users:', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword) {
      setUserActionError('Usuario y contraseña son requeridos.');
      return;
    }
    setUserActionError(null);
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
          role: newRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setUserActionError(data.error || 'Error al crear usuario.');
        return;
      }

      setUserActionSuccess(`¡Usuario "${data.user.username}" creado con éxito!`);
      setAdminUsersList(prev => [...prev, data.user]);
      setNewUsername('');
      setNewPassword('');
      setNewName('');
      setShowAddUserForm(false);
    } catch (err: any) {
      setUserActionError(err.message || 'Error de conexión.');
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`¿Confirmas eliminar al usuario "${username}"?`)) return;
    setUserActionError(null);
    try {
      const res = await fetch(`/api/auth/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setUserActionError(data.error || 'Error al eliminar usuario.');
        return;
      }
      setUserActionSuccess(`Usuario "${username}" eliminado.`);
      setAdminUsersList(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      setUserActionError(err.message || 'Error de conexión.');
    }
  };

  return (
    <>
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Escáner y Transcriptor de PDF a CSV
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  IA Multimodal
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Digitalización, lectura manuscrita y exportación estructurada automática
              </p>
            </div>
          </div>

          {/* Top Bar Zone 2: Navigation Links */}
          <nav className="hidden xl:flex items-center space-x-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => handleSelect('scanner')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentMod === 'scanner'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. Escáner OCR
            </button>

            <button
              type="button"
              onClick={() => handleSelect('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentMod === 'table'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2. Matriz de Datos
            </button>

            <button
              type="button"
              onClick={() => handleSelect('consulta_pai_adres')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentMod === 'consulta_pai_adres'
                  ? 'bg-[#7e22ce] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              3. PAI / ADRES
            </button>

            <button
              type="button"
              onClick={() => handleSelect('patients')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentMod === 'patients'
                  ? 'bg-white text-cyan-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              4. Directorio
            </button>

            <button
              type="button"
              onClick={() => handleSelect('audit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentMod === 'audit'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              5. Control & Turno
            </button>
          </nav>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className={`hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
              hasApiKey ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>{hasApiKey ? 'Gemini Conectado' : 'Sin Clave API'}</span>
            </div>

            {/* Authentication Bar */}
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-2">
                {/* User Pill */}
                <div className={`flex items-center space-x-2 pl-2.5 pr-2 py-1 rounded-xl text-xs border ${
                  permissions.isAdmin 
                    ? 'bg-indigo-50/90 border-indigo-200 text-indigo-950'
                    : 'bg-blue-50/90 border-blue-200 text-blue-950'
                }`}>
                  <div className="flex items-center space-x-1.5">
                    {permissions.isAdmin ? (
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                        <Crown className="w-3.5 h-3.5 text-amber-300" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                        <User className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div className="text-left hidden sm:block">
                      <div className="font-bold leading-tight">
                        {user.username}
                      </div>
                      <div className="text-[10px] text-slate-500 capitalize leading-tight">
                        {permissions.isAdmin ? 'Administrador' : 'Usuario Operador'}
                      </div>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    permissions.isAdmin
                      ? 'bg-indigo-700 text-white shadow-2xs'
                      : 'bg-blue-700 text-white shadow-2xs'
                  }`}>
                    {user.role}
                  </span>

                  {/* Admin User Management Button */}
                  {permissions.isAdmin ? (
                    <button
                      type="button"
                      onClick={fetchAdminUsers}
                      disabled={loadingUsers}
                      className="ml-1 p-1 text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer"
                      title="Panel de Administración y Usuarios"
                    >
                      <Users className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowUserProfileModal(true)}
                      className="ml-1 p-1 text-blue-700 hover:text-blue-900 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                      title="Ver información de sesión y atajos"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Logout Button */}
                <button
                  type="button"
                  onClick={() => logout()}
                  className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 transition-all cursor-pointer"
                  title="Cerrar sesión actual"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Salir</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalTab('login');
                    setIsAuthModalOpen(true);
                  }}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs hover:shadow transition-all cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Iniciar Sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Admin Users & Control Panel Modal */}
      {showAdminUsersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-amber-300">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">Panel de Administración SISVAN</h3>
                  <p className="text-[11px] text-indigo-200">Control de usuarios, roles y métricas del servidor</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminUsersModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Server Stats Banner */}
            {adminStats && (
              <div className="bg-indigo-50/70 border-b border-indigo-100 px-6 py-3 shrink-0">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-white p-2 rounded-lg border border-indigo-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Escaneos IA</span>
                    <span className="text-base font-extrabold text-indigo-900 font-mono">{adminStats.totalScansProcessed}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-indigo-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Usuarios</span>
                    <span className="text-base font-extrabold text-indigo-900 font-mono">{adminStats.totalUsers}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-indigo-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Sesiones</span>
                    <span className="text-base font-extrabold text-emerald-700 font-mono">{adminStats.activeSessions}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-indigo-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Uptime</span>
                    <span className="text-xs font-bold text-slate-700 font-mono mt-1 block">{adminStats.uptime}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Feedback messages */}
              {userActionError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{userActionError}</span>
                </div>
              )}
              {userActionSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-700 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{userActionSuccess}</span>
                </div>
              )}

              {/* Users Header & Add User Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Cuentas Registradas ({adminUsersList.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Roles autorizados para transcripción y consulta
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddUserForm(!showAddUserForm)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{showAddUserForm ? 'Cancelar' : 'Nuevo Usuario'}</span>
                </button>
              </div>

              {/* Add User Form */}
              {showAddUserForm && (
                <form onSubmit={handleCreateNewUser} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 animate-in fade-in">
                  <div className="font-bold text-xs text-slate-800 flex items-center space-x-1.5">
                    <UserPlus className="w-4 h-4 text-indigo-600" />
                    <span>Crear Nuevo Usuario en el Servidor</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Usuario (Login)</label>
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="ej.: digitador_sur"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Nombre Completo</label>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="ej.: Carlos Gómez"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Contraseña</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Rol Asignado</label>
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as any)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="usuario">Usuario (Operador / Digitador)</option>
                        <option value="admin">Admin (Control Total)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Guardar Usuario
                    </button>
                  </div>
                </form>
              )}

              {/* Users List */}
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                {adminUsersList.map((u) => {
                  const isCurrent = u.username === user?.username;
                  const isPrimaryAdmin = u.username === 'admin';

                  return (
                    <div key={u.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          u.role === 'admin'
                            ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                          {u.role === 'admin' ? '👑' : '👤'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center space-x-2">
                            <span>{u.username}</span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                                Tú
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              u.role === 'admin'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-blue-600 text-white'
                            }`}>
                              {u.role}
                            </span>
                          </div>
                          <div className="text-slate-500 text-[11px] mt-0.5">{u.name}</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </span>
                        {!isPrimaryAdmin && !isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Profile & Operator Shortcuts Modal (for Rol Usuario) */}
      {showUserProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Perfil del Operador / Digitador</h3>
                  <p className="text-[11px] text-blue-200">Modo de digitación asistida SISVAN</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUserProfileModal(false)}
                className="text-blue-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  {user?.username.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">{user?.name || user?.username}</div>
                  <div className="text-slate-500">Usuario activo: <strong className="font-mono text-slate-800">{user?.username}</strong></div>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white uppercase">
                    ROL {user?.role}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Funcionalidades Especiales de Tu Rol:</span>
                </h4>
                <ul className="space-y-1.5 text-slate-600 pl-1">
                  <li className="flex items-start space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Digitación Rápida:</strong> Edición directa de celdas con guardado automático.</span>
                  </li>
                  <li className="flex items-start space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Filtro de Alertas:</strong> Localización inmediata de cédulas o datos por revisar.</span>
                  </li>
                  <li className="flex items-start space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Consultas PAI y ADRES:</strong> Búsqueda masiva y cruce con base SISVESO.</span>
                  </li>
                  <li className="flex items-start space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Control de Turno:</strong> Contador de registros procesados durante tu jornada.</span>
                  </li>
                </ul>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowUserProfileModal(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

