import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, X, ImagePlus } from 'lucide-react';
import { api } from '../../lib/api';
import ApiState from '../../components/ApiState';
const empty = {
  title: '',
  type: 'BOOK',
  genre: '',
  year: new Date().getFullYear(),
  synopsis: '',
  rating: 7,
  best: [''],
  worst: [''],
  verdict: '',
  status: 'DRAFT',
  author: '',
  pages: '',
  director: '',
  duration: '',
  developer: '',
  platform: '',
  creator: '',
  seasons: '',
  recommended: false,
};
const typeFields = {
  BOOK: [
    ['author', 'Autor', 'text'],
    ['pages', 'Páginas', 'number'],
  ],
  MOVIE: [
    ['director', 'Director', 'text'],
    ['duration', 'Duración (minutos)', 'number'],
  ],
  GAME: [
    ['developer', 'Desarrollador', 'text'],
    ['platform', 'Plataforma', 'text'],
  ],
  SERIES: [
    ['creator', 'Creador', 'text'],
    ['seasons', 'Temporadas', 'number'],
  ],
};
export default function Editor({ onChanged }) {
  const { id } = useParams(),
    navigate = useNavigate();
  const [form, setForm] = useState(empty),
    [image, setImage] = useState(null),
    [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(Boolean(id)),
    [loadError, setLoadError] = useState('');
  const [error, setError] = useState(''),
    [fields, setFields] = useState({}),
    [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [revision, setRevision] = useState(0);
  const feedbackRef = useRef(null);
  const imageInputRef = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    setImage(null);
    setPreview('');
    setDirty(false);
    if (!id) {
      setForm({ ...empty, best: [''], worst: [''] });
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError('');
    api(`/admin/content/${id}`, { admin: true, signal: controller.signal })
      .then((data) => {
        setForm({ ...empty, ...data });
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setLoadError(err.message);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [id, revision]);
  useEffect(() => {
    if (!image) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);
  useEffect(() => {
    const warn = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const update = (key, value) => {
    setForm((p) => ({ ...p, [key]: value }));
    setDirty(true);
    setMessage('');
  };
  const selectImage = (e) => {
    const file = e.target.files?.[0];
    setError('');
    if (!file) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError('Seleccioná una imagen JPG, PNG o WebP de hasta 5 MB.');
      setImage(null);
      e.target.value = '';
      return;
    }
    setImage(file);
    setDirty(true);
    setMessage('');
  };
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setFields({});
    setMessage('');
    const payload = { ...form, status: event.nativeEvent.submitter?.value || form.status };
    const body = new FormData();
    body.append('data', JSON.stringify(payload));
    if (image) body.append('image', image);
    try {
      const saved = await api(id ? `/admin/content/${id}` : '/admin/content', {
        admin: true,
        method: id ? 'PUT' : 'POST',
        body,
      });
      setDirty(false);
      onChanged();
      setForm({ ...empty, ...saved });
      setImage(null);
      if (imageInputRef.current) imageInputRef.current.value = '';
      setMessage(
        saved.status === 'PUBLISHED'
          ? 'Reseña guardada y publicada correctamente.'
          : 'Borrador guardado correctamente.',
      );
      if (!id) navigate(`/admin/editar/${saved.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setFields(err.fields || {});
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (error || message) feedbackRef.current?.focus();
  }, [error, message]);
  const field = (key, label, type = 'text', props = {}) => (
    <label className="setting" key={key} htmlFor={`field-${key}`}>
      {label}
      <input
        id={`field-${key}`}
        name={key}
        type={type}
        value={form[key] ?? ''}
        onChange={(e) => update(key, e.target.value)}
        required
        aria-invalid={Boolean(fields[key])}
        aria-describedby={fields[key] ? `error-${key}` : undefined}
        {...props}
      />
      {fields[key] && (
        <span id={`error-${key}`} className="field-error">
          {fields[key].join(' ')}
        </span>
      )}
    </label>
  );
  if (loading || loadError)
    return (
      <ApiState loading={loading} error={loadError} reload={() => setRevision((v) => v + 1)} />
    );
  return (
    <section className="page-section editor-page">
      <Link className="back-link" to="/admin">
        <ArrowLeft size={17} />
        Volver al panel{dirty ? ' · Cambios sin guardar' : ''}
      </Link>
      <span className="eyebrow">ESPACIO EDITORIAL</span>
      <h1>{id ? 'Cuidá cada detalle.' : 'Una nueva historia.'}</h1>
      <p>
        Reseñas claras, en pequeñas secciones. Guardá un borrador o compartilo con tus lectores.
      </p>
      <div ref={feedbackRef} tabIndex={-1} className="editor-feedback">
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="feedback" role="status">
            {message}
          </p>
        )}
      </div>
      <form onSubmit={submit} aria-busy={busy}>
        <fieldset disabled={busy} className="editor-fieldset">
          <div className="editor-layout">
            <div>
              <section className="editor-section">
                <h2>01 · La historia</h2>
                {field('title', 'Título', 'text', { maxLength: 180 })}
                <div className="form-grid">
                  <label className="setting">
                    Tipo
                    <select
                      aria-label="Tipo de contenido"
                      value={form.type}
                      onChange={(e) => update('type', e.target.value)}
                    >
                      <option value="BOOK">Libro</option>
                      <option value="MOVIE">Película</option>
                      <option value="GAME">Juego</option>
                      <option value="SERIES">Serie</option>
                    </select>
                  </label>
                  {field('genre', 'Género', 'text', { maxLength: 80 })}
                  {field('year', 'Año', 'number', { min: 1, max: 2100 })}
                  {field('rating', 'Puntuación (0 a 10)', 'number', { min: 0, max: 10, step: 0.1 })}
                </div>
                <div className="form-grid">
                  {typeFields[form.type].map(([key, label, type]) =>
                    field(
                      key,
                      label,
                      type,
                      type === 'number' ? { min: 1, max: 100000 } : { maxLength: 250 },
                    ),
                  )}
                </div>
                <label className="spacing-option">
                  <input
                    type="checkbox"
                    checked={form.recommended}
                    onChange={(e) => update('recommended', e.target.checked)}
                  />
                  Destacar en Recomendados
                </label>
              </section>
              <section className="editor-section">
                <h2>02 · La reseña</h2>
                {[
                  ['synopsis', 'Sinopsis'],
                  ['verdict', 'Veredicto final'],
                ].map(([key, label]) => (
                  <label key={key} className="setting" htmlFor={`field-${key}`}>
                    {label}
                    <textarea
                      id={`field-${key}`}
                      required
                      maxLength={4000}
                      rows={5}
                      value={form[key]}
                      onChange={(e) => update(key, e.target.value)}
                      aria-invalid={Boolean(fields[key])}
                    />
                    {fields[key] && <span className="field-error">{fields[key].join(' ')}</span>}
                  </label>
                ))}
              </section>
              <div className="pros-cons">
                {[
                  ['best', 'Lo mejor'],
                  ['worst', 'Lo peor'],
                ].map(([key, label]) => (
                  <section key={key} className="editor-section">
                    <h2>{label}</h2>
                    {form[key].map((value, index) => (
                      <div className="list-input" key={index}>
                        <label className="sr-only" htmlFor={`${key}-${index}`}>
                          {label}, punto {index + 1}
                        </label>
                        <input
                          id={`${key}-${index}`}
                          required
                          maxLength={400}
                          value={value}
                          onChange={(e) =>
                            update(
                              key,
                              form[key].map((v, i) => (i === index ? e.target.value : v)),
                            )
                          }
                        />
                        <button
                          type="button"
                          disabled={form[key].length === 1}
                          aria-label={`Eliminar punto ${index + 1} de ${label.toLowerCase()}`}
                          onClick={() =>
                            update(
                              key,
                              form[key].filter((_, i) => i !== index),
                            )
                          }
                        >
                          <X size={17} />
                        </button>
                      </div>
                    ))}
                    {fields[key] && <p className="field-error">{fields[key].join(' ')}</p>}
                    <button
                      className="secondary"
                      type="button"
                      disabled={form[key].length >= 20}
                      onClick={() => update(key, [...form[key], ''])}
                    >
                      <Plus size={16} />
                      Agregar punto
                    </button>
                  </section>
                ))}
              </div>
            </div>
            <aside className="image-editor">
              <h2>La portada</h2>
              <div className="image-preview">
                {preview || form.imageUrl ? (
                  <img src={preview || form.imageUrl} alt="Vista previa de la portada" />
                ) : (
                  <div>
                    <ImagePlus size={36} />
                    <p>Una imagen para tu historia</p>
                  </div>
                )}
              </div>
              <label className="setting">
                Seleccionar imagen
                <input
                  type="file"
                  ref={imageInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={selectImage}
                  required={!id && !form.id}
                />
              </label>
              <p className="muted">
                JPG, JPEG, PNG o WebP · Máximo 5 MB. La imagen se sube al guardar. Al editar, dejá
                este campo vacío para conservar la portada.
              </p>
              {image && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setImage(null);
                    if (imageInputRef.current) imageInputRef.current.value = '';
                  }}
                >
                  Descartar imagen nueva
                </button>
              )}
              <span className="status-badge">
                {form.status === 'PUBLISHED' ? 'Publicada' : 'Borrador'}
              </span>
            </aside>
          </div>
          <div className="form-actions editor-actions">
            <Link className="secondary" to="/admin">
              Volver al panel
            </Link>
            <button className="secondary" type="submit" value="DRAFT">
              {busy ? 'Guardando…' : 'Guardar borrador'}
            </button>
            <button className="primary" type="submit" value="PUBLISHED">
              {busy ? 'Guardando…' : 'Guardar y publicar'}
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
