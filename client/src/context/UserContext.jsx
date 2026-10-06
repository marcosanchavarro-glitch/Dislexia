import { createContext, useContext, useEffect, useState } from 'react';
import { api, setUserToken, getUserToken } from '../lib/api';
const Context = createContext();
export function UserProvider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    const expire = () => setUser(null);
    window.addEventListener('user-session-expired', expire);
    if (getUserToken())
      api('/users/me', { user: true })
        .then((u) => {
          if (alive) setUser(u);
        })
        .catch(() => {
          setUserToken(null);
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    else setLoading(false);
    return () => {
      alive = false;
      window.removeEventListener('user-session-expired', expire);
    };
  }, []);
  const authenticate = async (path, data) => {
    const result = await api(`/users/${path}`, { method: 'POST', body: JSON.stringify(data) });
    setUserToken(result.token);
    setUser(result.user);
    return result.user;
  };
  const logout = () => {
    setUserToken(null);
    setUser(null);
  };
  return (
    <Context.Provider value={{ user, setUser, loading, authenticate, logout }}>
      {children}
    </Context.Provider>
  );
}
export const useUser = () => useContext(Context);
