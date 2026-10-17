/**
 * @file src/components/common/ShortcutsFooter.tsx
 * @description Rodapé com dicas de atalhos, exibidas como "teclas" e agrupadas por contexto
 * (questão, mesa digitalizadora). Só mostra o que é relevante para a tela atual.
 */

import React, { memo } from 'react';
import { Keyboard } from 'lucide-react';

interface ShortcutsFooterProps {
  /** Caderno de questões aberto com uma questão na tela */
  showQuestionKeys: boolean;
  /** Mesa digitalizadora (rascunho) ativa */
  showDrawKeys: boolean;
}

interface ShortcutItem {
  keys: string[];
  label: string;
}

const QUESTION_SHORTCUTS: ShortcutItem[] = [
  { keys: ['A', '–', 'E'], label: 'Alternativas' },
  { keys: ['Enter'], label: 'Confirmar' },
  { keys: ['W'], label: 'Anterior' },
  { keys: ['S'], label: 'Próxima' },
  { keys: ['R'], label: 'Rascunho' },
];

const DRAW_SHORTCUTS: ShortcutItem[] = [
  { keys: ['Ctrl', 'Z'], label: 'Desfazer' },
  { keys: ['Ctrl', 'Y'], label: 'Refazer' },
  { keys: ['Ctrl', '+ arrastar'], label: 'Linha reta' },
];

const Key: React.FC<{ children: string }> = ({ children }) =>
  children === '–' || children === '+ arrastar' ? (
    <span className="text-[10px] font-bold text-ink-muted px-0.5">{children}</span>
  ) : (
    <kbd className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 text-[11px] font-mono font-black text-ink bg-surface-2 border-2 border-line shadow-[0_2px_0_0_var(--line)] leading-none">
      {children}
    </kbd>
  );

const Group: React.FC<{ title: string; items: ShortcutItem[] }> = ({ title, items }) => (
  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
    <span className="text-[10px] font-black uppercase tracking-widest text-ink-muted">{title}</span>
    {items.map((item) => (
      <span key={item.label} className="inline-flex items-center gap-1.5">
        <span className="inline-flex items-center gap-0.5">
          {item.keys.map((k, i) => (
            <Key key={`${k}-${i}`}>{k}</Key>
          ))}
        </span>
        <span className="text-[11px] font-bold text-ink">{item.label}</span>
      </span>
    ))}
  </div>
);

const ShortcutsFooterComponent: React.FC<ShortcutsFooterProps> = ({ showQuestionKeys, showDrawKeys }) => {
  const hasShortcuts = showQuestionKeys || showDrawKeys;

  return (
    <footer className="bg-surface border-t-[3px] border-line px-4 py-2">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-ink-muted">
          <Keyboard className="w-4 h-4" />
          {hasShortcuts ? 'Atalhos' : 'Vestibulando NEO'}
        </span>

        {hasShortcuts && (
          <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2">
            {showQuestionKeys && <Group title="Questão" items={QUESTION_SHORTCUTS} />}
            {showDrawKeys && <Group title="Rascunho" items={DRAW_SHORTCUTS} />}
          </div>
        )}
      </div>
    </footer>
  );
};

export const ShortcutsFooter = memo(ShortcutsFooterComponent);