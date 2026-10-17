/**
 * @file src/hooks/useTextHighlighter.ts
 * @description Marca-texto: com o modo ativo, o trecho selecionado com o mouse dentro do contêiner
 * é destacado em amarelo. Selecionar sobre um destaque existente o remove.
 *
 * Usa a CSS Custom Highlight API (`CSS.highlights` + `::highlight(user-hl)`), que pinta Ranges sem
 * alterar o DOM, portanto não conflita com a renderização do React.
 * Os destaques são limpos quando `resetKey` muda (ex.: troca de questão).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

const HIGHLIGHT_NAME = 'user-hl';

interface HighlightLike {
  add(range: Range): void;
}
interface HighlightRegistryLike {
  set(name: string, highlight: HighlightLike): void;
  delete(name: string): boolean;
}

const getRegistry = (): HighlightRegistryLike | null => {
  const reg = (CSS as unknown as { highlights?: HighlightRegistryLike }).highlights;
  return reg ?? null;
};

const getHighlightCtor = (): (new (...ranges: Range[]) => HighlightLike) | null => {
  const ctor = (window as unknown as { Highlight?: new (...ranges: Range[]) => HighlightLike }).Highlight;
  return ctor ?? null;
};

const rangesOverlap = (a: Range, b: Range): boolean =>
  a.compareBoundaryPoints(Range.START_TO_END, b) > 0 && a.compareBoundaryPoints(Range.END_TO_START, b) < 0;

export interface TextHighlighter {
  /** true quando o navegador suporta a API de destaque */
  supported: boolean;
  enabled: boolean;
  toggle: () => void;
  count: number;
  clear: () => void;
  /** true por um instante logo após criar/remover um destaque (use para ignorar o "click" seguinte) */
  justHighlightedRef: RefObject<boolean>;
}

export function useTextHighlighter(containerRef: RefObject<HTMLElement | null>, resetKey: string): TextHighlighter {
  const supported = getRegistry() !== null && getHighlightCtor() !== null;
  const [enabled, setEnabled] = useState<boolean>(false);
  const [count, setCount] = useState<number>(0);
  const rangesRef = useRef<Range[]>([]);
  const justHighlightedRef = useRef<boolean>(false);

  const paint = useCallback(() => {
    const registry = getRegistry();
    const HighlightCtor = getHighlightCtor();
    if (!registry || !HighlightCtor) return;
    if (rangesRef.current.length === 0) {
      registry.delete(HIGHLIGHT_NAME);
    } else {
      registry.set(HIGHLIGHT_NAME, new HighlightCtor(...rangesRef.current));
    }
    setCount(rangesRef.current.length);
  }, []);

  const clear = useCallback(() => {
    rangesRef.current = [];
    paint();
  }, [paint]);

  const toggle = useCallback(() => setEnabled((prev) => !prev), []);

  // Limpa ao trocar de questão e ao desmontar
  useEffect(() => {
    clear();
    return () => {
      rangesRef.current = [];
      getRegistry()?.delete(HIGHLIGHT_NAME);
    };
  }, [resetKey, clear]);

  useEffect(() => {
    if (!enabled || !supported) return;

    const handleMouseUp = () => {
      const container = containerRef.current;
      const selection = window.getSelection();
      if (!container || !selection || selection.isCollapsed || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) return;
      if (range.toString().trim().length === 0) return;

      const newRange = range.cloneRange();
      const overlapping = rangesRef.current.filter((existing) => rangesOverlap(newRange, existing));

      rangesRef.current =
        overlapping.length > 0
          ? rangesRef.current.filter((existing) => !overlapping.includes(existing)) // remove destaques tocados
          : [...rangesRef.current, newRange]; // cria novo destaque

      paint();
      selection.removeAllRanges();

      justHighlightedRef.current = true;
      window.setTimeout(() => {
        justHighlightedRef.current = false;
      }, 0);
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [enabled, supported, containerRef, paint]);

  return { supported, enabled, toggle, count, clear, justHighlightedRef };
}
