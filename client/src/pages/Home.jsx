import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, BookOpen, Film, Gamepad2, Tv } from 'lucide-react';
import { types } from '../data/content';
import ContentCard from '../components/ContentCard';
const icons = { libro: BookOpen, pelicula: Film, juego: Gamepad2, serie: Tv };
export default function Home({ ids, onToggle, content }) {
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
        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit" />
          <img className="hero-cover hero-cover-one" src="/covers/dune.svg" alt="" />
          <img className="hero-cover hero-cover-two" src="/covers/interestelar.svg" alt="" />
          <img className="hero-cover hero-cover-three" src="/covers/zelda.svg" alt="" />
          <div className="art-note">
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
