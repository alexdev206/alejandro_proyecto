import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, AuthState } from '../types';

interface AuthContextType extends AuthState {
  token: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalTab: 'login' | 'register';
  setAuthModalTab: (tab: 'login' | 'register') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'sisvan_auth_token';

const ADMIN_USER: AuthUser = {
  id: 'usr_admin',
  username: 'admin',
  name: 'Administrador SISVAN',
  role: 'admin',
  token: 'sisvan_admin_token',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');

  // Verify stored token on startup
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setUser(null);
        setToken(null);
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setUser({ ...data.user, token: storedToken });
            setToken(storedToken);
          } else {
            localStorage.removeItem(TOKEN_KEY);
            setUser(null);
            setToken(null);
          }
        } else {
          // If stored token was admin token or fallback
          if (storedToken === 'sisvan_admin_token') {
            setUser(ADMIN_USER);
            setToken('sisvan_admin_token');
          } else {
            localStorage.removeItem(TOKEN_KEY);
            setUser(null);
            setToken(null);
          }
        }
      } catch (err) {
        console.warn('Error verificando sesión remota:', err);
        if (storedToken === 'sisvan_admin_token') {
          setUser(ADMIN_USER);
          setToken('sisvan_admin_token');
        } else {
          setUser(null);
          setToken(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const cleanUser = username.trim().toLowerCase();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Fallback local directo para credenciales oficiales admin / admin26
        if (cleanUser === 'admin' && password === 'admin26') {
          localStorage.setItem(TOKEN_KEY, 'sisvan_admin_token');
          setToken('sisvan_admin_token');
          setUser(ADMIN_USER);
          setIsAuthModalOpen(false);
          return { success: true };
        }
        return { success: false, error: data.error || 'Error al iniciar sesión' };
      }

      const userWithToken: AuthUser = {
        ...data.user,
        token: data.token,
      };

      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(userWithToken);
      setIsAuthModalOpen(false);

      return { success: true };
    } catch (err: any) {
      // Fallback si la red falla pero las credenciales son admin / admin26
      if (cleanUser === 'admin' && password === 'admin26') {
        localStorage.setItem(TOKEN_KEY, 'sisvan_admin_token');
        setToken('sisvan_admin_token');
        setUser(ADMIN_USER);
        setIsAuthModalOpen(false);
        return { success: true };
      }
      return { success: false, error: err.message || 'Error de conexión con el servidor.' };
    }
  };

  const register = async (username: string, password: string, name?: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, name }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Error en el registro de usuario' };
      }

      const userWithToken: AuthUser = {
        ...data.user,
        token: data.token,
      };

      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(userWithToken);
      setIsAuthModalOpen(false);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de conexión con el servidor.' };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (err) {
      console.warn('Error al cerrar sesión:', err);
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('pai_active_token');
      localStorage.removeItem('pai_operator_info');
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalTab,
        setAuthModalTab,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
