const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const storageKey = 'entre-lineas-session';
// Retire both legacy audiences; users log in once after the migration.
try {
  sessionStorage.removeItem('entre-lineas-admin-session');
  sessionStorage.removeItem('entre-lineas-user-session');
} catch {}
let memoryToken = null;
export function getToken() {
  try {
    return sessionStorage.getItem(storageKey) || memoryToken;
  } catch {
    return memoryToken;
  }
}
export function setToken(token) {
  memoryToken = token;
  try {
    if (token) sessionStorage.setItem(storageKey, token);
    else sessionStorage.removeItem(storageKey);
  } catch {
    /* Solo memoria cuando el almacenamiento está bloqueado. */
  }
}
export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}
export const getUserToken = getToken;
export const setUserToken = setToken;
export async function api(path, { admin = false, user = false, signal, ...options } = {}) {
  const requestToken = admin || user ? getToken() : null;
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData))
    headers.set('Content-Type', 'application/json');
  if (requestToken) headers.set('Authorization', `Bearer ${requestToken}`);
  let response;
  try {
    response = await fetch(`${base}/api${path}`, { ...options, signal, headers });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(
      'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
      0,
    );
  }
  if (response.status === 204) return null;
  let data;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      'El servidor devolvió una respuesta inesperada. Revisá la configuración de la API.',
      response.status,
    );
  }
  if (!response.ok) {
    if (response.status === 401 && (admin || user) && requestToken === getToken()) {
      setToken(null);
      window.dispatchEvent(new Event('session-expired'));
    }
    throw new ApiError(
      data.message || 'No pudimos completar la operación.',
      response.status,
      data.fields,
    );
  }
  return data;
}
const frontendTypes = { BOOK: 'libro', MOVIE: 'pelicula', GAME: 'juego', SERIES: 'serie' };
export const adaptContent = (item) => ({
  ...item,
  type: frontendTypes[item.type],
  image: item.imageUrl || '/covers/placeholder.svg',
});
