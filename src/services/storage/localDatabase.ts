/**
 * @file src/services/storage/localDatabase.ts
 * @description Camada de persistência local offline-first.
 * Gerencia a base de dados de questões, histórico permanente de tentativas,
 * streaks/ofensivas diárias, perfil do estudante e rascunhos da mesa digitalizadora.
 * Suporta exportação para arquivo SQL (compatível com SQLite nativo no Windows 11).
 */

import type { Question, UserAttempt, UserProfile, DrawingStroke, FilterState, SrsItemData, SrsRating, ExamType, DisciplineType } from '../../types/index.ts';
import { INITIAL_QUESTION_SEED } from '../ingestion/questionSeed.ts';

const STORAGE_KEYS = {
  QUESTIONS: 'vestibulando_neo_questions_v1',
  ATTEMPTS: 'vestibulando_neo_attempts_v1',
  PROFILE: 'vestibulando_neo_profile_v1',
  SRS: 'vestibulando_neo_srs_v1',
  ANNOTATIONS_PREFIX: 'vestibulando_neo_strokes_',
  INGESTION_LOGS: 'vestibulando_neo_logs_v1',
  EXPLANATION_OVERRIDES: 'vestibulando_neo_explanations_v1',
  QUESTION_OVERRIDES: 'vestibulando_neo_question_edits_v1',
};

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  targetExam: 'ENEM',
  targetCourse: '',
  dailyGoalQuestions: 15,
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: new Date().toISOString().split('T')[0],
  totalXp: 0,
  level: 1,
};

export function deduplicateQuestions(questions: Question[]): Question[] {
  const uniqueMap = new Map<string, Question>();
  for (const q of questions) {
    const normalizedStatement = (q.statement || '').trim().toLowerCase().replace(/\s+/g, ' ').substring(0, 120);
    // As alternativas entram na chave: várias questões do ENEM compartilham o mesmo texto-base
    // (ou nenhum), e comparar só o enunciado as descartava como "duplicadas".
    const alternativesKey = (q.alternatives || [])
      .map((a) => (a.text || '').trim().toLowerCase().replace(/\s+/g, ' ').substring(0, 60))
      .join('|');
    const key = `${q.vestibular}-${normalizedStatement}-${alternativesKey}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, q);
    }
  }
  return Array.from(uniqueMap.values());
}

/**
 * Campos de uma questão que o aluno pode editar. As edições ficam guardadas à parte
 * (id da questão -> campos alterados), então uma nova sincronização com as APIs não as sobrescreve
 * e dá para voltar ao texto original de qualquer questão.
 */
export type QuestionPatch = Partial<
  Pick<Question, 'statement' | 'alternatives' | 'correctAlternative' | 'explanation' | 'topic' | 'difficultyLevel'>
>;

/** Resoluções salvas por versões anteriores do app (id da questão -> texto). Continuam sendo lidas. */
function getExplanationOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXPLANATION_OVERRIDES);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (e) {
    return {};
  }
}

function getQuestionOverrides(): Record<string, QuestionPatch> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUESTION_OVERRIDES);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (e) {
    return {};
  }
}

function applyOverridesToQuestion(
  question: Question,
  overrides: Record<string, QuestionPatch>,
  legacyExplanations: Record<string, string>
): Question {
  const hasLegacy = Object.prototype.hasOwnProperty.call(legacyExplanations, question.id);
  const patch = overrides[question.id];
  if (!hasLegacy && !patch) return question;
  return {
    ...question,
    ...(hasLegacy ? { explanation: legacyExplanations[question.id] } : {}),
    ...(patch || {}),
  };
}

export function applyQuestionOverrides(questions: Question[]): Question[] {
  const overrides = getQuestionOverrides();
  const legacy = getExplanationOverrides();
  if (Object.keys(overrides).length === 0 && Object.keys(legacy).length === 0) return questions;
  return questions.map((q) => applyOverridesToQuestion(q, overrides, legacy));
}

/** Compatibilidade com o nome antigo. */
export const applyExplanationOverrides = applyQuestionOverrides;

/** Ids das questões que o aluno já editou (enunciado, gabarito, resolução etc.). */
export function getEditedQuestionIds(): string[] {
  const ids = new Set<string>([...Object.keys(getQuestionOverrides()), ...Object.keys(getExplanationOverrides())]);
  return Array.from(ids);
}

/** Recalcula acertos/erros das tentativas de uma questão depois que o gabarito muda. */
function recomputeAttemptsForQuestion(questionId: string, correct: string): boolean {
  const attempts = getStoredAttempts();
  let changed = false;
  const next = attempts.map((a) => {
    if (a.questionId !== questionId) return a;
    const isCorrect = a.selectedAlternative === correct;
    if (isCorrect === a.isCorrect) return a;
    changed = true;
    return { ...a, isCorrect };
  });
  if (changed) localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(next));
  return changed;
}

export interface QuestionUpdateResult {
  questions: Question[];
  /** true quando o gabarito mudou e o acerto/erro de tentativas antigas foi recalculado */
  attemptsChanged: boolean;
}

/**
 * Salva de forma permanente alterações em uma questão (enunciado, alternativas, gabarito,
 * resolução, conteúdo e dificuldade). Retorna null se os dados forem inválidos ou não der para gravar.
 */
export function updateQuestionFields(questionId: string, patch: QuestionPatch): QuestionUpdateResult | null {
  try {
    const base = getRawStoredQuestions().find((q) => q.id === questionId);
    if (!base) return null;

    const overrides = getQuestionOverrides();
    const current = applyOverridesToQuestion(base, overrides, getExplanationOverrides());

    const clean: QuestionPatch = {};
    if (patch.statement !== undefined) clean.statement = patch.statement.trim();
    if (patch.explanation !== undefined) clean.explanation = patch.explanation.trim();
    if (patch.topic !== undefined && patch.topic.trim()) clean.topic = patch.topic.trim();
    if (patch.difficultyLevel !== undefined) clean.difficultyLevel = patch.difficultyLevel;
    if (patch.alternatives !== undefined) {
      clean.alternatives = patch.alternatives.map((alt) => ({ ...alt, text: alt.text.trim() }));
    }
    if (patch.correctAlternative !== undefined) clean.correctAlternative = patch.correctAlternative;

    const merged: Question = { ...current, ...clean };
    if (!merged.statement.trim()) return null;
    if (merged.alternatives.length < 2 || merged.alternatives.some((alt) => !alt.text.trim())) return null;
    if (!merged.alternatives.some((alt) => alt.id === merged.correctAlternative)) return null;

    overrides[questionId] = { ...(overrides[questionId] || {}), ...clean };
    localStorage.setItem(STORAGE_KEYS.QUESTION_OVERRIDES, JSON.stringify(overrides));

    const attemptsChanged = recomputeAttemptsForQuestion(questionId, merged.correctAlternative);
    return { questions: getStoredQuestions(), attemptsChanged };
  } catch (e) {
    console.error('Falha ao salvar a edição da questão:', e);
    return null;
  }
}

/**
 * Adiciona ou edita a resolução de uma questão de forma permanente.
 * Retorna a lista de questões atualizada, ou null se não foi possível gravar.
 */
export function updateQuestionExplanation(questionId: string, explanation: string): Question[] | null {
  const result = updateQuestionFields(questionId, { explanation });
  return result ? result.questions : null;
}

/** Desfaz todas as edições de uma questão, voltando ao enunciado, gabarito e resolução originais. */
export function restoreQuestionOriginal(questionId: string): QuestionUpdateResult | null {
  try {
    const base = getRawStoredQuestions().find((q) => q.id === questionId);
    if (!base) return null;

    const overrides = getQuestionOverrides();
    delete overrides[questionId];
    localStorage.setItem(STORAGE_KEYS.QUESTION_OVERRIDES, JSON.stringify(overrides));

    const legacy = getExplanationOverrides();
    if (Object.prototype.hasOwnProperty.call(legacy, questionId)) {
      delete legacy[questionId];
      localStorage.setItem(STORAGE_KEYS.EXPLANATION_OVERRIDES, JSON.stringify(legacy));
    }

    const attemptsChanged = recomputeAttemptsForQuestion(questionId, base.correctAlternative);
    return { questions: getStoredQuestions(), attemptsChanged };
  } catch (e) {
    console.error('Falha ao restaurar a questão original:', e);
    return null;
  }
}

/**
 * Lê as questões gravadas (sem as edições do aluno), semeando o banco inicial na primeira execução
 * e aplicando deduplicação rigorosa.
 */
function getRawStoredQuestions(): Question[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    if (!raw) {
      const cleanSeed = deduplicateQuestions(INITIAL_QUESTION_SEED);
      localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(cleanSeed));
      return cleanSeed;
    }
    const parsed = JSON.parse(raw);
    const questionsList = Array.isArray(parsed) ? parsed : INITIAL_QUESTION_SEED;
    const deduplicated = deduplicateQuestions(questionsList);
    if (deduplicated.length !== questionsList.length) {
      localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(deduplicated));
    }
    return deduplicated;
  } catch (e) {
    console.error('Falha ao ler questões do storage local:', e);
    return deduplicateQuestions(INITIAL_QUESTION_SEED);
  }
}

/**
 * Inicializa e recupera a lista de questões armazenadas localmente, já com as edições do aluno
 */
export function getStoredQuestions(): Question[] {
  return applyQuestionOverrides(getRawStoredQuestions());
}

/**
 * Salva ou mescla novas questões no banco local garantindo exclusão de duplicatas
 */
export function saveQuestions(newQuestions: Question[]): Question[] {
  try {
    const current = getRawStoredQuestions();
    const combined = [...newQuestions, ...current];
    const deduplicated = deduplicateQuestions(combined);
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(deduplicated));
    return applyQuestionOverrides(deduplicated);
  } catch (e) {
    console.error('Falha ao salvar questões no banco local:', e);
    return getStoredQuestions();
  }
}

/**
 * Critérios para apagar questões do banco local. 'TODOS'/'TODAS' significa "sem filtro" naquele nível.
 */
export interface QuestionDeletionCriteria {
  vestibular: ExamType | 'TODOS';
  discipline: DisciplineType | 'TODAS';
  topic: string | 'TODOS';
}

export function matchesDeletionCriteria(question: Question, criteria: QuestionDeletionCriteria): boolean {
  if (criteria.vestibular !== 'TODOS' && question.vestibular !== criteria.vestibular) return false;
  if (criteria.discipline !== 'TODAS' && question.discipline !== criteria.discipline) return false;
  if (criteria.topic !== 'TODOS' && question.topic !== criteria.topic) return false;
  return true;
}

/**
 * Apaga do banco local as questões que atendem aos critérios (vestibular, matéria e conteúdo específico).
 * Tentativas, itens de revisão espaçada e rascunhos já salvos não são alterados.
 */
export function deleteQuestionsByFilter(
  criteria: QuestionDeletionCriteria
): { remaining: Question[]; removedCount: number } {
  const current = getRawStoredQuestions();
  try {
    const remaining = current.filter((q) => !matchesDeletionCriteria(q, criteria));
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(remaining));
    return { remaining: applyQuestionOverrides(remaining), removedCount: current.length - remaining.length };
  } catch (e) {
    console.error('Falha ao apagar questões do banco local:', e);
    return { remaining: applyQuestionOverrides(current), removedCount: 0 };
  }
}

/**
 * Apaga do banco local as questões com os ids informados.
 * Tentativas, revisões e rascunhos já salvos não são alterados.
 */
export function deleteQuestionsByIds(ids: string[]): { remaining: Question[]; removedCount: number } {
  const idSet = new Set(ids);
  const current = getRawStoredQuestions();
  try {
    const remaining = current.filter((q) => !idSet.has(q.id));
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(remaining));
    return { remaining: applyQuestionOverrides(remaining), removedCount: current.length - remaining.length };
  } catch (e) {
    console.error('Falha ao apagar questões do banco local:', e);
    return { remaining: applyQuestionOverrides(current), removedCount: 0 };
  }
}

/**
 * Limpa completamente o banco de dados local e restaura o seed mestre e perfil padrão
 */
export function clearAndResetDatabase(): Question[] {
  try {
    // Remove explicitamente cada item armazenado
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    
    // Remove todos os rascunhos salvos (que usam prefixo)
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(STORAGE_KEYS.ANNOTATIONS_PREFIX)) {
        localStorage.removeItem(key);
      }
    });

    // Restaura o estado inicial
    const cleanSeed = deduplicateQuestions(INITIAL_QUESTION_SEED);
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(cleanSeed));
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(DEFAULT_PROFILE));
    
    return cleanSeed;
  } catch (e) {
    console.error('Falha ao limpar banco de dados:', e);
    return INITIAL_QUESTION_SEED;
  }
}

/**
 * Apaga todo o progresso do usuário: perfil (nível, XP, ofensivas, meta e curso), histórico de
 * tentativas, itens de revisão espaçada e rascunhos da mesa digitalizadora.
 * O banco de questões e as resoluções escritas pelo aluno não são alterados.
 * Retorna o perfil zerado.
 */
export function clearUserProgress(): UserProfile {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  // lastActiveDate = ontem para que a primeira questão resolvida depois do reset já inicie a ofensiva em 1.
  const blankProfile: UserProfile = {
    ...DEFAULT_PROFILE,
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: yesterday,
    totalXp: 0,
    level: 1,
    estimatedTri: undefined,
  };

  try {
    localStorage.removeItem(STORAGE_KEYS.ATTEMPTS);
    localStorage.removeItem(STORAGE_KEYS.SRS);

    // Rascunhos salvos (um item por questão, identificados pelo prefixo)
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(STORAGE_KEYS.ANNOTATIONS_PREFIX)) {
        localStorage.removeItem(key);
      }
    });

    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(blankProfile));
  } catch (e) {
    console.error('Falha ao apagar o progresso do usuário:', e);
  }
  return blankProfile;
}

/** Informações do perfil que podem ser apagadas separadamente. */
export type ProfileResetField = 'xp' | 'name' | 'course' | 'streak' | 'correct' | 'average';

/**
 * Apaga só as informações escolhidas:
 * - xp: XP total e nível
 * - name / course: voltam ao valor padrão
 * - streak: ofensiva atual e maior ofensiva
 * - correct: tentativas que foram acertos (as erradas ficam)
 * - average: média TRI estimada, junto com as tentativas do ENEM que a calculam
 */
export function clearProfileFields(fields: ProfileResetField[]): { profile: UserProfile; attempts: UserAttempt[] } {
  const chosen = new Set(fields);
  let profile: UserProfile = { ...getStoredProfile() };
  let attempts = getStoredAttempts();

  try {
    if (chosen.has('xp')) {
      profile = { ...profile, totalXp: 0, level: 1 };
    }
    if (chosen.has('name')) {
      profile = { ...profile, name: DEFAULT_PROFILE.name };
    }
    if (chosen.has('course')) {
      profile = { ...profile, targetCourse: DEFAULT_PROFILE.targetCourse };
    }
    if (chosen.has('streak')) {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      profile = { ...profile, currentStreak: 0, longestStreak: 0, lastActiveDate: yesterday };
    }
    if (chosen.has('correct')) {
      attempts = attempts.filter((a) => !a.isCorrect);
    }
    if (chosen.has('average')) {
      profile = { ...profile, estimatedTri: undefined };
      attempts = attempts.filter((a) => a.vestibular !== 'ENEM');
    }

    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(attempts));
  } catch (e) {
    console.error('Falha ao apagar informações do perfil:', e);
  }
  return { profile, attempts };
}

/**
 * Apaga o histórico de tentativas de questões específicas (ou de todas, com 'ALL').
 * Com alsoSrs, também remove o agendamento de revisão dessas questões.
 */
export function deleteAttemptHistory(
  target: string[] | 'ALL',
  alsoSrs: boolean = false
): { attempts: UserAttempt[]; srsItems: Record<string, SrsItemData> } {
  try {
    const idSet = target === 'ALL' ? null : new Set(target);
    const attempts = idSet ? getStoredAttempts().filter((a) => !idSet.has(a.questionId)) : [];
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(attempts));

    if (alsoSrs) {
      if (!idSet) {
        localStorage.removeItem(STORAGE_KEYS.SRS);
      } else {
        const items = getStoredSrsItems();
        idSet.forEach((id) => delete items[id]);
        localStorage.setItem(STORAGE_KEYS.SRS, JSON.stringify(items));
      }
    }
    return { attempts, srsItems: getStoredSrsItems() };
  } catch (e) {
    console.error('Falha ao apagar o histórico de questões:', e);
    return { attempts: getStoredAttempts(), srsItems: getStoredSrsItems() };
  }
}

/**
 * Retorna as tentativas salvas
 */
export function getStoredAttempts(): UserAttempt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ATTEMPTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/**
 * Registra uma nova tentativa do usuário e atualiza a gamificação (XP, Streak)
 */
export function recordAttempt(
  attempt: Omit<UserAttempt, 'id' | 'timestamp'>
): { attempt: UserAttempt; profile: UserProfile } {
  const attempts = getStoredAttempts();
  const newAttempt: UserAttempt = {
    ...attempt,
    id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
  };

  attempts.push(newAttempt);
  localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(attempts));

  // Atualiza perfil e ofensiva (streak)
  const profile = getStoredProfile();
  const todayStr = new Date().toISOString().split('T')[0];

  let streak = profile.currentStreak;
  let longestStreak = profile.longestStreak;

  if (profile.lastActiveDate !== todayStr) {
    const lastDate = new Date(profile.lastActiveDate);
    const currentDate = new Date(todayStr);
    const diffDays = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));

    if (diffDays === 1) {
      streak += 1;
    } else if (diffDays > 1) {
      streak = 1;
    }

    if (streak > longestStreak) {
      longestStreak = streak;
    }
  }

  // Cálculo de XP: 30 XP por acerto, 10 XP por tentativa + bônus de tempo
  const xpGained = attempt.isCorrect ? 35 : 10;
  const updatedXp = profile.totalXp + xpGained;
  const updatedLevel = Math.floor(updatedXp / 300) + 1;

  const updatedProfile: UserProfile = {
    ...profile,
    currentStreak: streak,
    longestStreak,
    lastActiveDate: todayStr,
    totalXp: updatedXp,
    level: updatedLevel,
  };

  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updatedProfile));
  return { attempt: newAttempt, profile: updatedProfile };
}

/**
 * Retorna o perfil do estudante
 */
export function getStoredProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(DEFAULT_PROFILE));
      return DEFAULT_PROFILE;
    }
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_PROFILE;
  }
}

/**
 * Atualiza dados do perfil
 */
export function updateProfile(partial: Partial<UserProfile>): UserProfile {
  const current = getStoredProfile();
  const updated = { ...current, ...partial };
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
  return updated;
}

/**
 * Salva os traços da mesa digitalizadora para uma questão específica
 */
export function saveQuestionStrokes(questionId: string, strokes: DrawingStroke[]): void {
  try {
    const key = `${STORAGE_KEYS.ANNOTATIONS_PREFIX}${questionId}`;
    if (strokes.length === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(strokes));
    }
  } catch (e) {
    console.error('Falha ao salvar anotações da caneta:', e);
  }
}

/**
 * Carrega os traços da mesa digitalizadora de uma questão
 */
export function getQuestionStrokes(questionId: string): DrawingStroke[] {
  try {
    const key = `${STORAGE_KEYS.ANNOTATIONS_PREFIX}${questionId}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Retorna um mapa com todos os rascunhos/anotações salvos no navegador
 */
export function getAllSavedStrokes(): Record<string, DrawingStroke[]> {
  const result: Record<string, DrawingStroke[]> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEYS.ANNOTATIONS_PREFIX)) {
        const questionId = key.replace(STORAGE_KEYS.ANNOTATIONS_PREFIX, '');
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            result[questionId] = parsed;
          }
        }
      }
    }
  } catch (e) {
    console.error('Falha ao listar rascunhos:', e);
  }
  return result;
}

/**
 * Filtra questões pela taxonomia estrita de 3 níveis: Vestibular -> Área -> Conteúdo Específico
 */
export function filterQuestions(questions: Question[], filters: FilterState, attempts: UserAttempt[]): Question[] {
  const attemptsByQuestion = new Map<string, UserAttempt>();
  for (const a of attempts) {
    // Guarda a tentativa mais recente
    attemptsByQuestion.set(a.questionId, a);
  }

  return questions.filter((q) => {
    // Nível 1: Vestibular
    if (filters.vestibular !== 'TODOS' && q.vestibular !== filters.vestibular) {
      return false;
    }

    // Nível 2: Área de Conhecimento
    if (filters.area !== 'TODAS' && q.area !== filters.area) {
      return false;
    }

    // Disciplina opcional
    if (filters.discipline !== 'TODAS' && q.discipline !== filters.discipline) {
      return false;
    }

    // Nível 3: Conteúdo Específico
    if (filters.topic !== 'TODOS' && q.topic !== filters.topic) {
      return false;
    }

    // Filtro por termo de busca livre
    if (filters.searchQuery.trim()) {
      const qLower = filters.searchQuery.toLowerCase();
      const matchStatement = q.statement.toLowerCase().includes(qLower);
      const matchTopic = q.topic.toLowerCase().includes(qLower);
      const matchDiscipline = q.discipline.toLowerCase().includes(qLower);
      if (!matchStatement && !matchTopic && !matchDiscipline) return false;
    }

    // Filtro por status de resolução
    if (filters.status !== 'TODAS') {
      const lastAttempt = attemptsByQuestion.get(q.id);
      if (filters.status === 'NAO_RESOLVIDAS' && lastAttempt) return false;
      if (filters.status === 'ACERTADAS' && (!lastAttempt || !lastAttempt.isCorrect)) return false;
      if (filters.status === 'ERRADAS' && (!lastAttempt || lastAttempt.isCorrect)) return false;
    }

    return true;
  });
}

/**
 * Gera script SQL completo (compatível com SQLite) para exportação de dados
 */
export function generateSqliteExportScript(): string {
  const questions = getStoredQuestions();
  const attempts = getStoredAttempts();
  const profile = getStoredProfile();

  let sql = `-- =========================================================================\n`;
  sql += `-- VESTIBULANDO NEO - EXPORTAÇÃO OFFLINE DE BANCO DE DADOS SQLITE (WINDOWS 11)\n`;
  sql += `-- Gerado em: ${new Date().toISOString()}\n`;
  sql += `-- =========================================================================\n\n`;

  sql += `PRAGMA foreign_keys = ON;\n\n`;

  // Tabela de Perfil
  sql += `CREATE TABLE IF NOT EXISTS user_profile (\n`;
  sql += `  name TEXT PRIMARY KEY,\n`;
  sql += `  target_exam TEXT,\n`;
  sql += `  target_course TEXT,\n`;
  sql += `  daily_goal_questions INTEGER,\n`;
  sql += `  current_streak INTEGER,\n`;
  sql += `  longest_streak INTEGER,\n`;
  sql += `  last_active_date TEXT,\n`;
  sql += `  total_xp INTEGER,\n`;
  sql += `  level INTEGER\n`;
  sql += `);\n\n`;

  sql += `INSERT OR REPLACE INTO user_profile VALUES (\n`;
  sql += `  '${profile.name.replace(/'/g, "''")}',\n`;
  sql += `  '${profile.targetExam}',\n`;
  sql += `  '${profile.targetCourse.replace(/'/g, "''")}',\n`;
  sql += `  ${profile.dailyGoalQuestions},\n`;
  sql += `  ${profile.currentStreak},\n`;
  sql += `  ${profile.longestStreak},\n`;
  sql += `  '${profile.lastActiveDate}',\n`;
  sql += `  ${profile.totalXp},\n`;
  sql += `  ${profile.level}\n`;
  sql += `);\n\n`;

  // Tabela de Questões
  sql += `CREATE TABLE IF NOT EXISTS questions (\n`;
  sql += `  id TEXT PRIMARY KEY,\n`;
  sql += `  vestibular TEXT NOT NULL,\n`;
  sql += `  year INTEGER NOT NULL,\n`;
  sql += `  edition TEXT,\n`;
  sql += `  area TEXT NOT NULL,\n`;
  sql += `  discipline TEXT NOT NULL,\n`;
  sql += `  topic TEXT NOT NULL,\n`;
  sql += `  statement TEXT NOT NULL,\n`;
  sql += `  correct_alternative TEXT NOT NULL,\n`;
  sql += `  explanation TEXT,\n`;
  sql += `  tri_a REAL,\n`;
  sql += `  tri_b REAL,\n`;
  sql += `  tri_c REAL,\n`;
  sql += `  difficulty_level TEXT\n`;
  sql += `);\n\n`;

  for (const q of questions) {
    sql += `INSERT OR REPLACE INTO questions VALUES (\n`;
    sql += `  '${q.id}',\n`;
    sql += `  '${q.vestibular}',\n`;
    sql += `  ${q.year},\n`;
    sql += `  '${(q.edition || '').replace(/'/g, "''")}',\n`;
    sql += `  '${q.area.replace(/'/g, "''")}',\n`;
    sql += `  '${q.discipline.replace(/'/g, "''")}',\n`;
    sql += `  '${q.topic.replace(/'/g, "''")}',\n`;
    sql += `  '${q.statement.replace(/'/g, "''")}',\n`;
    sql += `  '${q.correctAlternative}',\n`;
    sql += `  '${(q.explanation || '').replace(/'/g, "''")}',\n`;
    sql += `  ${q.triParams?.a || 'NULL'},\n`;
    sql += `  ${q.triParams?.b || 'NULL'},\n`;
    sql += `  ${q.triParams?.c || 'NULL'},\n`;
    sql += `  '${q.difficultyLevel}'\n`;
    sql += `);\n`;
  }

  // Tabela de Histórico de Tentativas
  sql += `\nCREATE TABLE IF NOT EXISTS attempts (\n`;
  sql += `  id TEXT PRIMARY KEY,\n`;
  sql += `  question_id TEXT REFERENCES questions(id),\n`;
  sql += `  selected_alternative TEXT NOT NULL,\n`;
  sql += `  is_correct INTEGER NOT NULL,\n`;
  sql += `  time_spent_seconds INTEGER NOT NULL,\n`;
  sql += `  timestamp INTEGER NOT NULL\n`;
  sql += `);\n\n`;

  for (const a of attempts) {
    sql += `INSERT INTO attempts VALUES (\n`;
    sql += `  '${a.id}',\n`;
    sql += `  '${a.questionId}',\n`;
    sql += `  '${a.selectedAlternative}',\n`;
    sql += `  ${a.isCorrect ? 1 : 0},\n`;
    sql += `  ${a.timeSpentSeconds},\n`;
    sql += `  ${a.timestamp}\n`;
    sql += `);\n`;
  }

  return sql;
}

/**
 * Retorna todos os itens registrados no sistema de Repetição Espaçada (SRS)
 */
export function getStoredSrsItems(): Record<string, SrsItemData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SRS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

/**
 * Salva ou atualiza o agendamento de repetição espaçada de uma questão
 */
export function saveSrsItem(item: SrsItemData): void {
  try {
    const items = getStoredSrsItems();
    items[item.questionId] = item;
    localStorage.setItem(STORAGE_KEYS.SRS, JSON.stringify(items));
  } catch (e) {
    console.error('Falha ao salvar item no SRS:', e);
  }
}