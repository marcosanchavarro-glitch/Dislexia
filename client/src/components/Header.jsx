import { NavLink, Link } from 'react-router-dom';
import { BookOpen, SlidersHorizontal } from 'lucide-react';
import SearchBar from './SearchBar';
import { useUser } from '../context/UserContext';
import { Avatar } from '../pages/Profile';
import { hasMinimumRole } from '../context/AuthContext';
export default function Header({ query, onSearch, count, onAccessibility }) {
  const { user, logout } = useUser();
  return (
    <header className="header">
      <div className="header-inner">
        <Link className="brand" to="/" aria-label="Entre líneas, inicio">
          <span className="brand-icon">
            <BookOpen size={23} />
          </span>
          <span className="brand-name">
            entre líneas<span className="brand-dot">.</span>
          </span>
        </Link>
        <nav aria-label="Navegación principal">
          <NavLink to="/" end>
            Inicio
          </NavLink>
          <NavLink to="/explorar">Explorar</NavLink>
          <NavLink to="/mi-lista">
            Mi lista <span className="count">{count}</span>
          </NavLink>
        </nav>
        <button className="access-button" aria-label="Accesibilidad" onClick={onAccessibility}>
          <SlidersHorizontal size={18} />
          <span>Accesibilidad</span>
        </button>
        <SearchBar query={query} onSearch={onSearch} />
        <div className="user-nav">
          {user ? (
            <>
              <Avatar user={user} />
              <span>{user.username}</span>
              <Link to={`/profile/${user.username}`}>Mi perfil</Link>
              {hasMinimumRole(user, 'EDITOR') && (
                <Link to="/admin">
                  {user.role === 'EDITOR' ? 'Panel editorial' : 'Administración'}
                </Link>
              )}
              <button className="secondary" onClick={logout}>
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Iniciar sesión</Link>
              <Link to="/register">Crear cuenta</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
