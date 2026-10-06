import { useEffect, useRef } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { useUser } from '../context/UserContext';
export default function AccessibilityPanel({ open, onClose, settings }) {
  const { user } = useUser();
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  const { preferences: p, setPreferences, reset, error } = settings;
  const update = (key, value) => setPreferences({ ...p, [key]: value });
  return (
    <dialog ref={ref} className="access-dialog" onCancel={onClose} onClose={onClose}>
      <div className="dialog-heading">
        <div>
          <span className="eyebrow">A TU MANERA</span>
          <h2>Una lectura más cómoda</h2>
        </div>
        <button onClick={onClose} aria-label="Cerrar configuración">
          <X />
        </button>
      </div>
      <p>
        Ajustá la experiencia a lo que necesitás.{' '}
        {user
          ? 'Tus preferencias se guardan en tu cuenta y en este navegador.'
          : 'Tus preferencias se guardan en este navegador.'}
      </p>
      {[
        [
          'font',
          'Tipografía',
          [
            ['default', 'Sans-serif predeterminada'],
            ['accessible', 'Lectura accesible (Verdana)'],
          ],
        ],
        [
          'size',
          'Tamaño del texto',
          [
            ['normal', 'Normal'],
            ['large', 'Grande'],
            ['larger', 'Muy grande'],
          ],
        ],
        [
          'contrast',
          'Contraste',
          [
            ['normal', 'Normal'],
            ['soft', 'Suave'],
            ['high', 'Alto contraste'],
          ],
        ],
      ].map(([key, label, options]) => (
        <label className="setting" key={key}>
          {label}
          <select
            disabled={!settings.ready}
            aria-label={label}
            value={p[key]}
            onChange={(e) => update(key, e.target.value)}
          >
            {options.map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </label>
      ))}
      <label className="spacing-option">
        <input
          disabled={!settings.ready}
          type="checkbox"
          checked={p.spacing}
          onChange={(e) => update('spacing', e.target.checked)}
        />
        Aumentar espaciado de líneas y letras
      </label>
      <p className="muted">
        La opción accesible usa una fuente local de letras abiertas. No requiere descargar fuentes
        ni garantiza un efecto clínico sobre la dislexia.
      </p>
      {error && <p role="status">{error}</p>}
      {!settings.ready && <p role="status">Cargando tus preferencias…</p>}
      <button className="secondary" disabled={!settings.ready} onClick={reset}>
        <RotateCcw size={17} />
        Restablecer configuración
      </button>
      <button className="primary" onClick={onClose}>
        Listo
      </button>
    </dialog>
  );
}
