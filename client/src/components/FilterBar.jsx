import { types } from '../data/content';
export default function FilterBar({ type, setType, genre, setGenre, genres }) {
  return (
    <div className="filters">
      <div className="type-filters" role="group" aria-label="Filtrar por categoría">
        {[['all', 'Todos'], ...Object.entries(types)].map(([value, label]) => (
          <button
            key={value}
            aria-pressed={type === value}
            className={type === value ? 'selected' : ''}
            onClick={() => setType(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="genre-filter">
        Género{' '}
        <select aria-label="Género" value={genre} onChange={(e) => setGenre(e.target.value)}>
          <option value="all">Todos los géneros</option>
          {genres.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
