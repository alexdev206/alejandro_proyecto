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
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  hasApiKey: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ hasApiKey }) => {
  const { user, isAuthenticated, logout, setIsAuthModalOpen, setAuthModalTab, token } = useAuth();
  const [showAdminUsersModal, setShowAdminUsersModal] = useState(false);
  const [adminUsersList, setAdminUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchAdminUsers = async () => {
    if (!token) return;
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/auth/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAdminUsersList(data.users || []);
        setShowAdminUsersModal(true);
      }
    } catch (e) {
      console.warn('Error fetching users:', e);
    } finally {
      setLoadingUsers(false);
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
                <div className="flex items-center space-x-2 pl-2.5 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <div className="flex items-center space-x-1.5">
                    {user.role === 'admin' ? (
                      <div className="w-6 h-6 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold">
                        <Shield className="w-3.5 h-3.5" />
                      </div>
                    ) : user.role === 'invitado' ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold">
                        <User className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center font-bold">
                        <User className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div className="text-left hidden sm:block">
                      <div className="font-bold text-slate-900 leading-tight">
                        {user.username}
                      </div>
                      <div className="text-[10px] text-slate-500 capitalize leading-tight">
                        {user.role === 'admin' ? 'Administrador' : user.role === 'invitado' ? 'Invitado' : 'Operador'}
                      </div>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    user.role === 'admin'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : user.role === 'invitado'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-blue-600 text-white shadow-2xs'
                  }`}>
                    {user.role}
                  </span>

                  {/* Admin User Management Button */}
                  {user.role === 'admin' && (
                    <button
                      type="button"
                      onClick={fetchAdminUsers}
                      disabled={loadingUsers}
                      className="ml-1 p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-200/60 rounded-md transition-colors"
                      title="Ver usuarios registrados en el servidor"
                    >
                      <Users className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Logout Button */}
                <button
                  type="button"
                  onClick={() => logout()}
                  className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 transition-all"
                  title="Cerrar sesión actual"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cerrar Sesión</span>
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
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs hover:shadow transition-all"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Iniciar Sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Admin Users Inspection Modal */}
      {showAdminUsersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-sm">Usuarios en Base de Datos (server.ts)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminUsersModal(false)}
                className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-1 rounded"
              >
                Cerrar
              </button>
            </div>
            <div className="p-5 max-h-96 overflow-y-auto space-y-3">
              <p className="text-xs text-slate-500">
                Usuarios autenticados registrados en el servidor Express:
              </p>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {adminUsersList.map((u) => (
                  <div key={u.id} className="p-3 bg-white flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                        <span>{u.username}</span>
                        {u.role === 'admin' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-100 text-indigo-700 font-bold">
                            ADMIN
                          </span>
                        )}
                        {u.role === 'invitado' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-700 font-bold">
                            INVITADO
                          </span>
                        )}
                        {u.role === 'operador' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 font-bold">
                            OPERADOR
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">{u.name}</div>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

