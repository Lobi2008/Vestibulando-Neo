/**
 * @file src/components/home/HomeWelcomeHub.tsx
 * @description Painel de boas-vindas da Tela Inicial (Home) focado no estudante.
 * Exibe informações dinâmicas do perfil, painel de estatísticas (horas estudadas,
 * questões do dia, melhor matéria, média TRI) e área central de navegação com atalhos intuitivos,
 * incluindo a porta de entrada para 'Configurar Sessão de Questões'.
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
      return { name: 'Sem resoluções', detail: 'Resolva questões para calcular' };
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
    return '500.0 pts (Base)';
  }, [profile.estimatedTri, attempts]);

  const dailyGoalPercent = Math.min(100, Math.round((questionsSolvedToday / profile.dailyGoalQuestions) * 100));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 1. PAINEL DE BOAS-VINDAS FOCADO NO ALUNO */}
      <div className="bg-white dark:bg-[#18181B] neo-border neo-shadow-lg p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-[#FFE600] text-black px-3 py-1 neo-border-sm text-xs font-black uppercase">
              <Sparkles className="w-4 h-4 text-black" />
              <span>Painel do Vestibulando</span>
            </div>

            <h1 className="text-2xl md:text-4xl font-black text-black dark:text-white tracking-tight leading-none">
              Bem-vindo, <span className="text-[#FF5A36] dark:text-[#00F0FF]">{profile.name || 'Estudante'}</span>! 👋
            </h1>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-bold text-gray-700 dark:text-gray-300">
              <span className="flex items-center gap-1.5 bg-[#F8F5EE] dark:bg-[#202024] px-2.5 py-1 neo-border-sm">
                <Target className="w-3.5 h-3.5 text-[#3B82F6]" />
                Foco: <strong className="text-black dark:text-white">{profile.targetExam}</strong>
              </span>

              {profile.targetCourse && (
                <span className="flex items-center gap-1.5 bg-[#F8F5EE] dark:bg-[#202024] px-2.5 py-1 neo-border-sm">
                  <Award className="w-3.5 h-3.5 text-[#00AA44]" />
                  Curso: <strong className="text-black dark:text-white">{profile.targetCourse}</strong>
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
              className="w-full sm:w-auto px-6 py-4 bg-[#FFE600] hover:bg-[#FFD600] text-black neo-btn flex items-center justify-center gap-3 font-black text-sm tracking-wide transition-all shadow-md"
              title="Abrir o configurador dinâmico de simulado"
            >
              <div className="p-1.5 bg-black text-[#FFE600] neo-border-sm">
                <Sliders className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-xs font-mono uppercase tracking-wider text-gray-800">Iniciar Prática</div>
                <div className="text-base font-black">Configurar Sessão de Questões</div>
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
          <div className="bg-[#F8F5EE] dark:bg-[#202024] neo-border-sm p-4 flex items-center gap-3.5">
            <div className="p-3 bg-[#00F0FF] text-black neo-border-sm flex-shrink-0">
              <Clock className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-mono font-bold uppercase text-gray-500 dark:text-gray-400">
                Horas Estudadas
              </div>
              <div className="text-2xl font-black text-black dark:text-white truncate">
                {totalStudyHoursFormatted}
              </div>
              <div className="text-[10px] font-bold text-gray-600 dark:text-gray-400">
                Tempo total de dedicação
              </div>
            </div>
          </div>

          {/* Card 2: Questões Resolvidas no Dia */}
          <div className="bg-[#F8F5EE] dark:bg-[#202024] neo-border-sm p-4 flex items-center gap-3.5">
            <div className="p-3 bg-[#00E599] text-black neo-border-sm flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-mono font-bold uppercase text-gray-500 dark:text-gray-400">
                Resolvidas no Dia
              </div>
              <div className="text-2xl font-black text-black dark:text-white">
                {questionsSolvedToday} <span className="text-xs font-bold text-gray-500">/ {profile.dailyGoalQuestions}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 neo-border-sm mt-1 overflow-hidden">
                <div 
                  className="bg-[#00E599] h-full transition-all duration-300" 
                  style={{ width: `${dailyGoalPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Matéria com Maior Taxa de Acerto */}
          <div className="bg-[#F8F5EE] dark:bg-[#202024] neo-border-sm p-4 flex items-center gap-3.5">
            <div className="p-3 bg-[#FFE600] text-black neo-border-sm flex-shrink-0">
              <TrendingUp className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-mono font-bold uppercase text-gray-500 dark:text-gray-400">
                Maior Taxa de Acerto
              </div>
              <div className="text-base font-black text-black dark:text-white truncate" title={bestDisciplineInfo.name}>
                {bestDisciplineInfo.name}
              </div>
              <div className="text-[10px] font-bold text-[#00AA44] dark:text-[#00E599] truncate">
                {bestDisciplineInfo.detail}
              </div>
            </div>
          </div>

          {/* Card 4: Média TRI */}
          <div className="bg-[#F8F5EE] dark:bg-[#202024] neo-border-sm p-4 flex items-center gap-3.5">
            <div className="p-3 bg-[#FF3366] text-white neo-border-sm flex-shrink-0">
              <Award className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-mono font-bold uppercase text-gray-500 dark:text-gray-400">
                Média TRI Estimada
              </div>
              <div className="text-2xl font-black text-black dark:text-white">
                {triAverageFormatted}
              </div>
              <div className="text-[10px] font-bold text-gray-600 dark:text-gray-400">
                Modelo 3PL Bayesiano
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
            <h2 className="text-sm font-black uppercase tracking-wider text-black dark:text-white">
              ÁREA CENTRAL DE NAVEGAÇÃO • ACESSO RÁPIDO
            </h2>
          </div>
          <span className="text-xs font-mono font-bold text-gray-500 dark:text-gray-400">
            {questions.length} questões no sistema
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Atalho 1: Configurar Sessão de Questões */}
          <div
            onClick={onOpenSessionConfig}
            className="p-5 bg-white dark:bg-[#18181B] neo-border neo-shadow hover:translate-x-1 hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between border-l-8 border-l-[#FFE600]"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-[#FFE600] text-black neo-border-sm">
                  <Sliders className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-black text-white dark:bg-[#FFE600] dark:text-black font-black">
                  Simulado
                </span>
              </div>
              <h3 className="text-base font-black text-black dark:text-white group-hover:text-[#FF5A36] transition-colors">
                Configurar Sessão de Questões
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                Ajuste a quantidade com o scroll do mouse, selecione vestibulares e áreas para começar.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center text-xs font-black text-black dark:text-[#FFE600] gap-1">
              <span>Personalizar Simulado</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Atalho 2: Caderno de Questões */}
          <div
            onClick={() => onNavigateTab('questions')}
            className="p-5 bg-white dark:bg-[#18181B] neo-border neo-shadow hover:translate-x-1 hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between border-l-8 border-l-[#00F0FF]"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-[#00F0FF] text-black neo-border-sm">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-black dark:text-white font-bold">
                  {questions.length} itens
                </span>
              </div>
              <h3 className="text-base font-black text-black dark:text-white group-hover:text-[#00F0FF] transition-colors">
                Caderno de Questões
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                Pratique diretamente com o banco completo, cronômetro oficial e resolução comentada.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center text-xs font-black text-black dark:text-[#00F0FF] gap-1">
              <span>Abrir Caderno</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Atalho 3: Meus Rascunhos Salvos */}
          <div
            onClick={() => onNavigateTab('drafts')}
            className="p-5 bg-white dark:bg-[#18181B] neo-border neo-shadow hover:translate-x-1 hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between border-l-8 border-l-[#FF5A36]"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-[#FF5A36] text-white neo-border-sm">
                  <Edit3 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-[#FFE600] text-black font-black">
                  {draftsCount} salvos
                </span>
              </div>
              <h3 className="text-base font-black text-black dark:text-white group-hover:text-[#FF5A36] transition-colors">
                Meus Rascunhos Salvos
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                Consulte todos os traços, contas e anotações feitas na mesa digitalizadora com filtros por matéria.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center text-xs font-black text-[#FF5A36] gap-1">
              <span>Ver Rascunhos</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Atalho 4: Repetição Espaçada (SRS) */}
          <div
            onClick={() => onNavigateTab('srs')}
            className="p-5 bg-white dark:bg-[#18181B] neo-border neo-shadow hover:translate-x-1 hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between border-l-8 border-l-[#00E599]"
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
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-black dark:text-white font-bold">
                    Em dia
                  </span>
                )}
              </div>
              <h3 className="text-base font-black text-black dark:text-white group-hover:text-[#00E599] transition-colors">
                Repetição Espaçada (SRS)
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                Revise cartões baseados no algoritmo SM-2 para retenção de longo prazo dos seus erros.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center text-xs font-black text-[#00AA44] dark:text-[#00E599] gap-1">
              <span>Praticar Revisão</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Atalho 5: Dashboard de Desempenho */}
          <div
            onClick={() => onNavigateTab('dashboard')}
            className="p-5 bg-white dark:bg-[#18181B] neo-border neo-shadow hover:translate-x-1 hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between border-l-8 border-l-[#FF3399]"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-[#FF3399] text-white neo-border-sm">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-black dark:text-white font-bold">
                  TRI & Acordes
                </span>
              </div>
              <h3 className="text-base font-black text-black dark:text-white group-hover:text-[#FF3399] transition-colors">
                DASHBOARD
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                Análise gráfica de evolução temporal, coerência pedagógica e acertos por conteúdo específico.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center text-xs font-black text-[#FF3399] gap-1">
              <span>Abrir Métricas</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Atalho 6: Ingestão de Dados & Banco */}
          <div
            onClick={() => onNavigateTab('sync')}
            className="p-5 bg-white dark:bg-[#18181B] neo-border neo-shadow hover:translate-x-1 hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between border-l-8 border-l-purple-500"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-purple-500 text-white neo-border-sm">
                  <Database className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-black dark:text-white font-bold">
                  API & SQLite
                </span>
              </div>
              <h3 className="text-base font-black text-black dark:text-white group-hover:text-purple-500 transition-colors">
                Banco de Dados & Ingestão
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                Importe questões reais do enem.dev, exclua tópicos por filtro e exporte scripts SQLite offline.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center text-xs font-black text-purple-600 dark:text-purple-400 gap-1">
              <span>Gerenciar Banco</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Atalho 7: Perfil & Metas */}
          <div
            onClick={() => onNavigateTab('profile')}
            className="p-5 bg-white dark:bg-[#18181B] neo-border neo-shadow hover:translate-x-1 hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between border-l-8 border-l-emerald-600 sm:col-span-2 lg:col-span-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600 text-white neo-border-sm flex-shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-black dark:text-white group-hover:text-emerald-600 transition-colors">
                    Perfil & Metas de Aprovação
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">
                    Personalize seu apelido de estudos, vestibular alvo, carreira desejada e meta diária de questões.
                  </p>
                </div>
              </div>

              <div className="flex items-center text-xs font-black text-emerald-700 dark:text-emerald-400 gap-1 flex-shrink-0">
                <span>Editar Perfil & Metas</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
