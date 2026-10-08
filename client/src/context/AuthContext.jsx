import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useUser } from './UserContext';
export const roleLabels = {
  USER: 'Usuario',
  EDITOR: 'Editor',
  ADMIN: 'Admin',
  SUPER_ADMIN: 'Super Admin',
};
export const statusLabels = { ACTIVE: 'Activo', SUSPENDED: 'Suspendido', BANNED: 'Baneado' };
export const hasMinimumRole = (user, minimum) =>
  user?.status === 'ACTIVE' &&
  Object.keys(roleLabels).indexOf(user.role) >= Object.keys(roleLabels).indexOf(minimum);
// Compatibility hook, backed by the sole User context and token.
export function useAuth() {
  const session = useUser();
  return {
    ...session,
    admin: session.user,
    login: (email, password) => session.authenticate('login', { email, password }),
  };
}
export function ProtectedRoute({ minimum = 'EDITOR' }) {
  const { user, loading, error, retry } = useUser();
  const location = useLocation();
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
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!hasMinimumRole(user, minimum))
    return (
      <div className="empty-state">
        <h1>Acceso restringido</h1>
        <p>No tenés permisos para acceder a esta sección.</p>
      </div>
    );
  return <Outlet />;
}
