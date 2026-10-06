import { Search, X } from 'lucide-react';
export default function SearchBar({ query, onSearch }) {
  return (
    <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
      <Search size={19} aria-hidden="true" />
      <label className="sr-only" htmlFor="global-search">
        Buscar título, género o creador
      </label>
      <input
        id="global-search"
        value={query}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Una historia, un autor, un género…"
        autoComplete="off"
      />
      {query && (
        <button type="button" aria-label="Limpiar búsqueda" onClick={() => onSearch('')}>
          <X size={18} />
        </button>
      )}
      <kbd aria-hidden="true">Buscar</kbd>
    </form>
  );
}
