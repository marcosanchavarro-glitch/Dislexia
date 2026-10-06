import { useEffect, useState } from 'react';
import { readStorage, writeStorage } from '../lib/storage';
export const defaults = { font: 'default', size: 'normal', contrast: 'normal', spacing: false };
const valid = (v) =>
  v &&
  ['default', 'accessible'].includes(v.font) &&
  ['normal', 'large', 'larger'].includes(v.size) &&
  ['normal', 'soft', 'high'].includes(v.contrast) &&
  typeof v.spacing === 'boolean';
export function useAccessibility() {
  const [preferences, setPreferences] = useState(() =>
    readStorage('entre-lineas-accessibility', defaults, valid),
  );
  const [error, setError] = useState('');
  useEffect(() => {
    Object.entries(preferences).forEach(
      ([key, value]) => (document.documentElement.dataset[key] = String(value)),
    );
    if (!writeStorage('entre-lineas-accessibility', preferences))
      setError('No pudimos guardar tus preferencias; siguen aplicadas en esta sesión.');
  }, [preferences]);
  return { preferences, setPreferences, error, reset: () => setPreferences({ ...defaults }) };
}
