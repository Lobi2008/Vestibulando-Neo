/**
 * @file src/components/home/HomeWelcomeHub.tsx
 * @description Painel de boas-vindas da Tela Inicial (Home) focado no estudante.
 * Exibe informações dinâmicas do perfil, painel de estatísticas (horas estudadas,
 * questões do dia, melhor matéria, média TRI) e área central de navegação com atalhos intuitivos,
 * incluindo a porta de entrada para 'Novo simulado'.
 */

import React, { useMemo } from 'react';
import { 
  Play, 
  BookOpen, 
  Edit3, 
  RotateCcw, 
  BarChart3, 
  Database, 
  User, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  Award, 
  Flame, 
  Target, 
  Sparkles,
  Sliders,
  ChevronRight,
  Zap,
  ArrowRight
} from 'lucide-react';
import type { UserProfile, UserAttempt, Question, DrawingStroke } from '../../types/index.ts';
import type { NavTabType } from '../navigation/HeaderStatsBar.tsx';

interface HomeWelcomeHubProps {
  profile: UserProfile;
  attempts: UserAttempt[];
  questions: Question[];
  draftsCount: number;
  dueSrsCount: number;
  onOpenSessionConfig: () => void;
  onNavigateTab: (tab: NavTabType) => void;
}

export const HomeWelcomeHub: React.FC<HomeWelcomeHubProps> = ({
  profile,
  attempts,
  questions,
  draftsCount,
  dueSrsCount,
  onOpenSessionConfig,
  onNavigateTab,
}) => {
  // 1. HORAS ESTUDADAS: Soma do tempo gasto em todas as tentativas
  const totalStudyHoursFormatted = useMemo(() => {
    const totalSecs = attempts.reduce((acc, a) => acc + (a.timeSpentSeconds || 0), 0);
    const hours = totalSecs / 3600;
    if (hours >= 1) {
      return `${hours.toFixed(1)}h`;
    }
    const mins = Math.max(0, Math.round(totalSecs / 60));
    return `${mins} min`;
  }, [attempts]);

  // 2. QUESTÕES RESOLVIDAS NO DIA
  const questionsSolvedToday = useMemo(() => {
    const todayStr = new Date().toDateString();
    return attempts.filter((a) => {
      try {
        return new Date(a.timestamp).toDateString() === todayStr;
      } catch {
        return false;
      }
    }).length;
  }, [attempts]);

  // 3. MATÉRIA COM MAIOR TAXA DE ACERTO
  const bestDisciplineInfo = useMemo(() => {
    const stats: Record<string, { total: number; correct: number }> = {};
    for (const a of attempts) {
      const disc = a.discipline || a.area || 'Geral';
      if (!stats[disc]) {
        stats[disc] = { total: 0, correct: 0 };
      }
      stats[disc].total += 1;
      if (a.isCorrect) stats[disc].correct += 1;
    }

    let topDiscipline = 'Aguardando dados';
    let topRate = -1;
    let topCorrect = 0;
    let topTotal = 0;

    for (const [disc, val] of Object.entries(stats)) {
      if (val.total >= 1) {
        const rate = val.correct / val.total;
        if (rate > topRate || (rate === topRate && val.total > topTotal)) {
          topRate = rate;
          topDiscipline = disc;
          topCorrect = val.correct;
          topTotal = val.total;
        }
      }
    }

    if (topRate < 0) {
      return { name: 'Sem dados ainda', detail: 'Resolva questões para ver' };
    }

    const pct = Math.round(topRate * 100);
    return {
      name: topDiscipline,
      detail: `${pct}% de acerto (${topCorrect}/${topTotal})`,
    };
  }, [attempts]);

  // 4. MÉDIA TRI ESTIMADA
  const triAverageFormatted = useMemo(() => {
    if (profile.estimatedTri && profile.estimatedTri > 0) {
      return `${profile.estimatedTri.toFixed(1)} pts`;
    }
    const enemAttempts = attempts.filter((a) => a.vestibular === 'ENEM');
    if (enemAttempts.length > 0) {
      const correct = enemAttempts.filter((a) => a.isCorrect).length;
      const rate = correct / enemAttempts.length;
      const approx = Math.round(450 + rate * 400);
      return `${approx}.0 pts`;
    }
    return '500.0 pts';
  }, [profile.estimatedTri, attempts]);

  const dailyGoalPercent = Math.min(100, Math.round((questionsSolvedToday / profile.dailyGoalQuestions) * 100));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 1. PAINEL DE BOAS-VINDAS FOCADO NO ALUNO */}
      <div className="bg-surface neo-border neo-shadow-lg p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-primary text-ink px-3 py-1 neo-border-sm text-xs font-black uppercase">
              <Sparkles className="w-4 h-4 text-ink" />
              <span>Seu painel</span>
            </div>

            <h1 className="text-2xl md:text-4xl font-black text-ink tracking-tight leading-none">
              Bem-vindo, <span className="text-[#FF5A36] dark:text-[#00F0FF]">{profile.name || 'Estudante'}</span>! 👋
            </h1>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-bold text-gray-700 dark:text-ink-muted">
              <span className="flex items-center gap-1.5 bg-page text-gray-800 dark:text-ink px-2.5 py-1 neo-border-sm">
                <Target className="w-3.5 h-3.5 text-[#3B82F6]" />
                Foco: <strong className="text-ink">{profile.targetExam}</strong>
              </span>

              {profile.targetCourse && (
                <span className="flex items-center gap-1.5 bg-page text-gray-800 dark:text-ink px-2.5 py-1 neo-border-sm">
                  <Award className="w-3.5 h-3.5 text-[#00AA44]" />
                  Curso: <strong className="text-ink">{profile.targetCourse}</strong>
                </span>
              )}

              <span className="flex items-center gap-1.5 bg-[#FF5A36] text-white px-2.5 py-1 neo-border-sm">
                <Flame className="w-3.5 h-3.5 fill-yellow-300 text-yellow-300" />
                Ofensiva: <strong>{profile.currentStreak} dias seguidos</strong>
              </span>
            </div>
          </div>

          {/* Atalho Principal: CONFIGURAR SESSÃO DE QUESTÕES */}
          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={onOpenSessionConfig}
              className="w-full sm:w-auto px-6 py-4 bg-primary hover:bg-[#FFD600] text-black neo-btn flex items-center justify-center gap-3 font-black text-sm tracking-wide transition-colors shadow-md"
              title="Montar um simulado"
            >
              <div className="p-1.5 bg-black text-[#FFE600] neo-border-sm">
                <Sliders className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-xs font-mono uppercase tracking-wider text-gray-800 dark:text-ink">Praticar</div>
                <div className="text-base font-black">Novo simulado</div>
              </div>
              <ArrowRight className="w-5 h-5 ml-1 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* 2. PAINEL DE ESTATÍSTICAS REQUISITADAS:
            - Horas estudadas
            - Questões resolvidas no dia
            - Matéria com maior taxa de acerto
            - Média TRI
        */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t-2 border-black dark:border-gray-700">
          {/* Card 1: Horas Estudadas */}
          <div className="bg-page neo-border-sm p-4 flex items-center gap-3.5">
            <div className="p-3 bg-secondary text-ink neo-border-sm flex-shrink-0">
              <Clock className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-mono font-bold uppercase text-gray-500 dark:text-gray-400">
                Horas Estudadas
              </div>
              <div className="text-2xl font-black text-ink truncate">
                {totalStudyHoursFormatted}
              </div>
              <div className="text-xs font-bold text-gray-600 dark:text-ink-muted">
                Tempo total
              </div>
            </div>
          </div>

          {/* Card 2: Questões Resolvidas hoje
 */}
          <div className="bg-page neo-border-sm p-4 flex items-center gap-3.5">
            <div className="p-3 bg-[#00E599] text-black neo-border-sm flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-mono font-bold uppercase text-gray-500 dark:text-gray-400">
                Resolvidas hoje

              </div>
              <div className="text-2xl font-black text-ink">
                {questionsSolvedToday} <span className="text-xs font-bold text-gray-500">/ {profile.dailyGoalQuestions}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 neo-border-sm mt-1 overflow-hidden">
                <div 
                  className="bg-[#00E599] h-full transition-colors duration-300" 
                  style={{ width: `${dailyGoalPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Matéria com Melhor matéria */}
          <div className="bg-page neo-border-sm p-4 flex items-center gap-3.5">
            <div className="p-3 bg-primary text-ink neo-border-sm flex-shrink-0">
              <TrendingUp className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-mono font-bold uppercase text-gray-500 dark:text-gray-400">
                Melhor matéria
              </div>
              <div className="text-base font-black text-ink truncate" title={bestDisciplineInfo.name}>
                {bestDisciplineInfo.name}
              </div>
              <div className="text-xs font-bold text-[#00AA44] dark:text-[#00E599] truncate">
                {bestDisciplineInfo.detail}
              </div>
            </div>
          </div>

          {/* Card 4: Média TRI */}
          <div className="bg-page neo-border-sm p-4 flex items-center gap-3.5">
            <div className="p-3 bg-[#FF3366] text-white neo-border-sm flex-shrink-0">
              <Award className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-mono font-bold uppercase text-gray-500 dark:text-gray-400">
                Nota TRI estimada
              </div>
              <div className="text-2xl font-black text-ink">
                {triAverageFormatted}
              </div>
              <div className="text-xs font-bold text-gray-600 dark:text-ink-muted">
                Estimativa ENEM
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. ÁREA CENTRAL DE NAVEGAÇÃO: ATALHOS RÁPIDOS PARA TODAS AS SEÇÕES */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#FF5A36]" />
            <h2 className="text-base font-black uppercase tracking-wider text-ink">
              Acesso rápido
            </h2>
          </div>
          <span className="text-xs font-mono font-bold text-gray-500 dark:text-gray-400">
            {questions.length} questões
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Atalho 1: Novo simulado */}
          <div
            onClick={onOpenSessionConfig}
            className="p-5 bg-surface neo-border neo-shadow hover:translate-x-1 hover:-translate-y-1 transition-colors cursor-pointer group flex flex-col justify-between border-l-8 border-l-[#FFE600]"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-primary text-ink neo-border-sm">
                  <Sliders className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-black text-white dark:bg-[#FFE600] dark:text-black font-black">
                  Simulado
                </span>
              </div>
              <h3 className="text-lg font-black text-ink group-hover:text-[#FF5A36] transition-colors">
                Novo simulado
              </h3>
              <p className="text-sm text-gray-600 dark:text-ink-muted mt-1 leading-relaxed">
                Escolha a quantidade de questões, o vestibular e a área.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center text-sm font-black text-ink dark:text-[#FFE600] gap-1">
              <span>Montar simulado</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Atalho 2: Questões
 */}
          <div
            onClick={() => onNavigateTab('questions')}
            className="p-5 bg-surface neo-border neo-shadow hover:translate-x-1 hover:-translate-y-1 transition-colors cursor-pointer group flex flex-col justify-between border-l-8 border-l-[#00F0FF]"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-secondary text-ink neo-border-sm">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-ink font-bold">
                  {questions.length} itens
                </span>
              </div>
              <h3 className="text-lg font-black text-ink group-hover:text-[#00F0FF] transition-colors">
                Questões

              </h3>
              <p className="text-sm text-gray-600 dark:text-ink-muted mt-1 leading-relaxed">
                Resolva questões do banco, com cronômetro e resolução.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center text-sm font-black text-ink dark:text-[#00F0FF] gap-1">
              <span>Abrir questões</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Atalho 3: Meus rascunhos */}
          <div
            onClick={() => onNavigateTab('drafts')}
            className="p-5 bg-surface neo-border neo-shadow hover:translate-x-1 hover:-translate-y-1 transition-colors cursor-pointer group flex flex-col justify-between border-l-8 border-l-[#FF5A36]"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-[#FF5A36] text-white neo-border-sm">
                  <Edit3 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-primary text-ink font-black">
                  {draftsCount} salvos
                </span>
              </div>
              <h3 className="text-lg font-black text-ink group-hover:text-[#FF5A36] transition-colors">
                Meus rascunhos
              </h3>
              <p className="text-sm text-gray-600 dark:text-ink-muted mt-1 leading-relaxed">
                Veja os cálculos e anotações que você fez nas questões.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center text-sm font-black text-[#FF5A36] gap-1">
              <span>Ver rascunhos</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Atalho 4: Revisão espaçada */}
          <div
            onClick={() => onNavigateTab('srs')}
            className="p-5 bg-surface neo-border neo-shadow hover:translate-x-1 hover:-translate-y-1 transition-colors cursor-pointer group flex flex-col justify-between border-l-8 border-l-[#00E599]"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-[#00E599] text-black neo-border-sm">
                  <RotateCcw className="w-5 h-5" />
                </div>
                {dueSrsCount > 0 ? (
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-[#FF3366] text-white font-black animate-pulse">
                    {dueSrsCount} para hoje
                  </span>
                ) : (
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-ink font-bold">
                    Em dia
                  </span>
                )}
              </div>
              <h3 className="text-lg font-black text-ink group-hover:text-[#00E599] transition-colors">
                Revisão espaçada
              </h3>
              <p className="text-sm text-gray-600 dark:text-ink-muted mt-1 leading-relaxed">
                Revise as questões na hora certa para não esquecer.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center text-sm font-black text-[#00AA44] dark:text-[#00E599] gap-1">
              <span>Revisar</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Atalho 5: Dashboard de Desempenho */}
          <div
            onClick={() => onNavigateTab('dashboard')}
            className="p-5 bg-surface neo-border neo-shadow hover:translate-x-1 hover:-translate-y-1 transition-colors cursor-pointer group flex flex-col justify-between border-l-8 border-l-[#FF3399]"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-[#FF3399] text-white neo-border-sm">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-ink font-bold">
                  TRI e acertos
                </span>
              </div>
              <h3 className="text-lg font-black text-ink group-hover:text-[#FF3399] transition-colors">
                Desempenho

              </h3>
              <p className="text-sm text-gray-600 dark:text-ink-muted mt-1 leading-relaxed">
                Veja sua evolução e seus acertos por conteúdo.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center text-sm font-black text-[#FF3399] gap-1">
              <span>Ver desempenho</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Atalho 6: Ingestão de Dados & Banco */}
          <div
            onClick={() => onNavigateTab('sync')}
            className="p-5 bg-surface neo-border neo-shadow hover:translate-x-1 hover:-translate-y-1 transition-colors cursor-pointer group flex flex-col justify-between border-l-8 border-l-purple-500"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-purple-500 text-white neo-border-sm">
                  <Database className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-ink font-bold">
                  Dados
                </span>
              </div>
              <h3 className="text-lg font-black text-ink group-hover:text-purple-500 transition-colors">
                Banco de questões
              </h3>
              <p className="text-sm text-gray-600 dark:text-ink-muted mt-1 leading-relaxed">
                Importe questões do ENEM, remova conteúdos e faça backup.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center text-sm font-black text-purple-600 dark:text-purple-400 gap-1">
              <span>Abrir banco</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Atalho 7: Perfil & Metas */}
          <div
            onClick={() => onNavigateTab('profile')}
            className="p-5 bg-surface neo-border neo-shadow hover:translate-x-1 hover:-translate-y-1 transition-colors cursor-pointer group flex flex-col justify-between border-l-8 border-l-emerald-600 sm:col-span-2 lg:col-span-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600 text-white neo-border-sm flex-shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-ink group-hover:text-emerald-600 transition-colors">
                    Perfil e metas
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-ink-muted mt-0.5 leading-relaxed">
                    Mude seu nome, vestibular, curso e meta diária.
                  </p>
                </div>
              </div>

              <div className="flex items-center text-sm font-black text-emerald-700 dark:text-emerald-400 gap-1 flex-shrink-0">
                <span>Editar perfil</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};