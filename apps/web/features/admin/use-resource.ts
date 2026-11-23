'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAdmin } from './provider';
import { messageOf } from './ui';
export function useResource<T>(path: string | null) {
  const { request } = useAdmin();
  const latest = useRef(request);
  latest.current = request;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!path) {
      setLoading(false);
      setData(null);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      setData(await latest.current<T>(path));
    } catch (e) {
      setError(messageOf(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    void load();
  }, [load]);
  return { data, error, loading, reload: load };
}
