import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, LogOut, Search, BookOpen, Film, Gamepad2, Tv, ArrowUpRight } from 'lucide-react';
import { api } from '../../lib/api';
import { normalize } from '../../lib/search';
import { useAuth } from '../../context/AuthContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import ApiState from '../../components/ApiState';
const categories = {
  BOOK: ['Libros', BookOpen],
  MOVIE: ['Películas', Film],
  GAME: ['Juegos', Gamepad2],
  SERIES: ['Series', Tv],
};
export default function Dashboard({ onChanged }) {
  const { admin, logout } = useAuth();
  const [items, setItems] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const [query, setQuery] = useState(''),
    [status, setStatus] = useState('ALL'),
    [message, setMessage] = useState('');
  const [busy, setBusy] = useState(''),
    [deleting, setDeleting] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await api('/admin/content', { admin: true }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const changeStatus = async (item) => {
    setBusy(item.id);
    setMessage('');
    setError('');
    try {
      const updated = await api(`/admin/content/${item.id}/status`, {
        admin: true,
        method: 'PATCH',
        body: JSON.stringify({
          status: item.status === 'DRAFT' ? 'PUBLISHED' : 'DRAFT',
          version: item.version,
        }),
      });
      setItems((p) => p.map((c) => (c.id === item.id ? updated : c)));
      setMessage(
        updated.status === 'PUBLISHED'
          ? 'Reseña publicada correctamente.'
          : 'Reseña guardada como borrador.',
      );
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };
  const remove = async () => {
    setBusy(deleting.id);
    setError('');
    try {
      await api(`/admin/content/${deleting.id}`, {
        admin: true,
        method: 'DELETE',
        body: JSON.stringify({ version: deleting.version }),
      });
      setItems((p) => p.filter((c) => c.id !== deleting.id));
      setDeleting(null);
      setMessage('Reseña eliminada correctamente.');
      onChanged();
    } catch (err) {
      setDeleting(null);
      setError(err.message);
    } finally {
      setBusy('');
    }
  };
  const filtered = items.filter(
    (item) =>
      (status === 'ALL' || item.status === status) &&
      normalize(`${item.title} ${item.genre} ${categories[item.type]?.[0]}`).includes(
        normalize(query),
      ),
  );
  if (loading) return <ApiState loading />;
  return (
    <section className="page-section admin-page">
      <div className="admin-heading">
        <div>
          <span className="eyebrow">ESPACIO EDITORIAL · {admin.name}</span>
          <h1>El próximo descubrimiento.</h1>
          <p>Creá, cuidá y compartí historias que valen el tiempo.</p>
        </div>
        <div className="admin-heading-actions">
          <Link className="secondary" to="/admin/comunidad">
            Comunidad
          </Link>
          <Link className="primary" to="/admin/nueva">
            <Plus size={18} />
            Nueva reseña
          </Link>
          <button className="secondary" onClick={logout}>
            <LogOut size={17} />
            Salir
          </button>
        </div>
      </div>
      <div className="stat-grid">
        {[
          ['Total de reseñas', items.length],
          ['Publicadas', items.filter((c) => c.status === 'PUBLISHED').length],
          ['Borradores', items.filter((c) => c.status === 'DRAFT').length],
        ].map(([label, count]) => (
          <div className="stat-card" key={label}>
            <span>{label}</span>
            <strong>{count}</strong>
          </div>
        ))}
      </div>
      <div className="category-summary">
        {Object.entries(categories).map(([type, [label, Icon]]) => (
          <span key={type}>
            <Icon size={18} />
            {label}
            <strong>{items.filter((c) => c.type === type).length}</strong>
          </span>
        ))}
      </div>
      <div className="admin-toolbar">
        <label className="search">
          <Search size={18} />
          <span className="sr-only">Buscar reseñas en el panel</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar una reseña…"
          />
        </label>
        <label className="genre-filter">
          Estado
          <select
            aria-label="Estado del listado"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="ALL">Todos</option>
            <option value="PUBLISHED">Publicadas</option>
            <option value="DRAFT">Borradores</option>
          </select>
        </label>
      </div>
      {message && (
        <p className="feedback" role="status">
          {message}
        </p>
      )}
      {error && (
        <div className="form-error" role="alert">
          {error}{' '}
          <button className="secondary" onClick={load}>
            Recargar listado
          </button>
        </div>
      )}
      <p className="result-count">{filtered.length} reseñas</p>
      {filtered.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <caption className="sr-only">Reseñas y acciones editoriales</caption>
            <thead>
              <tr>
                <th scope="col">Historia</th>
                <th scope="col">Categoría</th>
                <th scope="col">Estado</th>
                <th scope="col">Puntuación</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="admin-topic">
                      <img
                        src={item.imageUrl || '/covers/placeholder.svg'}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/covers/placeholder.svg';
                        }}
                      />
                      <div>
                        <strong>{item.title}</strong>
                        <small>
                          {item.genre} · {item.year}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>{categories[item.type]?.[0]}</td>
                  <td>
                    <span className={`status-badge ${item.status.toLowerCase()}`}>
                      {item.status === 'PUBLISHED' ? 'Publicada' : 'Borrador'}
                    </span>
                  </td>
                  <td>{item.rating.toFixed(1)} / 10</td>
                  <td>
                    <div className="row-actions">
                      <Link to={`/admin/editar/${item.id}`} aria-label={`Editar ${item.title}`}>
                        Editar
                      </Link>
                      <button
                        disabled={Boolean(busy)}
                        onClick={() => changeStatus(item)}
                        aria-label={`${item.status === 'DRAFT' ? 'Publicar' : 'Pasar a borrador'} ${item.title}`}
                      >
                        {busy === item.id
                          ? 'Procesando…'
                          : item.status === 'DRAFT'
                            ? 'Publicar'
                            : 'A borrador'}
                      </button>
                      <Link
                        to={
                          item.status === 'PUBLISHED'
                            ? `/resena/${item.slug}`
                            : `/admin/ver/${item.id}`
                        }
                        aria-label={`Ver ${item.title}`}
                      >
                        Ver
                        <ArrowUpRight size={13} />
                      </Link>
                      <button
                        className="danger-text"
                        disabled={Boolean(busy)}
                        onClick={() => setDeleting(item)}
                        aria-label={`Eliminar ${item.title}`}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <h2>{items.length ? 'No hay coincidencias' : 'Tu primera reseña empieza acá'}</h2>
          <p>
            {items.length
              ? 'Probá otra búsqueda o estado.'
              : 'Agregá una historia y guardala como borrador o publicala.'}
          </p>
          <Link className="primary" to="/admin/nueva">
            Nueva reseña
          </Link>
        </div>
      )}
      <ConfirmDialog
        item={deleting}
        busy={Boolean(busy)}
        onCancel={() => setDeleting(null)}
        onConfirm={remove}
      />
    </section>
  );
}
