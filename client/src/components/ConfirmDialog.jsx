import { useEffect, useRef } from 'react';
export default function ConfirmDialog({
  item,
  busy,
  onCancel,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  eyebrow,
}) {
  const ref = useRef(null);
  useEffect(() => {
    if (item && !ref.current.open) ref.current.showModal();
    if (!item && ref.current.open) ref.current.close();
  }, [item]);
  return (
    <dialog
      ref={ref}
      className="access-dialog"
      aria-labelledby="delete-title"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onCancel();
      }}
    >
      <span className="eyebrow">{eyebrow || 'ELIMINAR RESEÑA'}</span>
      <h2 id="delete-title">{title || `¿Eliminar “${item?.title}”?`}</h2>
      <p>
        {description ||
          'Se eliminarán la reseña y su imagen. Esta acción no se puede deshacer. Podés pasarla a borrador si solo querés ocultarla.'}
      </p>
      <div className="form-actions">
        <button className="secondary" autoFocus disabled={busy} onClick={onCancel}>
          {cancelLabel || 'Conservar reseña'}
        </button>
        <button className="danger" disabled={busy} onClick={onConfirm}>
          {busy ? 'Procesando…' : confirmLabel || 'Eliminar definitivamente'}
        </button>
      </div>
    </dialog>
  );
}
