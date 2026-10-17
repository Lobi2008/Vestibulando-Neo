import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatQuestionPrompt, splitStatementAndPrompt } from './questionFormatter.ts';

describe('formatQuestionPrompt', () => {
  it('adds colon for ENEM prompt without question mark or colon', () => {
    const input = 'O trabalho realizado pelo gás nessa expansão é igual a';
    const result = formatQuestionPrompt(input, 'ENEM');
    assert.strictEqual(result, 'O trabalho realizado pelo gás nessa expansão é igual a:');
  });

  it('keeps question mark when already ending with question mark', () => {
    const input = 'Qual é a probabilidade calculada?';
    const result = formatQuestionPrompt(input, 'ENEM');
    assert.strictEqual(result, 'Qual é a probabilidade calculada?');
  });

  it('keeps existing colon when already present', () => {
    const input = 'Assinale a alternativa correta:';
    const result = formatQuestionPrompt(input, 'ENEM');
    assert.strictEqual(result, 'Assinale a alternativa correta:');
  });

  it('replaces ending period with colon for ENEM prompts', () => {
    const input = 'Nesse contexto, o valor da corrente elétrica no circuito é.';
    const result = formatQuestionPrompt(input, 'ENEM');
    assert.strictEqual(result, 'Nesse contexto, o valor da corrente elétrica no circuito é:');
  });

  it('does not force colon for other exams unless specified', () => {
    const input = 'Indique o fenômeno observado';
    const result = formatQuestionPrompt(input, 'FUVEST');
    assert.strictEqual(result, 'Indique o fenômeno observado');
  });
});

describe('splitStatementAndPrompt', () => {
  it('separates multiline paragraphs into context and prompt', () => {
    const statement = 'Texto de apoio com contexto.\n\nMais uma linha explicativa.\n\nQual é o valor da força resultante?';
    const { contextText, questionPrompt } = splitStatementAndPrompt(statement, 'ENEM');
    assert.strictEqual(contextText, 'Texto de apoio com contexto.\n\nMais uma linha explicativa.');
    assert.strictEqual(questionPrompt, 'Qual é o valor da força resultante?');
  });
});
