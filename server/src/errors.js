export class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.name === 'ZodError') {
    return res
      .status(400)
      .json({ message: 'Revisá los campos del formulario.', fields: error.flatten().fieldErrors });
  }
  if (error.code === 'LIMIT_FILE_SIZE')
    return res.status(413).json({ message: 'La imagen supera el máximo de 5 MB.' });
  if (error.name === 'MulterError')
    return res.status(400).json({ message: 'Subí una sola imagen en el campo imagen.' });
  if (error.code === 'P2002')
    return res
      .status(409)
      .json({
        message: 'Ese identificador ya está en uso. Intentá nuevamente.',
        ...(error.meta?.target?.includes('username')
          ? { fields: { username: ['Ese nombre ya está en uso.'] } }
          : error.meta?.target?.includes('email')
            ? { fields: { email: ['Ese email ya está registrado.'] } }
            : {}),
      });
  if (error.code === 'P2025') return res.status(404).json({ message: 'La reseña ya no existe.' });
  if (error.type === 'entity.too.large')
    return res.status(413).json({ message: 'El formulario supera el tamaño permitido.' });
  if (error instanceof SyntaxError && error.status === 400)
    return res.status(400).json({ message: 'El JSON enviado no es válido.' });
  const status = error.status || 500;
  if (status >= 500) console.error('Error API:', error.code || error.name);
  res.status(status).json({
    message:
      status >= 500 ? 'No pudimos completar la operación. Intentá nuevamente.' : error.message,
    ...(error.fields ? { fields: error.fields } : {}),
  });
}
