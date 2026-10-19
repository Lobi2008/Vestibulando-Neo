/**
 * @file src/utils/strokeEraser.ts
 * @description Mecanismo geométrico de Borracha de Traço Inteiro (Stroke Eraser) estilo OneNote.
 * Quando o usuário toca ou passa a borracha sobre qualquer parte de um traço, o traço
 * inteiro é apagado por completo da tela e removido da lista de traços, com suporte total
 * a Desfazer (Ctrl+Z) e Refazer (Ctrl+Y).
 */

import { DrawingStroke, StylusPoint } from '../types';

interface SimplePoint {
  x: number;
  y: number;
}

/**
 * Distância euclidiana ao quadrado entre dois pontos.
 */
export function distSq(p1: SimplePoint, p2: SimplePoint): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return dx * dx + dy * dy;
}

/**
 * Distância mínima ao quadrado de um ponto P a um segmento de reta AB.
 */
export function distPointToSegmentSq(p: SimplePoint, a: SimplePoint, b: SimplePoint): number {
  const l2 = distSq(a, b);
  if (l2 === 0) return distSq(p, a);

  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));

  const proj: SimplePoint = {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
  };

  return distSq(p, proj);
}

/**
 * Testa orientação anti-horária de três pontos (usado em teste de interseção de segmentos).
 */
function ccw(p1: SimplePoint, p2: SimplePoint, p3: SimplePoint): boolean {
  return (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
}

/**
 * Verifica se dois segmentos de reta (AB e CD) se cruzam.
 */
export function doSegmentsIntersect(
  a: SimplePoint,
  b: SimplePoint,
  c: SimplePoint,
  d: SimplePoint
): boolean {
  return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
}

/**
 * Calcula a menor distância euclidiana entre dois segmentos de reta AB e CD no plano 2D.
 */
export function minDistanceBetweenSegments(
  a: SimplePoint,
  b: SimplePoint,
  c: SimplePoint,
  d: SimplePoint
): number {
  if (doSegmentsIntersect(a, b, c, d)) {
    return 0;
  }

  const d1 = distPointToSegmentSq(a, c, d);
  const d2 = distPointToSegmentSq(b, c, d);
  const d3 = distPointToSegmentSq(c, a, b);
  const d4 = distPointToSegmentSq(d, a, b);

  return Math.sqrt(Math.min(d1, d2, d3, d4));
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Calcula a caixa delimitadora (AABB) de um traço com margem de segurança.
 */
export function getStrokeBoundingBox(stroke: DrawingStroke, padding = 10): BoundingBox {
  if (stroke.points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  let minX = stroke.points[0].x;
  let maxX = stroke.points[0].x;
  let minY = stroke.points[0].y;
  let maxY = stroke.points[0].y;

  for (let i = 1; i < stroke.points.length; i++) {
    const pt = stroke.points[i];
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }

  const pad = Math.max(padding, (stroke.width || 3) * 1.5);
  return {
    minX: minX - pad,
    minY: minY - pad,
    maxX: maxX + pad,
    maxY: maxY + pad,
  };
}

/**
 * Verifica se a caixa da borracha colide com a caixa do traço.
 */
function boundingBoxesOverlap(box1: BoundingBox, box2: BoundingBox): boolean {
  return !(
    box1.maxX < box2.minX ||
    box1.minX > box2.maxX ||
    box1.maxY < box2.minY ||
    box1.minY > box2.maxY
  );
}

/**
 * Verifica se um traço foi atingido por um ponto da borracha (ex.: clique/tap isolado).
 */
export function isStrokeHitByEraserPoint(
  stroke: DrawingStroke,
  eraserPoint: SimplePoint,
  eraserRadius: number
): boolean {
  if (!stroke.points || stroke.points.length === 0) return false;

  const strokeHalfWidth = (stroke.width || 3) / 2;
  const tolerance = eraserRadius + strokeHalfWidth;
  const toleranceSq = tolerance * tolerance;

  const eraserBox: BoundingBox = {
    minX: eraserPoint.x - tolerance,
    minY: eraserPoint.y - tolerance,
    maxX: eraserPoint.x + tolerance,
    maxY: eraserPoint.y + tolerance,
  };

  const strokeBox = getStrokeBoundingBox(stroke, tolerance);
  if (!boundingBoxesOverlap(strokeBox, eraserBox)) {
    return false;
  }

  // Traço de ponto único
  if (stroke.points.length === 1) {
    return distSq(stroke.points[0], eraserPoint) <= toleranceSq;
  }

  // Percorre os segmentos do traço
  for (let i = 0; i < stroke.points.length - 1; i++) {
    const p1 = stroke.points[i];
    const p2 = stroke.points[i + 1];
    if (distPointToSegmentSq(eraserPoint, p1, p2) <= toleranceSq) {
      return true;
    }
  }

  return false;
}

/**
 * Verifica se um traço foi atingido por um segmento percorrido pela borracha (arrasto/drag).
 */
export function isStrokeHitByEraserSegment(
  stroke: DrawingStroke,
  e1: SimplePoint,
  e2: SimplePoint,
  eraserRadius: number
): boolean {
  if (!stroke.points || stroke.points.length === 0) return false;

  const strokeHalfWidth = (stroke.width || 3) / 2;
  const tolerance = eraserRadius + strokeHalfWidth;

  const eraserBox: BoundingBox = {
    minX: Math.min(e1.x, e2.x) - tolerance,
    minY: Math.min(e1.y, e2.y) - tolerance,
    maxX: Math.max(e1.x, e2.x) + tolerance,
    maxY: Math.max(e1.y, e2.y) + tolerance,
  };

  const strokeBox = getStrokeBoundingBox(stroke, tolerance);
  if (!boundingBoxesOverlap(strokeBox, eraserBox)) {
    return false;
  }

  // Caso o traço tenha apenas 1 ponto
  if (stroke.points.length === 1) {
    return distPointToSegmentSq(stroke.points[0], e1, e2) <= tolerance * tolerance;
  }

  // Segmento contra segmentos do traço
  for (let i = 0; i < stroke.points.length - 1; i++) {
    const s1 = stroke.points[i];
    const s2 = stroke.points[i + 1];

    if (minDistanceBetweenSegments(e1, e2, s1, s2) <= tolerance) {
      return true;
    }
  }

  return false;
}

export interface EraserResult {
  remainingStrokes: DrawingStroke[];
  erasedStrokes: DrawingStroke[];
}

/**
 * Apaga traços inteiros que colidirem com o movimento da borracha de e1 a e2.
 */
export function eraseStrokesAlongSegment(
  strokes: DrawingStroke[],
  e1: SimplePoint,
  e2: SimplePoint | null,
  eraserRadius: number
): EraserResult {
  if (strokes.length === 0) {
    return { remainingStrokes: [], erasedStrokes: [] };
  }

  const remaining: DrawingStroke[] = [];
  const erased: DrawingStroke[] = [];

  for (const stroke of strokes) {
    const isHit = e2
      ? isStrokeHitByEraserSegment(stroke, e1, e2, eraserRadius)
      : isStrokeHitByEraserPoint(stroke, e1, eraserRadius);

    if (isHit) {
      erased.push(stroke);
    } else {
      remaining.push(stroke);
    }
  }

  return {
    remainingStrokes: remaining,
    erasedStrokes: erased,
  };
}
