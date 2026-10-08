import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useUser } from '../../context/UserContext';
import { roleLabels, statusLabels } from '../../context/AuthContext';
import { Avatar } from '../Profile';
import ConfirmDialog from '../../components/ConfirmDialog';

const date = (value) => new Date(value).toLocaleDateString('es-AR');
export function UserBadges({ user }) {
  return (
    <span className="user-badges">
      <span className={`role-badge role-${user.role}`}>{roleLabels[user.role]}</span>
      <span className={`status-badge status-${user.status}`}>{statusLabels[user.status]}</span>
    </span>
  );
}
export default function Users() {
  const [q, setQ] = useState(''),
    [role, setRole] = useState(''),
    [status, setStatus] = useState('');
  const [page, setPage] = useState(1),
    [data, setData] = useState(null),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError('');
    const params = new URLSearchParams({ q, page });
    if (role) params.set('role', role);
    if (status) params.set('status', status);
    api(`/admin/users?${params}`, { admin: true, signal: controller.signal })
      .then(setData)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      });
    return () => controller.abort();
  }, [q, role, status, page, revision]);
  return (
    <section className="page-section admin-page users-page">
      <Link to="/admin">Volver al panel</Link>
      <span className="eyebrow">ADMINISTRACIÓN · USUARIOS</span>
      <h1>Las personas detrás de las historias.</h1>
      <p>Perfiles, roles y estado de la comunidad.</p>
      <div className="users-filters community-form">
        <label>
          Buscar por usuario o email
          <input
            maxLength={100}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          Rol
          <select
            aria-label="Rol"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los roles</option>
            {Object.entries(roleLabels).map(([k, v]) => (
              <option value={k} key={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estado
          <select
            aria-label="Estado"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los estados</option>
            {Object.entries(statusLabels).map(([k, v]) => (
              <option value={k} key={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <div>
          <p role="alert" className="form-error">
            {error}
          </p>
          <button className="secondary" onClick={() => setRevision((v) => v + 1)}>
            Intentar nuevamente
          </button>
        </div>
      )}
      {!data && !error && <p role="status">Cargando usuarios…</p>}
      {data && <p role="status">{data.total} usuarios</p>}
      {data?.items.map((u) => (
        <article className="community-card user-admin-card" key={u.id}>
          <div className="user-admin-heading">
            <Avatar user={u} />
            <div>
              <h2>
                <Link to={`/admin/users/${u.id}`}>{u.username}</Link>
              </h2>
              <p>{u.email}</p>
            </div>
            <UserBadges user={u} />
          </div>
          <p>
            Alta: {date(u.createdAt)} · Actualización: {date(u.updatedAt)}
          </p>
          <p>
            {u._count.reviews} reseñas · {u._count.replies} respuestas · {u._count.reports} reportes
            · {u._count.editorialContent} publicaciones editoriales
          </p>
          <Link className="secondary" to={`/admin/users/${u.id}`}>
            Ver ficha
          </Link>
        </article>
      ))}
      {data?.total === 0 && <p>No hay usuarios para estos filtros.</p>}
      <div className="community-actions">
        <button
          className="secondary"
          disabled={page === 1 || !data}
          onClick={() => setPage(page - 1)}
        >
          Anteriores
        </button>
        <span>Página {page}</span>
        <button
          className="secondary"
          disabled={!data || page * 20 >= data.total}
          onClick={() => setPage(page + 1)}
        >
          Siguientes
        </button>
      </div>
    </section>
  );
}
export function UserAdminDetail() {
  const { id } = useParams(),
    { user: actor } = useUser();
  const [user, setUser] = useState(null),
    [role, setRole] = useState('USER'),
    [error, setError] = useState('');
  const [busy, setBusy] = useState(false),
    [pending, setPending] = useState(null),
    [notice, setNotice] = useState('');
  const load = useCallback(
    async (signal) => {
      const result = await api(`/admin/users/${id}`, { admin: true, signal });
      setUser(result);
      setRole(result.role);
    },
    [id],
  );
  useEffect(() => {
    const controller = new AbortController();
    setUser(null);
    setError('');
    setNotice('');
    setPending(null);
    load(controller.signal).catch((e) => {
      if (e.name !== 'AbortError') setError(e.message);
    });
    return () => controller.abort();
  }, [load]);
  const change = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api(`/admin/users/${id}/${pending.field}`, {
        admin: true,
        method: 'PATCH',
        body: JSON.stringify({ [pending.field]: pending.value }),
      });
      await load();
      setNotice('Cuenta actualizada. La acción quedó registrada.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      setPending(null);
    }
  };
  return (
    <section className="page-section admin-page users-page">
      <Link to="/admin/users">Volver a usuarios</Link>
      <span className="eyebrow">ADMINISTRACIÓN · FICHA DE USUARIO</span>
      {!user && !error && <p role="status">Cargando perfil…</p>}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {user && (
        <>
          <div className="community-card">
            <div className="user-admin-heading">
              <Avatar user={user} />
              <div>
                <h1>{user.username}</h1>
                <p>{user.email}</p>
              </div>
              <UserBadges user={user} />
            </div>
            <p className="community-body">{user.bio || 'Sin biografía.'}</p>
            <p>
              Alta: {date(user.createdAt)} · Última actualización: {date(user.updatedAt)}
            </p>
            <Link to={`/profile/${user.username}`}>Ver perfil público</Link>
          </div>
          {user.canManage ? (
            <div className="community-card community-form">
              <h2>Acciones administrativas</h2>
              <label>
                Rol del usuario
                <select
                  aria-label="Rol del usuario"
                  disabled={busy}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  {Object.entries(roleLabels)
                    .filter(([k]) => actor.role === 'SUPER_ADMIN' || k !== 'SUPER_ADMIN')
                    .map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                </select>
              </label>
              <button
                className="secondary"
                disabled={busy || role === user.role}
                onClick={() => setPending({ field: 'role', value: role })}
              >
                Cambiar rol
              </button>
              <div className="community-actions">
                {Object.entries({
                  SUSPENDED: 'Suspender usuario',
                  BANNED: 'Banear usuario',
                  ACTIVE: 'Reactivar usuario',
                })
                  .filter(([s]) => s !== user.status)
                  .map(([s, label]) => (
                    <button
                      key={s}
                      className={s === 'BANNED' ? 'danger' : 'secondary'}
                      disabled={busy}
                      onClick={() => setPending({ field: 'status', value: s })}
                    >
                      {label}
                    </button>
                  ))}
              </div>
            </div>
          ) : (
            <p>Tu rol no permite modificar esta cuenta o se trata de tu propia cuenta.</p>
          )}
          <h2>Actividad</h2>
          <p>
            {user._count.reviews} reseñas · {user._count.replies} respuestas · {user._count.reports}{' '}
            reportes enviados · {user._count.editorialContent} publicaciones editoriales
          </p>
          <h3>Reseñas recientes</h3>
          {user.reviews.map((r) => (
            <article className="community-card" key={r.id}>
              <Link to={`/resena/${r.content.slug}`}>{r.content.title}</Link>
              <p className="community-body">{r.body}</p>
              <small>
                {r.status} · {date(r.createdAt)}
              </small>
            </article>
          ))}
          <h3>Respuestas recientes</h3>
          {user.replies.map((r) => (
            <article className="community-card" key={r.id}>
              <p className="community-body">{r.body}</p>
              <small>
                {r.status} · {date(r.createdAt)}
              </small>
            </article>
          ))}
          <h3>Reportes enviados</h3>
          {user.reports.map((r) => (
            <p key={r.id}>
              {r.reason} · {r.status} · {date(r.createdAt)} {r.description}
            </p>
          ))}
          <h3>Contenido editorial creado</h3>
          {user.editorialContent.map((c) => (
            <p key={c.id}>
              <Link to={`/admin/editar/${c.id}`}>{c.title}</Link> · {c.status}
            </p>
          ))}
          <h3>Historial administrativo</h3>
          {user.auditTargets.map((a) => (
            <p key={a.id}>
              {a.actor.username} · {a.action} · {date(a.createdAt)} · {a.metadata.previous} →{' '}
              {a.metadata.next}
            </p>
          ))}
          <p>Se muestran las últimas 20 publicaciones y los últimos 30 eventos administrativos.</p>
        </>
      )}
      <ConfirmDialog
        item={pending}
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={change}
        eyebrow="ADMINISTRACIÓN DE CUENTAS"
        title={
          pending?.field === 'role'
            ? `¿Cambiar el rol de ${user?.username} a ${roleLabels[pending.value]}?`
            : `¿${pending?.value === 'BANNED' ? 'Banear' : pending?.value === 'SUSPENDED' ? 'Suspender' : 'Reactivar'} a ${user?.username}?`
        }
        description={
          pending?.value === 'BANNED'
            ? 'El usuario perderá la posibilidad de publicar contenido e iniciar acciones de comunidad mientras permanezca baneado.'
            : pending?.value === 'SUSPENDED'
              ? 'El usuario no podrá publicar ni realizar acciones de comunidad hasta que se reactive su cuenta.'
              : 'Se actualizarán sus permisos. La acción y los estados anterior y nuevo quedarán registrados.'
        }
        confirmLabel="Confirmar cambio"
        cancelLabel="Cancelar"
      />
    </section>
  );
}
