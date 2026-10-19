/**
 * @file src/components/sync/DataManagerPanel.tsx
 * @description Área para apagar informações específicas (XP, nome, curso, ofensiva, acertos, média),
 * gerenciar o histórico de questões e navegar/editar o banco de questões
 * (enunciado, gabarito, resolução, conteúdo, dificuldade).
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import type { Question, UserAttempt, UserProfile, SrsItemData } from '../../types/index.ts';
import {
  clearProfileFields,
  clearUserProgress,
  deleteAttemptHistory,
} from '../../services/storage/localDatabase.ts';
import type { ProfileResetField, QuestionPatch } from '../../services/storage/localDatabase.ts';
import { QuestionEditorModal } from '../questions/QuestionEditorModal.tsx';

interface DataManagerPanelProps {
  questions: Question[];
  attempts: UserAttempt[];
  profile: UserProfile;
  srsItems: Record<string, SrsItemData>;
  editedQuestionIds: Set<string>;
  /** Chamado depois de apagar dados do perfil/histórico: o App relê tudo do armazenamento. */
  onDataChanged: () => void;
  onSaveQuestion: (questionId: string, patch: QuestionPatch) => boolean;
  onRestoreQuestion: (questionId: string) => boolean;
  onDeleteQuestions: (ids: string[]) => number;
}

/* ------------------------------------------------------------------ */
/* Diálogo de confirmação                                              */
/* ------------------------------------------------------------------ */

interface ConfirmState {
  title: string;
  message: string;
  details?: string[];
  confirmLabel: string;
  /** Se informado, o usuário precisa digitar esta palavra para confirmar */
  requireText?: string;
  onConfirm: () => void;
}

const ConfirmDialog: React.FC<{ state: ConfirmState; onCancel: () => void }> = ({ state, onCancel }) => {
  const [typed, setTyped] = useState<string>('');
  const blocked = !!state.requireText && typed.trim().toUpperCase() !== state.requireText.toUpperCase();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md bg-surface neo-border-thick neo-shadow-xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="text-base font-black text-ink flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-[#FF3366]" />
          {state.title}
        </h4>

        <p className="text-sm font-bold text-gray-900 dark:text-ink">{state.message}</p>

        {state.details && state.details.length > 0 && (
          <ul className="text-xs font-mono bg-surface-2 neo-border-sm p-3 space-y-1 text-ink">
            {state.details.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}

        {state.requireText && (
          <label className="block text-xs font-black text-ink space-y-1">
            <span>
              Digite <strong>{state.requireText}</strong> para confirmar.
            </span>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
              className="w-full bg-surface neo-border-sm px-2 py-2 text-sm font-mono text-ink"
              placeholder={state.requireText}
            />
          </label>
        )}

        <div className="flex items-center justify-end gap-3 pt-1">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-xs font-black neo-btn bg-surface text-ink">
            Cancelar
          </button>
          <button
            type="button"
            disabled={blocked}
            onClick={() => {
              state.onConfirm();
              onCancel();
            }}
            className="px-4 py-2 text-xs font-black neo-btn bg-[#FF3366] text-white disabled:opacity-40 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>{state.confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Painel principal                                                    */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 15;

const PROFILE_FIELD_OPTIONS: { id: ProfileResetField; label: string; hint: string }[] = [
  { id: 'xp', label: 'XP', hint: 'Zera o XP e volta ao nível 1' },
  { id: 'name', label: 'Nome', hint: 'Volta ao nome padrão' },
  { id: 'course', label: 'Curso', hint: 'Volta ao curso padrão' },
  { id: 'streak', label: 'Ofensiva', hint: 'Zera a ofensiva atual e a maior' },
  { id: 'correct', label: 'Acertos', hint: 'Apaga as respostas certas do histórico' },
  { id: 'average', label: 'Média', hint: 'Zera a média TRI e apaga o histórico do ENEM que a calcula' },
];

const countBy = (list: string[]) => {
  const map = new Map<string, number>();
  list.forEach((item) => map.set(item, (map.get(item) || 0) + 1));
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
};

const snippet = (text: string, max = 170) => {
  const flat = (text || '').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
};

export const DataManagerPanel: React.FC<DataManagerPanelProps> = ({
  questions,
  attempts,
  profile,
  srsItems,
  editedQuestionIds,
  onDataChanged,
  onSaveQuestion,
  onRestoreQuestion,
  onDeleteQuestions,
}) => {
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [notice, setNotice] = useState<string>('');

  const showNotice = (message: string) => setNotice(message);

  /* ---------------- 1. Apagar informações do perfil ---------------- */

  const [chosenFields, setChosenFields] = useState<ProfileResetField[]>([]);

  const toggleField = (id: ProfileResetField) =>
    setChosenFields((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));

  const correctCount = useMemo(() => attempts.filter((a) => a.isCorrect).length, [attempts]);
  const enemCount = useMemo(() => attempts.filter((a) => a.vestibular === 'ENEM').length, [attempts]);

  const currentValue = (id: ProfileResetField): string => {
    switch (id) {
      case 'xp':
        return `${profile.totalXp} XP · nível ${profile.level}`;
      case 'name':
        return profile.name;
      case 'course':
        return profile.targetCourse;
      case 'streak':
        return `${profile.currentStreak} dia(s) · maior: ${profile.longestStreak}`;
      case 'correct':
        return `${correctCount} acerto(s)`;
      case 'average':
        return `${enemCount} tentativa(s) do ENEM`;
    }
  };

  const handleClearSelectedFields = () => {
    if (chosenFields.length === 0) return;
    const labels = PROFILE_FIELD_OPTIONS.filter((o) => chosenFields.includes(o.id)).map((o) => o.label);
    setConfirm({
      title: 'Apagar informações',
      message: 'Isso não pode ser desfeito.',
      details: PROFILE_FIELD_OPTIONS.filter((o) => chosenFields.includes(o.id)).map((o) => `${o.label}: ${o.hint}`),
      confirmLabel: 'Apagar',
      onConfirm: () => {
        clearProfileFields(chosenFields);
        onDataChanged();
        setChosenFields([]);
        showNotice(`Apagado: ${labels.join(', ')}.`);
      },
    });
  };

  const handleClearAllProgress = () => {
    setConfirm({
      title: 'Apagar todo o progresso',
      message:
        'Perfil (nível, XP, ofensivas, meta), histórico de tentativas, revisões agendadas e rascunhos da mesa digitalizadora serão removidos. As questões continuam no banco.',
      confirmLabel: 'Apagar tudo',
      onConfirm: () => {
        clearUserProgress();
        onDataChanged();
        setChosenFields([]);
        setHistorySelection(new Set());
        showNotice('Progresso apagado: perfil, tentativas, revisões e rascunhos.');
      },
    });
  };

  /* ---------------- 2. Histórico de questões ---------------- */

  const [historySelection, setHistorySelection] = useState<Set<string>>(new Set());
  const [alsoRemoveSrs, setAlsoRemoveSrs] = useState<boolean>(false);

  const historyRows = useMemo(() => {
    const questionById = new Map(questions.map((q) => [q.id, q]));
    const byQuestion = new Map<string, UserAttempt[]>();
    attempts.forEach((a) => {
      const list = byQuestion.get(a.questionId) || [];
      list.push(a);
      byQuestion.set(a.questionId, list);
    });
    return Array.from(byQuestion.entries())
      .map(([questionId, list]) => {
        const last = list.reduce((acc, cur) => (cur.timestamp > acc.timestamp ? cur : acc), list[0]);
        return { questionId, question: questionById.get(questionId), count: list.length, last };
      })
      .sort((a, b) => b.last.timestamp - a.last.timestamp);
  }, [attempts, questions]);

  const toggleHistoryRow = (id: string) =>
    setHistorySelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allHistorySelected = historyRows.length > 0 && historySelection.size === historyRows.length;

  const handleDeleteSelectedHistory = () => {
    const ids = Array.from(historySelection);
    if (ids.length === 0) return;
    setConfirm({
      title: 'Apagar histórico',
      message: `Apagar o histórico de ${ids.length} questão(ões)? Elas voltam a aparecer como não resolvidas.`,
      details: alsoRemoveSrs ? ['A revisão agendada dessas questões também será removida.'] : undefined,
      confirmLabel: 'Apagar histórico',
      onConfirm: () => {
        deleteAttemptHistory(ids, alsoRemoveSrs);
        onDataChanged();
        setHistorySelection(new Set());
        showNotice(`Histórico apagado em ${ids.length} questão(ões).`);
      },
    });
  };

  const handleDeleteAllHistory = () => {
    if (attempts.length === 0) return;
    setConfirm({
      title: 'Apagar todo o histórico',
      message: `Apagar as ${attempts.length} tentativas registradas? XP, ofensiva e perfil não mudam.`,
      details: alsoRemoveSrs ? ['Todas as revisões agendadas também serão removidas.'] : undefined,
      confirmLabel: 'Apagar tudo',
      onConfirm: () => {
        deleteAttemptHistory('ALL', alsoRemoveSrs);
        onDataChanged();
        setHistorySelection(new Set());
        showNotice('Todo o histórico de questões foi apagado.');
      },
    });
  };

  /* ---------------- 3. Navegar e editar questões ---------------- */

  const [search, setSearch] = useState<string>('');
  const [vestibular, setVestibular] = useState<string>('TODOS');
  const [discipline, setDiscipline] = useState<string>('TODAS');
  const [topic, setTopic] = useState<string>('TODOS');
  const [onlyNoExplanation, setOnlyNoExplanation] = useState<boolean>(false);
  const [onlyEdited, setOnlyEdited] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);
  const [editingId, setEditingId] = useState<string | null>(null);

  const vestibularOptions = useMemo(() => countBy(questions.map((q) => q.vestibular)), [questions]);
  const disciplineOptions = useMemo(
    () =>
      countBy(
        questions.filter((q) => vestibular === 'TODOS' || q.vestibular === vestibular).map((q) => q.discipline)
      ),
    [questions, vestibular]
  );
  const topicOptions = useMemo(
    () =>
      countBy(
        questions
          .filter(
            (q) =>
              (vestibular === 'TODOS' || q.vestibular === vestibular) &&
              (discipline === 'TODAS' || q.discipline === discipline)
          )
          .map((q) => q.topic)
      ),
    [questions, vestibular, discipline]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return questions.filter((q) => {
      if (vestibular !== 'TODOS' && q.vestibular !== vestibular) return false;
      if (discipline !== 'TODAS' && q.discipline !== discipline) return false;
      if (topic !== 'TODOS' && q.topic !== topic) return false;
      if (onlyNoExplanation && (q.explanation || '').trim().length > 0) return false;
      if (onlyEdited && !editedQuestionIds.has(q.id)) return false;
      if (term) {
        const haystack = `${q.statement} ${q.topic} ${q.discipline} ${q.year} ${q.id}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [questions, search, vestibular, discipline, topic, onlyNoExplanation, onlyEdited, editedQuestionIds]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [search, vestibular, discipline, topic, onlyNoExplanation, onlyEdited]);

  const editingQuestion = editingId ? questions.find((q) => q.id === editingId) || null : null;

  const handleDeleteOne = (q: Question) => {
    setConfirm({
      title: 'Apagar questão',
      message: 'Esta questão será removida do banco. Isso não pode ser desfeito.',
      details: [`${q.vestibular} ${q.year} · ${q.discipline}`, snippet(q.statement, 90)],
      confirmLabel: 'Apagar questão',
      onConfirm: () => {
        const removed = onDeleteQuestions([q.id]);
        showNotice(`${removed} questão apagada.`);
      },
    });
  };

  const handleDeleteFiltered = () => {
    if (filtered.length === 0) return;
    const everything = filtered.length === questions.length;
    setConfirm({
      title: 'Apagar questões',
      message: `Apagar as ${filtered.length} questão(ões) da lista atual? Isso não pode ser desfeito.`,
      details: [
        `Vestibular: ${vestibular === 'TODOS' ? 'Todos' : vestibular}`,
        `Matéria: ${discipline === 'TODAS' ? 'Todas' : discipline}`,
        `Conteúdo: ${topic === 'TODOS' ? 'Todos' : topic}`,
        ...(search.trim() ? [`Busca: ${search.trim()}`] : []),
      ],
      confirmLabel: 'Apagar definitivamente',
      requireText: everything ? 'APAGAR' : undefined,
      onConfirm: () => {
        const removed = onDeleteQuestions(filtered.map((q) => q.id));
        showNotice(`${removed} questão(ões) apagada(s).`);
      },
    });
  };

  const selectClass = 'w-full bg-surface neo-border-sm px-2 py-2 text-xs font-bold text-ink';

  return (
    <div className="space-y-6">
      {notice && (
        <div
          className="flex items-center justify-between gap-3 p-3 bg-[#00E599] text-black neo-border-sm text-xs font-black"
          role="status"
        >
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} className="underline">
            Fechar
          </button>
        </div>
      )}

      {/* 1. Apagar informações */}
      <section className="bg-[#FFF0F3] dark:bg-surface-2 neo-border neo-shadow p-5 space-y-4">
        <h3 className="text-base font-black uppercase tracking-wider text-ink pb-2 border-b-2 border-black flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-[#FF3366]" />
          <span>Apagar informações</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PROFILE_FIELD_OPTIONS.map((option) => {
            const checked = chosenFields.includes(option.id);
            return (
              <label
                key={option.id}
                className={`flex items-start gap-2.5 p-3 neo-border-sm cursor-pointer ${
                  checked ? 'bg-primary text-ink' : 'bg-surface text-ink'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleField(option.id)}
                  className="mt-1 w-4 h-4 accent-black"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-black">{option.label}</span>
                  <span className="block text-[11px] font-mono font-bold opacity-80 truncate">
                    {currentValue(option.id)}
                  </span>
                  <span className="block text-[11px] font-medium opacity-80">{option.hint}</span>
                </span>
              </label>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={chosenFields.length === 0}
            onClick={handleClearSelectedFields}
            className="px-4 py-2 text-xs font-black neo-btn bg-[#FF3366] text-white disabled:opacity-40 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Apagar selecionados ({chosenFields.length})</span>
          </button>

          <button
            type="button"
            onClick={handleClearAllProgress}
            className="px-4 py-2 text-xs font-black neo-btn bg-red-600 text-white flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Apagar todo o progresso</span>
          </button>
        </div>
      </section>

      {/* 2. Histórico de questões */}
      <section className="bg-surface neo-border neo-shadow p-5 space-y-4">
        <h3 className="text-base font-black uppercase tracking-wider text-ink pb-2 border-b-2 border-black flex items-center justify-between gap-2">
          <span>Histórico de questões</span>
          <span className="text-xs font-mono font-bold text-gray-600 dark:text-ink-muted normal-case tracking-normal">
            {attempts.length} tentativa(s) em {historyRows.length} questão(ões)
          </span>
        </h3>

        {historyRows.length === 0 ? (
          <p className="text-sm font-bold text-gray-700 dark:text-ink-muted">Nenhuma questão resolvida ainda.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-black text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={allHistorySelected}
                  onChange={() =>
                    setHistorySelection(allHistorySelected ? new Set() : new Set(historyRows.map((r) => r.questionId)))
                  }
                  className="w-4 h-4 accent-black"
                />
                <span>Selecionar todas</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-ink-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={alsoRemoveSrs}
                  onChange={(e) => setAlsoRemoveSrs(e.target.checked)}
                  className="w-4 h-4 accent-black"
                />
                <span>Apagar também a revisão agendada ({Object.keys(srsItems).length})</span>
              </label>
            </div>

            <ul className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {historyRows.map((row) => {
                const selected = historySelection.has(row.questionId);
                return (
                  <li key={row.questionId}>
                    <label
                      className={`flex items-start gap-2.5 p-2.5 neo-border-sm cursor-pointer ${
                        selected ? 'bg-primary text-ink' : 'bg-surface-2 text-ink'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleHistoryRow(row.questionId)}
                        className="mt-1 w-4 h-4 accent-black"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2 text-[11px] font-mono font-black">
                          <span>
                            {row.question ? `${row.question.vestibular} ${row.question.year}` : 'Questão removida'}
                          </span>
                          <span>{row.count}x</span>
                          <span className={row.last.isCorrect ? 'text-green-800 dark:text-green-700' : 'text-red-700'}>
                            {row.last.isCorrect ? 'Acertou' : 'Errou'}
                          </span>
                          <span className="font-bold opacity-70">
                            {new Date(row.last.timestamp).toLocaleDateString('pt-BR')}
                          </span>
                        </span>
                        <span className="block text-xs font-medium mt-0.5">
                          {row.question ? snippet(row.question.statement, 120) : row.questionId}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={historySelection.size === 0}
                onClick={handleDeleteSelectedHistory}
                className="px-4 py-2 text-xs font-black neo-btn bg-[#FF3366] text-white disabled:opacity-40 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Apagar selecionadas ({historySelection.size})</span>
              </button>
              <button
                type="button"
                onClick={handleDeleteAllHistory}
                className="px-4 py-2 text-xs font-black neo-btn bg-red-600 text-white flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Apagar todo o histórico</span>
              </button>
            </div>
          </>
        )}
      </section>

      {/* 3. Questões */}
      <section className="bg-surface neo-border neo-shadow p-5 space-y-4">
        <h3 className="text-base font-black uppercase tracking-wider text-ink pb-2 border-b-2 border-black flex items-center justify-between gap-2">
          <span>Questões</span>
          <span className="text-xs font-mono font-bold text-gray-600 dark:text-ink-muted normal-case tracking-normal">
            {filtered.length} de {questions.length}
          </span>
        </h3>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar no enunciado, conteúdo, ano ou código"
            className="w-full bg-surface neo-border-sm pl-8 pr-2 py-2 text-sm font-bold text-ink"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-xs font-black text-ink space-y-1 block">
            <span>Vestibular</span>
            <select
              value={vestibular}
              onChange={(e) => {
                setVestibular(e.target.value);
                setDiscipline('TODAS');
                setTopic('TODOS');
              }}
              className={selectClass}
            >
              <option value="TODOS">Todos</option>
              {vestibularOptions.map(([name, count]) => (
                <option key={name} value={name}>
                  {name} ({count})
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-black text-ink space-y-1 block">
            <span>Matéria</span>
            <select
              value={discipline}
              onChange={(e) => {
                setDiscipline(e.target.value);
                setTopic('TODOS');
              }}
              className={selectClass}
            >
              <option value="TODAS">Todas</option>
              {disciplineOptions.map(([name, count]) => (
                <option key={name} value={name}>
                  {name} ({count})
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-black text-ink space-y-1 block">
            <span>Conteúdo</span>
            <select value={topic} onChange={(e) => setTopic(e.target.value)} className={selectClass}>
              <option value="TODOS">Todos</option>
              {topicOptions.map(([name, count]) => (
                <option key={name} value={name}>
                  {name} ({count})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-xs font-black text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={onlyNoExplanation}
              onChange={(e) => setOnlyNoExplanation(e.target.checked)}
              className="w-4 h-4 accent-black"
            />
            <span>Só sem resolução</span>
          </label>
          <label className="flex items-center gap-2 text-xs font-black text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={onlyEdited}
              onChange={(e) => setOnlyEdited(e.target.checked)}
              className="w-4 h-4 accent-black"
            />
            <span>Só editadas por mim ({editedQuestionIds.size})</span>
          </label>
        </div>

        {pageItems.length === 0 ? (
          <p className="text-sm font-bold text-gray-700 dark:text-ink-muted py-4">
            Nenhuma questão com esses filtros.
          </p>
        ) : (
          <ul className="space-y-2">
            {pageItems.map((q) => {
              const edited = editedQuestionIds.has(q.id);
              const hasExplanation = (q.explanation || '').trim().length > 0;
              return (
                <li key={q.id} className="p-3 neo-border-sm bg-surface-2 flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono font-black text-ink">
                      <span className="px-1.5 py-0.5 bg-primary text-ink neo-border-sm">
                        {q.vestibular} {q.year}
                      </span>
                      <span>{q.discipline}</span>
                      <span className="opacity-70">· {q.topic}</span>
                      <span className="px-1.5 py-0.5 bg-surface neo-border-sm">Gabarito {q.correctAlternative}</span>
                      {!hasExplanation && (
                        <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 neo-border-sm">
                          Sem resolução
                        </span>
                      )}
                      {edited && (
                        <span className="px-1.5 py-0.5 bg-amber-200 dark:bg-amber-900 text-black dark:text-amber-100 neo-border-sm">
                          Editada
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-ink leading-snug">{snippet(q.statement)}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingId(q.id)}
                      className="px-3 py-1.5 text-[11px] font-black neo-btn bg-[#00F0FF] text-black flex items-center gap-1"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteOne(q)}
                      className="px-2.5 py-1.5 text-[11px] font-black neo-btn bg-surface text-[#FF3366] flex items-center"
                      title="Apagar questão"
                      aria-label="Apagar questão"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 0}
              onClick={() => setPage(safePage - 1)}
              className="px-3 py-1.5 text-xs font-black neo-btn bg-surface text-ink disabled:opacity-30 flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>
            <span className="text-xs font-mono font-bold text-ink">
              {safePage + 1} de {pageCount}
            </span>
            <button
              type="button"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
              className="px-3 py-1.5 text-xs font-black neo-btn bg-surface text-ink disabled:opacity-30 flex items-center gap-1"
            >
              <span>Próxima</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {(search || vestibular !== 'TODOS' || discipline !== 'TODAS' || topic !== 'TODOS' || onlyNoExplanation || onlyEdited) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setVestibular('TODOS');
                  setDiscipline('TODAS');
                  setTopic('TODOS');
                  setOnlyNoExplanation(false);
                  setOnlyEdited(false);
                }}
                className="px-3 py-1.5 text-xs font-black neo-btn bg-surface text-ink flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar filtros</span>
              </button>
            )}
            <button
              type="button"
              disabled={filtered.length === 0}
              onClick={handleDeleteFiltered}
              className="px-3 py-1.5 text-xs font-black neo-btn bg-[#FF3366] text-white disabled:opacity-40 flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Apagar as {filtered.length} da lista</span>
            </button>
          </div>
        </div>
      </section>

      {editingQuestion && (
        <QuestionEditorModal
          key={editingQuestion.id}
          question={editingQuestion}
          isEdited={editedQuestionIds.has(editingQuestion.id)}
          showMeta
          onSave={(patch) => onSaveQuestion(editingQuestion.id, patch)}
          onRestore={() => onRestoreQuestion(editingQuestion.id)}
          onClose={() => setEditingId(null)}
        />
      )}

      {confirm && <ConfirmDialog state={confirm} onCancel={() => setConfirm(null)} />}
    </div>
  );
};
