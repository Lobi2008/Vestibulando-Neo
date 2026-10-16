/**
 * @file src/components/dashboard/PerformanceDashboard.tsx
 * @description Painel de estatísticas avançadas e gamificação inspirado no respostacerta.com.
 * Inclui:
 * 5.1: Gráfico interativo de evolução temporal da Estimativa TRI ENEM e Taxa de Acerto.
 * 5.2: Acordeão expansível por disciplina detalhando o aproveitamento por Conteúdo Específico.
 */

import React, { useMemo, useState } from 'react';
import { 
  BarChart2, 
  Flame, 
  Target, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  Download, 
  Compass,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  BookOpen
} from 'lucide-react';
import type { UserProfile, UserAttempt, Question } from '../../types/index.ts';
import { estimateEnemTri, calculateUerjScore } from '../../services/tri/triEngine.ts';
import { generateSqliteExportScript } from '../../services/storage/localDatabase.ts';

interface PerformanceDashboardProps {
  profile: UserProfile;
  attempts: UserAttempt[];
  questions: Question[];
  onSelectQuestion: (questionId: string) => void;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  profile,
  attempts,
  questions,
  onSelectQuestion,
}) => {
  // Estado para acordeão de disciplinas expandidas
  const [expandedDisciplines, setExpandedDisciplines] = useState<Record<string, boolean>>({});

  const questionMap = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);

  const toggleDisciplineExpand = (discipline: string) => {
    setExpandedDisciplines((prev) => ({
      ...prev,
      [discipline]: !prev[discipline],
    }));
  };

  // 1. Cálculos de ENEM (TRI 3PL)
  const enemStats = useMemo(() => {
    const enemAttempts = attempts.filter((a) => a.vestibular === 'ENEM');
    const itemsForTri = enemAttempts.map((a) => {
      const q = questionMap.get(a.questionId);
      return {
        params: q?.triParams || { a: 1.5, b: 0.0, c: 0.2 },
        isCorrect: a.isCorrect,
      };
    });

    const triResult = estimateEnemTri(itemsForTri);
    const correctCount = enemAttempts.filter((a) => a.isCorrect).length;

    return {
      total: enemAttempts.length,
      correct: correctCount,
      percentage: enemAttempts.length > 0 ? Math.round((correctCount / enemAttempts.length) * 100) : 0,
      triResult,
    };
  }, [attempts, questionMap]);

  // 2. Cálculos da UERJ (Conceito de Qualificação A, B, C, D)
  const uerjStats = useMemo(() => {
    const uerjAttempts = attempts.filter((a) => a.vestibular === 'UERJ');
    const correctCount = uerjAttempts.filter((a) => a.isCorrect).length;
    const scoreResult = calculateUerjScore(correctCount, Math.max(uerjAttempts.length, 1));

    return {
      total: uerjAttempts.length,
      correct: correctCount,
      scoreResult,
    };
  }, [attempts]);

  // 5.1: Série temporal para o Gráfico de Evolução (TRI e Taxa Média)
  const evolutionSeries = useMemo(() => {
    if (attempts.length === 0) return [];

    let correctAccum = 0;
    const enemItemsSoFar: Array<{ params: any; isCorrect: boolean }> = [];

    return attempts.map((att, index) => {
      if (att.isCorrect) correctAccum++;
      const currentAvgAccuracy = Math.round((correctAccum / (index + 1)) * 100);

      const q = questionMap.get(att.questionId);
      if (att.vestibular === 'ENEM') {
        enemItemsSoFar.push({
          params: q?.triParams || { a: 1.5, b: 0.0, c: 0.2 },
          isCorrect: att.isCorrect,
        });
      }

      const currentTri =
        enemItemsSoFar.length > 0
          ? estimateEnemTri(enemItemsSoFar).enemScore
          : 500.0;

      return {
        attemptNumber: index + 1,
        questionId: att.questionId,
        vestibular: att.vestibular,
        isCorrect: att.isCorrect,
        accuracyPercent: currentAvgAccuracy,
        triScore: currentTri,
        timestamp: att.timestamp,
      };
    });
  }, [attempts, questionMap]);

  // 5.2: Desempenho por Disciplina com AGRUPAMENTO EXPANSÍVEL por Conteúdo Específico
  const disciplineHierarchicalStats = useMemo(() => {
    const data: Record<
      string,
      {
        total: number;
        correct: number;
        timeSum: number;
        topics: Record<string, { total: number; correct: number }>;
      }
    > = {};

    for (const a of attempts) {
      const disc = a.discipline || 'Outras';
      const topic = a.topic || 'Geral';

      if (!data[disc]) {
        data[disc] = { total: 0, correct: 0, timeSum: 0, topics: {} };
      }

      data[disc].total++;
      if (a.isCorrect) data[disc].correct++;
      data[disc].timeSum += a.timeSpentSeconds;

      if (!data[disc].topics[topic]) {
        data[disc].topics[topic] = { total: 0, correct: 0 };
      }
      data[disc].topics[topic].total++;
      if (a.isCorrect) data[disc].topics[topic].correct++;
    }

    return Object.entries(data)
      .map(([discipline, discData]) => ({
        discipline,
        total: discData.total,
        correct: discData.correct,
        rate: Math.round((discData.correct / discData.total) * 100),
        avgTimeSecs: Math.round(discData.timeSum / discData.total),
        topics: Object.entries(discData.topics)
          .map(([topicName, topData]) => ({
            topicName,
            total: topData.total,
            correct: topData.correct,
            rate: Math.round((topData.correct / topData.total) * 100),
          }))
          .sort((a, b) => b.total - a.total),
      }))
      .sort((a, b) => b.total - a.total);
  }, [attempts]);

  const avgTimeTotal = useMemo(() => {
    if (attempts.length === 0) return 0;
    const sum = attempts.reduce((acc, curr) => acc + curr.timeSpentSeconds, 0);
    return Math.round(sum / attempts.length);
  }, [attempts]);

  const handleDownloadSqlite = () => {
    const sql = generateSqliteExportScript();
    const blob = new Blob([sql], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vestibulando_neo_backup_${Date.now()}.sql`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Título da Seção */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white neo-border neo-shadow p-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-black flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-[#FF5A36]" />
            DASHBOARD DE DESEMPENHO & EVOLUÇÃO
          </h2>
          <p className="text-xs font-bold text-gray-700">
            Acompanhe sua nota TRI ao longo do tempo, acerto por conteúdos específicos e métricas oficiais.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadSqlite}
          className="px-3.5 py-2 text-xs font-black neo-btn bg-[#00E599] text-black flex items-center gap-1.5"
          title="Exportar base de dados local completa para SQLite / SQL"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Banco SQLite (.sql)</span>
        </button>
      </div>

      {/* Grid Superior: 4 Indicadores Chave */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* NOTA TRI */}
        <div className="bg-[#FFE600] neo-border neo-shadow p-4">
          <div className="flex items-center justify-between text-xs font-black mb-1">
            <span>ESTIMATIVA ENEM (TRI)</span>
            <Compass className="w-4 h-4 text-black" />
          </div>
          <div className="text-3xl md:text-4xl font-black text-black">
            {enemStats.total > 0 ? enemStats.triResult.enemScore.toFixed(1) : '500.0'}
          </div>
          <div className="text-[11px] font-bold text-black mt-2 pt-2 border-t border-black flex justify-between">
            <span>Coerência Pedagógica:</span>
            <span className="font-mono">{enemStats.triResult.coherenceScore}%</span>
          </div>
          <div className="text-[10px] text-gray-800 font-medium mt-1">
            {enemStats.total} questões do ENEM avaliadas
          </div>
        </div>

        {/* CONCEITO UERJ */}
        <div className="bg-[#00F0FF] neo-border neo-shadow p-4">
          <div className="flex items-center justify-between text-xs font-black mb-1">
            <span>CONCEITO UERJ</span>
            <Target className="w-4 h-4 text-black" />
          </div>
          <div className="text-3xl md:text-4xl font-black text-black flex items-baseline gap-2">
            <span>Conceito {uerjStats.scoreResult.concept}</span>
            {uerjStats.scoreResult.bonusPoints > 0 && (
              <span className="text-xs font-extrabold bg-black text-white px-1.5 py-0.5">
                +{uerjStats.scoreResult.bonusPoints} pts
              </span>
            )}
          </div>
          <div className="text-[11px] font-bold text-black mt-2 pt-2 border-t border-black flex justify-between">
            <span>Aproveitamento:</span>
            <span className="font-mono">{uerjStats.scoreResult.percentage}%</span>
          </div>
          <div className="text-[10px] text-gray-800 font-medium mt-1">
            {uerjStats.correct} acertos de {uerjStats.total} questões
          </div>
        </div>

        {/* TAXA GERAL */}
        <div className="bg-[#FF5A36] text-white neo-border neo-shadow p-4">
          <div className="flex items-center justify-between text-xs font-black mb-1">
            <span>TAXA GERAL DE ACERTO</span>
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div className="text-3xl md:text-4xl font-black text-white">
            {attempts.length > 0
              ? `${Math.round((attempts.filter((a) => a.isCorrect).length / attempts.length) * 100)}%`
              : '0%'}
          </div>
          <div className="text-[11px] font-bold text-orange-100 mt-2 pt-2 border-t border-white/40 flex justify-between">
            <span>Total de Resoluções:</span>
            <span className="font-mono">{attempts.length} itens</span>
          </div>
          <div className="text-[10px] text-orange-200 font-medium mt-1">
            Acertos: {attempts.filter((a) => a.isCorrect).length} • Erros:{' '}
            {attempts.filter((a) => !a.isCorrect).length}
          </div>
        </div>

        {/* TEMPO MÉDIO */}
        <div className="bg-white neo-border neo-shadow p-4">
          <div className="flex items-center justify-between text-xs font-black mb-1 text-gray-700">
            <span>TEMPO MÉDIO POR ITEM</span>
            <Clock className="w-4 h-4 text-black" />
          </div>
          <div className="text-3xl md:text-4xl font-black text-black">
            {Math.floor(avgTimeTotal / 60)}m {avgTimeTotal % 60}s
          </div>
          <div className="text-[11px] font-bold text-gray-700 mt-2 pt-2 border-t border-black flex justify-between">
            <span>Ritmo Prova:</span>
            <span className="font-mono text-green-700">≤ 3min / item</span>
          </div>
          <div className="text-[10px] text-gray-500 font-medium mt-1">
            {avgTimeTotal <= 180 ? 'Ritmo excelente de prova!' : 'Atenção ao tempo limite!'}
          </div>
        </div>
      </div>

      {/* =========================================================================
          5.1: GRÁFICO INTERATIVO DE EVOLUÇÃO TEMPORAL (TRI ENEM E TAXA DE ACERTO)
         ========================================================================= */}
      <div className="bg-white neo-border neo-shadow p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b-2 border-black">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-black flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#FF5A36]" />
              <span>Evolução Temporal: Estimativa ENEM (TRI) vs Taxa Média de Acerto</span>
            </h3>
            <p className="text-xs text-gray-600">
              Acompanhamento contínuo da sua proficiência calibrada questão a questão.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-extrabold">
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 bg-[#FFE600] border-2 border-black inline-block" />
              <span>Nota TRI (Escala 300 - 900)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 bg-[#00F0FF] border-2 border-black inline-block" />
              <span>Taxa de Acerto (%)</span>
            </span>
          </div>
        </div>

        {evolutionSeries.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-xs">
            Resolva algumas questões para visualizar o gráfico dinâmico de evolução.
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            {/* SVG Chart Neobrutalista Proporcional */}
            <div className="min-w-[650px] h-[300px] relative bg-[#FAF8F5] neo-border-sm p-5 flex flex-col justify-between">
              <div className="flex justify-between items-center text-[11px] font-mono font-bold text-black border-b border-gray-300 pb-2">
                <span>Escala (300-900 / 0-100%)</span>
                <span>Gráfico Proporcional & Legível</span>
                <span>Evolução Cronológica</span>
              </div>
              <svg className="w-full h-[190px] overflow-visible my-1" viewBox="0 0 650 180" preserveAspectRatio="xMidYMid meet">
                {/* Linhas de Grade de Fundo */}
                <line x1="15" y1="20" x2="635" y2="20" stroke="#D1C7B7" strokeDasharray="3 3" strokeWidth="1" />
                <line x1="15" y1="70" x2="635" y2="70" stroke="#D1C7B7" strokeDasharray="3 3" strokeWidth="1" />
                <line x1="15" y1="120" x2="635" y2="120" stroke="#D1C7B7" strokeDasharray="3 3" strokeWidth="1" />
                <line x1="15" y1="160" x2="635" y2="160" stroke="#111111" strokeWidth="2.5" />
                <line x1="15" y1="20" x2="15" y2="160" stroke="#111111" strokeWidth="2" />

                {/* Polilinha 1: TAXA DE ACERTO (0% a 100% mapeado em Y de 160 a 20) */}
                {evolutionSeries.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#00F0FF"
                    strokeWidth="4"
                    points={evolutionSeries
                      .map((pt, idx) => {
                        const x = 15 + (idx / (evolutionSeries.length - 1)) * 620;
                        const y = 160 - (pt.accuracyPercent / 100) * 140;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />
                )}

                {/* Polilinha 2: NOTA TRI ENEM (350 a 850 mapeado em Y de 160 a 20) */}
                {evolutionSeries.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#111111"
                    strokeWidth="3.5"
                    points={evolutionSeries
                      .map((pt, idx) => {
                        const x = 15 + (idx / (evolutionSeries.length - 1)) * 620;
                        const normalizedTri = Math.max(0, Math.min(1, (pt.triScore - 350) / 500));
                        const y = 160 - normalizedTri * 140;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />
                )}

                {/* Pontos Interativos no Gráfico */}
                {evolutionSeries.map((pt, idx) => {
                  const x =
                    evolutionSeries.length === 1
                      ? 325
                      : 15 + (idx / (evolutionSeries.length - 1)) * 620;
                  const yAcc = 160 - (pt.accuracyPercent / 100) * 140;
                  const normalizedTri = Math.max(0, Math.min(1, (pt.triScore - 350) / 500));
                  const yTri = 160 - normalizedTri * 140;

                  return (
                    <g key={idx}>
                      {/* Ponto Taxa de Acerto */}
                      <circle
                        cx={x}
                        cy={yAcc}
                        r="5.5"
                        fill="#00F0FF"
                        stroke="#111111"
                        strokeWidth="2.5"
                      />
                      {/* Ponto Nota TRI */}
                      <rect
                        x={x - 4.5}
                        y={yTri - 4.5}
                        width="9"
                        height="9"
                        fill="#FFE600"
                        stroke="#111111"
                        strokeWidth="2.5"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Rótulos dos Eixos */}
              <div className="flex justify-between items-center text-xs font-mono font-bold text-black border-t border-gray-300 pt-2">
                <span>Início (Q1)</span>
                <span className="text-gray-600 text-[11px]">Resolução Sequencial de Questões</span>
                <span>Último Item (Q{evolutionSeries.length})</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          5.2: EVOLUÇÃO POR DISCIPLINA COM ACORDEÃO EXPANSÍVEL POR CONTEÚDO ESPECÍFICO
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white neo-border neo-shadow p-5">
          <div className="flex flex-wrap items-center justify-between pb-2 mb-4 border-b-2 border-black">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-black" />
                <span>Evolução por Disciplina & Conteúdos Específicos</span>
              </h3>
              <p className="text-xs text-gray-600">
                Clique em qualquer matéria para expandir os acertos por conteúdo detalhado.
              </p>
            </div>
            <span className="text-xs text-gray-500 font-bold">
              {disciplineHierarchicalStats.length} matérias avaliadas
            </span>
          </div>

          {disciplineHierarchicalStats.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              Nenhuma questão resolvida ainda. Comece a praticar no Caderno de Questões!
            </div>
          ) : (
            <div className="space-y-4">
              {disciplineHierarchicalStats.map((item) => {
                const isExpanded = !!expandedDisciplines[item.discipline];

                return (
                  <div key={item.discipline} className="neo-border-sm bg-[#FAFAFA] overflow-hidden">
                    {/* Barra da Disciplina (Clicável para expandir) */}
                    <button
                      type="button"
                      onClick={() => toggleDisciplineExpand(item.discipline)}
                      className="w-full p-3.5 text-left bg-white hover:bg-yellow-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-1 neo-border-sm ${
                            isExpanded ? 'bg-black text-white' : 'bg-gray-100 text-black'
                          }`}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div>
                          <span className="text-sm font-black text-gray-900">
                            {item.discipline}
                          </span>
                          <span className="text-xs text-gray-500 ml-2 font-mono">
                            ({item.topics.length} conteúdos treinados)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-black text-gray-800">
                          {item.correct}/{item.total} acertos ({item.rate}%)
                        </span>
                        <div className="w-28 bg-[#E5E5E5] h-3.5 neo-border-sm overflow-hidden flex">
                          <div
                            className={`h-full transition-all duration-500 ${
                              item.rate >= 70
                                ? 'bg-[#00E599]'
                                : item.rate >= 50
                                ? 'bg-[#FFE600]'
                                : 'bg-[#FF3366]'
                            }`}
                            style={{ width: `${Math.max(5, item.rate)}%` }}
                          />
                        </div>
                      </div>
                    </button>

                    {/* Conteúdos Específicos Detalhados (Acordeão Expandido) */}
                    {isExpanded && (
                      <div className="p-4 bg-[#F5F2EA] border-t-2 border-black space-y-3">
                        <span className="text-[11px] font-black uppercase text-gray-700 tracking-wider block">
                          Desempenho por Conteúdo Específico de {item.discipline}:
                        </span>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {item.topics.map((top) => (
                            <div
                              key={top.topicName}
                              className="bg-white p-2.5 neo-border-sm flex flex-col justify-between"
                            >
                              <div className="flex items-center justify-between text-xs font-bold mb-1">
                                <span className="text-gray-900 truncate" title={top.topicName}>
                                  📌 {top.topicName}
                                </span>
                                <span className="font-mono text-[11px] font-black text-gray-700">
                                  {top.correct}/{top.total} ({top.rate}%)
                                </span>
                              </div>

                              <div className="w-full bg-[#E5E5E5] h-2 neo-border-sm overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 ${
                                    top.rate >= 70
                                      ? 'bg-[#00E599]'
                                      : top.rate >= 50
                                      ? 'bg-[#FFE600]'
                                      : 'bg-[#FF3366]'
                                  }`}
                                  style={{ width: `${Math.max(5, top.rate)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ofensiva (Streak) & Resumo do Perfil */}
        <div className="bg-[#FFFDF5] neo-border neo-shadow p-5 space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-black pb-2 border-b-2 border-black flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-500" />
            <span>Ofensiva & Metas</span>
          </h3>

          <div className="bg-[#FF5A36] text-white p-4 neo-border text-center">
            <div className="text-4xl font-black">{profile.currentStreak} DIAS</div>
            <p className="text-xs font-bold text-orange-100 uppercase tracking-wider mt-1">
              Dias Consecutivos Ativos
            </p>
            <div className="text-xs text-yellow-200 mt-2 font-mono">
              Recorde Histórico: {profile.longestStreak} dias
            </div>
          </div>

          <div className="space-y-2 text-xs font-bold bg-white p-3 neo-border-sm">
            <div className="flex justify-between py-1 border-b border-gray-200">
              <span className="text-gray-600">Vestibular Alvo:</span>
              <span className="font-black text-black">{profile.targetExam}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-200">
              <span className="text-gray-600">Curso dos Sonhos:</span>
              <span className="font-black text-black">{profile.targetCourse}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-600">Meta Diária:</span>
              <span className="font-black text-black">
                {attempts.length}/{profile.dailyGoalQuestions} questões
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Histórico Recente de Questões Resolvidas */}
      <div className="bg-white neo-border neo-shadow p-5">
        <h3 className="text-sm font-black uppercase tracking-wider text-black pb-2 mb-3 border-b-2 border-black flex items-center justify-between">
          <span>Histórico Permanente de Tentativas ({attempts.length})</span>
          <span className="text-xs text-gray-500 font-normal">Armazenado no SQLite local</span>
        </h3>

        {attempts.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">Nenhum registro ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#111111] text-white font-black">
                  <th className="p-2 border border-black">Vestibular</th>
                  <th className="p-2 border border-black">Disciplina</th>
                  <th className="p-2 border border-black">Conteúdo Específico</th>
                  <th className="p-2 border border-black text-center">Resposta</th>
                  <th className="p-2 border border-black text-center">Resultado</th>
                  <th className="p-2 border border-black text-center">Tempo</th>
                  <th className="p-2 border border-black text-center">Ação</th>
                </tr>
              </thead>
              <tbody>
                {attempts.slice(-10).reverse().map((att) => (
                  <tr key={att.id} className="hover:bg-yellow-50 transition-colors">
                    <td className="p-2 border border-gray-300 font-extrabold">{att.vestibular}</td>
                    <td className="p-2 border border-gray-300">{att.discipline}</td>
                    <td className="p-2 border border-gray-300 font-medium">{att.topic}</td>
                    <td className="p-2 border border-gray-300 text-center font-bold font-mono">
                      {att.selectedAlternative}
                    </td>
                    <td className="p-2 border border-gray-300 text-center">
                      {att.isCorrect ? (
                        <span className="bg-[#00E599] text-black font-extrabold px-2 py-0.5 neo-border-sm inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Acertou
                        </span>
                      ) : (
                        <span className="bg-[#FF3366] text-white font-extrabold px-2 py-0.5 neo-border-sm inline-flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Errou
                        </span>
                      )}
                    </td>
                    <td className="p-2 border border-gray-300 text-center font-mono">
                      {att.timeSpentSeconds}s
                    </td>
                    <td className="p-2 border border-gray-300 text-center">
                      <button
                        type="button"
                        onClick={() => onSelectQuestion(att.questionId)}
                        className="px-2 py-1 bg-white hover:bg-black hover:text-white neo-border-sm font-bold text-[10px]"
                      >
                        Rever Item
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
