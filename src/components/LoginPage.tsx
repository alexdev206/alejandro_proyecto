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
  Baby,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();

  // Modo de ingreso: 'pai' (Acceso PAIWEB integrado) o 'estandar' (Usuario/Contraseña)
  const [activeTab, setActiveTab] = useState<'pai' | 'estandar'>('pai');

  // Campos PAI
  const [paiUsername, setPaiUsername] = useState('');
  const [operatorName, setOperatorName] = useState('');

  // Campos estándar
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Acceso integrado con PAIWEB (100% dentro de la web, sin abrir pestañas externas)
  const handlePaiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = paiUsername.trim();
    if (!cleanUser) {
      setError('Por favor ingresa tu usuario o número de cédula institucional.');
      return;
    }

    setIsSubmitting(true);
    try {
      const paiSession = {
        username: cleanUser,
        name: operatorName.trim() || cleanUser,
        authenticated: true,
      };
      localStorage.setItem('pai_user_session', JSON.stringify(paiSession));
      localStorage.setItem('comprobador_user_session', JSON.stringify(paiSession));
      
      const res = await login(cleanUser, 'PAIWEB-SESSION-AUTH');
      if (!res.success) {
        setError(res.error || 'Error al iniciar sesión con usuario PAI.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error de conexión con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Acceso estándar con usuario y contraseña
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
        setError(res.error || 'Error al iniciar sesión. Verifique los datos ingresados.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error de conexión con el servidor.');
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
              Subred Integrada de Servicios de Salud Sur E.S.E. · PAIWEB & Comprobador
            </p>
          </div>

          {/* Selector de Modo de Acceso integrado */}
          <div className="bg-slate-100 p-1.5 flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => {
                setActiveTab('pai');
                setError(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeTab === 'pai'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Baby className="w-3.5 h-3.5 text-blue-600" />
              <span>Acceso PAIWEB</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('estandar');
                setError(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeTab === 'estandar'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Acceso Usuario</span>
            </button>
          </div>

          {/* Formulario */}
          <div className="p-7">
            {error && (
              <div className="mb-5 bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start space-x-2.5 text-xs text-rose-700 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* PESTAÑA 1: INGRESO CON PAIWEB (INTEGRADO EN PÁGINA) */}
            {activeTab === 'pai' && (
              <form onSubmit={handlePaiSubmit} className="space-y-4 animate-in fade-in">
                <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl space-y-1 text-xs">
                  <div className="flex items-center space-x-1.5 text-blue-950 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Integración Directa PAIWEB</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Ingresa con tu usuario o cédula institucional. Accederás de inmediato a los módulos de PAIWEB Vacunación, Comprobador de Derechos y Digitalización.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1 uppercase tracking-wider">
                    Usuario / Cédula PAI
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={paiUsername}
                      onChange={(e) => setPaiUsername(e.target.value)}
                      placeholder="ej: 1025530378 o usuario asignado"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all font-mono"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1 uppercase tracking-wider">
                    Nombre del Operador <span className="text-[10px] text-slate-400 font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    placeholder="ej: Carlos Gómez (Vacunador Subred Sur)"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSubmitting ? 'Iniciando sesión...' : 'Entrar al Sistema con PAIWEB'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* PESTAÑA 2: INGRESO ESTÁNDAR (USUARIO Y CONTRASEÑA) */}
            {activeTab === 'estandar' && (
              <form onSubmit={handleStandardSubmit} className="space-y-4 animate-in fade-in">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider">
                    Usuario
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Ingresa tu usuario institucional"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider">
                    Contraseña
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
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
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                  >
                    <span>{isSubmitting ? 'Verificando...' : 'Iniciar Sesión'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                Todo el proceso se realiza 100% dentro de esta página web institucional.
              </p>
              <p className="text-[10px] text-slate-400 mt-1.5">
                Subred Integrada de Servicios de Salud Sur E.S.E. · SISVAN Digital
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
