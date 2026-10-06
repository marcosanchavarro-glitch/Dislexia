import { useEffect, useState, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../lib/api';
import { readStorage, writeStorage } from '../lib/storage';
export const defaults = { font: 'default', size: 'normal', contrast: 'normal', spacing: false };
const valid = (v) =>
  v &&
  ['default', 'accessible'].includes(v.font) &&
  ['normal', 'large', 'larger'].includes(v.size) &&
  ['normal', 'soft', 'high'].includes(v.contrast) &&
  typeof v.spacing === 'boolean';
export function useAccessibility() {
  const { user } = useUser();
  const syncing = useRef(false),
    generation = useRef(0),
    lastSynced = useRef(null),
    saveQueue = useRef(Promise.resolve());
  const [ready, setReady] = useState(true);
  const [preferences, setPreferences] = useState(() =>
    readStorage('entre-lineas-accessibility', defaults, valid),
  );
  const [error, setError] = useState('');
  useEffect(() => {
    const current = ++generation.current;
    syncing.current = false;
    lastSynced.current = null;
    if (!user) {
      setReady(true);
      return;
    }
    setReady(false);
    syncing.current = true;
    api('/users/me/accessibility', { user: true })
      .then((v) => {
        if (current !== generation.current) return;
        const loaded = {
          font: v.fontMode,
          size: v.fontSize,
          contrast: v.contrast,
          spacing: v.spacing,
        };
        lastSynced.current = JSON.stringify(loaded);
        setPreferences(loaded);
      })
      .catch((e) => {
        if (current === generation.current) {
          lastSynced.current = JSON.stringify(preferences);
          setError(e.message);
        }
      })
      .finally(() => {
        if (current === generation.current) {
          syncing.current = false;
          setReady(true);
        }
      });
    return () => {
      generation.current++;
    };
  }, [user?.id]);
  useEffect(() => {
    if (!user || syncing.current || !ready || JSON.stringify(preferences) === lastSynced.current)
      return;
    const current = generation.current;
    const timer = setTimeout(() => {
      saveQueue.current = saveQueue.current
        .catch(() => {})
        .then(() => {
          if (current !== generation.current) return;
          return api('/users/me/accessibility', {
            user: true,
            method: 'PUT',
            body: JSON.stringify({
              fontMode: preferences.font,
              fontSize: preferences.size,
              contrast: preferences.contrast,
              spacing: preferences.spacing,
            }),
          }).then(() => {
            if (current === generation.current) lastSynced.current = JSON.stringify(preferences);
          });
        })
        .catch((e) => {
          if (current === generation.current) setError(e.message);
        });
    }, 500);
    return () => clearTimeout(timer);
  }, [preferences, user?.id, ready]);
  useEffect(() => {
    Object.entries(preferences).forEach(
      ([key, value]) => (document.documentElement.dataset[key] = String(value)),
    );
    if (!writeStorage('entre-lineas-accessibility', preferences))
      setError('No pudimos guardar tus preferencias; siguen aplicadas en esta sesión.');
  }, [preferences]);
  return {
    preferences,
    setPreferences,
    error,
    ready,
    reset: () => setPreferences({ ...defaults }),
  };
}
