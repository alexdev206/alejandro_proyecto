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
  Sparkles,
  CheckCircle2,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();

  // Credenciales requeridas y predeterminadas: admin / admin26
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin26');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = username.trim();
    if (!cleanUser || !password) {
      setError('Por favor ingresa tu usuario y contraseña.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(cleanUser, password);
      if (!res.success) {
        setError(res.error || 'Credenciales incorrectas. Verifique usuario y contraseña.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error de conexión con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLoginAdmin = async () => {
    setUsername('admin');
    setPassword('admin26');
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await login('admin', 'admin26');
      if (!res.success) {
        setError(res.error || 'Error al iniciar sesión como administrador.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error de conexión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-48 right-1/4 w-[500px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Main Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 border-b border-slate-800 px-7 py-7 text-white text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md mb-3.5">
              <FileSpreadsheet className="w-6 h-6" />
            </div>

            <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-400/20 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Plataforma SISVAN · Salud Capital</span>
            </div>

            <h1 className="text-xl font-bold tracking-tight text-white">
              Sistema SISVAN Digital
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Subred Integrada de Servicios de Salud Sur E.S.E. · Inicio de Sesión
            </p>
          </div>

          {/* Formulario */}
          <div className="p-7">
            {error && (
              <div className="mb-5 bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start space-x-2.5 text-xs text-rose-700 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleStandardSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider">
                  Usuario Administrador
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all font-mono"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Contraseña
                  </label>
                  <span className="text-[11px] text-blue-600 font-mono font-medium">admin26</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="admin26"
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  <span>{isSubmitting ? 'Verificando credenciales...' : 'Iniciar Sesión'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Acceso Rápido Administrador */}
            <div className="mt-5 p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-950 flex items-center space-x-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                  <span>Acceso Administrador Solicitado</span>
                </span>
                <span className="text-[10px] font-mono bg-blue-200 text-blue-900 font-bold px-2 py-0.5 rounded">
                  admin / admin26
                </span>
              </div>
              <button
                type="button"
                onClick={handleQuickLoginAdmin}
                disabled={isSubmitting}
                className="w-full py-2 px-3 bg-white hover:bg-blue-100/60 border border-blue-300 text-blue-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-2xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Ingresar como Administrador (1 Clic)</span>
              </button>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 text-center space-y-2">
              <p className="text-[11px] text-slate-500 flex items-center justify-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                <span>El ingreso a PAIWEB y comprobador se solicita directamente dentro del aplicativo.</span>
              </p>
              <p className="text-[10px] text-slate-400">
                Subred Integrada de Servicios de Salud Sur E.S.E. · SISVAN Digital 2026
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
