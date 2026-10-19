/**
 * @file src/utils/strokeEraser.test.ts
 * @description Testes unitários para o algoritmo de borracha de traço por completo (estilo OneNote).
 */

import test from 'node:test';
import assert from 'node:assert';
import {
  distPointToSegmentSq,
  doSegmentsIntersect,
  minDistanceBetweenSegments,
  isStrokeHitByEraserPoint,
  isStrokeHitByEraserSegment,
  eraseStrokesAlongSegment,
  getStrokeBoundingBox,
} from './strokeEraser';
import { DrawingStroke } from '../types';

test('doSegmentsIntersect detecta cruzamento de dois segmentos', () => {
  const a = { x: 0, y: 5 };
  const b = { x: 10, y: 5 };
  const c = { x: 5, y: 0 };
  const d = { x: 5, y: 10 };

  assert.strictEqual(doSegmentsIntersect(a, b, c, d), true);

  const nonCrossingC = { x: 5, y: 6 };
  const nonCrossingD = { x: 5, y: 10 };
  assert.strictEqual(doSegmentsIntersect(a, b, nonCrossingC, nonCrossingD), false);
});

test('minDistanceBetweenSegments calcula distância correta', () => {
  const a = { x: 0, y: 0 };
  const b = { x: 10, y: 0 };
  const c = { x: 0, y: 6 };
  const d = { x: 10, y: 6 };

  const dist = minDistanceBetweenSegments(a, b, c, d);
  assert.strictEqual(Math.round(dist), 6);
});

test('eraseStrokesAlongSegment apaga traço cruzado por completo', () => {
  const stroke1: DrawingStroke = {
    id: 'stroke-1',
    tool: 'pen',
    color: '#000000',
    width: 4,
    points: [
      { x: 10, y: 50, pressure: 0.5, time: 1 },
      { x: 100, y: 50, pressure: 0.5, time: 2 },
    ],
  };

  const stroke2: DrawingStroke = {
    id: 'stroke-2',
    tool: 'pen',
    color: '#FF0000',
    width: 4,
    points: [
      { x: 200, y: 200, pressure: 0.5, time: 1 },
      { x: 250, y: 250, pressure: 0.5, time: 2 },
    ],
  };

  // Movimento da borracha cruzando a linha stroke1 de y=30 a y=70 em x=50
  const e1 = { x: 50, y: 30 };
  const e2 = { x: 50, y: 70 };

  const result = eraseStrokesAlongSegment([stroke1, stroke2], e1, e2, 10);

  assert.strictEqual(result.erasedStrokes.length, 1);
  assert.strictEqual(result.erasedStrokes[0].id, 'stroke-1');
  assert.strictEqual(result.remainingStrokes.length, 1);
  assert.strictEqual(result.remainingStrokes[0].id, 'stroke-2');
});

test('eraseStrokesAlongSegment com clique (tap) apaga traço próximo', () => {
  const stroke: DrawingStroke = {
    id: 'stroke-tap',
    tool: 'pen',
    color: '#000',
    width: 2,
    points: [
      { x: 20, y: 20, pressure: 0.5, time: 1 },
      { x: 80, y: 20, pressure: 0.5, time: 2 },
    ],
  };

  // Clique da borracha a 5px da linha (dentro do raio de 12px)
  const tapNear = { x: 50, y: 25 };
  const result = eraseStrokesAlongSegment([stroke], tapNear, null, 12);
  assert.strictEqual(result.erasedStrokes.length, 1);
  assert.strictEqual(result.remainingStrokes.length, 0);

  // Clique da borracha a 100px da linha (fora)
  const tapFar = { x: 50, y: 125 };
  const resultFar = eraseStrokesAlongSegment([stroke], tapFar, null, 12);
  assert.strictEqual(resultFar.erasedStrokes.length, 0);
  assert.strictEqual(resultFar.remainingStrokes.length, 1);
});

test('eraseStrokesAlongSegment apaga traço de ponto único (pingo/ponto)', () => {
  const dotStroke: DrawingStroke = {
    id: 'dot-1',
    tool: 'pen',
    color: '#000',
    width: 6,
    points: [{ x: 50, y: 50, pressure: 0.8, time: 1 }],
  };

  const e1 = { x: 45, y: 40 };
  const e2 = { x: 55, y: 60 };

  const result = eraseStrokesAlongSegment([dotStroke], e1, e2, 8);
  assert.strictEqual(result.erasedStrokes.length, 1);
  assert.strictEqual(result.remainingStrokes.length, 0);
});

test('getStrokeBoundingBox gera limites corretos com padding', () => {
  const stroke: DrawingStroke = {
    id: 'bbox-test',
    tool: 'pen',
    color: '#000',
    width: 4,
    points: [
      { x: 20, y: 30, pressure: 0.5, time: 1 },
      { x: 80, y: 90, pressure: 0.5, time: 2 },
    ],
  };

  const box = getStrokeBoundingBox(stroke, 10);
  assert.strictEqual(box.minX, 10);
  assert.strictEqual(box.maxX, 90);
  assert.strictEqual(box.minY, 20);
  assert.strictEqual(box.maxY, 100);
});

test('eraseStrokesAlongSegment apaga múltiplos traços em uma única passada de borracha', () => {
  const line1: DrawingStroke = {
    id: 'line-1',
    tool: 'pen',
    color: '#000',
    width: 3,
    points: [{ x: 10, y: 10, pressure: 0.5, time: 1 }, { x: 10, y: 100, pressure: 0.5, time: 2 }],
  };

  const line2: DrawingStroke = {
    id: 'line-2',
    tool: 'pen',
    color: '#000',
    width: 3,
    points: [{ x: 30, y: 10, pressure: 0.5, time: 1 }, { x: 30, y: 100, pressure: 0.5, time: 2 }],
  };

  const line3: DrawingStroke = {
    id: 'line-3',
    tool: 'pen',
    color: '#000',
    width: 3,
    points: [{ x: 200, y: 10, pressure: 0.5, time: 1 }, { x: 200, y: 100, pressure: 0.5, time: 2 }],
  };

  // Passada horizontal de x=0 a x=50 na altura y=50 (atravessa line1 e line2)
  const e1 = { x: 0, y: 50 };
  const e2 = { x: 50, y: 50 };

  const result = eraseStrokesAlongSegment([line1, line2, line3], e1, e2, 10);
  assert.strictEqual(result.erasedStrokes.length, 2);
  assert.strictEqual(result.remainingStrokes.length, 1);
  assert.strictEqual(result.remainingStrokes[0].id, 'line-3');
});

