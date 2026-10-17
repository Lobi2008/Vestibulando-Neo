/**
 * @file src/types/index.ts
 * @description Definições de tipos centrais para a plataforma Vestibulando Neo.
 * Inclui taxonomia hierárquica, modelo TRI (3PL), Repetição Espaçada (SRS/SM-2),
 * modos de mesa digitalizadora, configurações de sessão e histórico.
 */

export type ExamType = 'ENEM' | 'UERJ' | 'FUVEST' | 'UNICAMP' | 'CONCURSOS';

export type AreaOfKnowledge = 
  | 'Ciências da Natureza e suas Tecnologias'
  | 'Ciências Humanas e suas Tecnologias'
  | 'Linguagens, Códigos e suas Tecnologias'
  | 'Matemática e suas Tecnologias';

export type DisciplineType = 
  | 'Física' 
  | 'Química' 
  | 'Biologia' 
  | 'História' 
  | 'Geografia' 
  | 'Filosofia e Sociologia'
  | 'Língua Portuguesa e Literatura' 
  | 'Língua Estrangeira (Inglês/Espanhol)'
  | 'Matemática';

export interface Alternative {
  id: 'A' | 'B' | 'C' | 'D' | 'E';
  text: string;
}

/**
 * Parâmetros da Teoria de Resposta ao Item (TRI) - Modelo Logístico de 3 Parâmetros (3PL):
 * - a: Poder de discriminação do item (típico: 0.5 a 2.5)
 * - b: Grau de dificuldade do item (escala teta: -3 a +3)
 * - c: Probabilidade de acerto casual / chute (típico: 0.15 a 0.25 para 5 alternativas)
 */
export interface TriParameters {
  a: number; // Discriminação
  b: number; // Dificuldade na escala teta
  c: number; // Acerto casual
}

export type SrsRating = 'ERRO' | 'DIFICIL' | 'BOM' | 'FACIL';

/**
 * Dados de Repetição Espaçada (Algoritmo SM-2):
 * - intervalDays: Quantos dias até a próxima revisão
 * - repetitions: Número de revisões consecutivas bem sucedidas
 * - easeFactor: Fator de facilidade (padrão inicial 2.5)
 * - nextReviewDate: Data formatada YYYY-MM-DD
 */
export interface SrsItemData {
  questionId: string;
  intervalDays: number;
  repetitions: number;
  easeFactor: number;
  nextReviewDate: string;
  lastRating?: SrsRating;
  lastReviewedTimestamp: number;
}

export interface Question {
  id: string;
  vestibular: ExamType;
  year: number;
  edition?: string;
  area: AreaOfKnowledge;
  discipline: DisciplineType;
  topic: string; // Conteúdo Específico (ex: 'Eletrodinâmica')
  subtopic?: string;
  statement: string;
  contextSnippet?: string;
  imageUrl?: string;
  imageCaption?: string;
  alternatives: Alternative[];
  correctAlternative: 'A' | 'B' | 'C' | 'D' | 'E';
  explanation: string;
  triParams?: TriParameters;
  difficultyLevel: 'Fácil' | 'Médio' | 'Difícil';
  sourceUrl?: string;
}

export interface UserAttempt {
  id: string;
  questionId: string;
  vestibular: ExamType;
  area: AreaOfKnowledge;
  discipline: DisciplineType;
  topic: string;
  selectedAlternative: 'A' | 'B' | 'C' | 'D' | 'E';
  isCorrect: boolean;
  timeSpentSeconds: number;
  timestamp: number;
  triParams?: TriParameters;
  srsRating?: SrsRating;
}

export interface UserProfile {
  name: string;
  targetExam: ExamType;
  targetCourse: string;
  dailyGoalQuestions: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  totalXp: number;
  level: number;
  estimatedTri?: number;
}

export type PenTool = 'pen' | 'highlighter' | 'eraser' | 'line';

export interface StylusPoint {
  x: number;
  y: number;
  pressure: number;
  time: number;
}

export interface DrawingStroke {
  id: string;
  tool: PenTool;
  color: string;
  width: number;
  points: StylusPoint[];
}

export type StylusLayoutMode = 'side' | 'bottom' | 'overlay' | 'hidden';

export interface FilterState {
  vestibular: ExamType | 'TODOS';
  area: AreaOfKnowledge | 'TODAS';
  topic: string | 'TODOS';
  discipline: DisciplineType | 'TODAS';
  searchQuery: string;
  status: 'TODAS' | 'NAO_RESOLVIDAS' | 'ACERTADAS' | 'ERRADAS';
}

export interface StudySessionConfig {
  quantity: number;
  vestibulares: ExamType[];
  areas: AreaOfKnowledge[];
  topics: string[];
  statusFilter: 'TODAS' | 'NAO_RESOLVIDAS' | 'ERRADAS';
}

export interface UerjScoreResult {
  totalQuestions: number;
  correctCount: number;
  percentage: number;
  concept: 'A' | 'B' | 'C' | 'D' | 'Reprovado';
  bonusPoints: number;
}

export interface EnemTriResult {
  theta: number;
  enemScore: number;
  standardError: number;
  coherenceScore: number;
}
