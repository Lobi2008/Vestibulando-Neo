/**
 * @file src/components/navigation/HeaderStatsBar.tsx
 * @description Barra de navegação principal e estatísticas de engajamento
 * inspiradas no respostacerta.com (ofensiva/streaks diárias, XP, nível, abas de navegação).
 */

import React from 'react';
import { 
  Flame, 
  Award, 
  BarChart3, 
  BookOpen, 
  Database, 
  User, 
  Target,
  Play,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import type { UserProfile } from '../../types/index.ts';

export type NavTabType = 'home' | 'questions' | 'srs' | 'dashboard' | 'sync' | 'profile';

interface HeaderStatsBarProps {
  profile: UserProfile;
  activeTab: NavTabType;
  onSelectTab: (tab: NavTabType) => void;
  questionsCount: number;
  solvedCount: number;
  dueSrsCount?: number;
}

export const HeaderStatsBar: React.FC<HeaderStatsBarProps> = ({
  profile,
  activeTab,
  onSelectTab,
  questionsCount,
  solvedCount,
  dueSrsCount = 0,
}) => {
  const xpInCurrentLevel = profile.totalXp % 300;
  const xpPercent = Math.min(100, Math.round((xpInCurrentLevel / 300) * 100));

  return (
    <header className="bg-[#FFE600] border-b-4 border-[#111111] px-4 py-3 neo-shadow">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Lado Esquerdo: Marca do Aplicativo */}
        <div 
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-3 cursor-pointer select-none"
        >
          <div className="bg-[#FF5A36] text-white p-2.5 neo-border neo-shadow-sm rotate-[-2deg]">
            <BookOpen className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-[#111111]">
                VESTIBULANDO<span className="bg-[#00F0FF] px-1 ml-1 neo-border-sm">NEO</span>
              </h1>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 bg-[#00E599] neo-border-sm">
                v2.5 Win11
              </span>
            </div>
            <p className="text-xs font-bold text-gray-800">
              Banco ENEM (TRI 3PL) • UERJ & Vestibulares Paulistas
            </p>
          </div>
        </div>

        {/* Centro / Direita: Gamificação estilo RespostaCerta.com */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Ofensiva (Streak) de Dias Consecutivos */}
          <div 
            className="flex items-center gap-1.5 bg-[#FF5A36] text-white px-3 py-1.5 neo-border neo-shadow-sm font-black"
            title={`${profile.currentStreak} dias seguidos praticando vestibulares! (Recorde: ${profile.longestStreak} dias)`}
          >
            <Flame className="w-5 h-5 fill-yellow-300 text-yellow-300 animate-bounce" />
            <div className="leading-tight">
              <div className="text-sm font-black tracking-wide">{profile.currentStreak} DIAS</div>
              <div className="text-[9px] uppercase tracking-wider text-orange-100">Ofensiva</div>
            </div>
          </div>

          {/* Nível e XP */}
          <div className="bg-white px-3 py-1.5 neo-border neo-shadow-sm flex items-center gap-2">
            <Award className="w-5 h-5 text-[#3B82F6] stroke-[2.5]" />
            <div>
              <div className="flex items-center justify-between gap-2 text-xs font-black">
                <span>NÍVEL {profile.level}</span>
                <span className="text-gray-500 font-mono text-[10px]">{profile.totalXp} XP</span>
              </div>
              <div className="w-24 bg-gray-200 h-2 neo-border-sm overflow-hidden mt-0.5">
                <div 
                  className="bg-[#00E599] h-full transition-all duration-300" 
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Vestibular Alvo */}
          <div className="hidden sm:flex items-center gap-1.5 bg-[#00F0FF] px-2.5 py-1.5 neo-border neo-shadow-sm text-xs font-black">
            <Target className="w-4 h-4" />
            <span>Foco: {profile.targetExam}</span>
          </div>
        </div>
      </div>

      {/* Barra de Navegação por Abas */}
      <nav className="max-w-7xl mx-auto mt-3 pt-2 border-t-2 border-black flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSelectTab('home')}
          className={`px-3.5 py-1.5 text-xs font-extrabold neo-btn flex items-center gap-1.5 ${
            activeTab === 'home'
              ? 'bg-[#111111] text-white'
              : 'bg-white text-black hover:bg-yellow-100'
          }`}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Iniciar Sessão (Home)</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('questions')}
          className={`px-3.5 py-1.5 text-xs font-extrabold neo-btn flex items-center gap-1.5 ${
            activeTab === 'questions'
              ? 'bg-[#111111] text-white'
              : 'bg-white text-black hover:bg-yellow-100'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Caderno de Questões ({solvedCount}/{questionsCount})</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('srs')}
          className={`px-3.5 py-1.5 text-xs font-extrabold neo-btn flex items-center gap-1.5 ${
            activeTab === 'srs'
              ? 'bg-[#111111] text-white'
              : 'bg-white text-black hover:bg-yellow-100'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#00F0FF]" />
          <span>Repetição Espaçada (SRS)</span>
          {dueSrsCount > 0 && (
            <span className="bg-[#FF3366] text-white px-1.5 py-0.2 rounded-full text-[10px] font-mono">
              {dueSrsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('dashboard')}
          className={`px-3.5 py-1.5 text-xs font-extrabold neo-btn flex items-center gap-1.5 ${
            activeTab === 'dashboard'
              ? 'bg-[#111111] text-white'
              : 'bg-white text-black hover:bg-yellow-100'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-[#00E599]" />
          <span>Desempenho & TRI</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('sync')}
          className={`px-3.5 py-1.5 text-xs font-extrabold neo-btn flex items-center gap-1.5 ${
            activeTab === 'sync'
              ? 'bg-[#111111] text-white'
              : 'bg-white text-black hover:bg-yellow-100'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-[#3B82F6]" />
          <span>Ingestão & Banco Offline</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('profile')}
          className={`px-3.5 py-1.5 text-xs font-extrabold neo-btn flex items-center gap-1.5 ${
            activeTab === 'profile'
              ? 'bg-[#111111] text-white'
              : 'bg-white text-black hover:bg-yellow-100'
          }`}
        >
          <User className="w-3.5 h-3.5 text-[#FF3366]" />
          <span>Perfil & Metas</span>
        </button>
      </nav>
    </header>
  );
};
