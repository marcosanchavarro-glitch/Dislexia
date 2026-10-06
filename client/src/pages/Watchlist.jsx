import { Link } from 'react-router-dom';
import { Bookmark } from 'lucide-react';

import ContentCard from '../components/ContentCard';
export default function Watchlist({ ids, onToggle, content }) {
  return (
    <section className="page-section">
      <span className="eyebrow">PARA CUANDO TENGAS UN RATO</span>
      <h1>Mi lista</h1>
      <p>
        Tus próximas historias, en un solo lugar.{' '}
        {ids.filter((id) => content.some((c) => c.id === id)).length}{' '}
        {ids.filter((id) => content.some((c) => c.id === id)).length === 1
          ? 'pendiente'
          : 'pendientes'}
        .
      </p>
      {ids.some((id) => !content.some((c) => c.id === id)) && (
        <div className="storage-warning">
          Algunas historias guardadas ya no están publicadas. Podés quitarlas de tu lista.{' '}
          {ids
            .filter((id) => !content.some((c) => c.id === id))
            .map((id, index) => (
              <div key={id} className="unavailable-topic">
                <span>Historia no disponible {index + 1}</span>
                <button
                  className="secondary"
                  onClick={() => onToggle(id)}
                  aria-label={`Quitar historia no disponible ${index + 1}`}
                >
                  Quitar de mi lista
                </button>
              </div>
            ))}
        </div>
      )}
      {ids.some((id) => content.some((c) => c.id === id)) ? (
        <div className="card-grid">
          {ids
            .map((id) => content.find((c) => c.id === id))
            .filter(Boolean)
            .map((item) => (
              <ContentCard key={item.id} item={item} saved onToggle={onToggle} />
            ))}
        </div>
      ) : (
        <div className="empty-state">
          <Bookmark size={40} />
          <h2>Tu próxima historia todavía está por descubrir</h2>
          <p>Usá el botón + en una tarjeta para guardarla acá.</p>
          <Link className="primary" to="/explorar">
            Explorar historias
          </Link>
        </div>
      )}
    </section>
  );
}
