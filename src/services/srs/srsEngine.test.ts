/**
 * @file src/services/srs/srsEngine.test.ts
 * @description Testes unitários para o algoritmo de repetição espaçada SM-2.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNextSrsSchedule, isSrsItemDue, formatDateYmd } from './srsEngine.ts';

test('calculateNextSrsSchedule handles ERRO rating by resetting repetitions to 0 and interval to 1 day', () => {
  const baseDate = new Date('2026-10-16T12:00:00Z');
  const existing = {
    questionId: 'q-test-1',
    intervalDays: 10,
    repetitions: 4,
    easeFactor: 2.5,
    nextReviewDate: '2026-10-16',
    lastReviewedTimestamp: 0,
  };

  const next = calculateNextSrsSchedule(existing, 'ERRO', baseDate);

  assert.equal(next.repetitions, 0);
  assert.equal(next.intervalDays, 1);
  assert.equal(next.nextReviewDate, '2026-10-17');
  assert.ok(next.easeFactor < 2.5, 'Ease factor must decrease on error');
});

test('calculateNextSrsSchedule increases interval progressively for BOM and FACIL', () => {
  const baseDate = new Date('2026-10-16T12:00:00Z');

  // Primeira revisão com BOM
  const round1 = calculateNextSrsSchedule(undefined, 'BOM', baseDate);
  assert.equal(round1.repetitions, 1);
  assert.equal(round1.intervalDays, 1);

  // Segunda revisão com BOM
  const round2 = calculateNextSrsSchedule(round1, 'BOM', baseDate);
  assert.equal(round2.repetitions, 2);
  assert.equal(round2.intervalDays, 3);

  // Terceira revisão com FACIL (deve aumentar substancialmente)
  const round3 = calculateNextSrsSchedule(round2, 'FACIL', baseDate);
  assert.equal(round3.repetitions, 3);
  assert.ok(round3.intervalDays >= 8, `Expected interval >= 8, got ${round3.intervalDays}`);
  assert.ok(round3.easeFactor > 2.5, 'Ease factor should increase on FACIL');
});

test('isSrsItemDue correctly detects overdue or due items', () => {
  const today = '2026-10-16';

  const dueItem = {
    questionId: 'q1',
    intervalDays: 1,
    repetitions: 1,
    easeFactor: 2.5,
    nextReviewDate: '2026-10-16',
    lastReviewedTimestamp: 0,
  };
  assert.equal(isSrsItemDue(dueItem, today), true);

  const overdueItem = {
    ...dueItem,
    nextReviewDate: '2026-10-14',
  };
  assert.equal(isSrsItemDue(overdueItem, today), true);

  const futureItem = {
    ...dueItem,
    nextReviewDate: '2026-10-20',
  };
  assert.equal(isSrsItemDue(futureItem, today), false);
});
