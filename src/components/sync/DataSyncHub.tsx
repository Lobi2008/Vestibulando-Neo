/**
 * @file src/components/sync/DataSyncHub.tsx
 * @description Central de sincronização e ingestão de dados para vestibulares.
 * Permite buscar dados da API enem.dev e do repositório beatrizmilz/BancoDeQuestoes,
 * exibe logs de conectividade e exporta os dados para arquivo SQLite offline no Windows 11.
 */

import React, { useState } from 'react';
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
  Sparkles
} from 'lucide-react';
import type { Question } from '../../types/index.ts';
import { fetchFromEnemDev, fetchFromBeatrizMilzRepo, IngestionLog } from '../../services/ingestion/apiIngestion.ts';
import { saveQuestions, generateSqliteExportScript, clearAndResetDatabase } from '../../services/storage/localDatabase.ts';
import { INITIAL_QUESTION_SEED } from '../../services/ingestion/questionSeed.ts';

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
      source: 'Local SQLite/IndexedDB Storage',
      status: 'success',
      message: `Banco offline inicial carregado com sucesso (${questions.length} questões ativas).`,
      count: questions.length,
    },
  ]);

  const [progressMsg, setProgressMsg] = useState<string>('');

  const handleSyncEnemDev = async () => {
    setIsLoadingEnem(true);
    setProgressMsg('Iniciando loop de consulta à API pública enem.dev...');
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
          message: `Erro na sincronização: ${e.message}`,
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
    setProgressMsg('Iniciando loop de agregação dos repositórios...');
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
          message: `Erro na sincronização: ${e.message}`,
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
    setProgressMsg('Executando loop completo: conectando ao enem.dev...');
    try {
      const enemRes = await fetchFromEnemDev((count, msg) => {
        setProgressMsg(`[1/2 ENEM] ${msg}`);
      });
      saveQuestions(enemRes.questions);

      setProgressMsg('Executando loop completo: consultando beatrizmilz e questoesConcursos...');
      const repoRes = await fetchFromBeatrizMilzRepo((count, msg) => {
        setProgressMsg(`[2/2 Repositórios] ${msg}`);
      });
      const allUpdated = saveQuestions([...enemRes.questions, ...repoRes.questions]);
      onQuestionsUpdated(allUpdated);

      setLogs((prev) => [
        {
          timestamp: Date.now(),
          source: 'Sincronização Completa em Loop',
          status: 'success',
          message: `Loop concluído com sucesso: total acumulado de ${allUpdated.length} questões no banco local!`,
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
          source: 'Loop Global de Sincronização',
          status: 'error',
          message: `Falha na sincronização global: ${e.message}`,
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

  const handleResetSeed = () => {
    if (confirm('Deseja limpar e restaurar o banco de dados removendo todas as duplicatas?')) {
      const fresh = clearAndResetDatabase();
      onQuestionsUpdated(fresh);
      setLogs((prev) => [
        {
          timestamp: Date.now(),
          source: 'System Reset & Cleanup',
          status: 'success',
          message: `Banco limpo e restaurado. Total de questões únicas: ${fresh.length}.`,
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
            <h2 className="text-xl md:text-2xl font-black text-black flex items-center gap-2">
              <Database className="w-6 h-6 text-[#3B82F6]" />
              INGESTÃO DE DADOS & PERSISTÊNCIA OFFLINE
            </h2>
            <p className="text-xs font-bold text-gray-700 mt-1">
              Integração com a API pública <strong>enem.dev</strong> e os repositórios de dados abertos{' '}
              <strong>beatrizmilz/BancoDeQuestoes</strong> e <strong>rodrigoborgesmachado/questoesConcursos</strong>.
            </p>
          </div>

          <button
            type="button"
            disabled={isLoadingEnem || isLoadingBeatriz}
            onClick={handleSyncAllBatch}
            className="px-5 py-3 text-xs md:text-sm font-black neo-btn bg-[#00E599] text-black disabled:opacity-50 flex items-center gap-2 whitespace-nowrap shadow-none"
            title="Executa o loop contínuo de sincronização obtendo dezenas de questões de todas as fontes"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {isLoadingEnem || isLoadingBeatriz
                ? 'Sincronizando em Loop...'
                : '⚡ Sincronizar Tudo (Loop em Lote)'}
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
              <span className="font-black text-sm bg-[#FFE600] px-2 py-0.5 neo-border-sm">
                FONTE: API ENEM.DEV
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

            <p className="text-xs text-gray-800 leading-relaxed font-medium mb-4">
              API aberta com banco histórico das provas do ENEM com parâmetros da Teoria de Resposta
              ao Item (TRI), itens das 4 áreas e resoluções pedagógicas.
            </p>
          </div>

          <button
            type="button"
            disabled={isLoadingEnem}
            onClick={handleSyncEnemDev}
            className="w-full py-2.5 px-4 text-xs font-black neo-btn bg-[#FFE600] text-black disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingEnem ? 'animate-spin' : ''}`} />
            <span>{isLoadingEnem ? 'Sincronizando ENEM...' : 'Sincronizar com enem.dev'}</span>
          </button>
        </div>

        {/* FONTE 2: BEATRIZMILZ / BANCO DE QUESTÕES */}
        <div className="bg-[#EBF7FF] neo-border neo-shadow p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-3 border-b-2 border-black">
              <span className="font-black text-sm bg-[#00F0FF] px-2 py-0.5 neo-border-sm">
                FONTE: BEATRIZMILZ REPO
              </span>
              <a
                href="https://github.com/beatrizmilz/BancoDeQuestoes"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-gray-700 hover:text-black flex items-center gap-1"
              >
                <span>GitHub Repo</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-xs text-gray-800 leading-relaxed font-medium mb-4">
              Repositório de dados abertos com exames de qualificação da UERJ, 1ª fase da FUVEST e
              UNICAMP estruturados por disciplina e conteúdo programático.
            </p>
          </div>

          <button
            type="button"
            disabled={isLoadingBeatriz}
            onClick={handleSyncBeatrizMilz}
            className="w-full py-2.5 px-4 text-xs font-black neo-btn bg-[#00F0FF] text-black disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingBeatriz ? 'animate-spin' : ''}`} />
            <span>{isLoadingBeatriz ? 'Sincronizando UERJ...' : 'Sincronizar UERJ / Paulistas'}</span>
          </button>
        </div>
      </div>

      {/* Operações de Persistência Local (SQLite / Backup) */}
      <div className="bg-white neo-border neo-shadow p-5">
        <h3 className="text-sm font-black uppercase tracking-wider text-black pb-2 mb-4 border-b-2 border-black flex items-center justify-between">
          <span>Persistência Local Offline (SQLite Windows 11)</span>
          <span className="text-xs text-green-700 font-bold">100% Funcional Offline</span>
        </h3>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadSqlite}
            className="px-4 py-2 text-xs font-black neo-btn bg-[#00E599] text-black flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Script SQLite Completo (.sql)</span>
          </button>

          <button
            type="button"
            onClick={handleResetSeed}
            className="px-4 py-2 text-xs font-bold neo-btn bg-gray-200 text-black hover:bg-red-100"
          >
            Restaurar Banco de Questões Padrão
          </button>
        </div>
      </div>

      {/* Console de Logs de Ingestão */}
      <div className="bg-[#111111] text-gray-200 neo-border neo-shadow p-4 font-mono text-xs">
        <div className="flex items-center gap-2 pb-2 mb-3 border-b border-gray-700 text-[#00E599] font-bold">
          <Terminal className="w-4 h-4" />
          <span>Console de Ingestão e Diagnóstico de Conexão</span>
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
