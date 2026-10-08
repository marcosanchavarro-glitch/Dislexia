import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
export default function UserLogin({ register = false }) {
  const { authenticate } = useUser(),
    navigate = useNavigate(),
    location = useLocation();
  const [values, setValues] = useState({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    }),
    [error, setError] = useState(''),
    [fields, setFields] = useState({}),
    [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setFields({});
    if (register && values.password !== values.confirmPassword) {
      setFields({ confirmPassword: ['Las contraseñas no coinciden.'] });
      return;
    }
    setBusy(true);
    try {
      await authenticate(
        register ? 'register' : 'login',
        register ? values : { email: values.email, password: values.password },
      );
      const next = location.state?.from;
      navigate(
        typeof next === 'string' &&
          (next.startsWith('/resena/') || next === '/admin' || next.startsWith('/admin/'))
          ? next
          : '/',
      );
    } catch (err) {
      setError(err.message);
      setFields(err.fields || {});
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="page-section user-auth">
      <span className="eyebrow">ENTRE LÍNEAS · COMUNIDAD</span>
      <h1>{register ? 'Creá tu cuenta' : 'Volvé a la conversación'}</h1>
      <form className="community-form" onSubmit={submit}>
        {(register
          ? ['username', 'email', 'password', 'confirmPassword']
          : ['email', 'password']
        ).map((key) => (
          <label key={key}>
            {
              {
                username: 'Nombre de usuario',
                email: 'Email',
                password: 'Contraseña',
                confirmPassword: 'Repetir contraseña',
              }[key]
            }
            <input
              required
              name={key}
              type={key.includes('assword') ? 'password' : key === 'email' ? 'email' : 'text'}
              minLength={key === 'password' && register ? 12 : undefined}
              maxLength={key === 'username' ? 30 : key.includes('assword') ? 72 : 254}
              pattern={key === 'username' ? '[a-zA-Z0-9_]{3,30}' : undefined}
              autoComplete={
                key === 'password'
                  ? register
                    ? 'new-password'
                    : 'current-password'
                  : key === 'confirmPassword'
                    ? 'new-password'
                    : key
              }
              value={values[key]}
              onChange={(e) => setValues({ ...values, [key]: e.target.value })}
              aria-invalid={!!fields[key]}
              aria-describedby={fields[key] ? `${key}-error` : undefined}
            />
            {fields[key] && (
              <small id={`${key}-error`} className="form-error">
                {fields[key].join(' ')}
              </small>
            )}
          </label>
        ))}
        {register && <small>Contraseña de al menos 12 caracteres.</small>}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy}>
          {busy ? 'Procesando…' : register ? 'Crear cuenta' : 'Iniciar sesión'}
        </button>
      </form>
      <p>
        <Link to={register ? '/login' : '/register'} state={location.state}>
          {register ? 'Ya tengo cuenta' : 'Crear una cuenta'}
        </Link>
      </p>
    </section>
  );
}
