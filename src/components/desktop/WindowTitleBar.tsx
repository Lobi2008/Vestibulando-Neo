/**
 * @file src/components/desktop/WindowTitleBar.tsx
 * @description Barra de título da aplicação estilo Windows 11 Desktop em tema Neobrutalista.
 * Fornece controles de janela (minimizar, maximizar, tela cheia), indicador de conectividade
 * offline/online, status de persistência local e relógio de prova.
 */

import React, { useState, useEffect } from 'react';
import { 
  Minus, 
  Square, 
  X, 
  Maximize, 
  Wifi, 
  WifiOff, 
  Database, 
  Clock, 
  Sparkles,
  BookOpen
} from 'lucide-react';

interface WindowTitleBarProps {
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

export const WindowTitleBar: React.FC<WindowTitleBarProps> = ({
  onToggleFullscreen,
  isFullscreen = false,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="w-full bg-[#111111] text-white flex items-center justify-between px-3 py-1.5 border-b-3 border-[#111111] select-none text-xs z-50">
      {/* Lado Esquerdo: Ícone e Título da Aplicação Windows 11 */}
      <div className="flex items-center gap-2">
        <div className="bg-[#FFE600] text-black font-extrabold px-1.5 py-0.5 border border-black flex items-center gap-1">
          <BookOpen className="w-3.5 h-3.5" />
          <span className="tracking-tight text-[11px]">VESTIBULANDO NEO</span>
        </div>
        <span className="text-gray-400 font-mono text-[11px] hidden sm:inline">
          Desktop Edition • Windows 11
        </span>
      </div>

      {/* Centro: Status do Sistema, Banco Local e Relógio */}
      <div className="flex items-center gap-4 text-[11px] font-mono">
        {/* Status de Conectividade & Persistência Offline */}
        <div className="flex items-center gap-1.5 bg-[#222222] px-2 py-0.5 border border-gray-700">
          <Database className="w-3 h-3 text-[#00E599]" />
          <span className="text-gray-200">SQLite/IndexedDB Offline</span>
          {isOnline ? (
            <span className="flex items-center gap-1 text-[#00E599]">
              <Wifi className="w-2.5 h-2.5" />
              <span className="text-[10px] hidden md:inline">Online</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[#FF5C00]">
              <WifiOff className="w-2.5 h-2.5" />
              <span className="text-[10px] hidden md:inline">Offline</span>
            </span>
          )}
        </div>

        {/* Relógio em Tempo Real */}
        <div className="hidden lg:flex items-center gap-1 text-gray-300 bg-[#222222] px-2 py-0.5 border border-gray-700">
          <Clock className="w-3 h-3 text-[#FFE600]" />
          <span>{currentTime}</span>
        </div>
      </div>

      {/* Lado Direito: Botões de Controle de Janela Windows */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="p-1 hover:bg-[#333333] transition-colors text-gray-300 hover:text-white"
          title={isFullscreen ? 'Sair da tela cheia (F11)' : 'Modo Foco em Tela Cheia (F11)'}
        >
          {isFullscreen ? <Square className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={() => alert('Modo Desktop: Aplicação em execução contínua no ambiente Windows 11.')}
          className="p-1 hover:bg-[#333333] transition-colors text-gray-300 hover:text-white"
          title="Minimizar janela"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => {
            if (confirm('Deseja salvar a sessão de estudos antes de sair?')) {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          className="p-1 hover:bg-[#FF3366] transition-colors text-gray-300 hover:text-white"
          title="Fechar aplicação"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
