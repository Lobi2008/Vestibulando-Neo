/**
 * @file src/hooks/useTextHighlighter.ts
 * @description Marca-texto sempre ativo: selecionar um trecho com o mouse dentro do contêiner e soltar
 * o deixa destacado em amarelo. Para remover, basta clicar em cima do trecho destacado.
 * Se o trecho ainda estiver selecionado e o usuário copiar (Ctrl+C), o destaque dele é desfeito:
 * a seleção é mantida para a cópia funcionar, e a marcação só vale se o trecho não for copiado.
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
  count: number;
  clear: () => void;
  /** true por um instante logo após criar/remover um destaque (use para ignorar o "click" seguinte) */
  justHighlightedRef: RefObject<boolean>;
}

export function useTextHighlighter(containerRef: RefObject<HTMLElement | null>, resetKey: string): TextHighlighter {
  const supported = getRegistry() !== null && getHighlightCtor() !== null;
  const [count, setCount] = useState<number>(0);
  const rangesRef = useRef<Range[]>([]);
  const justHighlightedRef = useRef<boolean>(false);
  // Último destaque criado e ainda selecionado, com os destaques que ele absorveu (para desfazer ao copiar)
  const pendingRef = useRef<{ range: Range; replaced: Range[] } | null>(null);

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

  // Limpa ao trocar de questão e ao desmontar
  useEffect(() => {
    clear();
    return () => {
      rangesRef.current = [];
      getRegistry()?.delete(HIGHLIGHT_NAME);
    };
  }, [resetKey, clear]);

  useEffect(() => {
    if (!supported) return;

    const flagHandled = () => {
      // Ignora o "click" que vem logo depois do mouseup (ex.: não escolher a alternativa ao marcar/desmarcar)
      justHighlightedRef.current = true;
      window.setTimeout(() => {
        justHighlightedRef.current = false;
      }, 0);
    };

    const handleMouseUp = (e: MouseEvent) => {
      const container = containerRef.current;
      const selection = window.getSelection();
      if (!container || !selection || selection.rangeCount === 0) return;
      pendingRef.current = null;

      // Seleção dentro de campos de texto (ex.: edição da resolução) não é marca-texto
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('textarea, input')) return;

      const range = selection.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) return;

      // Clique simples sobre um trecho destacado: remove o destaque
      if (selection.isCollapsed) {
        const hit = rangesRef.current.find(
          (existing) => existing.comparePoint(range.startContainer, range.startOffset) === 0
        );
        if (hit) {
          rangesRef.current = rangesRef.current.filter((existing) => existing !== hit);
          paint();
          flagHandled();
        }
        return;
      }

      // Seleção arrastada: cria o destaque (une com destaques que ela encosta)
      if (range.toString().trim().length === 0) return;

      const newRange = range.cloneRange();
      const overlapping = rangesRef.current.filter((existing) => rangesOverlap(newRange, existing));
      for (const existing of overlapping) {
        if (existing.compareBoundaryPoints(Range.START_TO_START, newRange) < 0) {
          newRange.setStart(existing.startContainer, existing.startOffset);
        }
        if (existing.compareBoundaryPoints(Range.END_TO_END, newRange) > 0) {
          newRange.setEnd(existing.endContainer, existing.endOffset);
        }
      }

      rangesRef.current = [...rangesRef.current.filter((existing) => !overlapping.includes(existing)), newRange];
      paint();
      // A seleção é mantida (não chama removeAllRanges) para que Ctrl+C ainda copie o trecho
      pendingRef.current = { range: newRange, replaced: overlapping };
      flagHandled();
    };

    // Copiou o trecho que acabou de ser marcado: desfaz essa marcação (restaura as que ela absorveu)
    const handleCopy = () => {
      const pending = pendingRef.current;
      const selection = window.getSelection();
      if (!pending || !selection || selection.isCollapsed || selection.rangeCount === 0) return;

      const current = selection.getRangeAt(0);
      const sameSelection =
        current.compareBoundaryPoints(Range.START_TO_START, pending.range) === 0 &&
        current.compareBoundaryPoints(Range.END_TO_END, pending.range) === 0;
      if (!sameSelection) return;

      rangesRef.current = [...rangesRef.current.filter((existing) => existing !== pending.range), ...pending.replaced];
      pendingRef.current = null;
      paint();
    };

    // Seleção desfeita sem copiar: a marcação passa a ser definitiva
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) pendingRef.current = null;
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [supported, containerRef, paint]);

  return { supported, count, clear, justHighlightedRef };
}