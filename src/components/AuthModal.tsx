import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  UserCheck, 
  Sparkles, 
  AlertCircle, 
  X, 
  ArrowRight,
  Shield,
  KeyRound,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  canDismiss?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose,
  canDismiss = true 
}) => {
  const { login, register, authModalTab, setAuthModalTab } = useAuth();

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [registerName, setRegisterName] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // Status state
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!loginUsername.trim() || !loginPassword) {
      setError('Por favor completa todos los campos.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(loginUsername.trim(), loginPassword);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Error al iniciar sesión.');
    } else {
      if (onClose) onClose();
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!registerUsername.trim() || !registerPassword) {
      setError('Por favor ingresa usuario y contraseña.');
      return;
    }

    if (registerUsername.trim().length < 3) {
      setError('El usuario debe tener al menos 3 caracteres.');
      return;
    }

    if (registerPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    const result = await register(
      registerUsername.trim(),
      registerPassword,
      registerName.trim() || undefined
    );
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Error en el registro.');
    } else {
      if (onClose) onClose();
    }
  };

  const fillQuickCredentials = (username: string, pass: string) => {
    setAuthModalTab('login');
    setLoginUsername(username);
    setLoginPassword(pass);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 px-6 py-5 text-white relative">
          {canDismiss && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 text-blue-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center space-x-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight text-white">
                Sistema SISVAN Digital
              </h3>
              <p className="text-xs text-blue-200">
                Subred Integrada de Servicios de Salud Sur E.S.E.
              </p>
            </div>
          </div>

          <p className="text-xs text-blue-100/90 mt-2">
            Acceso seguro al digitalizador y transcriptor automatizado de caracterización
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => {
              setAuthModalTab('login');
              setError(null);
            }}
            className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-all text-center flex items-center justify-center space-x-2 ${
              authModalTab === 'login'
                ? 'border-blue-600 text-blue-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Iniciar Sesión</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthModalTab('register');
              setError(null);
            }}
            className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-all text-center flex items-center justify-center space-x-2 ${
              authModalTab === 'register'
                ? 'border-blue-600 text-blue-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Crear Registro</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Quick Access Credentials helper */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Accesos Configurados
              </span>
              <span className="text-[10px] text-blue-600 font-medium">Clic para autorellenar</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillQuickCredentials('Sisvan', 'S15van39**')}
                className="text-left px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 transition-all text-xs group"
              >
                <div className="flex items-center space-x-1.5 font-bold text-slate-900 group-hover:text-blue-700">
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Admin (Sisvan)</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                  S15van39**
                </div>
              </button>

              <button
                type="button"
                onClick={() => fillQuickCredentials('Invited', '1nvited39**')}
                className="text-left px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-xs group"
              >
                <div className="flex items-center space-x-1.5 font-bold text-slate-900 group-hover:text-emerald-700">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Invitado (Invited)</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                  1nvited39**
                </div>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start space-x-2 text-xs text-rose-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: LOGIN */}
          {authModalTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Usuario
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="Sisvan o Invited"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-bold shadow-xs hover:shadow transition-all flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <span>Iniciando sesión...</span>
                ) : (
                  <>
                    <span>Ingresar al Sistema</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: REGISTER */}
          {authModalTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre Completo / Dependencia
                </label>
                <input
                  type="text"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  placeholder="Ej: Digitador SISVAN Usme"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre de Usuario
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value)}
                    placeholder="Mínimo 3 caracteres"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-9 pr-10 py-2 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all font-mono"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-sm font-bold shadow-xs hover:shadow transition-all flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <span>Registrando usuario...</span>
                ) : (
                  <>
                    <span>Completar Registro e Ingresar</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="pt-2 text-center">
            <p className="text-[11px] text-slate-400 flex items-center justify-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
              <span>Conexión protegida y autenticada con server.ts</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
