/**
 * @file src/components/navigation/HeaderStatsBar.tsx
 * @description Barra de navegação principal, estatísticas de ofensiva/XP e alternador de Modo Escuro.
 */

import React from 'react';
import { 
  Flame, 
  Award, 
  BarChart3, 
  BookOpen, 
  Target,
  Play,
  RotateCcw,
  Edit3,
  Moon,
  Sun
} from 'lucide-react';
import type { UserProfile } from '../../types/index.ts';

export type NavTabType = 'home' | 'questions' | 'srs' | 'dashboard' | 'sync' | 'profile' | 'drafts' | 'session-config';

interface HeaderStatsBarProps {
  profile: UserProfile;
  activeTab: NavTabType;
  onSelectTab: (tab: NavTabType) => void;
  questionsCount: number;
  solvedCount: number;
  dueSrsCount?: number;
  draftsCount?: number;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const HeaderStatsBar: React.FC<HeaderStatsBarProps> = ({
  profile,
  activeTab,
  onSelectTab,
  questionsCount,
  solvedCount,
  dueSrsCount = 0,
  draftsCount = 0,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  const xpInCurrentLevel = profile.totalXp % 300;
  const xpPercent = Math.min(100, Math.round((xpInCurrentLevel / 300) * 100));

  return (
    <header className="bg-[#FFE600] dark:bg-[#1E1E24] border-b-4 border-[#111111] dark:border-[#38383F] px-4 py-3 neo-shadow transition-colors">
      <div className="max-w-[98.5%] 2xl:max-w-[99.5%] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Lado Esquerdo: Marca do Aplicativo */}
        <div 
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-3.5 cursor-pointer select-none py-0.5"
        >
          <div className="bg-[#FF5A36] text-white p-3 neo-border neo-shadow-sm rotate-[-2deg]">
            <BookOpen className="w-7 h-7 stroke-[2.5]" />
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[#111111] dark:text-[#FFFFFF] flex items-center gap-1.5">
              VESTIBULANDO
              <span className="bg-[#FF3366] text-white px-2 py-0.5 neo-border-sm text-xl md:text-2xl">NEO</span>
            </h1>
            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 bg-[#00E599] text-black neo-border-sm self-center">
              v2.5
            </span>
          </div>
        </div>

        {/* Centro / Direita: Gamificação & Modo Escuro */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Alternador de Modo Escuro / Claro */}
          {onToggleDarkMode && (
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="bg-white dark:bg-[#27272A] text-black dark:text-yellow-300 p-2 neo-border neo-shadow-sm hover:scale-105 transition-transform"
              title={isDarkMode ? 'Modo claro' : 'Modo escuro'}
              aria-label="Alternar Modo Escuro"
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-yellow-400 fill-yellow-400" /> : <Moon className="w-5 h-5" />}
            </button>
          )}

          {/* Ofensiva (Streak) de Dias Consecutivos */}
          <div 
            className="flex items-center gap-1.5 bg-[#FF5A36] text-white px-3 py-1.5 neo-border neo-shadow-sm font-black"
            title={`${profile.currentStreak} dias seguidos (recorde: ${profile.longestStreak})`}
          >
            <Flame className="w-5 h-5 fill-yellow-300 text-yellow-300 animate-bounce" />
            <div className="leading-tight">
              <div className="text-sm font-black tracking-wide">{profile.currentStreak} DIAS</div>
              <div className="text-[9px] uppercase tracking-wider text-orange-100">Ofensiva</div>
            </div>
          </div>

          {/* Nível e XP */}
          <div className="bg-white dark:bg-[#27272A] px-3 py-1.5 neo-border neo-shadow-sm flex items-center gap-2">
            <Award className="w-5 h-5 text-[#3B82F6] stroke-[2.5]" />
            <div>
              <div className="flex items-center justify-between gap-2 text-xs font-black">
                <span>NÍVEL {profile.level}</span>
                <span className="text-gray-500 dark:text-gray-400 font-mono text-[10px]">{profile.totalXp} XP</span>
              </div>
              <div className="w-24 bg-gray-200 dark:bg-gray-700 h-2 neo-border-sm overflow-hidden mt-0.5">
                <div 
                  className="bg-[#00E599] h-full transition-all duration-300" 
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Vestibular Alvo */}
          <div className="hidden sm:flex items-center gap-1.5 bg-[#00F0FF] text-black px-2.5 py-1.5 neo-border neo-shadow-sm text-xs font-black">
            <Target className="w-4 h-4" />
            <span>Foco: {profile.targetExam}</span>
          </div>
        </div>
      </div>

      {/* Barra de Navegação por Abas (Sem Banco de Dados e Sem Perfil, acessíveis pela Home) */}
      <nav className="max-w-[98.5%] 2xl:max-w-[99.5%] mx-auto mt-3 pt-2 border-t-2 border-black dark:border-gray-700 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSelectTab('home')}
          className={`px-4 py-2 text-sm font-extrabold neo-btn flex items-center gap-1.5 ${
            activeTab === 'home'
              ? 'bg-[#111111] text-white dark:bg-[#00F0FF] dark:text-black'
              : 'bg-white text-black hover:bg-yellow-100 dark:bg-[#27272A] dark:text-white dark:hover:bg-gray-700'
          }`}
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Início</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('questions')}
          className={`px-4 py-2 text-sm font-extrabold neo-btn flex items-center gap-1.5 ${
            activeTab === 'questions'
              ? 'bg-[#111111] text-white dark:bg-[#00F0FF] dark:text-black'
              : 'bg-white text-black hover:bg-yellow-100 dark:bg-[#27272A] dark:text-white dark:hover:bg-gray-700'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Questões ({solvedCount}/{questionsCount})</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('drafts')}
          className={`px-4 py-2 text-sm font-extrabold neo-btn flex items-center gap-1.5 ${
            activeTab === 'drafts'
              ? 'bg-[#111111] text-white dark:bg-[#00F0FF] dark:text-black'
              : 'bg-white text-black hover:bg-yellow-100 dark:bg-[#27272A] dark:text-white dark:hover:bg-gray-700'
          }`}
        >
          <Edit3 className="w-4 h-4 text-[#FF5A36]" />
          <span>Meus Rascunhos</span>
          {draftsCount > 0 && (
            <span className="bg-[#FFE600] text-black px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold">
              {draftsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('srs')}
          className={`px-4 py-2 text-sm font-extrabold neo-btn flex items-center gap-1.5 ${
            activeTab === 'srs'
              ? 'bg-[#111111] text-white dark:bg-[#00F0FF] dark:text-black'
              : 'bg-white text-black hover:bg-yellow-100 dark:bg-[#27272A] dark:text-white dark:hover:bg-gray-700'
          }`}
        >
          <RotateCcw className="w-4 h-4 text-[#00F0FF]" />
          <span>Revisão espaçada</span>
          {dueSrsCount > 0 && (
            <span className="bg-[#FF3366] text-white px-1.5 py-0.2 rounded-full text-[10px] font-mono">
              {dueSrsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('dashboard')}
          className={`px-4 py-2 text-sm font-extrabold neo-btn flex items-center gap-1.5 ${
            activeTab === 'dashboard'
              ? 'bg-[#111111] text-white dark:bg-[#00F0FF] dark:text-black'
              : 'bg-white text-black hover:bg-yellow-100 dark:bg-[#27272A] dark:text-white dark:hover:bg-gray-700'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-[#00E599]" />
          <span>Desempenho</span>
        </button>
      </nav>
    </header>
  );
};