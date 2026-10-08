import { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { api, adaptContent } from '../lib/api';
export function useContent() {
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (previousPath.current !== pathname && pathname === '/') reload();
    previousPath.current = pathname;
    const refresh = () => {
      if (pathname === '/') reload();
    };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [pathname, reload]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api('/content', { signal: controller.signal, cache: 'no-store' })
      .then((data) => {
        if (controller.signal.aborted) return;
        setItems(data.map(adaptContent));
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [revision]);
  return { items, loading, error, reload };
}
export function useContentDetail(slug) {
  const [state, setState] = useState({ item: null, loading: true, error: '' });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setState({ item: null, loading: true, error: '' });
    api(`/content/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then((item) => setState({ item: adaptContent(item), loading: false, error: '' }))
      .catch((error) => {
        if (error.name !== 'AbortError')
          setState({ item: null, loading: false, error: error.message });
      });
    return () => controller.abort();
  }, [slug, revision]);
  return { ...state, reload };
}
