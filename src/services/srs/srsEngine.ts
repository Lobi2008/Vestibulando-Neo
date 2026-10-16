/**
 * @file src/services/srs/srsEngine.ts
 * @description Motor de Repetição Espaçada (SRS) baseado no algoritmo SuperMemo SM-2.
 * Calcula intervalos ótimos de retenção mnemônica para vestibulandos com base
 * na facilidade percebida (Erro, Difícil, Bom, Fácil).
 */

import type { SrsItemData, SrsRating } from '../../types/index.ts';

const MIN_EASE_FACTOR = 1.3;
const DEFAULT_EASE_FACTOR = 2.5;

/**
 * Converte data para string YYYY-MM-DD
 */
export function formatDateYmd(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Adiciona dias a uma data e retorna string formatada
 */
export function addDaysToDate(baseDate: Date, days: number): string {
  const result = new Date(baseDate);
  result.setDate(result.getDate() + Math.max(1, Math.round(days)));
  return formatDateYmd(result);
}

/**
 * Calcula o próximo estado SRS (intervalo, repetições, facilidade) usando SM-2.
 *
 * @param currentData - Dados atuais do item (ou undefined se primeira revisão)
 * @param rating - Avaliação do usuário ('ERRO' | 'DIFICIL' | 'BOM' | 'FACIL')
 * @param referenceDate - Data base do cálculo (padrão hoje)
 */
export function calculateNextSrsSchedule(
  currentData: SrsItemData | undefined,
  rating: SrsRating,
  referenceDate: Date = new Date()
): SrsItemData {
  let repetitions = currentData?.repetitions || 0;
  let intervalDays = currentData?.intervalDays || 1;
  let easeFactor = currentData?.easeFactor || DEFAULT_EASE_FACTOR;

  if (rating === 'ERRO') {
    repetitions = 0;
    intervalDays = 1;
    easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.2);
  } else if (rating === 'DIFICIL') {
    repetitions = Math.max(1, repetitions);
    intervalDays = repetitions === 1 ? 1 : Math.max(1, Math.round(intervalDays * 1.2));
    easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.15);
  } else if (rating === 'BOM') {
    if (repetitions === 0) {
      intervalDays = 1;
    } else if (repetitions === 1) {
      intervalDays = 3;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
    repetitions += 1;
  } else if (rating === 'FACIL') {
    if (repetitions === 0) {
      intervalDays = 2;
    } else if (repetitions === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor * 1.3);
    }
    repetitions += 1;
    easeFactor += 0.15;
  }

  const nextReviewDate = addDaysToDate(referenceDate, intervalDays);

  return {
    questionId: currentData?.questionId || '',
    intervalDays,
    repetitions,
    easeFactor: Math.round(easeFactor * 100) / 100,
    nextReviewDate,
    lastRating: rating,
    lastReviewedTimestamp: referenceDate.getTime(),
  };
}

/**
 * Determina se um item está pronto para revisão na data de corte (padrão hoje)
 */
export function isSrsItemDue(item: SrsItemData, todayStr: string = formatDateYmd(new Date())): boolean {
  return item.nextReviewDate <= todayStr;
}
