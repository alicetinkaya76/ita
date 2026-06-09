import { useMemo, useState } from 'react';
import Fuse from 'fuse.js';

interface SearchOptions<T> {
  keys: string[];
  threshold?: number;
  data: T[];
}

export function useSearch<T>({ keys, threshold = 0.35, data }: SearchOptions<T>) {
  const [query, setQuery] = useState('');

  const fuse = useMemo(
    () => new Fuse(data, { keys, threshold, includeScore: true }),
    [data, keys, threshold]
  );

  const results = useMemo(() => {
    if (!query.trim()) return data;
    return fuse.search(query).map(r => r.item);
  }, [query, fuse, data]);

  return { query, setQuery, results };
}
