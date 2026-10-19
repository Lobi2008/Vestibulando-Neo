/**
 * @file src/utils/canvasRenderer.test.ts
 * @description Testes para funções matemáticas de sensibilidade à pressão, contraste do canvas
 * e geração de traços contínuos sem furos ou falhas.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computePointRadius,
  extractPointerPressure,
  getContrastAdjustedColor,
  renderStroke,
  drawLiveSegment,
  renderOutlinePath,
  DEFAULT_PRESSURE_CONFIG,
} from './canvasRenderer.ts';
import type { DrawingStroke, StylusPoint } from '../types/index.ts';

test('computePointRadius scales properly with stylus pressure', () => {
  const baseWidth = 4;

  // Pressão leve (0.1) deve gerar raio menor que a pressão padrão (0.5)
  const rLight = computePointRadius(baseWidth, 0.1, 'pen', DEFAULT_PRESSURE_CONFIG);
  const rNormal = computePointRadius(baseWidth, 0.5, 'pen', DEFAULT_PRESSURE_CONFIG);
  const rHeavy = computePointRadius(baseWidth, 1.0, 'pen', DEFAULT_PRESSURE_CONFIG);

  assert.ok(rLight < rNormal, 'Raio de pressão leve deve ser menor que o normal');
  assert.ok(rNormal < rHeavy, 'Raio de pressão normal deve ser menor que o pesado');
  assert.ok(rLight >= 0.75, 'Raio mínimo não deve colapsar a zero');
  assert.ok(rHeavy <= (baseWidth * DEFAULT_PRESSURE_CONFIG.maxWidthRatio) / 2 + 0.1);
});

test('computePointRadius supports soft and firm pressure curves', () => {
  const baseWidth = 4;
  const pressure = 0.3;

  const rSoft = computePointRadius(baseWidth, pressure, 'pen', {
    ...DEFAULT_PRESSURE_CONFIG,
    curve: 'soft',
  });
  const rFirm = computePointRadius(baseWidth, pressure, 'pen', {
    ...DEFAULT_PRESSURE_CONFIG,
    curve: 'firm',
  });

  // Na curva soft, toques leves produzem raio maior que na curva firm
  assert.ok(rSoft > rFirm, 'Curva soft deve ser mais responsiva a toques leves que a firm');
});

test('extractPointerPressure identifies pen devices and retains fine pressure values', () => {
  // Evento simulado de caneta stylus Wacom / Surface
  const penEvent = { pointerType: 'pen', pressure: 0.08 };
  const resultPen = extractPointerPressure(penEvent);
  assert.equal(resultPen.isPen, true);
  assert.ok(Math.abs(resultPen.pressure - 0.08) < 0.001);

  // Mouse sem suporte a pressão
  const mouseEvent = { pointerType: 'mouse', pressure: 0.5 };
  const resultMouse = extractPointerPressure(mouseEvent);
  assert.equal(resultMouse.isPen, false);
  assert.equal(resultMouse.pressure, 0.5);

  // Dispositivo de caneta com flag knownPen
  const knownPenEvent = { pointerType: 'touch', pressure: 0.25 };
  const resultKnown = extractPointerPressure(knownPenEvent, true);
  assert.equal(resultKnown.isPen, true);
  assert.equal(resultKnown.pressure, 0.25);
});

test('getContrastAdjustedColor switches black/white correctly between dark and light modes', () => {
  assert.equal(getContrastAdjustedColor('#111111', true), '#FFFFFF');
  assert.equal(getContrastAdjustedColor('#000000', true), '#FFFFFF');
  assert.equal(getContrastAdjustedColor('#FFFFFF', false), '#111111');
  assert.equal(getContrastAdjustedColor('#0055FF', true), '#0055FF'); // Cores cromáticas mantidas
});

test('renderOutlinePath draws a single closed path without NaN coordinates', () => {
  const calls: string[] = [];
  const mockCtx = {
    beginPath: () => calls.push('beginPath'),
    moveTo: (x: number, y: number) => {
      assert.ok(!isNaN(x) && !isNaN(y), 'moveTo coordinate must not be NaN');
      calls.push(`moveTo(${Math.round(x)},${Math.round(y)})`);
    },
    quadraticCurveTo: (cx: number, cy: number, x: number, y: number) => {
      assert.ok(!isNaN(cx) && !isNaN(cy) && !isNaN(x) && !isNaN(y), 'curve coordinates must not be NaN');
      calls.push('quad');
    },
    closePath: () => calls.push('closePath'),
    fill: () => calls.push('fill'),
  } as unknown as CanvasRenderingContext2D;

  const testOutline = [
    [10, 10],
    [20, 12],
    [30, 25],
    [25, 35],
    [15, 30],
  ];

  renderOutlinePath(mockCtx, testOutline);

  assert.equal(calls[0], 'beginPath');
  assert.ok(calls[1].startsWith('moveTo'));
  assert.equal(calls[calls.length - 2], 'closePath');
  assert.equal(calls[calls.length - 1], 'fill');
});

test('drawLiveSegment generates solid closed capsule without internal cancellations', () => {
  const calls: string[] = [];
  const mockCtx = {
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    beginPath: () => calls.push('beginPath'),
    arc: (x: number, y: number, r: number, startA: number, endA: number, anticlockwise?: boolean) => {
      assert.ok(!isNaN(x) && !isNaN(y) && !isNaN(r), 'arc parameters must not be NaN');
      calls.push(`arc(r=${r.toFixed(1)})`);
    },
    lineTo: (x: number, y: number) => {
      assert.ok(!isNaN(x) && !isNaN(y), 'lineTo parameters must not be NaN');
      calls.push('lineTo');
    },
    closePath: () => calls.push('closePath'),
    fill: () => calls.push('fill'),
  } as unknown as CanvasRenderingContext2D;

  const p1: StylusPoint = { x: 50, y: 50, pressure: 0.3, time: 1 };
  const p2: StylusPoint = { x: 80, y: 90, pressure: 0.8, time: 2 };

  drawLiveSegment(mockCtx, p1, p2, 4, 'pen', '#111111', false, DEFAULT_PRESSURE_CONFIG);

  assert.ok(calls.includes('beginPath'));
  assert.ok(calls.includes('closePath'));
  assert.ok(calls.includes('fill'));
  assert.ok(calls.includes('restore'));
});

test('renderStroke produces a solid continuous outline stroke for complex multi-point drawing', () => {
  let filled = false;
  let closed = false;
  const mockCtx = {
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: (x: number, y: number) => {
      assert.ok(!isNaN(x) && !isNaN(y));
    },
    quadraticCurveTo: (cx: number, cy: number, x: number, y: number) => {
      assert.ok(!isNaN(cx) && !isNaN(cy) && !isNaN(x) && !isNaN(y));
    },
    closePath: () => {
      closed = true;
    },
    fill: () => {
      filled = true;
    },
  } as unknown as CanvasRenderingContext2D;

  const points: StylusPoint[] = [];
  for (let i = 0; i < 20; i++) {
    points.push({
      x: 100 + i * 5,
      y: 100 + Math.sin(i / 2) * 20,
      pressure: 0.2 + (i / 20) * 0.7,
      time: i * 16,
    });
  }

  const stroke: DrawingStroke = {
    id: 'test-stroke-1',
    tool: 'pen',
    color: '#0055FF',
    width: 3,
    points,
  };

  renderStroke(mockCtx, stroke, false, DEFAULT_PRESSURE_CONFIG);

  assert.ok(closed, 'O contorno do traço deve ser fechado');
  assert.ok(filled, 'O contorno deve ser preenchido de forma sólida');
});
