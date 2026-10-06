import { Link } from 'react-router-dom';
import { Plus, Check, Star, ArrowUpRight } from 'lucide-react';
import { types } from '../data/content';
export default function ContentCard({ item, saved, onToggle }) {
  return (
    <article className="card">
      <div className="cover-wrap">
        <Link to={`/resena/${item.slug}`} tabIndex={-1} aria-hidden="true">
          <img
            src={item.image}
            alt=""
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/covers/placeholder.svg';
            }}
          />
        </Link>
        <span className="type-tag">{types[item.type]}</span>
        <button
          className={`save-button ${saved ? 'saved' : ''}`}
          onClick={() => onToggle(item.id)}
          aria-label={`${saved ? 'Quitar de' : 'Agregar a'} pendientes: ${item.title}`}
          aria-pressed={saved}
        >
          {saved ? <Check size={20} /> : <Plus size={20} />}
        </button>
      </div>
      <div className="card-body">
        <div className="card-meta">
          {item.genre}
          <span>{item.year}</span>
        </div>
        <h3>
          <Link to={`/resena/${item.slug}`}>{item.title}</Link>
        </h3>
        <div className="card-bottom">
          <span className="rating" aria-label={`Puntuación ${item.rating} de 10`}>
            <Star size={15} fill="currentColor" />
            {item.rating.toFixed(1)}
            <small>/ 10</small>
          </span>
          <Link className="review-link" to={`/resena/${item.slug}`}>
            Ver reseña <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
    </article>
  );
}
