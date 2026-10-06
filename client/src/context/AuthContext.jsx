import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { api, getToken, setToken } from '../lib/api';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const expire = () => {
      setAdmin(null);
      setError('');
    };
    window.addEventListener('admin-session-expired', expire);
    return () => window.removeEventListener('admin-session-expired', expire);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api('/auth/me', { admin: true, signal: controller.signal })
      .then((data) => {
        setAdmin(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          if (err.status !== 401) setError(err.message);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [revision]);
  const login = async (email, password) => {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    setAdmin(data.admin);
    setError('');
  };
  const logout = () => {
    setToken(null);
    setAdmin(null);
    setError('');
  };
  return (
    <AuthContext.Provider
      value={{ admin, loading, error, login, logout, retry: () => setRevision((v) => v + 1) }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
export function ProtectedRoute() {
  const { admin, loading, error, retry } = useAuth();
  if (loading)
    return (
      <div className="empty-state" role="status">
        Verificando sesión…
      </div>
    );
  if (error)
    return (
      <div className="empty-state">
        <p role="alert">{error}</p>
        <button className="primary" onClick={retry}>
          Intentar nuevamente
        </button>
      </div>
    );
  return admin ? <Outlet /> : <Navigate to="/admin/login" replace />;
}
