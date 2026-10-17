/**
 * @file src/components/session/StudySessionStarter.tsx
 * @description Interface dedicada para configuração de simulados e sessões de estudo.
 * Acessada através do atalho 'Configurar Sessão de Questões' na tela Home.
 * Implementa seleção dinâmica de volume de questões (scroll do mouse e clique para digitar)
 * e remove completamente a seção de status de questões.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Play, 
  ArrowLeft, 
  Layers, 
  Sparkles, 
  Clock, 
  Plus, 
  Minus, 
  Target,
  Sliders,
  CheckCircle2,
  MousePointer
} from 'lucide-react';
import type { Question, ExamType, AreaOfKnowledge, UserAttempt, FilterState } from '../../types/index.ts';

interface StudySessionStarterProps {
  questions: Question[];
  attempts: UserAttempt[];
  onStartSession: (configuredFilters: FilterState, limit: number) => void;
  onBackToHome: () => void;
}

const ALL_VESTIBULARES: Array<{ id: ExamType | 'TODOS'; label: string; badge: string }> = [
  { id: 'TODOS', label: 'Todos os Vestibulares', badge: 'Geral' },
  { id: 'ENEM', label: 'ENEM (TRI 3PL)', badge: 'TRI' },
  { id: 'UERJ', label: 'UERJ (Qualificação)', badge: 'Conceito A' },
  { id: 'FUVEST', label: 'FUVEST (USP)', badge: '1ª Fase' },
  { id: 'UNICAMP', label: 'UNICAMP', badge: '1ª Fase' },
  { id: 'CONCURSOS', label: 'Concursos Públicos', badge: 'Geral' },
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
  onBackToHome,
}) => {
  // 1. VOLUME DE QUESTÕES: Valor inicial 5, scroll do mouse altera de 1 em 1, clique edita diretamente
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [isEditingCount, setIsEditingCount] = useState<boolean>(false);
  const inputCountRef = useRef<HTMLInputElement | null>(null);

  // 2. FILTROS DA SESSÃO
  const [selectedVestibular, setSelectedVestibular] = useState<ExamType | 'TODOS'>('TODOS');
  const [selectedArea, setSelectedArea] = useState<AreaOfKnowledge | 'TODAS'>('TODAS');
  const [selectedTopic, setSelectedTopic] = useState<string>('TODOS');

  // Foca no input quando clicar para editar número
  useEffect(() => {
    if (isEditingCount && inputCountRef.current) {
      inputCountRef.current.focus();
      inputCountRef.current.select();
    }
  }, [isEditingCount]);

  // Conteúdos específicos dinâmicos
  const availableTopics = useMemo(() => {
    let pool = questions;
    if (selectedVestibular !== 'TODOS') pool = pool.filter((q) => q.vestibular === selectedVestibular);
    if (selectedArea !== 'TODAS') pool = pool.filter((q) => q.area === selectedArea);
    const set = new Set<string>();
    for (const q of pool) {
      if (q.topic) set.add(q.topic);
    }
    return Array.from(set).sort();
  }, [questions, selectedVestibular, selectedArea]);

  // Questões correspondentes aos filtros selecionados
  const matchingQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (selectedVestibular !== 'TODOS' && q.vestibular !== selectedVestibular) return false;
      if (selectedArea !== 'TODAS' && q.area !== selectedArea) return false;
      if (selectedTopic !== 'TODOS' && q.topic !== selectedTopic) return false;
      return true;
    });
  }, [questions, selectedVestibular, selectedArea, selectedTopic]);

  const maxAvailable = Math.max(1, matchingQuestions.length);

  // Manipulador de Scroll do Mouse (Wheel) sobre o seletor de volume
  const handleWheelVolume = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      // Scroll para cima: aumenta de 1 em 1
      setQuestionCount((prev) => Math.min(prev + 1, maxAvailable));
    } else if (e.deltaY > 0) {
      // Scroll para baixo: diminui de 1 em 1
      setQuestionCount((prev) => Math.max(1, prev - 1));
    }
  };

  const handleStart = () => {
    const finalLimit = Math.max(1, Math.min(questionCount, maxAvailable));
    onStartSession(
      {
        vestibular: selectedVestibular,
        area: selectedArea,
        topic: selectedTopic,
        discipline: 'TODAS',
        searchQuery: '',
        status: 'TODAS',
      },
      finalLimit
    );
  };

  const estimatedMinutes = Math.round(questionCount * 3);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Barra Superior com botão de Voltar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToHome}
          className="px-3.5 py-1.5 text-xs font-black neo-btn bg-white dark:bg-[#18181B] text-black dark:text-white flex items-center gap-2 hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para a Tela Inicial</span>
        </button>

        <span className="text-xs font-mono font-bold text-gray-600 dark:text-gray-400">
          Simulado Personalizado
        </span>
      </div>

      {/* Cabeçalho da Configuração */}
      <div className="bg-white dark:bg-[#18181B] neo-border neo-shadow p-5 md:p-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 bg-[#FFE600] text-black neo-border-sm">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-black dark:text-white uppercase tracking-tight">
              CONFIGURAR SESSÃO DE QUESTÕES
            </h2>
            <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Personalize o volume de questões e recorte temático para iniciar seu simulado focado.
            </p>
          </div>
        </div>
      </div>

      {/* SEÇÃO 1: VOLUME DE QUESTÕES NA SESSÃO (Sistema Dinâmico com Scroll e Clique) */}
      <div className="bg-white dark:bg-[#18181B] neo-border neo-shadow p-6 space-y-4">
        <div className="flex items-center justify-between border-b-2 border-black dark:border-gray-700 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 flex items-center justify-center bg-black text-white dark:bg-[#FFE600] dark:text-black font-black text-xs">
              1
            </span>
            <h3 className="text-sm font-black uppercase tracking-wider text-black dark:text-white">
              VOLUME DE QUESTÕES NA SESSÃO
            </h3>
          </div>

          <span className="text-[11px] font-mono font-bold text-gray-500 dark:text-gray-400 hidden sm:inline">
            Role o mouse ou clique no número para digitar
          </span>
        </div>

        {/* Seletor Dinâmico de Volume com Scroll e Clique */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4">
          {/* Caixa de Scroll / Digitação */}
          <div
            onWheel={handleWheelVolume}
            className="flex items-center gap-3 bg-[#F8F5EE] dark:bg-[#202024] p-3 neo-border select-none"
            title="Use a rodinha do mouse sobre esta área para aumentar ou diminuir de 1 em 1"
          >
            {/* Botão Diminuir */}
            <button
              type="button"
              onClick={() => setQuestionCount((prev) => Math.max(1, prev - 1))}
              disabled={questionCount <= 1}
              className="w-10 h-10 bg-white dark:bg-[#27272A] neo-border-sm flex items-center justify-center font-black text-black dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30"
              title="Diminuir (1 questão)"
            >
              <Minus className="w-5 h-5 stroke-[3]" />
            </button>

            {/* Valor Numérico Central (Clique para digitar) */}
            <div
              onClick={() => setIsEditingCount(true)}
              className="w-32 h-16 bg-white dark:bg-[#18181B] neo-border-sm flex flex-col items-center justify-center cursor-pointer hover:border-[#FFE600] transition-colors relative"
              title="Clique para digitar o número exato desejado"
            >
              {isEditingCount ? (
                <input
                  ref={inputCountRef}
                  type="number"
                  min="1"
                  max={maxAvailable}
                  value={questionCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      setQuestionCount(Math.max(1, Math.min(val, 180)));
                    }
                  }}
                  onBlur={() => setIsEditingCount(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setIsEditingCount(false);
                  }}
                  className="w-full text-center text-3xl font-black bg-transparent text-black dark:text-white focus:outline-none"
                />
              ) : (
                <>
                  <span className="text-3xl font-black text-black dark:text-[#FFE600] tracking-tight">
                    {questionCount}
                  </span>
                  <span className="text-[9px] uppercase font-bold text-gray-500 dark:text-gray-400">
                    questões
                  </span>
                </>
              )}
            </div>

            {/* Botão Aumentar */}
            <button
              type="button"
              onClick={() => setQuestionCount((prev) => Math.min(prev + 1, maxAvailable))}
              disabled={questionCount >= maxAvailable}
              className="w-10 h-10 bg-white dark:bg-[#27272A] neo-border-sm flex items-center justify-center font-black text-black dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30"
              title="Aumentar (1 questão)"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
            </button>
          </div>

          {/* Dicas e Instruções Interativas */}
          <div className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300 max-w-xs text-center sm:text-left">
            <div className="flex items-center gap-1.5 font-bold text-black dark:text-white">
              <MousePointer className="w-4 h-4 text-[#FF5A36]" />
              <span>Controle Ultra-Rápido:</span>
            </div>
            <p className="text-[11px] text-gray-600 dark:text-gray-400">
              • <strong>Role o scroll do mouse</strong> para subir ou descer de 1 em 1.
            </p>
            <p className="text-[11px] text-gray-600 dark:text-gray-400">
              • <strong>Clique sobre o número</strong> para digitar qualquer valor (ex: 15, 30, 45, 90).
            </p>
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: VESTIBULARES E ÁREAS DE CONHECIMENTO */}
      <div className="bg-white dark:bg-[#18181B] neo-border neo-shadow p-6 space-y-5">
        <div className="flex items-center gap-2 border-b-2 border-black dark:border-gray-700 pb-2">
          <span className="w-6 h-6 flex items-center justify-center bg-black text-white dark:bg-[#FFE600] dark:text-black font-black text-xs">
            2
          </span>
          <h3 className="text-sm font-black uppercase tracking-wider text-black dark:text-white">
            BANCA E CONTEÚDOS DA SESSÃO
          </h3>
        </div>

        {/* Escolha do Vestibular */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">
            Vestibular / Banca
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ALL_VESTIBULARES.map((vest) => {
              const isSelected = selectedVestibular === vest.id;
              return (
                <button
                  key={vest.id}
                  type="button"
                  onClick={() => {
                    setSelectedVestibular(vest.id);
                    setSelectedTopic('TODOS');
                  }}
                  className={`p-2.5 text-left neo-border-sm flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'bg-[#FFE600] text-black font-black scale-102 shadow-none'
                      : 'bg-[#F8F5EE] dark:bg-[#202024] text-gray-800 dark:text-gray-200 hover:bg-yellow-50 dark:hover:bg-gray-700 font-bold'
                  }`}
                >
                  <span className="text-xs">{vest.label}</span>
                  <span className="text-[9px] font-mono uppercase text-gray-600 dark:text-gray-400 mt-1">
                    {vest.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Escolha da Área e Conteúdo Específico */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
              Área de Conhecimento
            </label>
            <select
              value={selectedArea}
              onChange={(e) => {
                setSelectedArea(e.target.value as any);
                setSelectedTopic('TODOS');
              }}
              className="w-full p-2.5 text-xs font-extrabold neo-border-sm bg-[#F8F5EE] dark:bg-[#27272A] text-black dark:text-white focus:outline-none"
            >
              <option value="TODAS">Todas as Áreas de Conhecimento</option>
              {ALL_AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
              Conteúdo Específico ({availableTopics.length})
            </label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full p-2.5 text-xs font-extrabold neo-border-sm bg-[#F8F5EE] dark:bg-[#27272A] text-black dark:text-white focus:outline-none"
            >
              <option value="TODOS">Todos os Conteúdos Específicos</option>
              {availableTopics.map((top) => (
                <option key={top} value={top}>
                  {top}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Resumo da Sessão e Ação de Início */}
      <div className="bg-[#FFE600] dark:bg-[#27272A] neo-border neo-shadow-lg p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-black text-black dark:text-white">
            <Target className="w-4 h-4" />
            <span>Sessão Pronta para Início</span>
          </div>
          <p className="text-xs font-bold text-gray-800 dark:text-gray-300">
            {questionCount} questões selecionadas • {matchingQuestions.length} questões disponíveis no banco
          </p>
          <div className="flex items-center justify-center sm:justify-start gap-1 text-[11px] font-mono text-gray-700 dark:text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Tempo estimado: ~{estimatedMinutes} min</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleStart}
          className="w-full sm:w-auto px-8 py-3.5 text-sm font-black neo-btn bg-black text-white dark:bg-[#00F0FF] dark:text-black flex items-center justify-center gap-2 hover:scale-105"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>INICIAR SIMULADO AGORA</span>
        </button>
      </div>
    </div>
  );
};
