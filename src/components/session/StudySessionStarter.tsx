/**
 * @file src/components/session/StudySessionStarter.tsx
 * @description Tela inicial para configuração e início de sessão personalizada de estudos.
 * Permite ao aluno selecionar quantidade de questões, vestibulares alvo,
 * áreas/matérias, conteúdos específicos e status (apenas pendentes, erros, todas).
 */

import React, { useState, useMemo } from 'react';
import { 
  Play, 
  Settings2, 
  Flame, 
  Target, 
  CheckSquare, 
  Square, 
  Sparkles, 
  Clock, 
  Layers,
  Zap,
  RotateCcw
} from 'lucide-react';
import type { Question, ExamType, AreaOfKnowledge, UserAttempt, FilterState } from '../../types/index.ts';

interface StudySessionStarterProps {
  questions: Question[];
  attempts: UserAttempt[];
  onStartSession: (configuredFilters: FilterState, limit: number) => void;
  onNavigateToSrs: () => void;
}

const ALL_VESTIBULARES: Array<{ id: ExamType; label: string; color: string }> = [
  { id: 'ENEM', label: 'ENEM (TRI 3PL)', color: 'bg-[#FFE600] text-black' },
  { id: 'UERJ', label: 'UERJ (Qualificação)', color: 'bg-[#00F0FF] text-black' },
  { id: 'FUVEST', label: 'FUVEST (USP)', color: 'bg-[#FF5A36] text-white' },
  { id: 'UNICAMP', label: 'UNICAMP', color: 'bg-[#00E599] text-black' },
  { id: 'CONCURSOS', label: 'Concursos Públicos', color: 'bg-purple-300 text-black' },
];

const ALL_AREAS: AreaOfKnowledge[] = [
  'Ciências da Natureza e suas Tecnologias',
  'Matemática e suas Tecnologias',
  'Ciências Humanas e suas Tecnologias',
  'Linguagens, Códigos e suas Tecnologias',
];

export const StudySessionStarter: React.FC<StudySessionStarterProps> = ({
  questions,
  attempts,
  onStartSession,
  onNavigateToSrs,
}) => {
  // Configuração da Sessão
  const [selectedVestibular, setSelectedVestibular] = useState<ExamType | 'TODOS'>('TODOS');
  const [selectedArea, setSelectedArea] = useState<AreaOfKnowledge | 'TODAS'>('TODAS');
  const [selectedTopic, setSelectedTopic] = useState<string>('TODOS');
  const [selectedStatus, setSelectedStatus] = useState<'TODAS' | 'NAO_RESOLVIDAS' | 'ERRADAS'>('NAO_RESOLVIDAS');
  const [questionCount, setQuestionCount] = useState<number>(10);

  // Mapeia tentativas para consulta rápida
  const attemptsByQuestion = useMemo(() => {
    const map = new Map<string, UserAttempt>();
    for (const a of attempts) map.set(a.questionId, a);
    return map;
  }, [attempts]);

  // Tópicos disponíveis dinamicamente
  const availableTopics = useMemo(() => {
    let pool = questions;
    if (selectedVestibular !== 'TODOS') pool = pool.filter((q) => q.vestibular === selectedVestibular);
    if (selectedArea !== 'TODAS') pool = pool.filter((q) => q.area === selectedArea);
    const set = new Set<string>();
    for (const q of pool) if (q.topic) set.add(q.topic);
    return Array.from(set).sort();
  }, [questions, selectedVestibular, selectedArea]);

  // Contagem de questões correspondentes aos critérios
  const matchingQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (selectedVestibular !== 'TODOS' && q.vestibular !== selectedVestibular) return false;
      if (selectedArea !== 'TODAS' && q.area !== selectedArea) return false;
      if (selectedTopic !== 'TODOS' && q.topic !== selectedTopic) return false;

      const lastAttempt = attemptsByQuestion.get(q.id);
      if (selectedStatus === 'NAO_RESOLVIDAS' && lastAttempt) return false;
      if (selectedStatus === 'ERRADAS' && (!lastAttempt || lastAttempt.isCorrect)) return false;

      return true;
    });
  }, [questions, selectedVestibular, selectedArea, selectedTopic, selectedStatus, attemptsByQuestion]);

  const effectiveCount = Math.min(questionCount, matchingQuestions.length);
  const estimatedTimeMinutes = Math.round(effectiveCount * 3); // ~3 min por questão

  // Presets rápidos
  const applyPreset = (preset: 'enem_rapido' | 'natureza' | 'revisao_erros' | 'uerj_qualif') => {
    if (preset === 'enem_rapido') {
      setSelectedVestibular('ENEM');
      setSelectedArea('TODAS');
      setSelectedTopic('TODOS');
      setSelectedStatus('NAO_RESOLVIDAS');
      setQuestionCount(10);
    } else if (preset === 'natureza') {
      setSelectedVestibular('TODOS');
      setSelectedArea('Ciências da Natureza e suas Tecnologias');
      setSelectedTopic('TODOS');
      setSelectedStatus('TODAS');
      setQuestionCount(15);
    } else if (preset === 'revisao_erros') {
      setSelectedVestibular('TODOS');
      setSelectedArea('TODAS');
      setSelectedTopic('TODOS');
      setSelectedStatus('ERRADAS');
      setQuestionCount(10);
    } else if (preset === 'uerj_qualif') {
      setSelectedVestibular('UERJ');
      setSelectedArea('TODAS');
      setSelectedTopic('TODOS');
      setSelectedStatus('TODAS');
      setQuestionCount(15);
    }
  };

  const handleStart = () => {
    onStartSession(
      {
        vestibular: selectedVestibular,
        area: selectedArea,
        topic: selectedTopic,
        discipline: 'TODAS',
        searchQuery: '',
        status: selectedStatus,
      },
      questionCount
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Banner Principal Neobrutalista */}
      <div className="bg-[#FFE600] neo-border neo-shadow-lg p-6 md:p-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-black text-white px-2.5 py-1 text-xs font-black uppercase mb-3">
              <Zap className="w-4 h-4 text-[#FFE600]" />
              <span>Painel de Início • Windows 11</span>
            </div>
            <h2 className="text-2xl md:text-4xl font-black text-black tracking-tight leading-none mb-2">
              CONFIGURAR SESSÃO DE QUESTÕES
            </h2>
            <p className="text-sm font-bold text-gray-800 max-w-xl">
              Escolha exatamente o volume de questões, bancas, disciplinas e matérias que deseja
              treinar hoje com cronometragem e rascunho de mesa digitalizadora.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-2">
            <button
              type="button"
              onClick={onNavigateToSrs}
              className="px-4 py-2.5 bg-[#00F0FF] text-black font-black text-xs neo-btn flex items-center gap-2"
              title="Acessar o deck de questões agendadas para revisão com o algoritmo SM-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Repetição Espaçada (SRS)</span>
            </button>
          </div>
        </div>

        {/* Presets Rápidos de 1 Clique */}
        <div className="mt-6 pt-4 border-t-2 border-black">
          <span className="text-xs font-black uppercase tracking-wider text-black block mb-2">
            Atalhos Rápidos de Sessão:
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyPreset('enem_rapido')}
              className="px-3 py-1.5 text-xs font-black bg-white hover:bg-black hover:text-white neo-border-sm transition-all"
            >
              ⚡ Simulado ENEM (10 questões)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('natureza')}
              className="px-3 py-1.5 text-xs font-black bg-white hover:bg-black hover:text-white neo-border-sm transition-all"
            >
              🔬 Foco Ciências da Natureza
            </button>
            <button
              type="button"
              onClick={() => applyPreset('uerj_qualif')}
              className="px-3 py-1.5 text-xs font-black bg-white hover:bg-black hover:text-white neo-border-sm transition-all"
            >
              🎯 UERJ Qualificação
            </button>
            <button
              type="button"
              onClick={() => applyPreset('revisao_erros')}
              className="px-3 py-1.5 text-xs font-black bg-[#FF3366] text-white hover:bg-red-700 neo-border-sm transition-all"
            >
              🔁 Revisão de Erros
            </button>
          </div>
        </div>
      </div>

      {/* Grade de Configurações da Sessão */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* COLUNA 1: QUANTIDADE & VESTIBULARES */}
        <div className="bg-white neo-border neo-shadow p-6 space-y-5">
          {/* 1. Quantidade de Questões */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black mb-2 flex items-center justify-between">
              <span>1. Volume de Questões na Sessão</span>
              <span className="text-sm font-black bg-[#FFE600] px-2 py-0.5 neo-border-sm">
                {questionCount} questões
              </span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 15, 20, 30, 45, 60, 90].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setQuestionCount(num)}
                  className={`py-2 text-xs font-black neo-border-sm transition-all ${
                    questionCount === num
                      ? 'bg-black text-white shadow-none'
                      : 'bg-[#F8F5EE] text-black hover:bg-gray-200'
                  }`}
                >
                  {num} itens
                </button>
              ))}
            </div>
          </div>

          {/* 2. Seleção de Vestibular */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black mb-2">
              2. Vestibular / Banca Examinadora
            </label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedVestibular('TODOS');
                  setSelectedTopic('TODOS');
                }}
                className={`w-full p-2.5 text-xs font-black neo-border-sm text-left flex items-center justify-between transition-all ${
                  selectedVestibular === 'TODOS'
                    ? 'bg-black text-white'
                    : 'bg-[#F8F5EE] text-black hover:bg-gray-200'
                }`}
              >
                <span>Todos os Vestibulares & Concursos</span>
                <span className="font-mono text-[11px]">{questions.length} questões</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                {ALL_VESTIBULARES.map((vest) => {
                  const countForVest = questions.filter((q) => q.vestibular === vest.id).length;
                  const isSelected = selectedVestibular === vest.id;
                  return (
                    <button
                      key={vest.id}
                      type="button"
                      onClick={() => {
                        setSelectedVestibular(vest.id);
                        setSelectedTopic('TODOS');
                      }}
                      className={`p-2.5 text-xs font-black neo-border-sm text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? `${vest.color} ring-2 ring-black font-extrabold`
                          : 'bg-white text-black hover:bg-yellow-50'
                      }`}
                    >
                      <span>{vest.id}</span>
                      <span className="font-mono text-[10px] opacity-80">{countForVest}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. Status de Resolução */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black mb-2">
              3. Status das Questões
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedStatus('NAO_RESOLVIDAS')}
                className={`py-2 px-2 text-xs font-black neo-border-sm text-center transition-all ${
                  selectedStatus === 'NAO_RESOLVIDAS'
                    ? 'bg-[#00E599] text-black ring-2 ring-black'
                    : 'bg-white text-gray-800 hover:bg-gray-100'
                }`}
              >
                Só Pendentes
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('ERRADAS')}
                className={`py-2 px-2 text-xs font-black neo-border-sm text-center transition-all ${
                  selectedStatus === 'ERRADAS'
                    ? 'bg-[#FF3366] text-white ring-2 ring-black'
                    : 'bg-white text-gray-800 hover:bg-gray-100'
                }`}
              >
                Só Erros
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('TODAS')}
                className={`py-2 px-2 text-xs font-black neo-border-sm text-center transition-all ${
                  selectedStatus === 'TODAS'
                    ? 'bg-black text-white ring-2 ring-black'
                    : 'bg-white text-gray-800 hover:bg-gray-100'
                }`}
              >
                Todas
              </button>
            </div>
          </div>
        </div>

        {/* COLUNA 2: MATÉRIAS, CONTEÚDOS ESPECÍFICOS & RESUMO */}
        <div className="bg-white neo-border neo-shadow p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            {/* 4. Matérias / Áreas */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black mb-2">
                4. Tema / Área de Conhecimento
              </label>
              <select
                value={selectedArea}
                onChange={(e) => {
                  setSelectedArea(e.target.value as any);
                  setSelectedTopic('TODOS');
                }}
                className="w-full p-2.5 text-xs font-black neo-border-sm bg-[#F5F2EA] focus:bg-white focus:outline-none"
              >
                <option value="TODAS">Todas as Áreas de Conhecimento</option>
                {ALL_AREAS.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Conteúdo Específico */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black mb-2">
                5. Conteúdo Específico
              </label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full p-2.5 text-xs font-black neo-border-sm bg-[#F5F2EA] focus:bg-white focus:outline-none"
              >
                <option value="TODOS">Todos os Conteúdos ({availableTopics.length} disponíveis)</option>
                {availableTopics.map((top) => (
                  <option key={top} value={top}>
                    {top}
                  </option>
                ))}
              </select>
            </div>

            {/* Resumo Dinâmico da Sessão */}
            <div className="bg-[#FFFDF0] p-4 neo-border-sm space-y-2 text-xs font-bold">
              <div className="flex items-center justify-between pb-1 border-b border-gray-300">
                <span className="text-gray-600">Questões Disponíveis:</span>
                <span className="font-black text-black font-mono text-sm">
                  {matchingQuestions.length} questões
                </span>
              </div>
              <div className="flex items-center justify-between pb-1 border-b border-gray-300">
                <span className="text-gray-600">Questões Selecionadas:</span>
                <span className="font-black text-black font-mono text-sm">
                  {effectiveCount} itens
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-black" /> Tempo Estimado:
                </span>
                <span className="font-black text-green-700 font-mono">
                  ~{estimatedTimeMinutes} minutos
                </span>
              </div>
            </div>
          </div>

          {/* Botão de Disparo da Sessão */}
          <div>
            <button
              type="button"
              disabled={matchingQuestions.length === 0}
              onClick={handleStart}
              className="w-full py-4 text-base font-black neo-btn bg-[#00E599] text-black disabled:opacity-40 disabled:hover:translate-x-0 flex items-center justify-center gap-3 tracking-wide"
            >
              <Play className="w-5 h-5 fill-black" />
              <span>
                {matchingQuestions.length === 0
                  ? 'NENHUMA QUESTÃO ENCONTRADA'
                  : `INICIAR SESSÃO (${effectiveCount} QUESTÕES)`}
              </span>
            </button>
            {matchingQuestions.length === 0 && (
              <p className="text-[11px] text-red-600 font-bold text-center mt-2">
                Experimente alterar o filtro de status ou selecionar "Todos os Conteúdos".
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
