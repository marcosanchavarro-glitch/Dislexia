import { useEffect, useState } from 'react';
import { readStorage, writeStorage } from '../lib/storage';

export function useWatchlist() {
  const [ids, setIds] = useState(() =>
    readStorage(
      'entre-lineas-list',
      [],
      (v) => Array.isArray(v) && v.every((id) => typeof id === 'string' && id.length < 200),
    ),
  );
  const [error, setError] = useState('');
  useEffect(() => {
    if (!writeStorage('entre-lineas-list', ids))
      setError('No pudimos guardar tu lista en este navegador. Se conservará durante esta sesión.');
  }, [ids]);
  const update = (fn) => setIds(fn);
  return {
    ids,
    error,
    add: (id) => update((p) => (p.includes(id) ? p : [...p, id])),
    remove: (id) => update((p) => p.filter((x) => x !== id)),
    restore: (id, index) =>
      update((p) => (p.includes(id) ? p : [...p.slice(0, index), id, ...p.slice(index)])),
  };
}
