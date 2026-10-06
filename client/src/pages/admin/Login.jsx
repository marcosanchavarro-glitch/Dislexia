import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
export default function Login() {
  const { admin, login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (admin) return <Navigate to="/admin" replace />;
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="login-shell">
      <div className="login-card">
        <span className="brand-icon">
          <LockKeyhole size={22} />
        </span>
        <span className="eyebrow">ESPACIO EDITORIAL</span>
        <h1>Historias bien cuidadas.</h1>
        <p>Ingresá para administrar las reseñas de Entre líneas.</p>
        <form onSubmit={submit} aria-busy={busy}>
          <label className="setting" htmlFor="admin-email">
            Email
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="setting" htmlFor="admin-password">
            Contraseña
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy || loading}>
            {busy ? 'Ingresando…' : 'Ingresar al panel'}
          </button>
        </form>
        <p className="muted">
          Acceso exclusivo para administradores. Las cuentas se crean mediante el seed del servidor.
        </p>
      </div>
    </section>
  );
}
