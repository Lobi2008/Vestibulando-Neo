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
 * 7. Banco de dados: importar/exportar (enem.dev, SQLite) e editar/apagar dados e questões
 * 8. Perfil & Metas com edição inline
 * 9. Alternador completo de Modo Claro e Modo Escuro
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { HeaderStatsBar, NavTabType } from './components/navigation/HeaderStatsBar.tsx';
import { HomeWelcomeHub } from './components/home/HomeWelcomeHub.tsx';
import { StudySessionStarter } from './components/session/StudySessionStarter.tsx';
import { TaxonomyFilterBar } from './components/filters/TaxonomyFilterBar.tsx';
import { QuestionCard } from './components/questions/QuestionCard.tsx';
import { SavedDraftsView } from './components/drafts/SavedDraftsView.tsx';
import { SpacedRepetitionDeck } from './components/srs/SpacedRepetitionDeck.tsx';
import { PerformanceDashboard } from './components/dashboard/PerformanceDashboard.tsx';
import { DatabaseHub } from './components/sync/DatabaseHub.tsx';
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
  getEditedQuestionIds,
  updateQuestionFields,
  restoreQuestionOriginal,
  deleteQuestionsByIds
} from './services/storage/localDatabase.ts';
import type { QuestionPatch } from './services/storage/localDatabase.ts';
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

  // Filtros da Taxonomia Hierárquica
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // IDs das questões congeladas da sessão ativa
  const [activeSessionIds, setActiveSessionIds] = useState<string[] | null>(null);
  const [sessionLimit, setSessionLimit] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);

  // Questões filtradas pela taxonomia (e sorteadas/randomizadas)
  const filteredQuestions = useMemo(() => {
    if (activeSessionIds && activeSessionIds.length > 0) {
      const idMap = new Map(questions.map((q) => [q.id, q]));
      return activeSessionIds.map((id) => idMap.get(id)).filter(Boolean) as Question[];
    }
    const list = filterQuestions(questions, filters, attempts);
    const shuffled = [...list].sort(() => Math.random() - 0.5);
    if (sessionLimit && sessionLimit > 0) {
      return shuffled.slice(0, sessionLimit);
    }
    return shuffled;
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

  // Inicia sessão configurada (simulado) com questões sorteadas (randomizadas)
  const handleStartSession = (configuredFilters: FilterState, limit: number) => {
    setFilters(configuredFilters);
    setSessionLimit(limit);
    const initialList = filterQuestions(questions, configuredFilters, attempts);
    const shuffled = [...initialList].sort(() => Math.random() - 0.5);
    const chosen = limit > 0 ? shuffled.slice(0, limit) : shuffled;
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

  // Edita enunciado, alternativas, gabarito, resolução etc. e grava de forma permanente no banco local
  const handleUpdateQuestion = useCallback((questionId: string, patch: QuestionPatch): boolean => {
    const result = updateQuestionFields(questionId, patch);
    if (!result) return false;
    setQuestions(result.questions);
    // Gabarito mudou: tentativas antigas dessa questão foram conferidas de novo
    if (result.attemptsChanged) setAttempts(getStoredAttempts());
    return true;
  }, []);

  // Adiciona/edita a resolução de uma questão
  const handleUpdateExplanation = useCallback(
    (questionId: string, explanation: string): boolean => handleUpdateQuestion(questionId, { explanation }),
    [handleUpdateQuestion]
  );

  // Desfaz as edições de uma questão (volta ao original)
  const handleRestoreQuestion = useCallback((questionId: string): boolean => {
    const result = restoreQuestionOriginal(questionId);
    if (!result) return false;
    setQuestions(result.questions);
    if (result.attemptsChanged) setAttempts(getStoredAttempts());
    return true;
  }, []);

  // Apaga questões do banco. Retorna quantas foram removidas.
  const handleDeleteQuestions = useCallback((ids: string[]): number => {
    const { remaining, removedCount } = deleteQuestionsByIds(ids);
    setQuestions(remaining);
    return removedCount;
  }, []);

  // Relê perfil, histórico, revisões e rascunhos depois de apagar dados na área Banco de dados
  const handleDataChanged = useCallback(() => {
    setProfile(getStoredProfile());
    setAttempts(getStoredAttempts());
    setSrsItems(getStoredSrsItems());
    setSavedStrokesMap(getAllSavedStrokes());
  }, []);

  // Questões que o aluno já editou (para marcar na lista e no botão de edição)
  const editedQuestionIds = useMemo(() => new Set(getEditedQuestionIds()), [questions]);

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

  return (
    <div className="min-h-screen flex flex-col bg-page text-ink antialiased transition-colors">
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
                onUpdateQuestion={handleUpdateQuestion}
                onRestoreQuestion={handleRestoreQuestion}
                isQuestionEdited={editedQuestionIds.has(currentQuestion.id)}
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

        {/* 7. ABA BANCO DE DADOS: importar/exportar e editar/apagar */}
        {activeTab === 'sync' && (
          <DatabaseHub
            questions={questions}
            attempts={attempts}
            profile={profile}
            srsItems={srsItems}
            editedQuestionIds={editedQuestionIds}
            onQuestionsUpdated={(updated) => setQuestions(updated)}
            onDataChanged={handleDataChanged}
            onSaveQuestion={handleUpdateQuestion}
            onRestoreQuestion={handleRestoreQuestion}
            onDeleteQuestions={handleDeleteQuestions}
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