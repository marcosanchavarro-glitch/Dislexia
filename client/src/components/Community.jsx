import { useCallback, useEffect, useRef, useState, useId } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { useUser } from '../context/UserContext';
import { Avatar } from '../pages/Profile';
export function Spoiler({ item }) {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  return item.containsSpoilers && !visible ? (
    <div className="spoiler">
      <p>Esta reseña contiene spoilers.</p>
      <button className="secondary" onClick={() => setVisible(true)}>
        Mostrar reseña
      </button>
    </div>
  ) : (
    <>
      <h3>{item.title}</h3>
      <p className="community-body">
        {!expanded && item.body.length > 600 ? `${item.body.slice(0, 600)}…` : item.body}
      </p>
      {item.body.length > 600 && (
        <button
          className="secondary"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Leer menos' : 'Leer más'}
        </button>
      )}
    </>
  );
}
function WritingForm({ initial, reply = false, onSave, onCancel }) {
  const formId = useId();
  const [data, setData] = useState({
      rating: initial?.rating || 5,
      title: initial?.title || '',
      body: initial?.body || '',
      containsSpoilers: initial?.containsSpoilers || false,
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [fields, setFields] = useState({});
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setFields({});
    try {
      await onSave(reply ? { body: data.body, containsSpoilers: data.containsSpoilers } : data);
    } catch (err) {
      setError(err.message);
      setFields(err.fields || {});
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="community-form" onSubmit={submit}>
      {!reply && (
        <>
          <label>
            Puntuación
            <select
              value={data.rating}
              onChange={(e) => setData({ ...data, rating: Number(e.target.value) })}
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {'★'.repeat(n)} · {n} de 5
                </option>
              ))}
            </select>
          </label>
          <label>
            Título opcional
            <input
              aria-label="Título opcional"
              aria-describedby={`${formId}-title-count`}
              maxLength={120}
              value={data.title}
              onChange={(e) => setData({ ...data, title: e.target.value })}
            />
            <small id={`${formId}-title-count`}>{data.title.length} / 120 caracteres</small>
          </label>
        </>
      )}
      <label>
        {reply ? 'Respuesta' : 'Reseña'}
        <textarea
          aria-label={reply ? 'Respuesta' : 'Reseña'}
          aria-describedby={`${formId}-body-count`}
          aria-invalid={!!fields.body}
          required
          maxLength={5000}
          value={data.body}
          onChange={(e) => setData({ ...data, body: e.target.value })}
        />
        <small id={`${formId}-body-count`}>{data.body.length} / 5000 caracteres</small>
        {fields.body && <small className="form-error">{fields.body.join(' ')}</small>}
      </label>
      <label className="community-check">
        <input
          type="checkbox"
          checked={data.containsSpoilers}
          onChange={(e) => setData({ ...data, containsSpoilers: e.target.checked })}
        />
        Contiene spoilers
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error} {Object.values(fields).flat().join(' ')}
        </p>
      )}
      <div className="community-actions">
        <button className="primary" disabled={busy}>
          {busy
            ? 'Guardando…'
            : initial
              ? 'Guardar cambios'
              : reply
                ? 'Publicar respuesta'
                : 'Publicar reseña'}
        </button>
        {onCancel && (
          <button type="button" className="secondary" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
function ReportDialog({ target, onClose }) {
  const ref = useRef(),
    [reason, setReason] = useState('SPAM'),
    [description, setDescription] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    ref.current.showModal();
  }, []);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/reports', {
        user: true,
        method: 'POST',
        body: JSON.stringify({ ...target, reason, description }),
      });
      onClose('Reporte enviado. Gracias por cuidar la comunidad.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <dialog
      ref={ref}
      className="access-dialog"
      aria-labelledby="report-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <h2 id="report-title">Reportar publicación</h2>
      <form className="community-form" onSubmit={submit}>
        <label>
          Motivo
          <select
            aria-label="Motivo"
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            {Object.entries({
              SPAM: 'Spam',
              OFFENSIVE: 'Contenido ofensivo',
              SPOILERS: 'Spoilers sin advertencia',
              OFF_TOPIC: 'Fuera de tema',
              OTHER: 'Otro',
            }).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        {reason === 'OTHER' && (
          <label>
            Explicación breve
            <textarea
              required
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
        )}
        {error && <p role="alert">{error}</p>}
        <div className="community-actions">
          <button className="primary" disabled={busy}>
            Enviar reporte
          </button>
          <button type="button" className="secondary" disabled={busy} onClick={() => onClose()}>
            Cancelar
          </button>
        </div>
      </form>
    </dialog>
  );
}
function DeleteDialog({ onConfirm, onClose }) {
  const ref = useRef(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    ref.current.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="access-dialog"
      aria-labelledby="community-delete"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <h2 id="community-delete">¿Eliminar tu publicación?</h2>
      <p>Dejará de aparecer en la comunidad. Se conserva el historial de moderación.</p>
      {error && <p role="alert">{error}</p>}
      <div className="community-actions">
        <button autoFocus className="secondary" disabled={busy} onClick={onClose}>
          Cancelar
        </button>
        <button
          className="danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
              onClose();
            } catch (e) {
              setError(e.message);
              setBusy(false);
            }
          }}
        >
          Eliminar publicación
        </button>
      </div>
    </dialog>
  );
}
function ReviewCard({ item, onChanged, onReport }) {
  const { user } = useUser(),
    active = user?.status === 'ACTIVE';
  const [editing, setEditing] = useState(false),
    [open, setOpen] = useState(false),
    [replies, setReplies] = useState([]),
    [replyPage, setReplyPage] = useState(1),
    [replyTotal, setReplyTotal] = useState(0),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [editReply, setEditReply] = useState(null),
    [replyFormVersion, setReplyFormVersion] = useState(0),
    [remove, setRemove] = useState(null);
  const loadReplies = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const d = await api(`/reviews/${item.id}/replies?page=${page}`);
      setReplies(d.items);
      setReplyTotal(d.total);
      setReplyPage(page);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  const mutate = async (path, method, data) => {
    await api(path, { user: true, method, ...(data ? { body: JSON.stringify(data) } : {}) });
    await onChanged();
  };
  return (
    <article className="community-card">
      <div className="community-author">
        <Avatar user={item.user} />
        <div>
          <Link to={`/profile/${item.user.username}`}>{item.user.username}</Link>
          <small>
            <time dateTime={item.createdAt}>
              {new Date(item.createdAt).toLocaleDateString('es-AR')}
            </time>
          </small>
        </div>
        <span className="community-stars" aria-label={`${item.rating} de 5 estrellas`}>
          {'★'.repeat(item.rating)} <small>{item.rating} / 5</small>
        </span>
      </div>
      {editing ? (
        <WritingForm
          initial={item}
          onCancel={() => setEditing(false)}
          onSave={async (d) => {
            await mutate(`/reviews/${item.id}`, 'PUT', d);
            setEditing(false);
          }}
        />
      ) : (
        <Spoiler item={item} />
      )}
      <div className="community-actions">
        <button
          className="secondary"
          disabled={!active || busy}
          aria-pressed={item.helpfulByMe}
          onClick={async () => {
            setBusy(true);
            try {
              await mutate(`/reviews/${item.id}/helpful`, item.helpfulByMe ? 'DELETE' : 'POST');
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Útil {item._count.helpful}
        </button>
        <button
          className="secondary"
          aria-expanded={open}
          onClick={() => {
            setOpen(!open);
            if (!open) void loadReplies();
          }}
        >
          Ver {item._count.replies} {item._count.replies === 1 ? 'respuesta' : 'respuestas'}
        </button>
        {active && (
          <>
            <button
              className="secondary"
              onClick={() => {
                setOpen(true);
                void loadReplies();
              }}
            >
              Responder
            </button>
            <button className="secondary" onClick={() => onReport({ reviewId: item.id })}>
              Reportar
            </button>
          </>
        )}
        {active && user.id === item.userId && (
          <>
            <button className="secondary" onClick={() => setEditing(true)}>
              Editar
            </button>
            <button
              className="secondary"
              onClick={() => setRemove({ path: `/reviews/${item.id}` })}
            >
              Eliminar
            </button>
          </>
        )}
      </div>
      <small>
        {item._count.helpful}{' '}
        {item._count.helpful === 1 ? 'persona encontró' : 'personas encontraron'} útil esta reseña.
      </small>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {open && (
        <section className="community-replies" aria-label="Respuestas">
          {loading && <p role="status">Cargando respuestas…</p>}
          {!loading && !replies.length && <p>Todavía no hay respuestas.</p>}
          {replies.map((r) => (
            <article className="community-reply" key={r.id}>
              <div className="community-author">
                <Avatar user={r.user} />
                <Link to={`/profile/${r.user.username}`}>{r.user.username}</Link>
                <small>{new Date(r.createdAt).toLocaleDateString('es-AR')}</small>
              </div>
              {editReply === r.id ? (
                <WritingForm
                  reply
                  initial={r}
                  onCancel={() => setEditReply(null)}
                  onSave={async (d) => {
                    await mutate(`/replies/${r.id}`, 'PUT', d);
                    await loadReplies(replyPage);
                    setEditReply(null);
                  }}
                />
              ) : (
                <Spoiler item={r} />
              )}
              <div className="community-actions">
                {active && (
                  <button className="secondary" onClick={() => onReport({ replyId: r.id })}>
                    Reportar respuesta
                  </button>
                )}
                {active && r.userId === user.id && (
                  <>
                    <button className="secondary" onClick={() => setEditReply(r.id)}>
                      Editar respuesta
                    </button>
                    <button
                      className="secondary"
                      onClick={() => setRemove({ path: `/replies/${r.id}`, reply: true })}
                    >
                      Eliminar respuesta
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
          <div className="community-actions">
            <button
              disabled={replyPage === 1 || loading}
              onClick={() => loadReplies(replyPage - 1)}
            >
              Respuestas anteriores
            </button>
            <button
              disabled={replyPage * 20 >= replyTotal || loading}
              onClick={() => loadReplies(replyPage + 1)}
            >
              Más respuestas
            </button>
          </div>
          {active && (
            <WritingForm
              key={replyFormVersion}
              reply
              onSave={async (d) => {
                await mutate(`/reviews/${item.id}/replies`, 'POST', d);
                await loadReplies();
                setReplyFormVersion((v) => v + 1);
              }}
            />
          )}
        </section>
      )}
      {remove && (
        <DeleteDialog
          onClose={() => setRemove(null)}
          onConfirm={async () => {
            await mutate(remove.path, 'DELETE');
            if (remove.reply) await loadReplies(replyPage);
          }}
        />
      )}
    </article>
  );
}
export default function Community({ contentId }) {
  const { user, loading: sessionLoading } = useUser(),
    location = useLocation();
  const [data, setData] = useState(null),
    [order, setOrder] = useState('recent'),
    [rating, setRating] = useState(''),
    [page, setPage] = useState(1),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [report, setReport] = useState(null),
    [notice, setNotice] = useState(''),
    [formVersion, setFormVersion] = useState(0);
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(
        await api(
          `/content/${contentId}/reviews?order=${order}&page=${page}${rating ? `&rating=${rating}` : ''}`,
          { user: !!user },
        ),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [contentId, order, rating, page, user]);
  useEffect(() => {
    if (!sessionLoading) void load();
  }, [load, sessionLoading]);
  return (
    <section className="community-section" aria-labelledby="community-title">
      <span className="eyebrow">OTRAS MIRADAS, NUEVAS CONVERSACIONES</span>
      <h2 id="community-title">La comunidad opina</h2>
      {data && (
        <p className="community-summary">
          {data.average === null ? 'Sin puntuaciones' : `${data.average.toFixed(1)} / 5 ★`} ·{' '}
          {data.count} {data.count === 1 ? 'reseña' : 'reseñas'}
        </p>
      )}
      {!user ? (
        <div className="community-card">
          <p>¿Ya viste/leíste/jugaste esto? Iniciá sesión para compartir tu opinión.</p>
          <Link className="primary" to="/login" state={{ from: location.pathname }}>
            Iniciar sesión
          </Link>
        </div>
      ) : user.status !== 'ACTIVE' ? (
        <p role="status">
          Tu cuenta está {user.status === 'SUSPENDED' ? 'suspendida' : 'bloqueada'}. Podés consultar
          el contenido, pero no participar en la comunidad.
        </p>
      ) : data && !data.mine ? (
        <WritingForm
          key={formVersion}
          onSave={async (d) => {
            await api(`/content/${contentId}/reviews`, {
              user: true,
              method: 'POST',
              body: JSON.stringify(d),
            });
            setNotice('Reseña publicada.');
            setFormVersion((v) => v + 1);
            await load();
          }}
        />
      ) : (
        data?.mine && (
          <p>
            Ya tenés una reseña para este contenido.
            {data.mine.status === 'PUBLISHED'
              ? ' Podés editarla desde su tarjeta.'
              : ' Está moderada o eliminada; no podés crear otra.'}
          </p>
        )
      )}
      <div className="community-actions">
        <label>
          Ordenar por
          <select
            value={order}
            onChange={(e) => {
              setOrder(e.target.value);
              setPage(1);
            }}
          >
            {Object.entries({
              recent: 'Más recientes',
              rating: 'Mejor puntuadas',
              helpful: 'Más útiles',
              oldest: 'Más antiguas',
            }).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Puntuación
          <select
            value={rating}
            onChange={(e) => {
              setRating(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todas</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} estrellas
              </option>
            ))}
          </select>
        </label>
      </div>
      {notice && (
        <p role="status" className="feedback">
          {notice}
        </p>
      )}
      {loading && <p role="status">Cargando comunidad…</p>}
      {error && (
        <p className="form-error" role="alert">
          {error} <button onClick={load}>Reintentar</button>
        </p>
      )}
      {!loading && data && !data.items.length && (
        <p>
          {data.count
            ? 'No hay reseñas con esa puntuación.'
            : 'Todavía nadie compartió su opinión. Sé el primero en dejar una reseña.'}
        </p>
      )}
      {data?.items.map((item) => (
        <ReviewCard key={item.id} item={item} onChanged={load} onReport={setReport} />
      ))}
      <div className="community-actions">
        <button
          className="secondary"
          disabled={page === 1 || loading}
          onClick={() => setPage(page - 1)}
        >
          Anteriores
        </button>
        <span>Página {page}</span>
        <button
          className="secondary"
          disabled={!data || page * 10 >= data.total || loading}
          onClick={() => setPage(page + 1)}
        >
          Siguientes
        </button>
      </div>
      {report && (
        <ReportDialog
          target={report}
          onClose={(message) => {
            setReport(null);
            if (message) setNotice(message);
          }}
        />
      )}
    </section>
  );
}
