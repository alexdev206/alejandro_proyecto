import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  AlertCircle, 
  ArrowRight,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();

  // Login state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Submission & status
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!loginUsername.trim() || !loginPassword) {
      setError('Por favor ingrese usuario y contraseña.');
      return;
    }

    setIsSubmitting(true);
    const res = await login(loginUsername.trim(), loginPassword);
    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error || 'Credenciales inválidas. Verifique su usuario y contraseña.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex flex-col justify-center items-center px-4 py-12">
      {/* Decorative background lights */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Main Card */}
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-2xl overflow-hidden backdrop-blur">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 px-7 py-6 text-white text-center relative">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur shadow-inner mb-3">
              <FileSpreadsheet className="w-7 h-7" />
            </div>

            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/15 text-blue-100 border border-white/20 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Acceso Seguro Requerido</span>
            </span>

            <h1 className="text-xl font-bold tracking-tight text-white">
              Escáner y Transcriptor PDF
            </h1>
            <p className="text-xs text-blue-200 mt-1">
              Subred Integrada de Servicios de Salud Sur E.S.E. Integracion Alejandro Ortega - Wilfredo Mahecha - Luis Silva · SISVAN · Alexander Munoz · NO TRANSMISIBLES
            </p>
          </div>
          
          {/* Form Area */}
          <div className="p-6">
            {error && (
              <div className="mb-4 bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start space-x-2 text-xs text-rose-700 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Usuario
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="Ingrese su usuario"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                    title={showLoginPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <span>Validando credenciales...</span>
                ) : (
                  <>
                    <span>Ingresar al Sistema</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-500 flex items-center justify-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                <span>Autenticación validada en tiempo real por server.ts</span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400 mt-6">
          © Subred Integrada de Servicios de Salud Sur E.S.E. · Bogotá D.C.
        </p>
      </div>
    </div>
  );
};
