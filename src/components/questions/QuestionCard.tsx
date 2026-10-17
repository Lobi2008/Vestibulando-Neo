/**
 * @file src/components/questions/QuestionCard.tsx
 * @description Card interativo de resolução de questão com design Neobrutalista.
 * Suporta alternativas A-E, eliminação por clique longo de 1.5s, atalhos 'S' e 'CTRL+Z',
 * botão unificado de Rascunho com múltiplos modos, perguntas em negrito e pontuação automática no ENEM.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Edit3, 
  ChevronRight, 
  ChevronLeft, 
  Lightbulb, 
  Sparkles, 
  Layers, 
  Columns, 
  Brain, 
  ChevronDown,
  RotateCcw,
  Ban,
  Copy,
  Check,
  Pencil
} from 'lucide-react';
import type { Question, UserAttempt, DrawingStroke, SrsRating, SrsItemData } from '../../types/index.ts';
import { DigitalPenCanvas } from '../canvas/DigitalPenCanvas.tsx';
import { RichText } from '../common/RichText.tsx';
import { splitStatementAndPrompt } from '../../utils/questionFormatter.ts';
import {
  buildQuestionClipboard,
  buildResolutionClipboard,
  copyToClipboard,
} from '../../utils/questionClipboard.ts';

interface QuestionCardProps {
  question: Question;
  lastAttempt?: UserAttempt;
  savedStrokes?: DrawingStroke[];
  srsData?: SrsItemData;
  onAnswer: (questionId: string, selected: 'A' | 'B' | 'C' | 'D' | 'E', timeSpent: number) => void;
  onRateSrs?: (questionId: string, rating: SrsRating) => void;
  onSaveStrokes: (questionId: string, strokes: DrawingStroke[]) => void;
  /** Grava a resolução (nova ou editada) no banco. Retorna false se não foi possível salvar. */
  onUpdateExplanation?: (questionId: string, explanation: string) => boolean;
  onNextQuestion: () => void;
  onPrevQuestion: () => void;
  currentIndex: number;
  totalCount: number;
  isDarkMode?: boolean;
  onRascunhoActiveChange?: (active: boolean) => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  lastAttempt,
  savedStrokes = [],
  srsData,
  onAnswer,
  onRateSrs,
  onSaveStrokes,
  onUpdateExplanation,
  onNextQuestion,
  onPrevQuestion,
  currentIndex,
  totalCount,
  isDarkMode,
  onRascunhoActiveChange,
}) => {
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | 'E' | null>(
    lastAttempt?.selectedAlternative || null
  );
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(!!lastAttempt);
  const [timeSpent, setTimeSpent] = useState<number>(lastAttempt?.timeSpentSeconds || 0);
  const [showExplanation, setShowExplanation] = useState<boolean>(!!lastAttempt);
  
  // Modos de posicionamento da mesa digitalizadora (múltiplos simultâneos)
  const [showSide, setShowSide] = useState<boolean>(false);
  const [showBottom, setShowBottom] = useState<boolean>(false);
  const [showOverlay, setShowOverlay] = useState<boolean>(false);
  const [isRascunhoMenuOpen, setIsRascunhoMenuOpen] = useState<boolean>(false);

  // Alternativas eliminadas (riscadas) pelo usuário
  const [eliminatedOptions, setEliminatedOptions] = useState<Record<string, boolean>>({});
  const [holdingAltId, setHoldingAltId] = useState<string | null>(null);
  const holdTimerRef = useRef<any>(null);
  const isHoldCompletedRef = useRef<boolean>(false);

  const [selectedSrsRating, setSelectedSrsRating] = useState<SrsRating | null>(
    lastAttempt?.srsRating || srsData?.lastRating || null
  );

  const timerRef = useRef<any>(null);

  // Copiar enunciado/resolução e editar resolução
  const [copiedKind, setCopiedKind] = useState<'question' | 'resolution' | 'error' | null>(null);
  const copyTimerRef = useRef<any>(null);
  const [isEditingExplanation, setIsEditingExplanation] = useState<boolean>(false);
  const [explanationDraft, setExplanationDraft] = useState<string>('');
  const [explanationSaveFailed, setExplanationSaveFailed] = useState<boolean>(false);

  useEffect(() => {
    setIsEditingExplanation(false);
    setExplanationSaveFailed(false);
    setCopiedKind(null);
  }, [question.id]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setSelectedOption(lastAttempt?.selectedAlternative || null);
    setHasSubmitted(!!lastAttempt);
    setShowExplanation(!!lastAttempt);
    setTimeSpent(lastAttempt?.timeSpentSeconds || 0);
    setSelectedSrsRating(lastAttempt?.srsRating || srsData?.lastRating || null);
    setEliminatedOptions({});
    setHoldingAltId(null);

    if (!lastAttempt) {
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, [question.id, lastAttempt, srsData]);

  useEffect(() => {
    onRascunhoActiveChange?.(showSide || showBottom || showOverlay);
  }, [showSide, showBottom, showOverlay, onRascunhoActiveChange]);

  useEffect(() => {
    return () => {
      onRascunhoActiveChange?.(false);
    };
  }, [onRascunhoActiveChange]);

  // Formata o enunciado da questão separando o contexto e o comando em negrito
  const { contextText, questionPrompt } = useMemo(() => {
    return splitStatementAndPrompt(question.statement, question.vestibular);
  }, [question.statement, question.vestibular]);

  const hasExplanation = (question.explanation || '').trim().length > 0;

  const flashCopied = (kind: 'question' | 'resolution' | 'error') => {
    setCopiedKind(kind);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopiedKind(null), 2000);
  };

  const handleCopyQuestion = async () => {
    const ok = await copyToClipboard(buildQuestionClipboard(question, { contextText, questionPrompt }));
    flashCopied(ok ? 'question' : 'error');
  };

  const handleCopyResolution = async () => {
    const ok = await copyToClipboard(buildResolutionClipboard(question));
    flashCopied(ok ? 'resolution' : 'error');
  };

  const handleStartEditExplanation = () => {
    setExplanationDraft(question.explanation || '');
    setExplanationSaveFailed(false);
    setIsEditingExplanation(true);
  };

  const handleSaveExplanation = () => {
    const ok = onUpdateExplanation ? onUpdateExplanation(question.id, explanationDraft) : false;
    if (ok) {
      setIsEditingExplanation(false);
      setExplanationSaveFailed(false);
    } else {
      setExplanationSaveFailed(true);
    }
  };

  // Atalhos de teclado (A-E/1-5, R para rascunho, S para pular, Enter para confirmar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      // Atalho 'S' para pular para a próxima questão
      if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        onNextQuestion();
        return;
      }

      if (!hasSubmitted) {
        if (e.key === '1' || e.key.toLowerCase() === 'a') setSelectedOption('A');
        if (e.key === '2' || e.key.toLowerCase() === 'b') setSelectedOption('B');
        if (e.key === '3' || e.key.toLowerCase() === 'c') setSelectedOption('C');
        if (e.key === '4' || (e.key.toLowerCase() === 'd' && !e.ctrlKey)) {
          if (question.alternatives.some((alt) => alt.id === 'D')) {
            setSelectedOption('D');
          }
        }
        if (e.key === '5' || e.key.toLowerCase() === 'e') {
          if (question.alternatives.some((alt) => alt.id === 'E')) {
            setSelectedOption('E');
          }
        }
      }

      if (e.key === 'Enter' && selectedOption && !hasSubmitted) {
        handleSubmitAnswer();
      }

      // Atalho 'R' para alternar rascunho lateral
      if (e.key.toLowerCase() === 'r' && !e.ctrlKey) {
        setShowSide((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedOption, hasSubmitted, question, onNextQuestion]);

  const handleSubmitAnswer = () => {
    if (!selectedOption || hasSubmitted) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setHasSubmitted(true);
    setShowExplanation(true);
    onAnswer(question.id, selectedOption, timeSpent);
  };

  const handleSrsRate = (rating: SrsRating) => {
    setSelectedSrsRating(rating);
    onRateSrs?.(question.id, rating);
  };

  // Tratadores de eliminação de alternativa segurando por 1.5s
  const handlePointerDownAlt = (altId: string) => {
    if (hasSubmitted) return;
    isHoldCompletedRef.current = false;
    setHoldingAltId(altId);

    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);

    holdTimerRef.current = setTimeout(() => {
      isHoldCompletedRef.current = true;
      setEliminatedOptions((prev) => ({
        ...prev,
        [altId]: !prev[altId],
      }));
      setHoldingAltId(null);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 1500);
  };

  const handlePointerUpAlt = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldingAltId(null);
  };

  const handleClickAlt = (altId: 'A' | 'B' | 'C' | 'D' | 'E') => {
    if (hasSubmitted) return;
    // Se foi long-press, consome o evento sem selecionar a alternativa
    if (isHoldCompletedRef.current) {
      isHoldCompletedRef.current = false;
      return;
    }
    setSelectedOption(altId);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isCorrect = selectedOption === question.correctAlternative;

  const vestibularColor = 
    question.vestibular === 'ENEM' 
      ? 'bg-[#FFE600] text-black' 
      : question.vestibular === 'UERJ'
      ? 'bg-[#00F0FF] text-black'
      : question.vestibular === 'FUVEST'
      ? 'bg-[#FF5A36] text-white'
      : question.vestibular === 'CONCURSOS'
      ? 'bg-purple-300 text-black'
      : 'bg-[#00E599] text-black';

  const activeRascunhoCount = (showSide ? 1 : 0) + (showBottom ? 1 : 0) + (showOverlay ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Barra Superior de Controles: Título Simples "Rascunho" e Botão Unificado */}
      <div className="bg-white dark:bg-[#18181B] neo-border neo-shadow-sm px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-black text-black dark:text-white">
          <Edit3 className="w-4 h-4 text-[#FF5A36]" />
          <span>Rascunho:</span>
        </div>

        {/* Botão Unificado de Rascunho com Seletor Multi-modo */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsRascunhoMenuOpen(!isRascunhoMenuOpen)}
            className={`px-3 py-1.5 text-xs font-black neo-btn flex items-center gap-2 ${
              activeRascunhoCount > 0 
                ? 'bg-[#FFE600] text-black' 
                : 'bg-white text-black hover:bg-gray-100 dark:bg-[#27272A] dark:text-white dark:hover:bg-gray-700'
            }`}
            title="Escolher onde o rascunho aparece"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>
              {activeRascunhoCount === 0
                ? 'Ativar Rascunho'
                : `Rascunho Ativo (${activeRascunhoCount})`}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isRascunhoMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isRascunhoMenuOpen && (
            <div 
              className="absolute right-0 top-full mt-2 z-40 bg-white dark:bg-[#1F1F23] neo-border neo-shadow-lg p-2.5 min-w-[190px] space-y-1.5"
              onMouseLeave={() => setIsRascunhoMenuOpen(false)}
            >
              <div className="text-[10px] font-mono uppercase font-black text-gray-500 dark:text-gray-400 pb-1 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <span>Posição</span>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  setShowSide(!showSide);
                  setIsRascunhoMenuOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 text-xs font-bold neo-border-sm flex items-center justify-between transition-colors ${
                  showSide 
                    ? 'bg-[#FFE600] text-black font-black' 
                    : 'bg-gray-50 dark:bg-[#27272A] text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Columns className="w-3.5 h-3.5" />
                  Ao lado
                </span>
                <span className="font-mono text-xs font-black">{showSide ? '✓ Ativo' : 'OFF'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowBottom(!showBottom);
                  setIsRascunhoMenuOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 text-xs font-bold neo-border-sm flex items-center justify-between transition-colors ${
                  showBottom 
                    ? 'bg-[#FFE600] text-black font-black' 
                    : 'bg-gray-50 dark:bg-[#27272A] text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Abaixo
                </span>
                <span className="font-mono text-xs font-black">{showBottom ? '✓ Ativo' : 'OFF'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowOverlay(!showOverlay);
                  setIsRascunhoMenuOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 text-xs font-bold neo-border-sm flex items-center justify-between transition-colors ${
                  showOverlay 
                    ? 'bg-[#FF3366] text-white font-black animate-pulse' 
                    : 'bg-gray-50 dark:bg-[#27272A] text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Sobre o texto
                </span>
                <span className="font-mono text-xs font-black">{showOverlay ? '✓ Ativo' : 'OFF'}</span>
              </button>

              {activeRascunhoCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowSide(false);
                    setShowBottom(false);
                    setShowOverlay(false);
                    setIsRascunhoMenuOpen(false);
                  }}
                  className="w-full text-center text-[10px] font-black text-red-500 hover:text-red-700 pt-1.5 border-t border-gray-200 dark:border-gray-700"
                >
                  Fechar todos
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Grid Principal: se showSide for true, divide em colunas balanceadas para 16:9 e ultrawide 21:9 */}
      <div className={`grid gap-4 md:gap-6 ${showSide ? 'grid-cols-1 lg:grid-cols-12 items-start' : 'grid-cols-1'}`}>
        {/* Lado Esquerdo: Card da Questão */}
        <div className={`bg-white dark:bg-[#18181B] neo-border neo-shadow-lg p-4 md:p-6 2xl:p-7 relative overflow-hidden ${showSide ? 'lg:col-span-6' : ''}`}>
          {/* MODO OVERLAY: Canvas de Mesa Digitalizadora Transparente Diretamente Sobre o Texto */}
          {showOverlay && (
            <div className="absolute inset-0 z-30 pointer-events-auto bg-transparent">
              <DigitalPenCanvas
                questionId={question.id}
                initialStrokes={savedStrokes}
                onSaveStrokes={(strokes) => onSaveStrokes(question.id, strokes)}
                mode="overlay"
                isDarkMode={isDarkMode}
                onClose={() => setShowOverlay(false)}
                className="h-full w-full bg-transparent"
              />
            </div>
          )}

          {/* Metadados e Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b-3 border-[#111111] dark:border-gray-700">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-1 text-xs font-black neo-border-sm ${vestibularColor}`}>
                {question.vestibular} {question.year}
              </span>

              {question.edition && (
                <span className="px-2 py-0.5 text-xs font-bold bg-gray-100 dark:bg-gray-800 neo-border-sm text-gray-800 dark:text-gray-200">
                  {question.edition}
                </span>
              )}

              <span className="px-2 py-0.5 text-xs font-extrabold bg-[#F5F2EA] dark:bg-gray-800 neo-border-sm text-black dark:text-white">
                {question.discipline}
              </span>

              <span className="px-2 py-0.5 text-xs font-bold bg-[#E8F0FE] dark:bg-blue-950 neo-border-sm text-blue-900 dark:text-white">
                📌 {question.topic}
              </span>

              {question.difficultyLevel && (
                <span
                  className={`px-2 py-0.5 text-[11px] font-bold neo-border-sm ${
                    question.difficultyLevel === 'Fácil'
                      ? 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300'
                      : question.difficultyLevel === 'Médio'
                      ? 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-300'
                      : 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300'
                  }`}
                >
                  Nível: {question.difficultyLevel}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Copiar enunciado + alternativas formatados */}
              <button
                type="button"
                onClick={handleCopyQuestion}
                className="flex items-center gap-1.5 text-[11px] font-black bg-white dark:bg-[#27272A] px-2.5 py-1 neo-border-sm text-black dark:text-white hover:bg-[#FFE600] dark:hover:bg-[#FFE600] dark:hover:text-black"
                title="Copiar questão e alternativas"
              >
                {copiedKind === 'question' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>
                  {copiedKind === 'question'
                    ? 'Copiado!'
                    : copiedKind === 'error'
                    ? 'Erro ao copiar'
                    : 'Copiar questão'}
                </span>
              </button>

              {/* Cronômetro com texto de cor clara no Modo Escuro */}
              <div className="flex items-center gap-1.5 text-xs font-mono font-black bg-[#F8F5EE] dark:bg-[#27272A] px-2.5 py-1 neo-border-sm text-[#111111] dark:text-[#FFFFFF] border-black dark:border-gray-600 shadow-sm">
                <Clock className="w-3.5 h-3.5 text-black dark:text-[#00F0FF]" />
                <span className="text-[#111111] dark:text-[#FFFFFF]">{formatTimer(timeSpent)}</span>
              </div>
            </div>
          </div>

          {/* Texto de Contexto adicional se houver */}
          {question.contextSnippet && (
            <RichText
              text={question.contextSnippet}
              className="selectable-text mb-4 p-3 bg-[#FBF8F1] dark:bg-[#202024] border-l-4 border-black dark:border-yellow-400 text-sm italic text-gray-800 dark:text-gray-200"
            />
          )}

          {/* Texto de Apoio do Enunciado */}
          {contextText && (
            <RichText
              text={contextText}
              className="selectable-text text-base md:text-lg font-normal text-gray-800 dark:text-gray-200 leading-relaxed mb-4"
            />
          )}

          {/* Pergunta da Questão em Negrito com ':' automático no ENEM se necessário */}
          {questionPrompt && (
            <RichText
              text={questionPrompt}
              className="selectable-text text-base md:text-lg font-black text-black dark:text-white leading-relaxed mb-6 border-l-4 border-[#FFE600] pl-3 py-1.5 bg-[#FFFEEA]/60 dark:bg-[#27272A]"
            />
          )}

          {/* Lista de Alternativas (A-E) com Eliminação por Clique Longo (1.5s) */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between text-xs font-mono text-gray-500 dark:text-gray-400 pb-1">
              <span>Alternativas</span>
              <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                <Ban className="w-3 h-3" />
                Segure 1,5 s para riscar
              </span>
            </div>

            {question.alternatives.map((alt) => {
              const isSelected = selectedOption === alt.id;
              const isCorrectOption = alt.id === question.correctAlternative;
              const isEliminated = !!eliminatedOptions[alt.id];
              const isHolding = holdingAltId === alt.id;

              let buttonStyle = 'bg-white text-black hover:bg-gray-50 dark:bg-[#202024] dark:text-white dark:hover:bg-[#27272A]';

              if (hasSubmitted) {
                if (isCorrectOption) {
                  buttonStyle = 'bg-[#00E599] text-black font-extrabold ring-2 ring-black dark:ring-white';
                } else if (isSelected && !isCorrectOption) {
                  buttonStyle = 'bg-[#FF3366] text-white font-extrabold';
                } else {
                  buttonStyle = 'bg-gray-100 text-gray-400 opacity-60 dark:bg-gray-800 dark:text-gray-500';
                }
              } else if (isSelected) {
                buttonStyle = 'bg-[#FFE600] text-black font-extrabold translate-x-1 shadow-none';
              } else if (isEliminated) {
                buttonStyle = 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 opacity-50 line-through decoration-red-600 decoration-2';
              }

              return (
                <button
                  key={alt.id}
                  type="button"
                  disabled={hasSubmitted}
                  onPointerDown={() => handlePointerDownAlt(alt.id)}
                  onPointerUp={handlePointerUpAlt}
                  onPointerLeave={handlePointerUpAlt}
                  onClick={() => handleClickAlt(alt.id)}
                  className={`w-full text-left p-3.5 neo-border neo-shadow-sm flex items-start gap-3 transition-all relative overflow-hidden select-none ${buttonStyle}`}
                >
                  {/* Barra de progresso para o clique longo de 1.5s */}
                  {isHolding && (
                    <div 
                      className="absolute bottom-0 left-0 h-1 bg-[#FF3366] transition-all duration-[1500ms] w-full z-10" 
                      style={{ animation: 'progress 1.5s linear forwards' }}
                    />
                  )}

                  <span className={`w-7 h-7 flex-shrink-0 flex items-center justify-center font-black text-sm rounded-none neo-border-sm ${
                    isEliminated ? 'bg-red-700 text-white line-through' : 'bg-black text-white dark:bg-white dark:text-black'
                  }`}>
                    {alt.id}
                  </span>

                  <RichText
                    as="span"
                    text={alt.text}
                    className={`text-sm md:text-base font-medium flex-1 min-w-0 pt-0.5 ${
                      isEliminated ? 'line-through decoration-red-600 decoration-2' : ''
                    }`}
                    imgClassName="max-h-60 2xl:max-h-96"
                  />

                  {isEliminated && !hasSubmitted && (
                    <span className="flex-shrink-0 text-[10px] font-mono px-1.5 py-0.5 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 font-bold border border-red-500">
                      Riscada
                    </span>
                  )}

                  {hasSubmitted && isCorrectOption && (
                    <CheckCircle2 className="w-6 h-6 text-black flex-shrink-0" />
                  )}
                  {hasSubmitted && isSelected && !isCorrectOption && (
                    <XCircle className="w-6 h-6 text-white flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Botões de Ação & Navegação */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t-2 border-black dark:border-gray-700">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onPrevQuestion}
                disabled={currentIndex <= 0}
                className="px-3 py-2 text-xs font-bold neo-btn bg-white dark:bg-[#27272A] text-black dark:text-white disabled:opacity-30 flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>

              <span className="text-xs font-bold font-mono px-2 text-gray-800 dark:text-gray-200">
                {currentIndex + 1} de {totalCount}
              </span>

              <button
                type="button"
                onClick={onNextQuestion}
                disabled={currentIndex >= totalCount - 1}
                className="px-3 py-2 text-xs font-bold neo-btn bg-white dark:bg-[#27272A] text-black dark:text-white disabled:opacity-30 flex items-center gap-1"
                title="Próxima questão (tecla S)"
              >
                <span>Próxima</span>
                <span className="text-[10px] font-mono text-gray-500 ml-0.5">[S]</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div>
              {!hasSubmitted ? (
                <button
                  type="button"
                  onClick={handleSubmitAnswer}
                  disabled={!selectedOption}
                  className="px-8 py-2.5 text-sm font-black neo-btn bg-[#FFE600] text-black disabled:opacity-40 flex items-center gap-2"
                >
                  <span>Confirmar</span>
                  <Sparkles className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowExplanation(!showExplanation)}
                  className="px-4 py-2 text-xs font-black neo-btn bg-[#00F0FF] text-black flex items-center gap-1.5"
                >
                  <Lightbulb className="w-4 h-4" />
                  <span>{showExplanation ? 'Ocultar resolução' : 'Ver resolução'}</span>
                </button>
              )}
            </div>
          </div>

          {/* REPETIÇÃO ESPAÇADA (SRS): SELETOR DE FACILIDADE APÓS RESPONDER */}
          {hasSubmitted && (
            <div className="mt-5 p-4 bg-[#F5F2EA] dark:bg-[#202024] neo-border">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                <span className="text-sm font-black uppercase tracking-wider text-black dark:text-white">
                  Como foi essa questão?
                </span>
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300 mb-3">
                Sua resposta define quando a questão volta para revisão.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleSrsRate('ERRO')}
                  className={`p-2 text-xs font-black neo-border-sm transition-all ${
                    selectedSrsRating === 'ERRO'
                      ? 'bg-[#FF3366] text-white ring-2 ring-black dark:ring-white'
                      : 'bg-white dark:bg-[#27272A] text-red-700 dark:text-red-400 hover:bg-red-50'
                  }`}
                >
                  Errei (+1 dia)
                </button>

                <button
                  type="button"
                  onClick={() => handleSrsRate('DIFICIL')}
                  className={`p-2 text-xs font-black neo-border-sm transition-all ${
                    selectedSrsRating === 'DIFICIL'
                      ? 'bg-[#FF8800] text-white ring-2 ring-black dark:ring-white'
                      : 'bg-white dark:bg-[#27272A] text-orange-700 dark:text-orange-400 hover:bg-orange-50'
                  }`}
                >
                  Difícil (+1 dia)
                </button>

                <button
                  type="button"
                  onClick={() => handleSrsRate('BOM')}
                  className={`p-2 text-xs font-black neo-border-sm transition-all ${
                    selectedSrsRating === 'BOM'
                      ? 'bg-[#FFE600] text-black ring-2 ring-black dark:ring-white'
                      : 'bg-white dark:bg-[#27272A] text-gray-900 dark:text-gray-200 hover:bg-yellow-50'
                  }`}
                >
                  Bom (+3 dias)
                </button>

                <button
                  type="button"
                  onClick={() => handleSrsRate('FACIL')}
                  className={`p-2 text-xs font-black neo-border-sm transition-all ${
                    selectedSrsRating === 'FACIL'
                      ? 'bg-[#00E599] text-black ring-2 ring-black dark:ring-white'
                      : 'bg-white dark:bg-[#27272A] text-green-800 dark:text-green-300 hover:bg-green-50'
                  }`}
                >
                  Fácil (+6 dias)
                </button>
              </div>

              {selectedSrsRating && (
                <div className="mt-2 text-[10px] font-mono font-bold text-green-800 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Revisão agendada!
                </div>
              )}
            </div>
          )}

          {/* Resolução Pedagógica */}
          {hasSubmitted && showExplanation && (
            <div
              className={`mt-4 p-4 neo-border ${
                isCorrect ? 'bg-[#E6FAF2] dark:bg-green-950/40 border-green-800' : 'bg-[#FFF0F3] dark:bg-red-950/40 border-red-800'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-700 dark:text-green-400" />
                    <span className="font-black text-green-900 dark:text-green-300 text-sm">
                      Resposta correta! (+35 XP)
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-700 dark:text-red-400" />
                    <span className="font-black text-red-900 dark:text-red-300 text-sm">
                      Resposta incorreta. Gabarito: alternativa {question.correctAlternative}
                    </span>
                  </>
                )}
              </div>

              <div className="mt-3 pt-3 border-t-2 border-black/20 dark:border-gray-700">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h4 className="text-sm font-black uppercase tracking-wider text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Resolução
                  </h4>

                  {!isEditingExplanation && (
                    <div className="flex items-center gap-1.5">
                      {hasExplanation && (
                        <button
                          type="button"
                          onClick={handleCopyResolution}
                          className="flex items-center gap-1 text-[10px] font-black bg-white dark:bg-[#27272A] px-2 py-1 neo-border-sm text-black dark:text-white hover:bg-[#FFE600] dark:hover:bg-[#FFE600] dark:hover:text-black"
                          title="Copiar gabarito e resolução"
                        >
                          {copiedKind === 'resolution' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKind === 'resolution' ? 'Copiado!' : 'Copiar'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleStartEditExplanation}
                        className="flex items-center gap-1 text-[10px] font-black bg-white dark:bg-[#27272A] px-2 py-1 neo-border-sm text-black dark:text-white hover:bg-[#00F0FF] dark:hover:bg-[#00F0FF] dark:hover:text-black"
                        title={hasExplanation ? 'Editar resolução' : 'Adicionar resolução'}
                      >
                        <Pencil className="w-3 h-3" />
                        <span>{hasExplanation ? 'Editar' : 'Adicionar resolução'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {isEditingExplanation ? (
                  <div className="space-y-2">
                    <textarea
                      value={explanationDraft}
                      onChange={(e) => setExplanationDraft(e.target.value)}
                      autoFocus
                      rows={8}
                      placeholder="Digite ou cole a resolução. Cada linha vira um parágrafo."
                      className="selectable-text w-full text-sm font-sans leading-relaxed p-3 neo-border-sm bg-white text-black resize-y"
                    />
                    {explanationSaveFailed && (
                      <p className="text-[11px] font-bold text-red-700 dark:text-red-400">
                        Não foi possível salvar a resolução.
                      </p>
                    )}
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingExplanation(false);
                          setExplanationSaveFailed(false);
                        }}
                        className="px-3 py-1.5 text-[11px] font-black neo-btn bg-white dark:bg-[#27272A] text-black dark:text-white"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveExplanation}
                        className="px-3 py-1.5 text-[11px] font-black neo-btn bg-[#00E599] text-black flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Salvar resolução</span>
                      </button>
                    </div>
                  </div>
                ) : hasExplanation ? (
                  <RichText
                    text={question.explanation}
                    className="selectable-text text-sm text-gray-800 dark:text-gray-200 font-sans leading-relaxed bg-white dark:bg-[#1E1E22] p-3 neo-border-sm"
                  />
                ) : (
                  <p className="text-sm italic text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1E1E22] p-3 neo-border-sm">
                    Esta questão ainda não tem resolução.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Lado Direito: MESA DIGITALIZADORA LATERAL (se showSide for true) */}
        {showSide && (
          <div className="w-full h-full min-h-[600px] lg:col-span-6 flex flex-col">
            <DigitalPenCanvas
              questionId={question.id}
              initialStrokes={savedStrokes}
              onSaveStrokes={(strokes) => onSaveStrokes(question.id, strokes)}
              mode="scratchpad"
              layoutMode="side"
              isDarkMode={isDarkMode}
              onClose={() => setShowSide(false)}
              className="w-full h-full flex-1"
            />
          </div>
        )}
      </div>

      {/* MESA DIGITALIZADORA INFERIOR (se showBottom for true) */}
      {showBottom && (
        <div className="mt-4">
          <div className="flex items-center justify-between bg-black text-white px-3 py-1.5 font-bold text-xs">
            <span className="flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-[#FFE600]" />
              Rascunho
            </span>
            <button
              type="button"
              onClick={() => setShowBottom(false)}
              className="text-xs text-red-300 hover:text-white"
            >
              Fechar
            </button>
          </div>
          <DigitalPenCanvas
            questionId={question.id}
            initialStrokes={savedStrokes}
            onSaveStrokes={(strokes) => onSaveStrokes(question.id, strokes)}
            mode="scratchpad"
            layoutMode="bottom"
            isDarkMode={isDarkMode}
            onClose={() => setShowBottom(false)}
          />
        </div>
      )}
    </div>
  );
};