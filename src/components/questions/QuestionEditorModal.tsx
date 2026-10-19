/**
 * @file src/components/questions/QuestionEditorModal.tsx
 * @description Janela para editar uma questão: enunciado, alternativas, gabarito e resolução
 * (e, opcionalmente, conteúdo e dificuldade). Tudo o que for salvo fica gravado no banco local.
 * Usada na tela de resolução (botão discreto) e na área de gerenciar o banco.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Check, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import type { Alternative, Question } from '../../types/index.ts';
import type { QuestionPatch } from '../../services/storage/localDatabase.ts';

type AltId = Alternative['id'];
const ALT_IDS: AltId[] = ['A', 'B', 'C', 'D', 'E'];
const DIFFICULTIES: Question['difficultyLevel'][] = ['Fácil', 'Médio', 'Difícil'];

interface QuestionEditorModalProps {
  question: Question;
  /** true se a questão já foi editada antes (mostra o botão de voltar ao original) */
  isEdited?: boolean;
  /** mostra também os campos de conteúdo e dificuldade */
  showMeta?: boolean;
  /** Grava as alterações. Retorna false se não foi possível salvar. */
  onSave: (patch: QuestionPatch) => boolean;
  /** Volta a questão ao original. Retorna false se não foi possível. */
  onRestore?: () => boolean;
  onClose: () => void;
}

export const QuestionEditorModal: React.FC<QuestionEditorModalProps> = ({
  question,
  isEdited = false,
  showMeta = false,
  onSave,
  onRestore,
  onClose,
}) => {
  const [statement, setStatement] = useState<string>(question.statement || '');
  const [alternatives, setAlternatives] = useState<Alternative[]>(() =>
    question.alternatives.map((alt) => ({ ...alt }))
  );
  const [correct, setCorrect] = useState<AltId>(question.correctAlternative);
  const [explanation, setExplanation] = useState<string>(question.explanation || '');
  const [topic, setTopic] = useState<string>(question.topic || '');
  const [difficulty, setDifficulty] = useState<Question['difficultyLevel']>(question.difficultyLevel);
  const [error, setError] = useState<string>('');
  const [confirmRestore, setConfirmRestore] = useState<boolean>(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const patch = useMemo<QuestionPatch>(() => {
    const changes: QuestionPatch = {};
    if (statement.trim() !== (question.statement || '').trim()) changes.statement = statement;
    if (explanation.trim() !== (question.explanation || '').trim()) changes.explanation = explanation;
    if (correct !== question.correctAlternative) changes.correctAlternative = correct;
    const altsChanged =
      alternatives.length !== question.alternatives.length ||
      alternatives.some((alt, i) => alt.text.trim() !== (question.alternatives[i]?.text || '').trim());
    if (altsChanged) changes.alternatives = alternatives;
    if (showMeta) {
      if (topic.trim() && topic.trim() !== question.topic) changes.topic = topic;
      if (difficulty !== question.difficultyLevel) changes.difficultyLevel = difficulty;
    }
    return changes;
  }, [statement, explanation, correct, alternatives, topic, difficulty, question, showMeta]);

  const hasChanges = Object.keys(patch).length > 0;

  const handleAltText = (id: AltId, text: string) => {
    setAlternatives((prev) => prev.map((alt) => (alt.id === id ? { ...alt, text } : alt)));
  };

  const handleAddAlternative = () => {
    if (alternatives.length >= ALT_IDS.length) return;
    setAlternatives((prev) => [...prev, { id: ALT_IDS[prev.length], text: '' }]);
  };

  const handleRemoveLastAlternative = () => {
    if (alternatives.length <= 2) return;
    const removed = alternatives[alternatives.length - 1];
    setAlternatives((prev) => prev.slice(0, -1));
    if (correct === removed.id) setCorrect('A');
  };

  const handleSave = () => {
    if (!statement.trim()) {
      setError('O enunciado não pode ficar vazio.');
      return;
    }
    if (alternatives.some((alt) => !alt.text.trim())) {
      setError('Preencha o texto de todas as alternativas ou remova as que sobrarem.');
      return;
    }
    if (!hasChanges) {
      onClose();
      return;
    }
    const ok = onSave(patch);
    if (ok) {
      onClose();
    } else {
      setError('Não foi possível salvar a questão.');
    }
  };

  const handleRestore = () => {
    if (!onRestore) return;
    const ok = onRestore();
    if (ok) {
      onClose();
    } else {
      setError('Não foi possível voltar ao original.');
      setConfirmRestore(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="question-editor-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] flex flex-col bg-surface neo-border-thick neo-shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b-2 border-black dark:border-gray-700">
          <div className="min-w-0">
            <h4 id="question-editor-title" className="text-base font-black text-ink">
              Editar questão
            </h4>
            <p className="text-[11px] font-mono font-bold text-gray-600 dark:text-ink-muted truncate">
              {question.vestibular} {question.year} · {question.discipline} · {question.topic}
              {isEdited ? ' · já editada' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 neo-border-sm bg-surface text-ink hover:bg-[#FF3366] hover:text-white"
            title="Fechar (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Campos */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <label className="block space-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-ink">Enunciado</span>
            <textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              rows={9}
              className="selectable-text w-full text-sm font-sans leading-relaxed p-3 neo-border-sm bg-surface text-ink resize-y"
              placeholder="Texto da questão. A última linha ou parágrafo vira a pergunta em negrito."
            />
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-ink">Alternativas e gabarito</span>
              <span className="text-[11px] font-bold text-gray-600 dark:text-ink-muted">
                Marque a letra correta
              </span>
            </div>

            {alternatives.map((alt) => {
              const isCorrectAlt = correct === alt.id;
              return (
                <div key={alt.id} className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => setCorrect(alt.id)}
                    aria-pressed={isCorrectAlt}
                    title={isCorrectAlt ? 'Gabarito' : `Marcar ${alt.id} como gabarito`}
                    className={`w-9 h-9 flex-shrink-0 flex items-center justify-center font-black text-sm neo-border-sm ${
                      isCorrectAlt
                        ? 'bg-[#00E599] text-black'
                        : 'bg-black text-white dark:bg-white dark:text-black'
                    }`}
                  >
                    {isCorrectAlt ? <Check className="w-4 h-4" /> : alt.id}
                  </button>
                  <textarea
                    value={alt.text}
                    onChange={(e) => handleAltText(alt.id, e.target.value)}
                    rows={2}
                    className="selectable-text flex-1 text-sm font-sans p-2 neo-border-sm bg-surface text-ink resize-y"
                    placeholder={`Alternativa ${alt.id}`}
                  />
                </div>
              );
            })}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {alternatives.length < ALT_IDS.length && (
                <button
                  type="button"
                  onClick={handleAddAlternative}
                  className="px-3 py-1.5 text-[11px] font-black neo-btn bg-surface text-ink flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar alternativa</span>
                </button>
              )}
              {alternatives.length > 2 && (
                <button
                  type="button"
                  onClick={handleRemoveLastAlternative}
                  className="px-3 py-1.5 text-[11px] font-black neo-btn bg-surface text-ink flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remover última</span>
                </button>
              )}
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-ink">Resolução</span>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={7}
              className="selectable-text w-full text-sm font-sans leading-relaxed p-3 neo-border-sm bg-surface text-ink resize-y"
              placeholder="Digite ou cole a resolução. Cada linha vira um parágrafo."
            />
          </label>

          {showMeta && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-black uppercase tracking-wider text-ink">Conteúdo</span>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full text-sm font-bold p-2 neo-border-sm bg-surface text-ink"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-black uppercase tracking-wider text-ink">Dificuldade</span>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Question['difficultyLevel'])}
                  className="w-full text-sm font-bold p-2 neo-border-sm bg-surface text-ink"
                >
                  {DIFFICULTIES.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {correct !== question.correctAlternative && (
            <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/50 neo-border-sm p-2">
              Ao mudar o gabarito, as respostas que você já deu nesta questão são conferidas de novo.
            </p>
          )}

          {error && <p className="text-xs font-black text-red-700 dark:text-red-400">{error}</p>}
        </div>

        {/* Rodapé */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t-2 border-black dark:border-gray-700">
          <div>
            {isEdited && onRestore && (
              confirmRestore ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black text-ink">Descartar todas as edições?</span>
                  <button
                    type="button"
                    onClick={handleRestore}
                    className="px-2.5 py-1.5 text-[11px] font-black neo-btn bg-[#FF3366] text-white"
                  >
                    Sim, voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRestore(false)}
                    className="px-2.5 py-1.5 text-[11px] font-black neo-btn bg-surface text-ink"
                  >
                    Não
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmRestore(true)}
                  className="px-3 py-1.5 text-[11px] font-black neo-btn bg-surface text-ink flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Voltar ao original</span>
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-black neo-btn bg-surface text-ink"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges}
              className="px-4 py-2 text-xs font-black neo-btn bg-[#00E599] text-black disabled:opacity-40 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Salvar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
