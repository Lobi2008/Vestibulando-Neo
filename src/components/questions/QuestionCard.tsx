/**
 * @file src/components/questions/QuestionCard.tsx
 * @description Card interativo de resolução de questão com design Neobrutalista.
 * Suporta alternativas A-E, eliminação por clique longo de 1s, marca-texto (selecionar para marcar, clicar para desmarcar), atalhos 'S'/'W' (próxima/anterior) e 'CTRL+Z',
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
  Pencil,
  Highlighter
} from 'lucide-react';
import type { Question, UserAttempt, DrawingStroke, SrsRating, SrsItemData } from '../../types/index.ts';
import { DigitalPenCanvas } from '../canvas/DigitalPenCanvas.tsx';
import { RichText } from '../common/RichText.tsx';
import { useTextHighlighter } from '../../hooks/useTextHighlighter.ts';

/** Tempo (ms) segurando uma alternativa para riscá-la */
const HOLD_TO_STRIKE_MS = 1000;
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

const QuestionCardComponent: React.FC<QuestionCardProps> = ({
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
  const highlightRootRef = useRef<HTMLDivElement>(null);
  const highlighter = useTextHighlighter(highlightRootRef, question.id);
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

      // Atalho 'W' para voltar à questão anterior
      if (e.key.toLowerCase() === 'w' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        onPrevQuestion();
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
  }, [selectedOption, hasSubmitted, question, onNextQuestion, onPrevQuestion]);

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

  // Tratadores de eliminação de alternativa segurando por 1s
  const handlePointerDownAlt = (altId: string) => {
    if (hasSubmitted) return;
    isHoldCompletedRef.current = false;
    setHoldingAltId(altId);

    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);

    holdTimerRef.current = setTimeout(() => {
      // Se há texto selecionado (marca-texto), o usuário está arrastando para marcar, não para riscar
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
        setHoldingAltId(null);
        return;
      }
      isHoldCompletedRef.current = true;
      setEliminatedOptions((prev) => ({
        ...prev,
        [altId]: !prev[altId],
      }));
      setHoldingAltId(null);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, HOLD_TO_STRIKE_MS);
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
    // Acabou de criar/remover um destaque arrastando: não conta como escolha de alternativa
    if (highlighter.justHighlightedRef.current) return;
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
      ? 'bg-primary text-ink' 
      : question.vestibular === 'UERJ'
      ? 'bg-secondary text-ink'
      : question.vestibular === 'FUVEST'
      ? 'bg-[#FF5A36] text-white'
      : question.vestibular === 'CONCURSOS'
      ? 'bg-purple-300 text-ink'
      : 'bg-[#00E599] text-black';

  const activeRascunhoCount = (showSide ? 1 : 0) + (showBottom ? 1 : 0) + (showOverlay ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Botão Unificado de Rascunho (sem bloco/título ao redor) */}
      <div className="flex justify-end">
        {/* Botão Unificado de Rascunho com Seletor Multi-modo */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsRascunhoMenuOpen(!isRascunhoMenuOpen)}
            className={`px-3 py-1.5 text-xs font-black neo-btn flex items-center gap-2 ${
              activeRascunhoCount > 0 
                ? 'bg-primary text-ink' 
                : 'bg-surface text-ink hover:bg-gray-100 dark:hover:bg-gray-700'
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
              className="absolute right-0 top-full mt-2 z-40 bg-surface dark:bg-[#1F1F23] neo-border neo-shadow-lg p-2.5 min-w-[190px] space-y-1.5"
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
                    ? 'bg-primary text-ink font-black' 
                    : 'bg-gray-50 text-gray-800 dark:text-ink hover:bg-gray-200 dark:hover:bg-gray-700'
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
                    ? 'bg-primary text-ink font-black' 
                    : 'bg-gray-50 text-gray-800 dark:text-ink hover:bg-gray-200 dark:hover:bg-gray-700'
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
                    : 'bg-gray-50 dark:bg-surface-2 text-gray-800 dark:text-ink hover:bg-gray-200 dark:hover:bg-gray-700'
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
        <div
          ref={highlightRootRef}
          className={`bg-surface neo-border neo-shadow-lg p-4 md:p-6 2xl:p-7 relative overflow-hidden ${showSide ? 'lg:col-span-6' : ''}`}
        >
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
                <span className="px-2 py-0.5 text-xs font-bold bg-gray-100 dark:bg-gray-800 neo-border-sm text-gray-800 dark:text-ink">
                  {question.edition}
                </span>
              )}

              <span className="px-2 py-0.5 text-xs font-extrabold bg-surface-2 neo-border-sm text-ink">
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
              {/* Marca-texto: selecione um trecho para marcar; clique no trecho marcado para desmarcar */}
              {highlighter.supported && highlighter.count > 0 && (
                <button
                  type="button"
                  onClick={highlighter.clear}
                  className="flex items-center gap-1.5 text-[11px] font-black px-2.5 py-1 neo-border-sm bg-surface text-ink hover:bg-primary transition-colors"
                  title="Remover todos os destaques"
                >
                  <Highlighter className="w-3.5 h-3.5" />
                  <span>Limpar marcações ({highlighter.count})</span>
                </button>
              )}

              {/* Copiar enunciado + alternativas formatados */}
              <button
                type="button"
                onClick={handleCopyQuestion}
                className="flex items-center gap-1.5 text-[11px] font-black bg-surface px-2.5 py-1 neo-border-sm text-ink hover:bg-[#FFE600] dark:hover:bg-[#FFE600] dark:hover:text-black"
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
              <div className="flex items-center gap-1.5 text-xs font-mono font-black bg-page px-2.5 py-1 neo-border-sm text-[#111111] dark:text-[#FFFFFF] border-black shadow-sm">
                <Clock className="w-3.5 h-3.5 text-ink dark:text-[#00F0FF]" />
                <span className="text-[#111111] dark:text-[#FFFFFF]">{formatTimer(timeSpent)}</span>
              </div>
            </div>
          </div>

          {/* Texto de Contexto adicional se houver */}
          {question.contextSnippet && (
            <RichText
              text={question.contextSnippet}
              className="selectable-text mb-4 p-3 bg-[#FBF8F1] dark:bg-surface-2 border-l-4 border-black dark:border-yellow-400 text-sm italic text-gray-800 dark:text-ink"
            />
          )}

          {/* Texto de Apoio do Enunciado */}
          {contextText && (
            <RichText
              text={contextText}
              className="selectable-text text-base md:text-lg font-normal text-gray-800 dark:text-ink leading-relaxed mb-4"
            />
          )}

          {/* Pergunta da Questão em Negrito com ':' automático no ENEM se necessário */}
          {questionPrompt && (
            <RichText
              text={questionPrompt}
              className="selectable-text text-base md:text-lg font-black text-ink leading-relaxed mb-6 border-l-4 border-[#FFE600] pl-3 py-1.5 bg-[#FFFEEA]/60 dark:bg-surface-2"
            />
          )}

          {/* Lista de Alternativas (A-E) com Eliminação por Clique Longo (1s) */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between text-xs font-mono text-gray-500 dark:text-gray-400 pb-1">
              <span>Alternativas</span>
              <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                <Ban className="w-3 h-3" />
                Segure 1 s para riscar
              </span>
            </div>

            {question.alternatives.map((alt) => {
              const isSelected = selectedOption === alt.id;
              const isCorrectOption = alt.id === question.correctAlternative;
              const isEliminated = !!eliminatedOptions[alt.id];
              const isHolding = holdingAltId === alt.id;

              let buttonStyle = 'bg-surface text-ink hover:bg-gray-50 dark:hover:bg-surface-2';

              if (hasSubmitted) {
                if (isCorrectOption) {
                  buttonStyle = 'bg-[#00E599] text-black font-extrabold ring-2 ring-black dark:ring-white';
                } else if (isSelected && !isCorrectOption) {
                  buttonStyle = 'bg-[#FF3366] text-white font-extrabold';
                } else {
                  buttonStyle = 'bg-gray-100 text-gray-400 opacity-60 dark:bg-gray-800 dark:text-gray-500';
                }
              } else if (isSelected) {
                buttonStyle = 'bg-primary text-ink font-extrabold translate-x-1 shadow-none';
              } else if (isEliminated) {
                buttonStyle = 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 opacity-50 line-through decoration-red-600 decoration-2';
              }

              return (
                <div
                  key={alt.id}
                  role="button"
                  tabIndex={hasSubmitted ? -1 : 0}
                  aria-disabled={hasSubmitted}
                  aria-pressed={isSelected}
                  onKeyDown={(e) => {
                    if (e.key === ' ') {
                      e.preventDefault();
                      handleClickAlt(alt.id);
                    }
                  }}
                  onPointerDown={() => handlePointerDownAlt(alt.id)}
                  onPointerUp={handlePointerUpAlt}
                  onPointerLeave={handlePointerUpAlt}
                  onClick={() => handleClickAlt(alt.id)}
                  className={`w-full text-left p-3.5 neo-border neo-shadow-sm flex items-start gap-3 transition-colors relative overflow-hidden ${
                    'select-text'
                  } ${hasSubmitted ? 'cursor-default' : 'cursor-pointer'} ${buttonStyle}`}
                >
                  {/* Barra de progresso para o clique longo de 1s */}
                  {isHolding && (
                    <div 
                      className="absolute bottom-0 left-0 h-1 bg-[#FF3366] w-full z-10 origin-left"
                      style={{ animation: `hold-progress ${HOLD_TO_STRIKE_MS}ms linear forwards` }}
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
                    className={`text-sm md:text-base font-medium flex-1 min-w-0 pt-0.5 selectable-text ${
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
                    <CheckCircle2 className="w-6 h-6 text-ink flex-shrink-0" />
                  )}
                  {hasSubmitted && isSelected && !isCorrectOption && (
                    <XCircle className="w-6 h-6 text-white flex-shrink-0" />
                  )}
                </div>
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
                className="px-3 py-2 text-xs font-bold neo-btn bg-surface text-ink disabled:opacity-30 flex items-center gap-1"
                title="Questão anterior (tecla W)"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
                <span className="text-[10px] font-mono text-gray-500 ml-0.5">[W]</span>
              </button>

              <span className="text-xs font-bold font-mono px-2 text-gray-800 dark:text-ink">
                {currentIndex + 1} de {totalCount}
              </span>

              <button
                type="button"
                onClick={onNextQuestion}
                disabled={currentIndex >= totalCount - 1}
                className="px-3 py-2 text-xs font-bold neo-btn bg-surface text-ink disabled:opacity-30 flex items-center gap-1"
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
                  className="px-8 py-2.5 text-sm font-black neo-btn bg-primary text-ink disabled:opacity-40 flex items-center gap-2"
                >
                  <span>Confirmar</span>
                  <Sparkles className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowExplanation(!showExplanation)}
                  className="px-4 py-2 text-xs font-black neo-btn bg-secondary text-ink flex items-center gap-1.5"
                >
                  <Lightbulb className="w-4 h-4" />
                  <span>{showExplanation ? 'Ocultar resolução' : 'Ver resolução'}</span>
                </button>
              )}
            </div>
          </div>

          {/* REPETIÇÃO ESPAÇADA (SRS): SELETOR DE FACILIDADE APÓS RESPONDER */}
          {hasSubmitted && (
            <div className="mt-5 p-4 bg-surface-2 neo-border">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                <span className="text-sm font-black uppercase tracking-wider text-ink">
                  Como foi essa questão?
                </span>
              </div>
              <p className="text-xs text-gray-700 dark:text-ink-muted mb-3">
                Sua resposta define quando a questão volta para revisão.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleSrsRate('ERRO')}
                  className={`p-2 text-xs font-black neo-border-sm transition-colors ${
                    selectedSrsRating === 'ERRO'
                      ? 'bg-[#FF3366] text-white ring-2 ring-black dark:ring-white'
                      : 'bg-surface text-red-700 dark:text-red-400 hover:bg-red-50'
                  }`}
                >
                  Errei (+1 dia)
                </button>

                <button
                  type="button"
                  onClick={() => handleSrsRate('DIFICIL')}
                  className={`p-2 text-xs font-black neo-border-sm transition-colors ${
                    selectedSrsRating === 'DIFICIL'
                      ? 'bg-[#FF8800] text-white ring-2 ring-black dark:ring-white'
                      : 'bg-surface text-orange-700 dark:text-orange-400 hover:bg-orange-50'
                  }`}
                >
                  Difícil (+1 dia)
                </button>

                <button
                  type="button"
                  onClick={() => handleSrsRate('BOM')}
                  className={`p-2 text-xs font-black neo-border-sm transition-colors ${
                    selectedSrsRating === 'BOM'
                      ? 'bg-primary text-ink ring-2 ring-black dark:ring-white'
                      : 'bg-surface text-gray-900 dark:text-ink hover:bg-yellow-50'
                  }`}
                >
                  Bom (+3 dias)
                </button>

                <button
                  type="button"
                  onClick={() => handleSrsRate('FACIL')}
                  className={`p-2 text-xs font-black neo-border-sm transition-colors ${
                    selectedSrsRating === 'FACIL'
                      ? 'bg-[#00E599] text-black ring-2 ring-black dark:ring-white'
                      : 'bg-surface text-green-800 dark:text-green-300 hover:bg-green-50'
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
                isCorrect ? 'bg-[#E6FAF2] dark:bg-green-950/40 border-green-800' : 'bg-[#FFF0F3] dark:bg-surface-2 dark:bg-red-950/40 border-red-800'
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
                  <h4 className="text-sm font-black uppercase tracking-wider text-gray-800 dark:text-ink flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Resolução
                  </h4>

                  {!isEditingExplanation && (
                    <div className="flex items-center gap-1.5">
                      {hasExplanation && (
                        <button
                          type="button"
                          onClick={handleCopyResolution}
                          className="flex items-center gap-1 text-[10px] font-black bg-surface px-2 py-1 neo-border-sm text-ink hover:bg-[#FFE600] dark:hover:bg-[#FFE600] dark:hover:text-black"
                          title="Copiar gabarito e resolução"
                        >
                          {copiedKind === 'resolution' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKind === 'resolution' ? 'Copiado!' : 'Copiar'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleStartEditExplanation}
                        className="flex items-center gap-1 text-[10px] font-black bg-surface px-2 py-1 neo-border-sm text-ink hover:bg-[#00F0FF] dark:hover:bg-[#00F0FF] dark:hover:text-black"
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
                      className="selectable-text w-full text-sm font-sans leading-relaxed p-3 neo-border-sm bg-surface text-ink resize-y"
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
                        className="px-3 py-1.5 text-[11px] font-black neo-btn bg-surface text-ink"
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
                    className="selectable-text text-sm text-gray-800 dark:text-ink font-sans leading-relaxed bg-surface p-3 neo-border-sm"
                  />
                ) : (
                  <p className="text-sm italic text-gray-700 dark:text-ink-muted bg-surface p-3 neo-border-sm">
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

export const QuestionCard = React.memo(QuestionCardComponent);