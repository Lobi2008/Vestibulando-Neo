/**
 * @file src/components/desktop/WindowTitleBar.tsx
 * @description Barra superior exclusiva para os controles de janela do Windows (minimizar, maximizar e fechar).
 */

import React from 'react';
import { Minus, Square, X, Maximize } from 'lucide-react';

interface WindowTitleBarProps {
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

export const WindowTitleBar: React.FC<WindowTitleBarProps> = ({
  onToggleFullscreen,
  isFullscreen = false,
}) => {
  return (
    <div className="w-full bg-[#111111] dark:bg-[#09090B] text-white flex items-center justify-end px-2 py-1 border-b border-[#222222] select-none text-xs z-50">
      <div className="flex items-center gap-1">
        {/* Minimizar */}
        <button
          type="button"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="p-1 px-2.5 hover:bg-[#333333] transition-colors text-gray-300 hover:text-white"
          title="Minimizar"
          aria-label="Minimizar"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        {/* Maximizar / Tela Cheia */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="p-1 px-2.5 hover:bg-[#333333] transition-colors text-gray-300 hover:text-white"
          title={isFullscreen ? 'Restaurar' : 'Maximizar'}
          aria-label="Maximizar"
        >
          {isFullscreen ? <Square className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
        </button>

        {/* Fechar */}
        <button
          type="button"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="p-1 px-2.5 hover:bg-[#FF3366] transition-colors text-gray-300 hover:text-white"
          title="Fechar"
          aria-label="Fechar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};