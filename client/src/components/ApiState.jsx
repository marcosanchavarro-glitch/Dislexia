import { Link } from 'react-router-dom';
export default function ApiState({ loading, error, reload }) {
  return (
    <div
      className={`empty-state api-state${loading ? ' api-state-loading' : ''}`}
      aria-busy={loading}
    >
      {loading ? (
        <p role="status">Cargando historias…</p>
      ) : (
        <>
          <h2>No pudimos cargar esta sección</h2>
          <p role="alert">{error}</p>
          <button className="primary" onClick={reload}>
            Intentar nuevamente
          </button>{' '}
          <Link className="secondary" to="/explorar">
            Ir al catálogo
          </Link>
        </>
      )}
    </div>
  );
}
