/**
 * @file src/App.tsx
 * @description Ponto de entrada principal da aplicação desktop Vestibulando Neo (Windows 11).
 * Gerencia coordenação entre:
 * 1. Tela Inicial de Boas-Vindas focada no estudante com painel de estatísticas e atalhos rápidos (Home)
 * 2. Interface de Configuração de Sessão de Questões (Simulado com volume dinâmico por scroll/clique)
 * 3. Caderno de Questões com Filtros, Cronômetro oficial e Mesa Digitalizadora (Stylus)
 * 4. Seção dedicada de Rascunhos Salvos com filtros padrões e pré-visualização de traços
 * 5. Repetição Espaçada (SRS SM-2)
 * 6. Dashboard de Desempenho com TRI 3PL e análise de proficiência
 * 7. Ingestão de Dados (enem.dev) e Exportação SQLite
 * 8. Perfil & Metas com edição inline
 * 9. Alternador completo de Modo Claro e Modo Escuro
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { WindowTitleBar } from './components/desktop/WindowTitleBar.tsx';
import { HeaderStatsBar, NavTabType } from './components/navigation/HeaderStatsBar.tsx';
import { HomeWelcomeHub } from './components/home/HomeWelcomeHub.tsx';
import { StudySessionStarter } from './components/session/StudySessionStarter.tsx';
import { TaxonomyFilterBar } from './components/filters/TaxonomyFilterBar.tsx';
import { QuestionCard } from './components/questions/QuestionCard.tsx';
import { SavedDraftsView } from './components/drafts/SavedDraftsView.tsx';
import { SpacedRepetitionDeck } from './components/srs/SpacedRepetitionDeck.tsx';
import { PerformanceDashboard } from './components/dashboard/PerformanceDashboard.tsx';
import { DataSyncHub } from './components/sync/DataSyncHub.tsx';
import { UserProfileTab } from './components/profile/UserProfileTab.tsx';
import { ShortcutsFooter } from './components/common/ShortcutsFooter.tsx';

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
  saveQuestionStrokes,
  getAllSavedStrokes,
  updateQuestionExplanation
} from './services/storage/localDatabase.ts';
import { calculateNextSrsSchedule, isSrsItemDue, formatDateYmd } from './services/srs/srsEngine.ts';
import { RotateCcw, AlertCircle, ArrowLeft } from 'lucide-react';

const DEFAULT_FILTERS: FilterState = {
  vestibular: 'TODOS',
  area: 'TODAS',
  discipline: 'TODAS',
  topic: 'TODOS',
  searchQuery: '',
  status: 'TODAS',
};

export default function App() {
  const [questions, setQuestions] = useState<Question[]>(() => getStoredQuestions());
  const [attempts, setAttempts] = useState<UserAttempt[]>(() => getStoredAttempts());
  const [profile, setProfile] = useState<UserProfile>(() => getStoredProfile());
  const [srsItems, setSrsItems] = useState<Record<string, SrsItemData>>(() => getStoredSrsItems());

  // Mapa de todos os rascunhos salvos no dispositivo
  const [savedStrokesMap, setSavedStrokesMap] = useState<Record<string, DrawingStroke[]>>(() => getAllSavedStrokes());
  const [isRascunhoActive, setIsRascunhoActive] = useState<boolean>(false);

  // Modo Escuro com persistência em localStorage
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vestibulando_dark_mode') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      document.documentElement.classList.toggle('dark', isDarkMode);
      localStorage.setItem('vestibulando_dark_mode', String(isDarkMode));
    } catch (e) {
      console.error('Falha ao sincronizar classe do modo escuro:', e);
    }
  }, [isDarkMode]);

  const handleToggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  // Aba ativa na navegação principal
  const [activeTab, setActiveTab] = useState<NavTabType>('home');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Filtros da Taxonomia Hierárquica
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // IDs das questões congeladas da sessão ativa
  const [activeSessionIds, setActiveSessionIds] = useState<string[] | null>(null);
  const [sessionLimit, setSessionLimit] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);

  // Questões filtradas pela taxonomia
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

  // Busca anotações salvas da mesa digitalizadora para a questão atual
  const currentStrokes = useMemo(() => {
    if (!currentQuestion) return [];
    return savedStrokesMap[currentQuestion.id] || getQuestionStrokes(currentQuestion.id) || [];
  }, [currentQuestion, savedStrokesMap]);

  // Contagem de itens SRS que vencem hoje
  const dueSrsCount = useMemo(() => {
    const today = formatDateYmd(new Date());
    return Object.values(srsItems).filter((item) => isSrsItemDue(item, today)).length;
  }, [srsItems]);

  const draftsCount = useMemo(() => {
    return Object.keys(savedStrokesMap).length;
  }, [savedStrokesMap]);

  // Inicia sessão configurada (simulado)
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

  // Manipulador para salvar traços da mesa digitalizadora (atualiza banco e mapa de rascunhos)
  const handleSaveStrokes = useCallback((questionId: string, strokes: DrawingStroke[]) => {
    saveQuestionStrokes(questionId, strokes);
    setSavedStrokesMap((prev) => {
      const updated = { ...prev };
      if (!strokes || strokes.length === 0) {
        delete updated[questionId];
      } else {
        updated[questionId] = strokes;
      }
      return updated;
    });
  }, []);

  // Adiciona/edita a resolução de uma questão e grava de forma permanente no banco local
  const handleUpdateExplanation = useCallback((questionId: string, explanation: string): boolean => {
    const updated = updateQuestionExplanation(questionId, explanation);
    if (!updated) return false;
    setQuestions(updated);
    return true;
  }, []);

  // Excluir rascunho de uma questão
  const handleDeleteDraft = useCallback((questionId: string) => {
    saveQuestionStrokes(questionId, []);
    setSavedStrokesMap((prev) => {
      const updated = { ...prev };
      delete updated[questionId];
      return updated;
    });
  }, []);

  // Abrir questão diretamente a partir de um rascunho
  const handleOpenQuestionWithDraft = useCallback((questionId: string) => {
    setFilters(DEFAULT_FILTERS);
    setSessionLimit(null);
    setActiveSessionIds(null);
    const idx = questions.findIndex((q) => q.id === questionId);
    if (idx !== -1) {
      setCurrentQuestionIndex(idx);
    }
    setActiveTab('questions');
  }, [questions]);

  const filteredCount = filteredQuestions.length;

  const handleNextQuestion = useCallback(() => {
    setCurrentQuestionIndex((prev) => (prev < filteredCount - 1 ? prev + 1 : prev));
  }, [filteredCount]);

  const handlePrevQuestion = useCallback(() => {
    setCurrentQuestionIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const handleFilterChange = useCallback((updated: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setSessionLimit(null);
    setActiveSessionIds(null);
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Inicia revisão de questão a partir do SRS Deck
  const handleStartReviewQuestionFromSrs = (questionId: string) => {
    setFilters(DEFAULT_FILTERS);
    setSessionLimit(null);
    setActiveSessionIds(null);
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
      setFilters(DEFAULT_FILTERS);
      setSessionLimit(dueIds.length);
      setActiveSessionIds(dueIds);
      setCurrentQuestionIndex(0);
      setActiveTab('questions');
    }
  };

  // Seleciona questão diretamente a partir do Dashboard
  const handleSelectQuestionFromDashboard = (questionId: string) => {
    setFilters(DEFAULT_FILTERS);
    setSessionLimit(null);
    setActiveSessionIds(null);
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
    <div className="min-h-screen flex flex-col bg-page text-ink antialiased transition-colors">
      {/* Barra de Título Windows 11 */}
      <WindowTitleBar
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* Header com Gamificação, Modo Escuro e Abas */}
      <HeaderStatsBar
        profile={profile}
        activeTab={activeTab === 'session-config' ? 'home' : activeTab}
        onSelectTab={setActiveTab}
        questionsCount={questions.length}
        solvedCount={attempts.length}
        dueSrsCount={dueSrsCount}
        draftsCount={draftsCount}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-[98.5%] 2xl:max-w-[99.5%] w-full mx-auto p-2 sm:p-3 md:p-5 2xl:p-6">
        {/* 1. ABA HOME: PAINEL DE BOAS-VINDAS COM ESTATÍSTICAS E ATALHOS */}
        {activeTab === 'home' && (
          <HomeWelcomeHub
            profile={profile}
            attempts={attempts}
            questions={questions}
            draftsCount={draftsCount}
            dueSrsCount={dueSrsCount}
            onOpenSessionConfig={() => setActiveTab('session-config')}
            onNavigateTab={setActiveTab}
          />
        )}

        {/* 2. SUBTELA: CONFIGURAR SESSÃO DE QUESTÕES (SIMULADO COM VOLUME DINÂMICO) */}
        {activeTab === 'session-config' && (
          <StudySessionStarter
            questions={questions}
            attempts={attempts}
            onStartSession={handleStartSession}
            onBackToHome={() => setActiveTab('home')}
          />
        )}

        {/* 3. ABA CADERNO DE QUESTÕES */}
        {activeTab === 'questions' && (
          <div>
            {/* Barra de retorno se estiver em sessão personalizada ativa */}
            {sessionLimit && (
              <div className="mb-3 flex items-center justify-between bg-primary px-3 py-2 neo-border neo-shadow-sm text-xs font-black text-ink">
                <span>🎯 Sessão Personalizada Ativa ({filteredQuestions.length} questões)</span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSessionIds(null);
                    setSessionLimit(null);
                    setActiveTab('home');
                  }}
                  className="bg-black text-white px-2.5 py-1 neo-border-sm flex items-center gap-1 hover:bg-gray-800"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar para Início</span>
                </button>
              </div>
            )}

            {/* Filtros da Taxonomia Hierárquica em 3 Níveis (Minimizado por padrão) */}
            <TaxonomyFilterBar
              questions={questions}
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
              filteredCount={filteredCount}
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
                onUpdateExplanation={handleUpdateExplanation}
                onNextQuestion={handleNextQuestion}
                onPrevQuestion={handlePrevQuestion}
                currentIndex={currentQuestionIndex}
                totalCount={filteredQuestions.length}
                isDarkMode={isDarkMode}
                onRascunhoActiveChange={setIsRascunhoActive}
              />
            ) : (
              <div className="bg-surface neo-border neo-shadow p-8 text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-[#FF5A36] mx-auto" />
                <h3 className="text-lg font-black text-ink">
                  Nenhuma questão encontrada com os filtros selecionados
                </h3>
                <p className="text-xs text-gray-600 dark:text-ink-muted max-w-md mx-auto">
                  Tente alterar os filtros de vestibular, tema/área ou conteúdo específico.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-2 text-xs font-black neo-btn bg-primary text-ink inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Restaurar Todos os Filtros</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 4. ABA MEUS RASCUNHOS SALVOS */}
        {activeTab === 'drafts' && (
          <SavedDraftsView
            questions={questions}
            savedStrokesMap={savedStrokesMap}
            onOpenQuestionWithDraft={handleOpenQuestionWithDraft}
            onDeleteDraft={handleDeleteDraft}
            onNavigateToQuestions={() => setActiveTab('questions')}
            isDarkMode={isDarkMode}
          />
        )}

        {/* 5. ABA REPETIÇÃO ESPAÇADA (SRS) */}
        {activeTab === 'srs' && (
          <SpacedRepetitionDeck
            questions={questions}
            srsItems={srsItems}
            onStartReviewQuestion={handleStartReviewQuestionFromSrs}
            onReviewDueDeck={handleReviewDueDeck}
          />
        )}

        {/* 6. ABA DESEMPENHO & TRI */}
        {activeTab === 'dashboard' && (
          <PerformanceDashboard
            profile={profile}
            attempts={attempts}
            questions={questions}
            onSelectQuestion={handleSelectQuestionFromDashboard}
          />
        )}

        {/* 7. ABA INGESTÃO & BANCO OFFLINE */}
        {activeTab === 'sync' && (
          <DataSyncHub
            questions={questions}
            onQuestionsUpdated={(updated) => setQuestions(updated)}
          />
        )}

        {/* 8. ABA PERFIL & METAS */}
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

      {/* Rodapé de atalhos */}
      <ShortcutsFooter
        showQuestionKeys={activeTab === 'questions' && !!currentQuestion}
        showDrawKeys={isRascunhoActive}
      />
    </div>
  );
}