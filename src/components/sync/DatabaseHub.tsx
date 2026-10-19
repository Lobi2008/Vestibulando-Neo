/**
 * @file src/components/sync/DatabaseHub.tsx
 * @description Área "Banco de dados" com um menu pequeno de duas opções:
 * 1. Importar e exportar: sincronização, importação e exportação dos bancos de questões (DataSyncHub)
 * 2. Editar e apagar: apagar informações específicas, histórico e navegar/editar questões (DataManagerPanel)
 */

import React, { useState } from 'react';
import { ArrowLeft, Download, Pencil } from 'lucide-react';
import type { Question, UserAttempt, UserProfile, SrsItemData } from '../../types/index.ts';
import type { QuestionPatch } from '../../services/storage/localDatabase.ts';
import { DataSyncHub } from './DataSyncHub.tsx';
import { DataManagerPanel } from './DataManagerPanel.tsx';

type DatabaseSection = 'menu' | 'import' | 'manage';

interface DatabaseHubProps {
  questions: Question[];
  attempts: UserAttempt[];
  profile: UserProfile;
  srsItems: Record<string, SrsItemData>;
  editedQuestionIds: Set<string>;
  onQuestionsUpdated: (updatedList: Question[]) => void;
  onDataChanged: () => void;
  onSaveQuestion: (questionId: string, patch: QuestionPatch) => boolean;
  onRestoreQuestion: (questionId: string) => boolean;
  onDeleteQuestions: (ids: string[]) => number;
}

export const DatabaseHub: React.FC<DatabaseHubProps> = ({
  questions,
  attempts,
  profile,
  srsItems,
  editedQuestionIds,
  onQuestionsUpdated,
  onDataChanged,
  onSaveQuestion,
  onRestoreQuestion,
  onDeleteQuestions,
}) => {
  const [section, setSection] = useState<DatabaseSection>('menu');

  if (section === 'menu') {
    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="bg-surface neo-border neo-shadow p-5">
          <h2 className="text-2xl md:text-3xl font-black text-ink">Banco de dados</h2>
          <p className="text-sm font-bold text-gray-700 dark:text-ink-muted mt-1">
            {questions.length} questões no banco.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <button
            type="button"
            onClick={() => setSection('import')}
            className="text-left bg-primary text-ink neo-border neo-shadow p-6 flex flex-col gap-3 hover:translate-x-0.5 hover:translate-y-0.5 transition-transform"
          >
            <Download className="w-8 h-8" />
            <span className="text-xl font-black">Importar e exportar</span>
          </button>

          <button
            type="button"
            onClick={() => setSection('manage')}
            className="text-left bg-secondary text-ink neo-border neo-shadow p-6 flex flex-col gap-3 hover:translate-x-0.5 hover:translate-y-0.5 transition-transform"
          >
            <Pencil className="w-8 h-8" />
            <span className="text-xl font-black">Editar e apagar</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Menu pequeno: troca entre as duas áreas */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSection('menu')}
          className="px-3 py-2 text-xs font-black neo-btn bg-surface text-ink flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Banco de dados</span>
        </button>

        <button
          type="button"
          onClick={() => setSection('import')}
          className={`px-4 py-2 text-xs font-black neo-btn flex items-center gap-1.5 ${
            section === 'import' ? 'bg-[#111111] text-white dark:bg-[#00F0FF] dark:text-black' : 'bg-surface text-ink'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Importar e exportar</span>
        </button>

        <button
          type="button"
          onClick={() => setSection('manage')}
          className={`px-4 py-2 text-xs font-black neo-btn flex items-center gap-1.5 ${
            section === 'manage' ? 'bg-[#111111] text-white dark:bg-[#00F0FF] dark:text-black' : 'bg-surface text-ink'
          }`}
        >
          <Pencil className="w-4 h-4" />
          <span>Editar e apagar</span>
        </button>
      </div>

      {section === 'import' && <DataSyncHub questions={questions} onQuestionsUpdated={onQuestionsUpdated} />}

      {section === 'manage' && (
        <DataManagerPanel
          questions={questions}
          attempts={attempts}
          profile={profile}
          srsItems={srsItems}
          editedQuestionIds={editedQuestionIds}
          onDataChanged={onDataChanged}
          onSaveQuestion={onSaveQuestion}
          onRestoreQuestion={onRestoreQuestion}
          onDeleteQuestions={onDeleteQuestions}
        />
      )}
    </div>
  );
};
