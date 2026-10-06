import { useEffect, useRef, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import Header from './components/Header';
import AccessibilityPanel from './components/AccessibilityPanel';
import Snackbar from './components/Snackbar';
import ApiState from './components/ApiState';
import Home from './pages/Home';
import Explore from './pages/Explore';
import Detail from './pages/Detail';
import Watchlist from './pages/Watchlist';
import Login from './pages/admin/Login';
import Dashboard from './pages/admin/Dashboard';
import Editor from './pages/admin/Editor';
import Preview from './pages/admin/Preview';
import UserLogin from './pages/UserLogin';
import Profile from './pages/Profile';
import Moderation from './pages/admin/Moderation';
import { useWatchlist } from './hooks/useWatchlist';
import { useAccessibility } from './hooks/useAccessibility';
import { useContent } from './hooks/useContent';
import { AuthProvider, ProtectedRoute } from './context/AuthContext';
export default function App() {
  const list = useWatchlist(),
    settings = useAccessibility(),
    catalog = useContent();
  const [query, setQuery] = useState(''),
    [accessOpen, setAccessOpen] = useState(false),
    [notice, setNotice] = useState(null);
  const timer = useRef(),
    main = useRef();
  const navigate = useNavigate(),
    location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    if (document.activeElement?.id !== 'global-search') main.current?.focus();
  }, [location.pathname]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const closeNotice = () => {
    clearTimeout(timer.current);
    setNotice(null);
  };
  const toggle = (id) => {
    clearTimeout(timer.current);
    if (list.ids.includes(id)) {
      const index = list.ids.indexOf(id);
      list.remove(id);
      setNotice({ message: 'Elemento eliminado de tu lista', undo: () => list.restore(id, index) });
    } else {
      list.add(id);
      setNotice({ message: 'Historia agregada a tu lista' });
    }
    timer.current = setTimeout(() => setNotice(null), 5000);
  };
  const search = (value) => {
    setQuery(value);
    if (location.pathname !== '/explorar') navigate('/explorar');
  };
  const props = { ids: list.ids, onToggle: toggle, content: catalog.items };
  const publicPage = (page) =>
    catalog.loading || catalog.error ? (
      <ApiState loading={catalog.loading} error={catalog.error} reload={catalog.reload} />
    ) : (
      page
    );
  return (
    <AuthProvider>
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>
      <Header
        query={query}
        onSearch={search}
        count={list.ids.length}
        onAccessibility={() => setAccessOpen(true)}
      />
      <main id="main" ref={main} tabIndex={-1}>
        {list.error && (
          <p role="status" className="storage-warning">
            {list.error}
          </p>
        )}
        <Routes>
          <Route path="/" element={publicPage(<Home {...props} />)} />
          <Route
            path="/explorar"
            element={publicPage(<Explore {...props} query={query} onSearch={setQuery} />)}
          />
          <Route path="/mi-lista" element={publicPage(<Watchlist {...props} />)} />
          <Route path="/resena/:slug" element={<Detail {...props} />} />
          <Route path="/admin/login" element={<Login />} />
          <Route path="/login" element={<UserLogin />} />
          <Route path="/register" element={<UserLogin register />} />
          <Route path="/profile/:username" element={<Profile />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/admin/comunidad" element={<Moderation />} />
            <Route path="/admin" element={<Dashboard onChanged={catalog.reload} />} />
            <Route path="/admin/nueva" element={<Editor onChanged={catalog.reload} />} />
            <Route path="/admin/editar/:id" element={<Editor onChanged={catalog.reload} />} />
            <Route path="/admin/ver/:id" element={<Preview />} />
          </Route>
          <Route
            path="*"
            element={
              <div className="empty-state">
                <h1>No encontramos esta página</h1>
                <Link to="/">Volver al inicio</Link>
              </div>
            }
          />
        </Routes>
      </main>
      <footer>
        <Link className="footer-brand" to="/">
          entre líneas.
        </Link>
        <span>Buenas historias. Decisiones a tu manera.</span>
        <Link to="/admin">Administración</Link>
        <small>Proyecto de Ingeniería de Software · 2026</small>
      </footer>
      <AccessibilityPanel
        open={accessOpen}
        onClose={() => setAccessOpen(false)}
        settings={settings}
      />
      {notice && (
        <Snackbar
          message={notice.message}
          onClose={closeNotice}
          onUndo={
            notice.undo
              ? () => {
                  notice.undo();
                  closeNotice();
                }
              : null
          }
        />
      )}
    </AuthProvider>
  );
}
