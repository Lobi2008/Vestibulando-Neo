/**
 * @file src/App.tsx
 * @description Ponto de entrada principal da aplicação desktop Vestibulando Neo (Windows 11).
 * Gerencia coordenação entre:
 * 1. Tela Inicial de Configuração de Sessão (Home)
 * 2. Caderno de Questões com Filtros e Mesa Digitalizadora (Lateral, Inferior e Sobre o Texto)
 * 3. Repetição Espaçada (SRS SM-2)
 * 4. Dashboard com Gráfico de Evolução Temporal e Acordeão por Conteúdos Específicos
 * 5. Ingestão de Dados em Loop (enem.dev, beatrizmilz, questoesConcursos) e Exportação SQLite
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { WindowTitleBar } from './components/desktop/WindowTitleBar.tsx';
import { HeaderStatsBar, NavTabType } from './components/navigation/HeaderStatsBar.tsx';
import { StudySessionStarter } from './components/session/StudySessionStarter.tsx';
import { TaxonomyFilterBar } from './components/filters/TaxonomyFilterBar.tsx';
import { QuestionCard } from './components/questions/QuestionCard.tsx';
import { SpacedRepetitionDeck } from './components/srs/SpacedRepetitionDeck.tsx';
import { PerformanceDashboard } from './components/dashboard/PerformanceDashboard.tsx';
import { DataSyncHub } from './components/sync/DataSyncHub.tsx';
import { UserProfileTab } from './components/profile/UserProfileTab.tsx';

import type { Question, UserAttempt, UserProfile, FilterState, DrawingStroke, SrsItemData, SrsRating } from './types/index.ts';
import { 
  getStoredQuestions, 
  getStoredAttempts, 
  getStoredProfile, 
  getStoredSrsItems,
  saveSrsItem,
  recordAttempt, 
  updateProfile,
  filterQuestions,
  getQuestionStrokes,
  saveQuestionStrokes
} from './services/storage/localDatabase.ts';
import { calculateNextSrsSchedule, isSrsItemDue, formatDateYmd } from './services/srs/srsEngine.ts';
import { RotateCcw, AlertCircle, ArrowLeft } from 'lucide-react';

export default function App() {
  const [questions, setQuestions] = useState<Question[]>(() => getStoredQuestions());
  const [attempts, setAttempts] = useState<UserAttempt[]>(() => getStoredAttempts());
  const [profile, setProfile] = useState<UserProfile>(() => getStoredProfile());
  const [srsItems, setSrsItems] = useState<Record<string, SrsItemData>>(() => getStoredSrsItems());

  // Aba inicial: 'home' (Tela de Iniciar Questões personalizada)
  const [activeTab, setActiveTab] = useState<NavTabType>('home');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Filtros da Taxonomia Hierárquica
  const [filters, setFilters] = useState<FilterState>({
    vestibular: 'TODOS',
    area: 'TODAS',
    discipline: 'TODAS',
    topic: 'TODOS',
    searchQuery: '',
    status: 'TODAS',
  });

  // IDs das questões congeladas da sessão ativa (para não sumirem ao responder)
  const [activeSessionIds, setActiveSessionIds] = useState<string[] | null>(null);
  const [sessionLimit, setSessionLimit] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);

  // Questões filtradas pela taxonomia de 3 níveis
  const filteredQuestions = useMemo(() => {
    if (activeSessionIds && activeSessionIds.length > 0) {
      const idMap = new Map(questions.map((q) => [q.id, q]));
      return activeSessionIds.map((id) => idMap.get(id)).filter(Boolean) as Question[];
    }
    const list = filterQuestions(questions, filters, attempts);
    if (sessionLimit && sessionLimit > 0) {
      return list.slice(0, sessionLimit);
    }
    return list;
  }, [questions, filters, attempts, sessionLimit, activeSessionIds]);

  useEffect(() => {
    if (currentQuestionIndex >= filteredQuestions.length && filteredQuestions.length > 0) {
      setCurrentQuestionIndex(0);
    }
  }, [filteredQuestions.length, currentQuestionIndex]);

  const currentQuestion = filteredQuestions[currentQuestionIndex] || null;

  // Busca a última tentativa da questão atual
  const currentAttempt = useMemo(() => {
    if (!currentQuestion) return undefined;
    return attempts.filter((a) => a.questionId === currentQuestion.id).slice(-1)[0];
  }, [currentQuestion, attempts]);

  // Busca anotações salvas da mesa digitalizadora
  const currentStrokes = useMemo(() => {
    if (!currentQuestion) return [];
    return getQuestionStrokes(currentQuestion.id);
  }, [currentQuestion]);

  // Contagem de itens SRS que vencem hoje
  const dueSrsCount = useMemo(() => {
    const today = formatDateYmd(new Date());
    return Object.values(srsItems).filter((item) => isSrsItemDue(item, today)).length;
  }, [srsItems]);

  // Inicia sessão a partir da Tela Inicial
  const handleStartSession = (configuredFilters: FilterState, limit: number) => {
    setFilters(configuredFilters);
    setSessionLimit(limit);
    const initialList = filterQuestions(questions, configuredFilters, attempts);
    const chosen = limit > 0 ? initialList.slice(0, limit) : initialList;
    setActiveSessionIds(chosen.map((q) => q.id));
    setCurrentQuestionIndex(0);
    setActiveTab('questions');
  };

  // Manipulador de resposta de questão
  const handleAnswerQuestion = useCallback(
    (questionId: string, selected: 'A' | 'B' | 'C' | 'D' | 'E', timeSpent: number) => {
      const q = questions.find((item) => item.id === questionId);
      if (!q) return;

      const isCorrect = selected === q.correctAlternative;

      const { attempt, profile: updatedProfile } = recordAttempt({
        questionId: q.id,
        vestibular: q.vestibular,
        area: q.area,
        discipline: q.discipline,
        topic: q.topic,
        selectedAlternative: selected,
        isCorrect,
        timeSpentSeconds: timeSpent,
        triParams: q.triParams,
      });

      setAttempts((prev) => [...prev, attempt]);
      setProfile(updatedProfile);
    },
    [questions]
  );

  // Manipulador de classificação de Repetição Espaçada (SM-2)
  const handleRateSrs = useCallback((questionId: string, rating: SrsRating) => {
    const existing = srsItems[questionId];
    const updatedSchedule = calculateNextSrsSchedule(existing, rating, new Date());
    updatedSchedule.questionId = questionId;

    saveSrsItem(updatedSchedule);
    setSrsItems((prev) => ({
      ...prev,
      [questionId]: updatedSchedule,
    }));
  }, [srsItems]);

  // Manipulador para salvar traços da mesa digitalizadora
  const handleSaveStrokes = useCallback((questionId: string, strokes: DrawingStroke[]) => {
    saveQuestionStrokes(questionId, strokes);
  }, []);

  const handleNextQuestion = () => {
    if (currentQuestionIndex < filteredQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  // Inicia revisão de questão a partir do SRS Deck
  const handleStartReviewQuestionFromSrs = (questionId: string) => {
    setFilters({
      vestibular: 'TODOS',
      area: 'TODAS',
      discipline: 'TODAS',
      topic: 'TODOS',
      searchQuery: '',
      status: 'TODAS',
    });
    setSessionLimit(null);
    const idx = questions.findIndex((q) => q.id === questionId);
    if (idx !== -1) {
      setCurrentQuestionIndex(idx);
    }
    setActiveTab('questions');
  };

  // Inicia deck com todas as questões due hoje
  const handleReviewDueDeck = (dueIds: string[]) => {
    const matching = questions.filter((q) => dueIds.includes(q.id));
    if (matching.length > 0) {
      setFilters({
        vestibular: 'TODOS',
        area: 'TODAS',
        discipline: 'TODAS',
        topic: 'TODOS',
        searchQuery: '',
        status: 'TODAS',
      });
      setSessionLimit(dueIds.length);
      setCurrentQuestionIndex(0);
      setActiveTab('questions');
    }
  };

  // Seleciona questão diretamente a partir do Dashboard
  const handleSelectQuestionFromDashboard = (questionId: string) => {
    setFilters({
      vestibular: 'TODOS',
      area: 'TODAS',
      discipline: 'TODAS',
      topic: 'TODOS',
      searchQuery: '',
      status: 'TODAS',
    });
    setSessionLimit(null);
    const idx = questions.findIndex((q) => q.id === questionId);
    if (idx !== -1) {
      setCurrentQuestionIndex(idx);
    }
    setActiveTab('questions');
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F5EE] text-[#111111] antialiased">
      {/* Barra de Título Windows 11 */}
      <WindowTitleBar
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* Header com Gamificação e Abas */}
      <HeaderStatsBar
        profile={profile}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        questionsCount={questions.length}
        solvedCount={attempts.length}
        dueSrsCount={dueSrsCount}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {/* 1. ABA HOME: CONFIGURAR E INICIAR SESSÃO DE ESTUDOS */}
        {activeTab === 'home' && (
          <StudySessionStarter
            questions={questions}
            attempts={attempts}
            onStartSession={handleStartSession}
            onNavigateToSrs={() => setActiveTab('srs')}
          />
        )}

        {/* 2. ABA CADERNO DE QUESTÕES */}
        {activeTab === 'questions' && (
          <div>
            {/* Barra de retorno à tela inicial se estiver em sessão limitada */}
            {sessionLimit && (
              <div className="mb-3 flex items-center justify-between bg-[#FFE600] px-3 py-2 neo-border neo-shadow-sm text-xs font-black">
                <span>🎯 Sessão Personalizada Ativa ({filteredQuestions.length} questões)</span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSessionIds(null);
                    setSessionLimit(null);
                    setActiveTab('home');
                  }}
                  className="bg-black text-white px-2 py-0.5 neo-border-sm flex items-center gap-1 hover:bg-gray-800"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Voltar para Configuração</span>
                </button>
              </div>
            )}

            {/* Filtros da Taxonomia Hierárquica em 3 Níveis */}
            <TaxonomyFilterBar
              questions={questions}
              filters={filters}
              onFilterChange={(updated) => setFilters((prev) => ({ ...prev, ...updated }))}
              onResetFilters={() => {
                setSessionLimit(null);
                setFilters({
                  vestibular: 'TODOS',
                  area: 'TODAS',
                  discipline: 'TODAS',
                  topic: 'TODOS',
                  searchQuery: '',
                  status: 'TODAS',
                });
              }}
              filteredCount={filteredQuestions.length}
            />

            {/* Questão Atual */}
            {currentQuestion ? (
              <QuestionCard
                question={currentQuestion}
                lastAttempt={currentAttempt}
                savedStrokes={currentStrokes}
                srsData={srsItems[currentQuestion.id]}
                onAnswer={handleAnswerQuestion}
                onRateSrs={handleRateSrs}
                onSaveStrokes={handleSaveStrokes}
                onNextQuestion={handleNextQuestion}
                onPrevQuestion={handlePrevQuestion}
                currentIndex={currentQuestionIndex}
                totalCount={filteredQuestions.length}
              />
            ) : (
              <div className="bg-white neo-border neo-shadow p-8 text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-[#FF5A36] mx-auto" />
                <h3 className="text-lg font-black text-black">
                  Nenhuma questão encontrada com os filtros selecionados
                </h3>
                <p className="text-xs text-gray-600 max-w-md mx-auto">
                  Tente alterar os filtros de vestibular, tema/área ou conteúdo específico.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSessionLimit(null);
                    setFilters({
                      vestibular: 'TODOS',
                      area: 'TODAS',
                      discipline: 'TODAS',
                      topic: 'TODOS',
                      searchQuery: '',
                      status: 'TODAS',
                    });
                  }}
                  className="px-4 py-2 text-xs font-black neo-btn bg-[#FFE600] text-black inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Restaurar Todos os Filtros</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 3. ABA REPETIÇÃO ESPAÇADA (SRS) */}
        {activeTab === 'srs' && (
          <SpacedRepetitionDeck
            questions={questions}
            srsItems={srsItems}
            onStartReviewQuestion={handleStartReviewQuestionFromSrs}
            onReviewDueDeck={handleReviewDueDeck}
          />
        )}

        {/* 4. ABA DESEMPENHO & TRI */}
        {activeTab === 'dashboard' && (
          <PerformanceDashboard
            profile={profile}
            attempts={attempts}
            questions={questions}
            onSelectQuestion={handleSelectQuestionFromDashboard}
          />
        )}

        {/* 5. ABA INGESTÃO & BANCO OFFLINE */}
        {activeTab === 'sync' && (
          <DataSyncHub
            questions={questions}
            onQuestionsUpdated={(updated) => setQuestions(updated)}
          />
        )}

        {/* 6. ABA PERFIL & METAS */}
        {activeTab === 'profile' && (
          <UserProfileTab
            profile={profile}
            onUpdateProfile={(updated) => {
              const updatedProf = updateProfile(updated);
              setProfile(updatedProf);
            }}
          />
        )}
      </main>

      {/* Rodapé Desktop */}
      <footer className="bg-white border-t-3 border-black py-3 px-4 text-center text-xs font-bold text-gray-700">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Vestibulando Neo Desktop • ENEM (TRI 3PL), UERJ & Concursos • Windows 11
          </span>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span>Atalhos: [A-E] Alternativas • [R] Rascunho Stylus • [F11] Tela Cheia</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
