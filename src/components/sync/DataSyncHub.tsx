/**
 * @file src/components/sync/DataSyncHub.tsx
 * @description Central de sincronização e ingestão de dados para vestibulares.
 * Permite buscar dados da API enem.dev e do repositório beatrizmilz/BancoDeQuestoes,
 * exibe logs de conectividade e exporta os dados para arquivo SQLite offline no Windows 11.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  Database, 
  RefreshCw, 
  Download, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Terminal, 
  ExternalLink,
  Layers,
  Sparkles,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import type { Question, ExamType, DisciplineType } from '../../types/index.ts';
import { fetchFromEnemDev, fetchFromBeatrizMilzRepo, IngestionLog } from '../../services/ingestion/apiIngestion.ts';
import {
  saveQuestions,
  generateSqliteExportScript,
  clearAndResetDatabase,
  deleteQuestionsByFilter,
  matchesDeletionCriteria,
} from '../../services/storage/localDatabase.ts';
import type { QuestionDeletionCriteria } from '../../services/storage/localDatabase.ts';
import { INITIAL_QUESTION_SEED } from '../../services/ingestion/questionSeed.ts';
import {
  IMPORT_FIELD_GUIDE,
  buildCsvTemplate,
  buildJsonTemplate,
  parseQuestionFile,
} from '../../utils/questionImport.ts';
import type { ImportError } from '../../utils/questionImport.ts';

interface DataSyncHubProps {
  questions: Question[];
  onQuestionsUpdated: (updatedList: Question[]) => void;
}

export const DataSyncHub: React.FC<DataSyncHubProps> = ({
  questions,
  onQuestionsUpdated,
}) => {
  const [isLoadingEnem, setIsLoadingEnem] = useState<boolean>(false);
  const [isLoadingBeatriz, setIsLoadingBeatriz] = useState<boolean>(false);
  const [logs, setLogs] = useState<IngestionLog[]>([
    {
      timestamp: Date.now() - 3600000,
      source: 'Banco local',
      status: 'success',
      message: `Banco carregado: ${questions.length} questões.`,
      count: questions.length,
    },
  ]);

  const [progressMsg, setProgressMsg] = useState<string>('');

  // Envio de banco de questões do próprio aluno (.json / .csv)
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [importReport, setImportReport] = useState<{
    fileName: string;
    totalRows: number;
    valid: number;
    added: number;
    errors: ImportError[];
    fatalError?: string;
  } | null>(null);

  // Apagar questões: filtros (vestibular > matéria > conteúdo específico) e confirmação
  const [deleteVestibular, setDeleteVestibular] = useState<ExamType | 'TODOS'>('TODOS');
  const [deleteDiscipline, setDeleteDiscipline] = useState<DisciplineType | 'TODAS'>('TODAS');
  const [deleteTopic, setDeleteTopic] = useState<string>('TODOS');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');

  const deleteCriteria: QuestionDeletionCriteria = {
    vestibular: deleteVestibular,
    discipline: deleteDiscipline,
    topic: deleteTopic,
  };

  const countBy = (list: string[]) => {
    const map = new Map<string, number>();
    list.forEach((item) => map.set(item, (map.get(item) || 0) + 1));
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
  };

  // Opções de cada filtro dependem do nível anterior (só aparece o que existe no banco)
  const vestibularOptions = useMemo(() => countBy(questions.map((q) => q.vestibular)), [questions]);
  const disciplineOptions = useMemo(
    () =>
      countBy(
        questions
          .filter((q) => matchesDeletionCriteria(q, { vestibular: deleteVestibular, discipline: 'TODAS', topic: 'TODOS' }))
          .map((q) => q.discipline)
      ),
    [questions, deleteVestibular]
  );
  const topicOptions = useMemo(
    () =>
      countBy(
        questions
          .filter((q) =>
            matchesDeletionCriteria(q, { vestibular: deleteVestibular, discipline: deleteDiscipline, topic: 'TODOS' })
          )
          .map((q) => q.topic)
      ),
    [questions, deleteVestibular, deleteDiscipline]
  );

  const deleteMatchCount = useMemo(
    () => questions.filter((q) => matchesDeletionCriteria(q, { vestibular: deleteVestibular, discipline: deleteDiscipline, topic: deleteTopic })).length,
    [questions, deleteVestibular, deleteDiscipline, deleteTopic]
  );

  const isDeletingEverything =
    deleteVestibular === 'TODOS' && deleteDiscipline === 'TODAS' && deleteTopic === 'TODOS';

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeleteConfirmText('');
  };

  useEffect(() => {
    if (!isDeleteModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDeleteModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDeleteModalOpen]);

  const handleConfirmDelete = () => {
    if (deleteMatchCount === 0) return;
    if (isDeletingEverything && deleteConfirmText.trim().toUpperCase() !== 'APAGAR') return;

    const { remaining, removedCount } = deleteQuestionsByFilter(deleteCriteria);
    onQuestionsUpdated(remaining);
    setLogs((prev) => [
      {
        timestamp: Date.now(),
        source: 'Exclusão',
        status: removedCount > 0 ? 'success' : 'warning',
        message: `${removedCount} questão(ões) apagada(s). Restam ${remaining.length} no banco.`,
        count: removedCount,
      },
      ...prev,
    ]);

    setDeleteVestibular('TODOS');
    setDeleteDiscipline('TODAS');
    setDeleteTopic('TODOS');
    closeDeleteModal();
  };

  const handleSyncEnemDev = async () => {
    setIsLoadingEnem(true);
    setProgressMsg('Conectando ao enem.dev...');
    try {
      const result = await fetchFromEnemDev((count, msg) => {
        setProgressMsg(msg);
      });
      const updated = saveQuestions(result.questions);
      onQuestionsUpdated(updated);
      setLogs((prev) => [result.log, ...prev]);
    } catch (e: any) {
      setLogs((prev) => [
        {
          timestamp: Date.now(),
          source: 'enem.dev',
          status: 'error',
          message: `Erro na importação: ${e.message}`,
          count: 0,
        },
        ...prev,
      ]);
    } finally {
      setIsLoadingEnem(false);
      setProgressMsg('');
    }
  };

  const handleSyncBeatrizMilz = async () => {
    setIsLoadingBeatriz(true);
    setProgressMsg('Buscando nos repositórios...');
    try {
      const result = await fetchFromBeatrizMilzRepo((count, msg) => {
        setProgressMsg(msg);
      });
      const updated = saveQuestions(result.questions);
      onQuestionsUpdated(updated);
      setLogs((prev) => [result.log, ...prev]);
    } catch (e: any) {
      setLogs((prev) => [
        {
          timestamp: Date.now(),
          source: 'beatrizmilz/BancoDeQuestoes',
          status: 'error',
          message: `Erro na importação: ${e.message}`,
          count: 0,
        },
        ...prev,
      ]);
    } finally {
      setIsLoadingBeatriz(false);
      setProgressMsg('');
    }
  };

  const handleSyncAllBatch = async () => {
    setIsLoadingEnem(true);
    setIsLoadingBeatriz(true);
    setProgressMsg('Conectando ao enem.dev...');
    try {
      const enemRes = await fetchFromEnemDev((count, msg) => {
        setProgressMsg(`[1/2 ENEM] ${msg}`);
      });
      saveQuestions(enemRes.questions);

      setProgressMsg('Buscando nos repositórios...');
      const repoRes = await fetchFromBeatrizMilzRepo((count, msg) => {
        setProgressMsg(`[2/2 Repositórios] ${msg}`);
      });
      const allUpdated = saveQuestions([...enemRes.questions, ...repoRes.questions]);
      onQuestionsUpdated(allUpdated);

      setLogs((prev) => [
        {
          timestamp: Date.now(),
          source: 'Importação completa',
          status: 'success',
          message: `Importação concluída: ${allUpdated.length} questões no banco.`,
          count: enemRes.questions.length + repoRes.questions.length,
        },
        repoRes.log,
        enemRes.log,
        ...prev,
      ]);
    } catch (e: any) {
      setLogs((prev) => [
        {
          timestamp: Date.now(),
          source: 'Importação completa',
          status: 'error',
          message: `Falha na importação: ${e.message}`,
          count: 0,
        },
        ...prev,
      ]);
    } finally {
      setIsLoadingEnem(false);
      setIsLoadingBeatriz(false);
      setProgressMsg('');
    }
  };

  const handleDownloadSqlite = () => {
    const sql = generateSqliteExportScript();
    const blob = new Blob([sql], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vestibulando_neo_sqlite_db_${Date.now()}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTextFile = (content: string, fileName: string, mime: string) => {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJsonTemplate = () =>
    downloadTextFile(buildJsonTemplate(), 'modelo_banco_questoes.json', 'application/json');

  const handleDownloadCsvTemplate = () =>
    downloadTextFile(buildCsvTemplate(), 'modelo_banco_questoes.csv', 'text/csv');

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const content = await file.text();
      const result = parseQuestionFile(file.name, content);

      let added = 0;
      if (result.questions.length > 0) {
        const updated = saveQuestions(result.questions);
        added = Math.max(0, updated.length - questions.length);
        onQuestionsUpdated(updated);
      }

      setImportReport({
        fileName: file.name,
        totalRows: result.totalRows,
        valid: result.questions.length,
        added,
        errors: result.errors,
      });
      setLogs((prev) => [
        {
          timestamp: Date.now(),
          source: 'Seu arquivo',
          status: result.errors.length === 0 ? 'success' : result.questions.length > 0 ? 'warning' : 'error',
          message: `${file.name}: ${added} nova(s), ${result.questions.length - added} já existiam, ${result.errors.length} com erro.`,
          count: added,
        },
        ...prev,
      ]);
    } catch (err: any) {
      setImportReport({
        fileName: file.name,
        totalRows: 0,
        valid: 0,
        added: 0,
        errors: [],
        fatalError: err?.message || 'Não foi possível ler o arquivo.',
      });
    }
  };

  const handleResetSeed = () => {
    if (confirm('Restaurar o banco de questões padrão e remover duplicatas?')) {
      const fresh = clearAndResetDatabase();
      onQuestionsUpdated(fresh);
      setLogs((prev) => [
        {
          timestamp: Date.now(),
          source: 'Restauração',
          status: 'success',
          message: `Banco restaurado: ${fresh.length} questões.`,
          count: fresh.length,
        },
        ...prev,
      ]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white neo-border neo-shadow p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-black flex items-center gap-2">
              <Database className="w-6 h-6 text-[#3B82F6]" />
              Banco de questões
            </h2>
            <p className="text-sm font-bold text-gray-700 mt-1">
              Importe questões do <strong>enem.dev</strong> e de repositórios abertos, ou envie as suas.
            </p>
          </div>

          <button
            type="button"
            disabled={isLoadingEnem || isLoadingBeatriz}
            onClick={handleSyncAllBatch}
            className="px-5 py-3 text-xs md:text-sm font-black neo-btn bg-[#00E599] text-black disabled:opacity-50 flex items-center gap-2 whitespace-nowrap shadow-none"
            title="Importar de todas as fontes"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {isLoadingEnem || isLoadingBeatriz
                ? 'Importando...'
                : '⚡ Importar tudo'}
            </span>
          </button>
        </div>

        {progressMsg && (
          <div className="p-2.5 bg-[#FFE600] neo-border-sm flex items-center gap-2 font-mono text-xs font-black animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin text-black" />
            <span>{progressMsg}</span>
          </div>
        )}
      </div>

      {/* Fontes de Ingestão */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* FONTE 1: ENEM.DEV */}
        <div className="bg-[#FFFDE7] neo-border neo-shadow p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-3 border-b-2 border-black">
              <span className="font-black text-base bg-[#FFE600] px-2.5 py-1 neo-border-sm">
                ENEM
              </span>
              <a
                href="https://enem.dev"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-gray-700 hover:text-black flex items-center gap-1"
              >
                <span>enem.dev</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-sm text-gray-800 leading-relaxed font-medium mb-4">
              Provas antigas do ENEM, das 4 áreas, com os parâmetros usados no cálculo da nota TRI.
            </p>
          </div>

          <button
            type="button"
            disabled={isLoadingEnem}
            onClick={handleSyncEnemDev}
            className="w-full py-2.5 px-4 text-sm font-black neo-btn bg-[#FFE600] text-black disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingEnem ? 'animate-spin' : ''}`} />
            <span>{isLoadingEnem ? 'Importando ENEM...' : 'Importar do enem.dev'}</span>
          </button>
        </div>

        {/* FONTE 2: BEATRIZMILZ / BANCO DE QUESTÕES */}
        <div className="bg-[#EBF7FF] neo-border neo-shadow p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-3 border-b-2 border-black">
              <span className="font-black text-base bg-[#00F0FF] px-2.5 py-1 neo-border-sm">
                UERJ e outros
              </span>
              <a
                href="https://github.com/beatrizmilz/BancoDeQuestoes"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-gray-700 hover:text-black flex items-center gap-1"
              >
                <span>GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-sm text-gray-800 leading-relaxed font-medium mb-4">
              Questões da UERJ (qualificação) e da 1ª fase da FUVEST e da UNICAMP, separadas por matéria e conteúdo.
            </p>
          </div>

          <button
            type="button"
            disabled={isLoadingBeatriz}
            onClick={handleSyncBeatrizMilz}
            className="w-full py-2.5 px-4 text-sm font-black neo-btn bg-[#00F0FF] text-black disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingBeatriz ? 'animate-spin' : ''}`} />
            <span>{isLoadingBeatriz ? 'Importando...' : 'Importar UERJ, FUVEST e UNICAMP'}</span>
          </button>
        </div>
      </div>

      {/* Operações de Persistência Local (SQLite / Backup) */}
      <div className="bg-white neo-border neo-shadow p-5">
        <h3 className="text-base font-black uppercase tracking-wider text-black pb-2 mb-4 border-b-2 border-black flex items-center justify-between">
          <span>Backup e restauração</span>
          <span className="text-xs text-green-700 font-bold">Funciona sem internet</span>
        </h3>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadSqlite}
            className="px-4 py-2 text-xs font-black neo-btn bg-[#00E599] text-black flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Exportar backup (.sql)</span>
          </button>

          <button
            type="button"
            onClick={handleResetSeed}
            className="px-4 py-2 text-xs font-bold neo-btn bg-gray-200 text-black hover:bg-red-100"
          >
            Restaurar questões padrão
          </button>
        </div>
      </div>

      {/* Enviar o próprio banco de questões (upload .json / .csv) */}
      <div className="bg-white neo-border neo-shadow p-5 space-y-4">
        <h3 className="text-base font-black uppercase tracking-wider text-black pb-2 border-b-2 border-black flex items-center gap-2">
          <Upload className="w-4 h-4 text-[#00AA44]" />
          <span>Enviar minhas questões</span>
        </h3>

        <p className="text-sm font-bold text-gray-700 leading-relaxed">
          Baixe o modelo, preencha com as suas questões e envie de volta. Aceita <strong>.json</strong> e <strong>.csv</strong> (Excel salvo como CSV). Questões repetidas não são duplicadas.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadCsvTemplate}
            className="px-4 py-2 text-xs font-black neo-btn bg-white dark:bg-[#27272A] text-black dark:text-white flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Modelo (.csv / Excel)</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadJsonTemplate}
            className="px-4 py-2 text-xs font-black neo-btn bg-white dark:bg-[#27272A] text-black dark:text-white flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Modelo (.json)</span>
          </button>

          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="px-4 py-2 text-xs font-black neo-btn bg-[#00E599] text-black flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>Enviar arquivo</span>
          </button>

          <input
            ref={importInputRef}
            type="file"
            accept=".json,.csv,application/json,text/csv"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>

        {importReport && (
          <div
            className={`p-3 neo-border-sm text-xs space-y-2 ${
              importReport.fatalError
                ? 'bg-red-100 dark:bg-red-950 text-red-900 dark:text-red-200'
                : 'bg-green-100 dark:bg-green-950 text-green-900 dark:text-green-200'
            }`}
          >
            <div className="font-black flex items-center gap-1.5">
              {importReport.fatalError ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
              <span>{importReport.fileName}</span>
            </div>

            {importReport.fatalError ? (
              <p className="font-bold">{importReport.fatalError}</p>
            ) : (
              <p className="font-bold">
                {importReport.totalRows} linha(s): {importReport.valid} válida(s), {importReport.added} nova(s), {importReport.valid - importReport.added} já existia(m), {importReport.errors.length} com erro.
              </p>
            )}

            {importReport.errors.length > 0 && (
              <ul className="font-mono text-[11px] space-y-0.5 max-h-40 overflow-y-auto bg-white dark:bg-[#18181B] text-gray-900 dark:text-gray-100 p-2 neo-border-sm">
                {importReport.errors.slice(0, 50).map((err, idx) => (
                  <li key={idx}>
                    Linha {err.row}: {err.message}
                  </li>
                ))}
                {importReport.errors.length > 50 && <li>… e mais {importReport.errors.length - 50} erro(s).</li>}
              </ul>
            )}
          </div>
        )}

        <details className="text-xs">
          <summary className="cursor-pointer font-black text-black">Ver formato do arquivo</summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-black dark:border-gray-600 text-black">
                  <th className="py-1 pr-3 font-black">Campo</th>
                  <th className="py-1 pr-3 font-black">Obrigatório</th>
                  <th className="py-1 font-black">O que colocar</th>
                </tr>
              </thead>
              <tbody>
                {IMPORT_FIELD_GUIDE.map((item) => (
                  <tr key={item.field} className="border-b border-gray-300 dark:border-gray-700 align-top">
                    <td className="py-1.5 pr-3 font-mono font-bold text-black whitespace-nowrap">{item.field}</td>
                    <td className="py-1.5 pr-3 font-bold text-gray-700 whitespace-nowrap">{item.required ? 'Sim' : 'Não'}</td>
                    <td className="py-1.5 text-gray-700">{item.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-gray-700">
              No CSV, a primeira linha deve ter exatamente esses nomes de coluna. Para quebrar linha numa célula do Excel, use Alt+Enter.
            </p>
          </div>
        </details>
      </div>

      {/* Apagar questões do banco (com filtros e confirmação) */}
      <div className="bg-[#FFF0F3] neo-border neo-shadow p-5">
        <h3 className="text-base font-black uppercase tracking-wider text-black pb-2 mb-4 border-b-2 border-black flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-[#FF3366]" />
          <span>Apagar questões</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <label className="text-xs font-black text-black space-y-1 block">
            <span>Vestibular</span>
            <select
              value={deleteVestibular}
              onChange={(e) => {
                setDeleteVestibular(e.target.value as ExamType | 'TODOS');
                setDeleteDiscipline('TODAS');
                setDeleteTopic('TODOS');
              }}
              className="w-full bg-white neo-border-sm px-2 py-2 text-xs font-bold text-black"
            >
              <option value="TODOS">Todos</option>
              {vestibularOptions.map(([name, count]) => (
                <option key={name} value={name}>
                  {name} ({count})
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-black text-black space-y-1 block">
            <span>Matéria</span>
            <select
              value={deleteDiscipline}
              onChange={(e) => {
                setDeleteDiscipline(e.target.value as DisciplineType | 'TODAS');
                setDeleteTopic('TODOS');
              }}
              className="w-full bg-white neo-border-sm px-2 py-2 text-xs font-bold text-black"
            >
              <option value="TODAS">Todas</option>
              {disciplineOptions.map(([name, count]) => (
                <option key={name} value={name}>
                  {name} ({count})
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-black text-black space-y-1 block">
            <span>Conteúdo</span>
            <select
              value={deleteTopic}
              onChange={(e) => setDeleteTopic(e.target.value)}
              className="w-full bg-white neo-border-sm px-2 py-2 text-xs font-bold text-black"
            >
              <option value="TODOS">Todos</option>
              {topicOptions.map(([name, count]) => (
                <option key={name} value={name}>
                  {name} ({count})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-bold text-gray-800">
            {deleteMatchCount} questão(ões) nos filtros escolhidos.
          </span>
          <button
            type="button"
            disabled={deleteMatchCount === 0}
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-4 py-2 text-xs font-black neo-btn bg-[#FF3366] text-white disabled:opacity-40 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Apagar</span>
          </button>
        </div>
      </div>

      {/* Confirmação de exclusão */}
      {isDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-questions-title"
          onClick={closeDeleteModal}
        >
          <div
            className="w-full max-w-md bg-white neo-border-thick neo-shadow-xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 id="delete-questions-title" className="text-base font-black text-black flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#FF3366]" />
              Confirmar exclusão
            </h4>

            <p className="text-sm font-bold text-gray-900">
              Você vai apagar <span className="text-[#FF3366]">{deleteMatchCount}</span> questão(ões). Isso não pode ser desfeito.
            </p>

            <ul className="text-xs font-mono bg-[#F5F2EA] neo-border-sm p-3 space-y-1 text-black">
              <li>Vestibular: <strong>{deleteVestibular === 'TODOS' ? 'Todos' : deleteVestibular}</strong></li>
              <li>Matéria: <strong>{deleteDiscipline === 'TODAS' ? 'Todas' : deleteDiscipline}</strong></li>
              <li>Conteúdo: <strong>{deleteTopic === 'TODOS' ? 'Todos' : deleteTopic}</strong></li>
            </ul>

            {isDeletingEverything && (
              <label className="block text-xs font-black text-black space-y-1">
                <span>
                  Sem filtros, isso apaga TODAS as questões. Digite <strong>APAGAR</strong> para confirmar.
                </span>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  autoFocus
                  className="w-full bg-white neo-border-sm px-2 py-2 text-sm font-mono text-black"
                  placeholder="APAGAR"
                />
              </label>
            )}

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="px-4 py-2 text-xs font-black neo-btn bg-white text-black"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeletingEverything && deleteConfirmText.trim().toUpperCase() !== 'APAGAR'}
                className="px-4 py-2 text-xs font-black neo-btn bg-[#FF3366] text-white disabled:opacity-40 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Apagar definitivamente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Console de Logs de Ingestão */}
      <div className="bg-[#111111] text-gray-200 neo-border neo-shadow p-4 font-mono text-xs">
        <div className="flex items-center gap-2 pb-2 mb-3 border-b border-gray-700 text-[#00E599] font-bold">
          <Terminal className="w-4 h-4" />
          <span>Registro</span>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {logs.map((log, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-gray-500 text-[10px]">
                [{new Date(log.timestamp).toLocaleTimeString()}]
              </span>
              <span
                className={`font-bold ${
                  log.status === 'success'
                    ? 'text-[#00E599]'
                    : log.status === 'cached'
                    ? 'text-[#FFE600]'
                    : log.status === 'warning'
                    ? 'text-orange-400'
                    : 'text-[#FF3366]'
                }`}
              >
                [{log.source}]:
              </span>
              <span className="text-gray-300">{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};