/**
 * @file src/services/storage/localDatabase.test.ts
 * @description Testes para lógica de filtragem hierárquica por Vestibular, Área e Conteúdo.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { filterQuestions } from './localDatabase.ts';
import type { Question, FilterState, UserAttempt } from '../../types/index.ts';

const mockQuestions: Question[] = [
  {
    id: 'q1',
    vestibular: 'ENEM',
    year: 2023,
    area: 'Ciências da Natureza e suas Tecnologias',
    discipline: 'Física',
    topic: 'Eletrodinâmica',
    statement: 'Circuito elétrico com lâmpadas em paralelo.',
    alternatives: [
      { id: 'A', text: '10' },
      { id: 'B', text: '20' },
      { id: 'C', text: '30' },
      { id: 'D', text: '40' },
      { id: 'E', text: '50' },
    ],
    correctAlternative: 'A',
    explanation: 'Explicação detalhada',
    difficultyLevel: 'Fácil',
  },
  {
    id: 'q2',
    vestibular: 'UERJ',
    year: 2024,
    area: 'Linguagens, Códigos e suas Tecnologias',
    discipline: 'Língua Portuguesa e Literatura',
    topic: 'Figuras de Linguagem',
    statement: 'Identifique a metáfora presente no soneto.',
    alternatives: [
      { id: 'A', text: 'Opção 1' },
      { id: 'B', text: 'Opção 2' },
      { id: 'C', text: 'Opção 3' },
      { id: 'D', text: 'Opção 4' },
    ],
    correctAlternative: 'B',
    explanation: 'Explicação UERJ',
    difficultyLevel: 'Médio',
  },
  {
    id: 'q3',
    vestibular: 'ENEM',
    year: 2022,
    area: 'Matemática e suas Tecnologias',
    discipline: 'Matemática',
    topic: 'Geometria Espacial',
    statement: 'Volume de um prisma hexagonal.',
    alternatives: [
      { id: 'A', text: '100' },
      { id: 'B', text: '200' },
      { id: 'C', text: '300' },
      { id: 'D', text: '400' },
      { id: 'E', text: '500' },
    ],
    correctAlternative: 'C',
    explanation: 'Explicação matemática',
    difficultyLevel: 'Difícil',
  },
];

test('filterQuestions filters strictly by Vestibular level', () => {
  const filterEnem: FilterState = {
    vestibular: 'ENEM',
    area: 'TODAS',
    discipline: 'TODAS',
    topic: 'TODOS',
    searchQuery: '',
    status: 'TODAS',
  };

  const enemResults = filterQuestions(mockQuestions, filterEnem, []);
  assert.equal(enemResults.length, 2);
  assert.ok(enemResults.every((q) => q.vestibular === 'ENEM'));

  const filterUerj: FilterState = {
    ...filterEnem,
    vestibular: 'UERJ',
  };
  const uerjResults = filterQuestions(mockQuestions, filterUerj, []);
  assert.equal(uerjResults.length, 1);
  assert.equal(uerjResults[0].id, 'q2');
});

test('filterQuestions filters strictly by Area of Knowledge and Specific Topic', () => {
  const filterTopic: FilterState = {
    vestibular: 'ENEM',
    area: 'Ciências da Natureza e suas Tecnologias',
    discipline: 'Física',
    topic: 'Eletrodinâmica',
    searchQuery: '',
    status: 'TODAS',
  };

  const results = filterQuestions(mockQuestions, filterTopic, []);
  assert.equal(results.length, 1);
  assert.equal(results[0].topic, 'Eletrodinâmica');
});

test('filterQuestions filters by User Status (ACERTADAS / ERRADAS / NAO_RESOLVIDAS)', () => {
  const attempts: UserAttempt[] = [
    {
      id: 'a1',
      questionId: 'q1',
      vestibular: 'ENEM',
      area: 'Ciências da Natureza e suas Tecnologias',
      discipline: 'Física',
      topic: 'Eletrodinâmica',
      selectedAlternative: 'A',
      isCorrect: true,
      timeSpentSeconds: 45,
      timestamp: Date.now(),
    },
    {
      id: 'a2',
      questionId: 'q2',
      vestibular: 'UERJ',
      area: 'Linguagens, Códigos e suas Tecnologias',
      discipline: 'Língua Portuguesa e Literatura',
      topic: 'Figuras de Linguagem',
      selectedAlternative: 'A',
      isCorrect: false,
      timeSpentSeconds: 60,
      timestamp: Date.now(),
    },
  ];

  const filterCorrect: FilterState = {
    vestibular: 'TODOS',
    area: 'TODAS',
    discipline: 'TODAS',
    topic: 'TODOS',
    searchQuery: '',
    status: 'ACERTADAS',
  };
  const correctResults = filterQuestions(mockQuestions, filterCorrect, attempts);
  assert.equal(correctResults.length, 1);
  assert.equal(correctResults[0].id, 'q1');

  const filterUnanswered: FilterState = {
    ...filterCorrect,
    status: 'NAO_RESOLVIDAS',
  };
  const unansweredResults = filterQuestions(mockQuestions, filterUnanswered, attempts);
  assert.equal(unansweredResults.length, 1);
  assert.equal(unansweredResults[0].id, 'q3');
});
