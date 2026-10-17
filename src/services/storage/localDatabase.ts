/**
 * @file src/services/storage/localDatabase.ts
 * @description Camada de persistência local offline-first.
 * Gerencia a base de dados de questões, histórico permanente de tentativas,
 * streaks/ofensivas diárias, perfil do estudante e rascunhos da mesa digitalizadora.
 * Suporta exportação para arquivo SQL (compatível com SQLite nativo no Windows 11).
 */

import type { Question, UserAttempt, UserProfile, DrawingStroke, FilterState, SrsItemData, SrsRating } from '../../types/index.ts';
import { INITIAL_QUESTION_SEED } from '../ingestion/questionSeed.ts';

const STORAGE_KEYS = {
  QUESTIONS: 'vestibulando_neo_questions_v1',
  ATTEMPTS: 'vestibulando_neo_attempts_v1',
  PROFILE: 'vestibulando_neo_profile_v1',
  SRS: 'vestibulando_neo_srs_v1',
  ANNOTATIONS_PREFIX: 'vestibulando_neo_strokes_',
  INGESTION_LOGS: 'vestibulando_neo_logs_v1',
};

const DEFAULT_PROFILE: UserProfile = {
  name: 'Candidato(a) Focado',
  targetExam: 'ENEM',
  targetCourse: 'Medicina / Engenharia',
  dailyGoalQuestions: 15,
  currentStreak: 4,
  longestStreak: 12,
  lastActiveDate: new Date().toISOString().split('T')[0],
  totalXp: 1840,
  level: 5,
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
 * Inicializa e recupera a lista de questões armazenadas localmente, aplicando deduplicação rigorosa
 */
export function getStoredQuestions(): Question[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    if (!raw) {
      const cleanSeed = deduplicateQuestions(INITIAL_QUESTION_SEED);
      localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(cleanSeed));
      return cleanSeed;
    }
    const parsed = JSON.parse(raw);
    const questionsList = Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_QUESTION_SEED;
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
 * Salva ou mescla novas questões no banco local garantindo exclusão de duplicatas
 */
export function saveQuestions(newQuestions: Question[]): Question[] {
  try {
    const current = getStoredQuestions();
    const combined = [...newQuestions, ...current];
    const deduplicated = deduplicateQuestions(combined);
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(deduplicated));
    return deduplicated;
  } catch (e) {
    console.error('Falha ao salvar questões no banco local:', e);
    return getStoredQuestions();
  }
}

/**
 * Limpa completamente o banco de dados local e restaura o seed mestre limpo
 */
export function clearAndResetDatabase(): Question[] {
  try {
    localStorage.removeItem(STORAGE_KEYS.QUESTIONS);
    localStorage.removeItem(STORAGE_KEYS.ATTEMPTS);
    localStorage.removeItem(STORAGE_KEYS.SRS);
    const cleanSeed = deduplicateQuestions(INITIAL_QUESTION_SEED);
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(cleanSeed));
    return cleanSeed;
  } catch (e) {
    console.error('Falha ao limpar banco de dados:', e);
    return INITIAL_QUESTION_SEED;
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
