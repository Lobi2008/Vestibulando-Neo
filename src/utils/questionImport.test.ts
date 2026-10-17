/**
 * @file src/utils/questionImport.test.ts
 * @description Testes da leitura/validação do banco de questões enviado pelo aluno.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCsvTemplate, buildJsonTemplate, parseCsv, parseQuestionFile } from './questionImport.ts';

test('o modelo JSON é aceito sem erros', () => {
  const result = parseQuestionFile('modelo.json', buildJsonTemplate());
  assert.equal(result.errors.length, 0);
  assert.equal(result.questions.length, 2);
  assert.equal(result.questions[0].area, 'Ciências da Natureza e suas Tecnologias');
  assert.equal(result.questions[1].alternatives.length, 4);
  assert.equal(result.questions[1].explanation, '');
});

test('o modelo CSV é aceito sem erros e mantém quebras de linha das células', () => {
  const result = parseQuestionFile('modelo.csv', buildCsvTemplate());
  assert.equal(result.errors.length, 0);
  assert.equal(result.questions.length, 2);
  assert.ok(result.questions[0].statement.includes('\n'));
  assert.equal(result.questions[0].correctAlternative, 'A');
});

test('CSV e JSON do mesmo modelo geram as mesmas questões', () => {
  const fromJson = parseQuestionFile('a.json', buildJsonTemplate()).questions;
  const fromCsv = parseQuestionFile('a.csv', buildCsvTemplate()).questions;
  assert.deepEqual(fromCsv, fromJson);
});

test('parseCsv lida com aspas duplicadas e separador vírgula', () => {
  const rows = parseCsv('a,b\n"x ""y"" z",w\n');
  assert.deepEqual(rows, [['a', 'b'], ['x "y" z', 'w']]);
});

test('linhas inválidas são relatadas com o número da linha, e as válidas são importadas', () => {
  const csv = [
    'vestibular;ano;disciplina;conteudo;enunciado;alternativa_a;alternativa_b;gabarito',
    'ENEM;2023;Fisica;Ótica;Pergunta?;sim;não;A',
    'XYZ;2023;Fisica;Ótica;Pergunta?;sim;não;A',
    'ENEM;2023;Fisica;Ótica;Pergunta?;sim;não;D',
  ].join('\n');
  const result = parseQuestionFile('q.csv', csv);
  assert.equal(result.questions.length, 1);
  assert.equal(result.questions[0].discipline, 'Física');
  assert.deepEqual(result.errors.map((e) => e.row), [3, 4]);
});

test('JSON inválido gera erro claro', () => {
  assert.throws(() => parseQuestionFile('x.json', '{ quebrado'), /JSON válido/);
});
