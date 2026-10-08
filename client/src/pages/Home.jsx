import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, BookOpen, Film, Gamepad2, Tv } from 'lucide-react';
import { types } from '../data/content';
import ContentCard from '../components/ContentCard';
import { useState } from 'react';
import { selectHeroBooks } from '../lib/heroBooks';
const icons = { libro: BookOpen, pelicula: Film, juego: Gamepad2, serie: Tv };
const heroFallbacks = ['/covers/dune.svg', '/covers/interestelar.svg', '/covers/zelda.svg'];
const heroPositions = ['one', 'two', 'three'];
export default function Home({ ids, onToggle, content }) {
  const [failed, setFailed] = useState(new Set());
  const books = selectHeroBooks(content, failed);
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="little-line" /> GRANDES HISTORIAS. MEJORES ELECCIONES.
          </span>
          <h1>
            Tu próxima gran
            <br />
            historia empieza <em>acá.</em>
          </h1>
          <p>
            Libros, películas, juegos y series que merecen tu tiempo.
            <br className="desktop-break" /> Reseñas claras para descubrir, elegir y disfrutar.
          </p>
          <Link className="primary" to="/explorar">
            Explorar historias <ArrowRight size={18} />
          </Link>
          <span className="hero-footnote">Sin spoilers. Sin vueltas. A tu ritmo.</span>
        </div>
        <div className="hero-art">
          <div className="hero-scene">
            <div className="art-orbit" aria-hidden="true" />
            {heroPositions.map((position, index) => {
              const book = books[index];
              return book ? (
                <Link
                  key={`${book.id}:${book.imageUrl}`}
                  className={`hero-cover hero-cover-${position}`}
                  to={`/resena/${book.slug}`}
                  aria-label={`Ver reseña de ${book.title}`}
                >
                  <img
                    src={book.imageUrl}
                    alt={`Portada de ${book.title}`}
                    onError={() =>
                      setFailed((previous) => new Set([...previous, `${book.id}:${book.imageUrl}`]))
                    }
                  />
                </Link>
              ) : (
                <img
                  key={position}
                  className={`hero-cover hero-cover-${position}`}
                  src={heroFallbacks[index]}
                  alt=""
                />
              );
            })}
          </div>
          <div className="art-note" aria-hidden="true">
            <Sparkles size={18} />
            <span>
              Una buena historia
              <br />
              <strong>puede cambiar tu día.</strong>
            </span>
          </div>
        </div>
      </section>
      <div className="discovery-strip">
        <span>Un universo de historias</span>
        {Object.entries(types).map(([key, label]) => {
          const Icon = icons[key];
          return (
            <Link key={key} to={`/explorar?tipo=${key}`}>
              <Icon size={19} />
              {label}
              <span>{String(content.filter((c) => c.type === key).length).padStart(2, '0')}</span>
            </Link>
          );
        })}
      </div>
      <section className="catalog-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">NUESTRA SELECCIÓN</span>
            <h2>
              Un buen lugar para empezar <Sparkles size={23} />
            </h2>
            <p>Cuatro historias distintas. Algo en común: vale la pena descubrirlas.</p>
          </div>
          <Link to="/explorar">
            Ver todo <ArrowRight size={17} />
          </Link>
        </div>
        <div className="card-grid">
          {content
            .filter((c) => c.recommended)
            .slice(0, 4)
            .map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                saved={ids.includes(item.id)}
                onToggle={onToggle}
              />
            ))}
        </div>
      </section>
      <aside className="reading-banner">
        <BookOpen size={31} />
        <div>
          <h2>Las mejores reseñas son las que se entienden.</h2>
          <p>
            Información en pequeñas secciones, una navegación simple y una experiencia que se adapta
            a vos.
          </p>
        </div>
        <span>Elegí con confianza.</span>
      </aside>
      {Object.entries(types).map(([key, label]) => (
        <section className="catalog-section" key={key}>
          <div className="section-heading">
            <div>
              <span className="eyebrow">SEGUÍ DESCUBRIENDO</span>
              <h2>{label}</h2>
            </div>
            <Link to={`/explorar?tipo=${key}`}>
              Explorar {label.toLowerCase()} <ArrowRight size={17} />
            </Link>
          </div>
          <div className="card-grid">
            {content
              .filter((c) => c.type === key)
              .map((item) => (
                <ContentCard
                  key={item.id}
                  item={item}
                  saved={ids.includes(item.id)}
                  onToggle={onToggle}
                />
              ))}
          </div>
        </section>
      ))}
    </>
  );
}
