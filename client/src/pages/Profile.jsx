import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useUser } from '../context/UserContext';
import ApiState from '../components/ApiState';
export function Avatar({ user }) {
  return user.avatarUrl ? (
    <img className="user-avatar" src={user.avatarUrl} alt={`Avatar de ${user.username}`} />
  ) : (
    <span className="user-avatar" aria-hidden="true">
      {user.username?.slice(0, 1).toUpperCase()}
    </span>
  );
}
export default function Profile() {
  const navigate = useNavigate();
  const { username } = useParams(),
    { user, setUser } = useUser();
  const [profile, setProfile] = useState(null),
    [error, setError] = useState(''),
    [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false),
    [fields, setFields] = useState({}),
    [notice, setNotice] = useState('');
  useEffect(() => {
    setProfile(null);
    setError('');
    api(`/users/${encodeURIComponent(username)}`)
      .then(setProfile)
      .catch((e) => setError(e.message));
  }, [username]);
  const submit = async (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (!data.get('image')?.size) data.delete('image');
    setBusy(true);
    setError('');
    setFields({});
    try {
      const updated = await api('/users/me', { user: true, method: 'PUT', body: data });
      setUser(updated);
      setEditing(false);
      setNotice('Perfil actualizado.');
      setProfile((p) => ({ ...p, ...updated }));
      if (updated.username !== username)
        navigate(`/profile/${updated.username}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setFields(err.fields || {});
    } finally {
      setBusy(false);
    }
  };
  if (!profile) return <ApiState loading={!error} error={error} />;
  return (
    <section className="page-section">
      <div className="community-author">
        <Avatar user={profile} />
        <div>
          <h1>{profile.username}</h1>
          <p>En la comunidad desde {new Date(profile.createdAt).toLocaleDateString('es-AR')}</p>
        </div>
      </div>
      <p>{profile.bio}</p>
      <p>
        {profile.reviewCount} reseñas · {profile.helpfulCount} votos Útil recibidos
      </p>
      {user?.id === profile.id && (
        <button className="secondary" onClick={() => setEditing(!editing)}>
          Editar perfil
        </button>
      )}
      {notice && <p role="status">{notice}</p>}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {editing && (
        <form className="community-form" onSubmit={submit}>
          <label>
            Nombre de usuario
            <input
              name="username"
              required
              minLength={3}
              maxLength={30}
              defaultValue={profile.username}
            />
            {fields.username && <small className="form-error">{fields.username.join(' ')}</small>}
          </label>
          <label>
            Bio
            <textarea name="bio" maxLength={500} defaultValue={profile.bio || ''} />
          </label>
          <label>
            Avatar (JPG, PNG o WebP; máximo 5 MB)
            <input type="file" name="image" accept="image/jpeg,image/png,image/webp" />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar perfil'}
          </button>
        </form>
      )}
      <h2>Sus reseñas</h2>
      {!profile.reviews.length && <p>Todavía no publicó reseñas.</p>}
      {profile.reviews.map((r) => (
        <article className="community-card" key={r.id}>
          <Link to={`/resena/${r.content.slug}`}>{r.content.title}</Link>
          <p>{r.rating} / 5</p>
          <h3>{r.title}</h3>
          {r.containsSpoilers ? (
            <p>Esta reseña contiene spoilers. Abrí el contenido para verla.</p>
          ) : (
            <p>{r.body}</p>
          )}
        </article>
      ))}
    </section>
  );
}
