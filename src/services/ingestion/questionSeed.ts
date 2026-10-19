/**
 * @file src/services/ingestion/questionSeed.ts
 * @description Banco de questões inicial vazio para que o banco comece zerado, pronto para ser preenchido pelo usuário.
 */

import type { Question } from '../../types/index.ts';

export const INITIAL_QUESTION_SEED: Question[] = [];
