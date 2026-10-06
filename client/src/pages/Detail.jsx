import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Check, Star } from 'lucide-react';
import { types } from '../data/content';
import { useContentDetail } from '../hooks/useContent';
import ApiState from '../components/ApiState';
export default function Detail({ ids, onToggle }) {
  const { slug } = useParams();
  const { item, loading, error, reload } = useContentDetail(slug);
  if (loading || error) return <ApiState loading={loading} error={error} reload={reload} />;
  if (!item)
    return (
      <section className="empty-state">
        <h1>Esta historia no está en el catálogo</h1>
        <Link className="primary" to="/explorar">
          Volver a explorar
        </Link>
      </section>
    );
  const facts = [
    ['Categoría', types[item.type]],
    ['Género', item.genre],
    ['Año', item.year],
    ['Autor', item.author],
    ['Director', item.director],
    ['Desarrollador', item.developer],
    ['Creador', item.creator],
    ['Páginas', item.pages],
    ['Duración', item.duration && `${item.duration} minutos`],
    ['Plataforma', item.platform],
    ['Temporadas', item.seasons],
  ].filter(([, v]) => v);
  const saved = ids.includes(item.id);
  return (
    <section className="page-section">
      <Link className="back-link" to="/explorar">
        <ArrowLeft size={17} />
        Volver al catálogo
      </Link>
      <div className="detail-layout">
        <img
          className="detail-cover"
          src={item.image}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = '/covers/placeholder.svg';
          }}
          alt={`Ilustración de portada de ${item.title}`}
        />
        <div>
          <span className="eyebrow">{types[item.type]} · RESEÑA SIN SPOILERS</span>
          <h1>{item.title}</h1>
          <button className="primary" aria-pressed={saved} onClick={() => onToggle(item.id)}>
            {saved ? <Check size={18} /> : <Plus size={18} />}{' '}
            {saved ? 'En mi lista · Quitar' : 'Agregar a pendientes'}
          </button>
          <section className="review-chunk">
            <h2>
              01 <span>Ficha técnica</span>
            </h2>
            <dl>
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="review-chunk">
            <h2>
              02 <span>Sinopsis</span>
            </h2>
            <p>{item.synopsis}</p>
          </section>
          <div className="pros-cons">
            <section className="review-chunk">
              <h2>
                03 <span>Lo mejor</span>
              </h2>
              <ul>
                {item.best.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            </section>
            <section className="review-chunk">
              <h2>
                04 <span>Lo peor</span>
              </h2>
              <ul>
                {item.worst.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            </section>
          </div>
          <section className="verdict">
            <h2>05 · Veredicto final</h2>
            <div className="verdict-rating">
              <Star fill="currentColor" />
              {item.rating.toFixed(1)}
              <small>
                / 10 ·{' '}
                {item.rating >= 9
                  ? 'Excelente'
                  : item.rating >= 7
                    ? 'Recomendado'
                    : item.rating >= 5
                      ? 'Con matices'
                      : 'Poco recomendable'}
              </small>
            </div>
            <p>{item.verdict}</p>
            <small>Puntuación editorial de demostración.</small>
          </section>
        </div>
      </div>
    </section>
  );
}
