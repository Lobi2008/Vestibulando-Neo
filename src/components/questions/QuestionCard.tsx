/**
 * @file src/components/questions/QuestionCard.tsx
 * @description Card interativo de resolução de questão com design Neobrutalista.
 * Suporta alternativas A-E, cronômetro, layout de mesa digitalizadora versátil
 * (Lateral, Inferior e Sobre o Texto/Riscar Prova) e classificação SM-2 de Repetição Espaçada.
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Edit3, 
  ChevronRight, 
  ChevronLeft, 
  Lightbulb, 
  Sparkles,
  Info,
  Layers,
  Columns,
  Maximize2,
  Brain,
  RotateCcw
} from 'lucide-react';
import type { Question, UserAttempt, DrawingStroke, StylusLayoutMode, SrsRating, SrsItemData } from '../../types/index.ts';
import { DigitalPenCanvas } from '../canvas/DigitalPenCanvas.tsx';

interface QuestionCardProps {
  question: Question;
  lastAttempt?: UserAttempt;
  savedStrokes?: DrawingStroke[];
  srsData?: SrsItemData;
  onAnswer: (questionId: string, selected: 'A' | 'B' | 'C' | 'D' | 'E', timeSpent: number) => void;
  onRateSrs?: (questionId: string, rating: SrsRating) => void;
  onSaveStrokes: (questionId: string, strokes: DrawingStroke[]) => void;
  onNextQuestion: () => void;
  onPrevQuestion: () => void;
  currentIndex: number;
  totalCount: number;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  lastAttempt,
  savedStrokes = [],
  srsData,
  onAnswer,
  onRateSrs,
  onSaveStrokes,
  onNextQuestion,
  onPrevQuestion,
  currentIndex,
  totalCount,
}) => {
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | 'E' | null>(
    lastAttempt?.selectedAlternative || null
  );
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(!!lastAttempt);
  const [timeSpent, setTimeSpent] = useState<number>(lastAttempt?.timeSpentSeconds || 0);
  const [showExplanation, setShowExplanation] = useState<boolean>(!!lastAttempt);
  
  // Modo de posicionamento da mesa digitalizadora: 'hidden' | 'side' | 'bottom' | 'overlay'
  const [stylusMode, setStylusMode] = useState<StylusLayoutMode>('hidden');
  const [selectedSrsRating, setSelectedSrsRating] = useState<SrsRating | null>(
    lastAttempt?.srsRating || srsData?.lastRating || null
  );

  const timerRef = useRef<any>(null);

  useEffect(() => {
    setSelectedOption(lastAttempt?.selectedAlternative || null);
    setHasSubmitted(!!lastAttempt);
    setShowExplanation(!!lastAttempt);
    setTimeSpent(lastAttempt?.timeSpentSeconds || 0);
    setSelectedSrsRating(lastAttempt?.srsRating || srsData?.lastRating || null);

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
    };
  }, [question.id, lastAttempt, srsData]);

  // Atalhos de teclado para vestibulandos (A-E ou 1-5, R para rascunho, Enter para confirmar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
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

      // Atalho 'R' para alternar rascunho
      if (e.key.toLowerCase() === 'r' && !e.ctrlKey) {
        setStylusMode((prev) => (prev === 'hidden' ? 'side' : 'hidden'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedOption, hasSubmitted, question]);

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

  const isCorrect = selectedOption === question.correctAlternative;

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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

  return (
    <div className="space-y-4">
      {/* Barra de Seleção de Modo da Mesa Digitalizadora (Lateral / Inferior / Sobre o Texto) */}
      <div className="bg-white neo-border neo-shadow-sm px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-black text-black">
          <Edit3 className="w-4 h-4 text-[#FF5A36]" />
          <span>Posição do Rascunho / Stylus:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStylusMode(stylusMode === 'side' ? 'hidden' : 'side')}
            className={`px-2.5 py-1 text-xs font-bold neo-border-sm flex items-center gap-1 transition-all ${
              stylusMode === 'side' ? 'bg-[#FFE600] text-black font-black' : 'bg-[#F8F5EE] text-gray-800 hover:bg-gray-200'
            }`}
            title="Abrir mesa digitalizadora ao lado da questão (Split View para telas Widescreen)"
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Painel Lateral</span>
          </button>

          <button
            type="button"
            onClick={() => setStylusMode(stylusMode === 'bottom' ? 'hidden' : 'bottom')}
            className={`px-2.5 py-1 text-xs font-bold neo-border-sm flex items-center gap-1 transition-all ${
              stylusMode === 'bottom' ? 'bg-[#FFE600] text-black font-black' : 'bg-[#F8F5EE] text-gray-800 hover:bg-gray-200'
            }`}
            title="Abrir mesa digitalizadora abaixo da questão"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Abaixo</span>
          </button>

          <button
            type="button"
            onClick={() => setStylusMode(stylusMode === 'overlay' ? 'hidden' : 'overlay')}
            className={`px-2.5 py-1 text-xs font-bold neo-border-sm flex items-center gap-1 transition-all ${
              stylusMode === 'overlay' ? 'bg-[#FF3366] text-white font-black animate-pulse' : 'bg-[#F8F5EE] text-gray-800 hover:bg-gray-200'
            }`}
            title="Escrever, grifar e riscar diretamente sobre o texto e as alternativas da prova"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sobre o Texto (Riscar Prova)</span>
          </button>

          {stylusMode !== 'hidden' && (
            <button
              type="button"
              onClick={() => setStylusMode('hidden')}
              className="px-2 py-1 text-xs font-bold text-gray-600 hover:text-black underline ml-1"
            >
              Fechar
            </button>
          )}
        </div>
      </div>

      {/* Grid Principal: se stylusMode === 'side', divide em 2 colunas lado a lado */}
      <div className={`grid gap-4 ${stylusMode === 'side' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Lado Esquerdo: Card da Questão */}
        <div className="bg-white neo-border neo-shadow-lg p-4 md:p-6 relative overflow-hidden">
          {/* MODO OVERLAY: Canvas de Mesa Digitalizadora Transparente Diretamente Sobre o Texto */}
          {stylusMode === 'overlay' && (
            <div className="absolute inset-0 z-30 pointer-events-auto bg-transparent">
              <DigitalPenCanvas
                questionId={question.id}
                initialStrokes={savedStrokes}
                onSaveStrokes={(strokes) => onSaveStrokes(question.id, strokes)}
                mode="overlay"
                onClose={() => setStylusMode('hidden')}
                className="h-full w-full bg-transparent"
              />
            </div>
          )}

          {/* Metadados e Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b-3 border-[#111111]">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-1 text-xs font-black neo-border-sm ${vestibularColor}`}>
                {question.vestibular} {question.year}
              </span>

              {question.edition && (
                <span className="px-2 py-0.5 text-xs font-bold bg-gray-100 neo-border-sm text-gray-800">
                  {question.edition}
                </span>
              )}

              <span className="px-2 py-0.5 text-xs font-extrabold bg-[#F5F2EA] neo-border-sm text-black">
                {question.discipline}
              </span>

              <span className="px-2 py-0.5 text-xs font-bold bg-[#E8F0FE] neo-border-sm text-blue-900">
                📌 {question.topic}
              </span>

              {question.difficultyLevel && (
                <span
                  className={`px-2 py-0.5 text-[11px] font-bold neo-border-sm ${
                    question.difficultyLevel === 'Fácil'
                      ? 'bg-green-100 text-green-800'
                      : question.difficultyLevel === 'Médio'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  Nível: {question.difficultyLevel}
                </span>
              )}
            </div>

            {/* Cronômetro */}
            <div className="flex items-center gap-1 text-xs font-mono font-bold bg-[#F8F5EE] px-2 py-1 neo-border-sm">
              <Clock className="w-3.5 h-3.5 text-black" />
              <span>{formatTimer(timeSpent)}</span>
            </div>
          </div>

          {/* Parâmetros TRI do ENEM */}
          {question.triParams && (
            <div className="mb-4 bg-[#FFFDE7] p-2.5 neo-border-sm flex flex-wrap items-center justify-between text-xs font-mono gap-2">
              <div className="flex items-center gap-1 text-gray-800 font-bold">
                <Info className="w-4 h-4 text-amber-600" />
                <span>Parâmetros TRI 3PL do ENEM:</span>
              </div>
              <div className="flex items-center gap-3">
                <span><strong>a (discriminação):</strong> {question.triParams.a.toFixed(2)}</span>
                <span><strong>b (dificuldade):</strong> {question.triParams.b.toFixed(2)}</span>
                <span><strong>c (acerto casual):</strong> {question.triParams.c.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Texto de Contexto */}
          {question.contextSnippet && (
            <div className="mb-4 p-3 bg-[#FBF8F1] border-l-4 border-black text-sm italic text-gray-800">
              {question.contextSnippet}
            </div>
          )}

          {/* Enunciado Principal */}
          <div className="text-base md:text-lg font-semibold text-gray-900 leading-relaxed mb-6">
            {question.statement}
          </div>

          {/* Lista de Alternativas (A-E) */}
          <div className="space-y-3 mb-6">
            {question.alternatives.map((alt) => {
              const isSelected = selectedOption === alt.id;
              const isCorrectOption = alt.id === question.correctAlternative;

              let buttonStyle = 'bg-white text-black hover:bg-gray-50';

              if (hasSubmitted) {
                if (isCorrectOption) {
                  buttonStyle = 'bg-[#00E599] text-black font-extrabold ring-2 ring-black';
                } else if (isSelected && !isCorrectOption) {
                  buttonStyle = 'bg-[#FF3366] text-white font-extrabold';
                } else {
                  buttonStyle = 'bg-gray-100 text-gray-400 opacity-60';
                }
              } else if (isSelected) {
                buttonStyle = 'bg-[#FFE600] text-black font-extrabold translate-x-1 shadow-none';
              }

              return (
                <button
                  key={alt.id}
                  type="button"
                  disabled={hasSubmitted}
                  onClick={() => setSelectedOption(alt.id)}
                  className={`w-full text-left p-3.5 neo-border neo-shadow-sm flex items-start gap-3 transition-all ${buttonStyle}`}
                >
                  <span className="w-7 h-7 flex-shrink-0 flex items-center justify-center font-black text-sm bg-black text-white rounded-none neo-border-sm">
                    {alt.id}
                  </span>
                  <span className="text-sm md:text-base font-medium flex-1 pt-0.5">
                    {alt.text}
                  </span>

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
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t-2 border-black">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onPrevQuestion}
                disabled={currentIndex <= 0}
                className="px-3 py-2 text-xs font-bold neo-btn bg-white text-black disabled:opacity-30 flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>

              <span className="text-xs font-bold font-mono px-2">
                {currentIndex + 1} de {totalCount}
              </span>

              <button
                type="button"
                onClick={onNextQuestion}
                disabled={currentIndex >= totalCount - 1}
                className="px-3 py-2 text-xs font-bold neo-btn bg-white text-black disabled:opacity-30 flex items-center gap-1"
              >
                <span>Próxima</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div>
              {!hasSubmitted ? (
                <button
                  type="button"
                  onClick={handleSubmitAnswer}
                  disabled={!selectedOption}
                  className="px-6 py-2.5 text-sm font-black neo-btn bg-[#FFE600] text-black disabled:opacity-40 flex items-center gap-2"
                >
                  <span>Confirmar Resposta</span>
                  <Sparkles className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowExplanation(!showExplanation)}
                  className="px-4 py-2 text-xs font-black neo-btn bg-[#00F0FF] text-black flex items-center gap-1.5"
                >
                  <Lightbulb className="w-4 h-4" />
                  <span>{showExplanation ? 'Ocultar Resolução' : 'Ver Resolução'}</span>
                </button>
              )}
            </div>
          </div>

          {/* REPETIÇÃO ESPAÇADA (SRS): SELETOR DE FACILIDADE APÓS RESPONDER */}
          {hasSubmitted && (
            <div className="mt-5 p-4 bg-[#F5F2EA] neo-border">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-purple-700" />
                <span className="text-xs font-black uppercase tracking-wider text-black">
                  Repetição Espaçada: Como foi responder essa questão?
                </span>
              </div>
              <p className="text-[11px] text-gray-700 mb-3">
                Sua avaliação define o intervalo do algoritmo SM-2 até a próxima revisão mnemônica.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleSrsRate('ERRO')}
                  className={`p-2 text-xs font-black neo-border-sm transition-all ${
                    selectedSrsRating === 'ERRO'
                      ? 'bg-[#FF3366] text-white ring-2 ring-black'
                      : 'bg-white text-red-700 hover:bg-red-50'
                  }`}
                >
                  Errei (+1 dia)
                </button>

                <button
                  type="button"
                  onClick={() => handleSrsRate('DIFICIL')}
                  className={`p-2 text-xs font-black neo-border-sm transition-all ${
                    selectedSrsRating === 'DIFICIL'
                      ? 'bg-[#FF8800] text-white ring-2 ring-black'
                      : 'bg-white text-orange-700 hover:bg-orange-50'
                  }`}
                >
                  Difícil (+1 dia)
                </button>

                <button
                  type="button"
                  onClick={() => handleSrsRate('BOM')}
                  className={`p-2 text-xs font-black neo-border-sm transition-all ${
                    selectedSrsRating === 'BOM'
                      ? 'bg-[#FFE600] text-black ring-2 ring-black'
                      : 'bg-white text-gray-900 hover:bg-yellow-50'
                  }`}
                >
                  Bom / Médio (+3 dias)
                </button>

                <button
                  type="button"
                  onClick={() => handleSrsRate('FACIL')}
                  className={`p-2 text-xs font-black neo-border-sm transition-all ${
                    selectedSrsRating === 'FACIL'
                      ? 'bg-[#00E599] text-black ring-2 ring-black'
                      : 'bg-white text-green-800 hover:bg-green-50'
                  }`}
                >
                  Fácil (+6 dias)
                </button>
              </div>

              {selectedSrsRating && (
                <div className="mt-2 text-[10px] font-mono font-bold text-green-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Agendado para o Deck de Repetição Espaçada!
                </div>
              )}
            </div>
          )}

          {/* Resolução Pedagógica */}
          {hasSubmitted && showExplanation && (
            <div
              className={`mt-4 p-4 neo-border ${
                isCorrect ? 'bg-[#E6FAF2] border-green-800' : 'bg-[#FFF0F3] border-red-800'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-700" />
                    <span className="font-black text-green-900 text-sm">
                      PARABÉNS! Resposta Correta (+35 XP)
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-700" />
                    <span className="font-black text-red-900 text-sm">
                      RESPOSTA INCORRETA — Gabarito Oficial: Alternativa {question.correctAlternative}
                    </span>
                  </>
                )}
              </div>

              <div className="mt-3 pt-3 border-t-2 border-black/20">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-800 mb-2 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Resolução Comentada Passo a Passo:
                </h4>
                <div className="text-sm text-gray-800 font-sans whitespace-pre-line leading-relaxed bg-white p-3 neo-border-sm">
                  {question.explanation}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lado Direito: MESA DIGITALIZADORA LATERAL (se stylusMode === 'side') */}
        {stylusMode === 'side' && (
          <div className="h-full min-h-[500px]">
            <DigitalPenCanvas
              questionId={question.id}
              initialStrokes={savedStrokes}
              onSaveStrokes={(strokes) => onSaveStrokes(question.id, strokes)}
              mode="scratchpad"
              layoutMode="side"
              onClose={() => setStylusMode('hidden')}
              className="h-full w-full"
            />
          </div>
        )}
      </div>

      {/* MESA DIGITALIZADORA INFERIOR (se stylusMode === 'bottom') */}
      {stylusMode === 'bottom' && (
        <div className="mt-4">
          <div className="flex items-center justify-between bg-black text-white px-3 py-1.5 font-bold text-xs">
            <span className="flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-[#FFE600]" />
              Mesa Digitalizadora & Rascunho Inferior
            </span>
            <button
              type="button"
              onClick={() => setStylusMode('hidden')}
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
            onClose={() => setStylusMode('hidden')}
          />
        </div>
      )}
    </div>
  );
};
