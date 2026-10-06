import { useCallback, useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
export default function Moderation() {
  const requestVersion = useRef(0);
  const [section, setSection] = useState('reports'),
    [query, setQuery] = useState(''),
    [page, setPage] = useState(1),
    [data, setData] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    const current = ++requestVersion.current;
    setError('');
    try {
      const result = await api(
        `/admin/community/${section}?q=${encodeURIComponent(query)}&page=${page}`,
        {
          admin: true,
        },
      );
      if (current === requestVersion.current) setData(result);
    } catch (e) {
      if (current === requestVersion.current) setError(e.message);
    }
  }, [section, query, page]);
  useEffect(() => {
    setData(null);
    void load();
    return () => {
      requestVersion.current++;
    };
  }, [load]);
  const states =
    section === 'users'
      ? { ACTIVE: 'Restaurar usuario', SUSPENDED: 'Suspender', BANNED: 'Bloquear' }
      : section === 'reports'
        ? {
            REVIEWED: 'Revisado',
            DISMISSED: 'Descartar',
            ACTION_TAKEN: 'Acción tomada',
            PENDING: 'Pendiente',
          }
        : { PUBLISHED: 'Restaurar', HIDDEN: 'Ocultar', DELETED: 'Eliminar lógicamente' };
  const change = async (item, status) => {
    setBusy(true);
    try {
      await api(`/admin/community/${section}/${item.id}`, {
        admin: true,
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setNotice('Estado actualizado.');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="page-section admin-page">
      <Link to="/admin">Volver al catálogo editorial</Link>
      <span className="eyebrow">ADMINISTRACIÓN · COMUNIDAD</span>
      <h1>Cuidemos la conversación.</h1>
      <nav className="community-actions" aria-label="Moderación">
        {Object.entries({
          reviews: 'Reseñas',
          replies: 'Respuestas',
          reports: 'Reportes',
          users: 'Usuarios',
        }).map(([k, v]) => (
          <button
            className="secondary"
            disabled={busy}
            key={k}
            aria-pressed={section === k}
            onClick={() => {
              setSection(k);
              setPage(1);
              setQuery('');
            }}
          >
            {v}
          </button>
        ))}
      </nav>
      <label className="community-form">
        Buscar{' '}
        {section === 'users'
          ? 'usuario'
          : section === 'reports'
            ? 'en la explicación de reportes'
            : 'en el texto'}
        <input
          disabled={busy}
          value={query}
          maxLength={100}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
      </label>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {!data && !error && <p role="status">Cargando…</p>}
      {data && !data.items.length && <p>No hay resultados.</p>}
      {data?.items.map((item) => (
        <article className="community-card" key={item.id}>
          <h2>{item.username || item.user?.username || item.reporter?.username}</h2>
          {item.content && <Link to={`/resena/${item.content.slug}`}>{item.content.title}</Link>}
          <p>{item.title}</p>
          <p className="community-body">{item.body || item.bio || item.description}</p>
          {section === 'reports' && (
            <>
              <p>Motivo: {item.reason}</p>
              <p>
                Publicación reportada: {item.review?.body || item.reply?.body || 'No disponible'}
              </p>
              {item.reviewId && (
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await api(`/admin/community/reviews/${item.reviewId}`, {
                        admin: true,
                        method: 'PATCH',
                        body: JSON.stringify({ status: 'HIDDEN' }),
                      });
                      await change(item, 'ACTION_TAKEN');
                    } catch (e) {
                      setError(e.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Ocultar reseña reportada
                </button>
              )}
              {item.replyId && (
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await api(`/admin/community/replies/${item.replyId}`, {
                        admin: true,
                        method: 'PATCH',
                        body: JSON.stringify({ status: 'HIDDEN' }),
                      });
                      await change(item, 'ACTION_TAKEN');
                    } catch (e) {
                      setError(e.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Ocultar respuesta reportada
                </button>
              )}
            </>
          )}
          <p>Estado: {item.status}</p>
          <div className="community-actions">
            {Object.entries(states).map(([status, label]) => (
              <button
                className="secondary"
                key={status}
                disabled={busy || status === item.status}
                onClick={() => change(item, status)}
              >
                {label}
              </button>
            ))}
          </div>
        </article>
      ))}
      <div className="community-actions">
        <button disabled={page === 1 || busy} onClick={() => setPage(page - 1)}>
          Anteriores
        </button>
        <span>Página {page}</span>
        <button
          disabled={!data || page * 20 >= data.total || busy}
          onClick={() => setPage(page + 1)}
        >
          Siguientes
        </button>
      </div>
    </section>
  );
}
