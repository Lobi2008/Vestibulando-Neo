/**
 * @file src/components/srs/SpacedRepetitionDeck.tsx
 * @description Deck dedicado de Repetição Espaçada (SRS) baseado no algoritmo SM-2.
 * Exibe questões agendadas para revisão hoje (Due), intervalos de repetição,
 * facilidade mnemônica e permite iniciar rodadas de revisão diária.
 */

import React, { useMemo, useState } from 'react';
import { 
  RotateCcw, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Play, 
  Layers,
  ArrowRight,
  TrendingUp,
  Brain
} from 'lucide-react';
import type { Question, SrsItemData, SrsRating } from '../../types/index.ts';
import { isSrsItemDue, formatDateYmd } from '../../services/srs/srsEngine.ts';
import { richTextToPlain } from '../../utils/richText.ts';

interface SpacedRepetitionDeckProps {
  questions: Question[];
  srsItems: Record<string, SrsItemData>;
  onStartReviewQuestion: (questionId: string) => void;
  onReviewDueDeck: (dueQuestionIds: string[]) => void;
}

export const SpacedRepetitionDeck: React.FC<SpacedRepetitionDeckProps> = ({
  questions,
  srsItems,
  onStartReviewQuestion,
  onReviewDueDeck,
}) => {
  const [filterType, setFilterType] = useState<'DUE' | 'ALL'>('DUE');
  const todayStr = useMemo(() => formatDateYmd(new Date()), []);

  const questionMap = useMemo(() => {
    return new Map(questions.map((q) => [q.id, q]));
  }, [questions]);

  // Itens cadastrados no SRS
  const registeredList = useMemo(() => {
    return Object.values(srsItems).map((srs) => {
      const q = questionMap.get(srs.questionId);
      const isDue = isSrsItemDue(srs, todayStr);
      return {
        ...srs,
        question: q,
        isDue,
      };
    }).filter((item) => item.question !== undefined);
  }, [srsItems, questionMap, todayStr]);

  // Itens prontos para revisão hoje (Due)
  const dueItems = useMemo(() => {
    return registeredList.filter((item) => item.isDue);
  }, [registeredList]);

  const displayedList = filterType === 'DUE' ? dueItems : registeredList;

  const handleStartReviewAllDue = () => {
    const ids = dueItems.map((item) => item.questionId);
    if (ids.length > 0) {
      onReviewDueDeck(ids);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Banner SRS */}
      <div className="bg-[#00F0FF] neo-border neo-shadow-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-black text-white px-2.5 py-1 text-xs font-black uppercase mb-2">
            <Brain className="w-4 h-4 text-[#00F0FF]" />
            <span>Método SM-2</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-black tracking-tight">
            Revisão espaçada
          </h2>
          <p className="text-sm font-bold text-gray-900 mt-1 max-w-md">
            Depois de resolver uma questão, você avalia como foi e o app agenda a próxima revisão.
          </p>
        </div>

        <div>
          <button
            type="button"
            disabled={dueItems.length === 0}
            onClick={handleStartReviewAllDue}
            className="px-6 py-3.5 bg-[#FFE600] text-black font-black text-sm neo-btn flex items-center gap-2 disabled:opacity-40"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>Revisar hoje ({dueItems.length})</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas do Deck */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white neo-border neo-shadow p-4">
          <div className="text-xs font-black text-gray-600 uppercase flex items-center justify-between mb-1">
            <span>Para revisar hoje</span>
            <AlertCircle className="w-4 h-4 text-[#FF3366]" />
          </div>
          <div className="text-3xl font-black text-black">{dueItems.length}</div>
          <div className="text-xs text-gray-500 font-bold mt-1">
            {dueItems.length > 0 ? 'Revise para fixar o conteúdo' : 'Tudo em dia!'}
          </div>
        </div>

        <div className="bg-white neo-border neo-shadow p-4">
          <div className="text-xs font-black text-gray-600 uppercase flex items-center justify-between mb-1">
            <span>Total agendado</span>
            <Layers className="w-4 h-4 text-[#3B82F6]" />
          </div>
          <div className="text-3xl font-black text-black">{registeredList.length}</div>
          <div className="text-xs text-gray-500 font-bold mt-1">
            Questões na revisão
          </div>
        </div>

        <div className="bg-white neo-border neo-shadow p-4">
          <div className="text-xs font-black text-gray-600 uppercase flex items-center justify-between mb-1">
            <span>Intervalo Médio</span>
            <Clock className="w-4 h-4 text-[#00E599]" />
          </div>
          <div className="text-3xl font-black text-black">
            {registeredList.length > 0
              ? `${Math.round(
                  registeredList.reduce((acc, curr) => acc + curr.intervalDays, 0) /
                    registeredList.length
                )} dias`
              : '0 dias'}
          </div>
          <div className="text-xs text-gray-500 font-bold mt-1">
            Tempo médio entre revisões
          </div>
        </div>
      </div>

      {/* Tabela de Itens Agendados */}
      <div className="bg-white neo-border neo-shadow p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b-2 border-black">
          <div className="flex items-center gap-2">
            <span className="text-base font-black uppercase text-black">
              Cronograma
            </span>
            <span className="text-xs font-mono font-bold bg-black text-white px-2 py-0.5">
              {displayedList.length} itens
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterType('DUE')}
              className={`px-3.5 py-1.5 text-xs font-black neo-border-sm transition-all ${
                filterType === 'DUE' ? 'bg-[#FFE600] text-black' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Hoje ({dueItems.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-3.5 py-1.5 text-xs font-black neo-border-sm transition-all ${
                filterType === 'ALL' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Todas ({registeredList.length})
            </button>
          </div>
        </div>

        {displayedList.length === 0 ? (
          <div className="text-center py-12 text-gray-500 space-y-2">
            <Brain className="w-10 h-10 text-gray-400 mx-auto" />
            <p className="text-sm font-bold text-gray-700">
              {filterType === 'DUE'
                ? 'Nenhuma revisão para hoje.'
                : 'Você ainda não tem questões na revisão.'}
            </p>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Depois de responder uma questão, avalie como foi (Errei, Difícil, Bom ou Fácil) para agendar a revisão.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedList.map((item) => {
              const q = item.question!;
              return (
                <div
                  key={item.questionId}
                  className={`p-3.5 neo-border-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    item.isDue ? 'bg-[#FFFDE7] border-l-4 border-l-[#FF5A36]' : 'bg-[#FAFAFA]'
                  }`}
                >
                  <div className="space-y-1 max-w-xl">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                      <span className="bg-black text-white px-1.5 py-0.5 font-mono">
                        {q.vestibular} {q.year}
                      </span>
                      <span className="bg-gray-200 px-1.5 py-0.5">{q.discipline}</span>
                      <span className="bg-blue-100 text-blue-900 px-1.5 py-0.5">{q.topic}</span>
                      {item.isDue && (
                        <span className="bg-[#FF3366] text-white px-2 py-0.5 text-[10px] font-black uppercase">
                          Hoje
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-gray-800 line-clamp-2">
                      {richTextToPlain(q.statement)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200">
                    <div className="text-right text-[11px] font-mono">
                      <div className="font-bold text-gray-800">
                        Próxima: <strong>{item.nextReviewDate}</strong>
                      </div>
                      <div className="text-gray-500">
                        Intervalo: {item.intervalDays}d • Revisões: {item.repetitions}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onStartReviewQuestion(item.questionId)}
                      className="px-3 py-1.5 text-xs font-black neo-btn bg-[#FFE600] text-black flex items-center gap-1"
                    >
                      <span>Revisar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};