/**
 * @file src/services/tri/triEngine.test.ts
 * @description Testes unitários puros com node:test para os motores TRI (ENEM) e UERJ.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateProbability3PL,
  estimateEnemTri,
  calculateUerjScore,
  calculateCoherenceIndex,
  ENEM_SCALE_MEAN,
  ENEM_MIN_SCORE,
  ENEM_MAX_SCORE,
} from './triEngine.ts';

test('calculateProbability3PL calculates probability bounded between c and 1.0', () => {
  const item = { a: 1.5, b: 0.0, c: 0.2 };
  
  // Quando theta = b, logistic = 0.5 -> P = 0.2 + 0.8 * 0.5 = 0.6
  const pAtB = calculateProbability3PL(0.0, item);
  assert.ok(Math.abs(pAtB - 0.6) < 1e-4, `Expected ~0.6, got ${pAtB}`);

  // Para theta muito baixo, P se aproxima do parâmetro c (acerto casual)
  const pVeryLow = calculateProbability3PL(-5.0, item);
  assert.ok(pVeryLow >= 0.2 && pVeryLow < 0.22, `Expected ~0.2, got ${pVeryLow}`);

  // Para theta muito alto, P se aproxima de 1.0
  const pVeryHigh = calculateProbability3PL(5.0, item);
  assert.ok(pVeryHigh > 0.99 && pVeryHigh <= 1.0, `Expected ~1.0, got ${pVeryHigh}`);
});

test('calculateProbability3PL increases monotonically with ability theta', () => {
  const item = { a: 1.8, b: 1.0, c: 0.2 };
  const pLow = calculateProbability3PL(-1.0, item);
  const pMid = calculateProbability3PL(1.0, item);
  const pHigh = calculateProbability3PL(3.0, item);

  assert.ok(pLow < pMid, 'pLow must be lower than pMid');
  assert.ok(pMid < pHigh, 'pMid must be lower than pHigh');
});

test('estimateEnemTri estimates higher score for high accuracy vs low accuracy', () => {
  const testItems = [
    { params: { a: 1.2, b: -1.0, c: 0.2 }, isCorrect: true },
    { params: { a: 1.4, b: -0.5, c: 0.2 }, isCorrect: true },
    { params: { a: 1.5, b: 0.0, c: 0.2 }, isCorrect: true },
    { params: { a: 1.6, b: 0.8, c: 0.2 }, isCorrect: true },
    { params: { a: 1.8, b: 1.5, c: 0.2 }, isCorrect: true },
  ];

  const highResult = estimateEnemTri(testItems);

  const lowItems = testItems.map(item => ({ ...item, isCorrect: false }));
  const lowResult = estimateEnemTri(lowItems);

  assert.ok(
    highResult.enemScore > lowResult.enemScore,
    `High score (${highResult.enemScore}) should exceed low score (${lowResult.enemScore})`
  );
  assert.ok(highResult.enemScore > ENEM_SCALE_MEAN, 'High score should be above mean 500');
  assert.ok(lowResult.enemScore < ENEM_SCALE_MEAN, 'Low score should be below mean 500');
  assert.ok(highResult.enemScore <= ENEM_MAX_SCORE, 'Score must not exceed 1000');
  assert.ok(lowResult.enemScore >= ENEM_MIN_SCORE, 'Score must not be below 200');
});

test('calculateCoherenceIndex distinguishes consistent answers from guessing', () => {
  // Padrão coerente: acertou itens fáceis e errou difíceis
  const coherentPattern = [
    { params: { a: 1.0, b: -1.5, c: 0.2 }, isCorrect: true },
    { params: { a: 1.0, b: -0.5, c: 0.2 }, isCorrect: true },
    { params: { a: 1.0, b: 0.5, c: 0.2 }, isCorrect: false },
    { params: { a: 1.0, b: 1.5, c: 0.2 }, isCorrect: false },
  ];
  const coherentIndex = calculateCoherenceIndex(coherentPattern);
  assert.ok(coherentIndex >= 70, `Expected high coherence, got ${coherentIndex}`);

  // Padrão de chute clássico: errou fáceis e acertou difíceis
  const guessingPattern = [
    { params: { a: 1.0, b: -1.5, c: 0.2 }, isCorrect: false },
    { params: { a: 1.0, b: -0.5, c: 0.2 }, isCorrect: false },
    { params: { a: 1.0, b: 0.5, c: 0.2 }, isCorrect: true },
    { params: { a: 1.0, b: 1.5, c: 0.2 }, isCorrect: true },
  ];
  const guessingIndex = calculateCoherenceIndex(guessingPattern);
  assert.ok(guessingIndex < 30, `Expected low coherence for guessing pattern, got ${guessingIndex}`);
});

test('calculateUerjScore assigns correct concepts according to official UERJ thresholds', () => {
  // 60 questões no total
  // Conceito A: >= 70% (>= 42 acertos) -> 20 pontos
  const resA = calculateUerjScore(45, 60);
  assert.equal(resA.concept, 'A');
  assert.equal(resA.bonusPoints, 20);
  assert.equal(resA.percentage, 75);

  // Conceito B: 60% a 69.9% (36 a 41 acertos) -> 15 pontos
  const resB = calculateUerjScore(38, 60);
  assert.equal(resB.concept, 'B');
  assert.equal(resB.bonusPoints, 15);

  // Conceito C: 50% a 59.9% (30 a 35 acertos) -> 10 pontos
  const resC = calculateUerjScore(32, 60);
  assert.equal(resC.concept, 'C');
  assert.equal(resC.bonusPoints, 10);

  // Conceito D: 40% a 49.9% (24 a 29 acertos) -> 5 pontos
  const resD = calculateUerjScore(25, 60);
  assert.equal(resD.concept, 'D');
  assert.equal(resD.bonusPoints, 5);

  // Reprovado: < 40% (< 24 acertos) -> 0 pontos
  const resReprovado = calculateUerjScore(20, 60);
  assert.equal(resReprovado.concept, 'Reprovado');
  assert.equal(resReprovado.bonusPoints, 0);
});
