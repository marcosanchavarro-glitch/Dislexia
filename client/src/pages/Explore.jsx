import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { searchContent, normalize } from '../lib/search';
import FilterBar from '../components/FilterBar';
import ContentCard from '../components/ContentCard';
export default function Explore({ query, onSearch, ids, onToggle, content }) {
  const [params, setParams] = useSearchParams();
  const type = params.get('tipo') || 'all';
  const [genre, setGenre] = useState('all');
  const matches = searchContent(query, content);
  const results = matches.filter(
    (c) => (type === 'all' || c.type === type) && (genre === 'all' || c.genre === genre),
  );
  const suggestion =
    query.trim() && matches[0] && !normalize(matches[0].title).includes(normalize(query))
      ? matches[0]
      : null;
  return (
    <section className="page-section">
      <span className="eyebrow">ENCONTRÁ TU PRÓXIMA HISTORIA</span>
      <h1>Explorar</h1>
      <p>
        Seguí tu curiosidad. Buscá por título, género o creador, incluso si no recordás el nombre
        exacto.
      </p>
      <FilterBar
        type={type}
        setType={(value) => setParams(value === 'all' ? {} : { tipo: value })}
        genre={genre}
        setGenre={setGenre}
        genres={[...new Set(content.map((c) => c.genre))].sort()}
      />
      {suggestion && (
        <p className="suggestion">
          ¿Quisiste decir{' '}
          <button
            onClick={() => {
              onSearch(suggestion.title);
              setGenre('all');
              setParams({});
            }}
          >
            “{suggestion.title}”
          </button>
          ?
        </p>
      )}
      <p className="result-count" role="status">
        {results.length} {results.length === 1 ? 'historia encontrada' : 'historias encontradas'}
        {query && ` para “${query}”`}
      </p>
      {results.length ? (
        <div className="card-grid">
          {results.map((item) => (
            <ContentCard
              key={item.id}
              item={item}
              saved={ids.includes(item.id)}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No encontramos historias con esos filtros</h2>
          <p>Probá con menos palabras o recuperá el catálogo completo.</p>
          <button
            className="primary"
            onClick={() => {
              onSearch('');
              setGenre('all');
              setParams({});
            }}
          >
            Limpiar búsqueda y filtros
          </button>
        </div>
      )}
    </section>
  );
}
