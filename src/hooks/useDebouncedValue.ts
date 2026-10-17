/**
 * @file src/hooks/useDebouncedValue.ts
 * @description Hook de debounce: devolve o valor somente após `delayMs` sem novas mudanças.
 * Evita disparar filtragem/re-render da árvore a cada tecla digitada.
 */

import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs: number = 250): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
