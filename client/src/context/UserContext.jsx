import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { api, setToken, getToken } from '../lib/api';
const Context = createContext();
export function UserProvider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true);
  const [error, setError] = useState(''),
    [revision, setRevision] = useState(0);
  const { pathname } = useLocation();
  const generation = useRef(0);
  useEffect(() => {
    const expire = () => {
      generation.current++;
      setUser(null);
      setError('');
      setLoading(false);
    };
    const refresh = () => setRevision((v) => v + 1);
    window.addEventListener('session-expired', expire);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('session-expired', expire);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const current = ++generation.current;
    setError('');
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    api('/auth/me', { user: true, signal: controller.signal })
      .then((u) => {
        if (generation.current === current) setUser(u);
      })
      .catch((e) => {
        if (generation.current === current && e.name !== 'AbortError' && e.status !== 401)
          setError(e.message);
      })
      .finally(() => {
        if (generation.current === current && !controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      generation.current++;
    };
  }, [revision, pathname]);
  const authenticate = async (path, data) => {
    const current = ++generation.current;
    setLoading(false);
    const result = await api(`/auth/${path}`, { method: 'POST', body: JSON.stringify(data) });
    if (generation.current !== current)
      throw new Error('El inicio de sesión fue cancelado. Intentá nuevamente.');
    setToken(result.token);
    setUser(result.user);
    setError('');
    return result.user;
  };
  const logout = () => {
    generation.current++;
    setToken(null);
    setUser(null);
    setError('');
    setRevision((v) => v + 1);
    window.dispatchEvent(new Event('session-expired'));
  };
  return (
    <Context.Provider
      value={{
        user,
        setUser,
        loading,
        error,
        authenticate,
        logout,
        retry: () => setRevision((v) => v + 1),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useUser = () => useContext(Context);
