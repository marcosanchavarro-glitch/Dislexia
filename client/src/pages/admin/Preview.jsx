import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import ApiState from '../../components/ApiState';
export default function Preview() {
  const { id } = useParams();
  const [item, setItem] = useState(null),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setItem(null);
    setError('');
    api(`/admin/content/${id}`, { admin: true, signal: controller.signal })
      .then(setItem)
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      });
    return () => controller.abort();
  }, [id, revision]);
  if (!item || error)
    return <ApiState loading={!error} error={error} reload={() => setRevision((v) => v + 1)} />;
  return (
    <section className="page-section">
      <Link className="back-link" to="/admin">
        ← Volver al panel
      </Link>
      <span className="eyebrow">
        VISTA PREVIA EDITORIAL · {item.status === 'DRAFT' ? 'BORRADOR' : 'PUBLICADA'}
      </span>
      <div className="detail-layout">
        <img
          className="detail-cover"
          src={item.imageUrl || '/covers/placeholder.svg'}
          alt={`Portada de ${item.title}`}
        />
        <div>
          <h1>{item.title}</h1>
          <Link className="secondary" to={`/admin/editar/${id}`}>
            Editar reseña
          </Link>
          <section className="review-chunk">
            <h2>Ficha técnica</h2>
            <dl>
              {[
                'type',
                'genre',
                'year',
                'author',
                'pages',
                'director',
                'duration',
                'developer',
                'platform',
                'creator',
                'seasons',
              ]
                .filter((key) => item[key])
                .map((key) => (
                  <div key={key}>
                    <dt>
                      {
                        {
                          type: 'Tipo',
                          genre: 'Género',
                          year: 'Año',
                          author: 'Autor',
                          pages: 'Páginas',
                          director: 'Director',
                          duration: 'Duración',
                          developer: 'Desarrollador',
                          platform: 'Plataforma',
                          creator: 'Creador',
                          seasons: 'Temporadas',
                        }[key]
                      }
                    </dt>
                    <dd>{item[key]}</dd>
                  </div>
                ))}
            </dl>
          </section>
          <section className="review-chunk">
            <h2>Sinopsis</h2>
            <p>{item.synopsis}</p>
          </section>
          {[
            ['best', 'Lo mejor'],
            ['worst', 'Lo peor'],
          ].map(([key, label]) => (
            <section className="review-chunk" key={key}>
              <h2>{label}</h2>
              <ul>
                {item[key].map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            </section>
          ))}
          <section className="verdict">
            <h2>Veredicto final · ★ {item.rating} / 10</h2>
            <p>{item.verdict}</p>
          </section>
        </div>
      </div>
    </section>
  );
}
