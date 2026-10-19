/**
 * @file src/utils/canvasRenderer.ts
 * @description Motor de renderização de traços no Canvas 2D com suporte profissional a mesas
 * digitalizadoras (Wacom, Huion, XP-Pen, Apple Pencil, Microsoft Surface, etc.),
 * curvas de resposta de pressão, suavização anti-tremor e contornos vetoriais contínuos
 * livres de falhas, furos ou efeito pontilhado/zebrado.
 */

import { getStroke } from 'perfect-freehand';
import type { DrawingStroke, StylusPoint, PenTool } from '../types/index.ts';

export type PressureCurveType = 'soft' | 'normal' | 'firm';

export interface StylusPressureConfig {
  sensitivity: number; // Multiplicador de escala de pressão (padrão: 1.0, range 0.5 - 2.0)
  curve: PressureCurveType; // 'soft' (mais sensível a toques leves), 'normal', 'firm' (exige mais força)
  minWidthRatio: number; // Fração da espessura base no toque mais leve (padrão: 0.25)
  maxWidthRatio: number; // Fração da espessura base na pressão máxima (padrão: 2.30)
  enabled?: boolean; // Se a modulação de pressão está ativa
}

export const DEFAULT_PRESSURE_CONFIG: StylusPressureConfig = {
  sensitivity: 1.0,
  curve: 'normal',
  minWidthRatio: 0.25,
  maxWidthRatio: 2.3,
  enabled: true,
};

/**
 * Calcula o raio (metade da espessura) para um ponto específico de acordo com
 * a pressão registrada pela mesa digitalizadora e a ferramenta ativa.
 */
export function computePointRadius(
  baseWidth: number,
  pressure: number | undefined,
  tool: PenTool,
  config: StylusPressureConfig = DEFAULT_PRESSURE_CONFIG
): number {
  if (tool === 'highlighter') {
    return (baseWidth * 4) / 2;
  }
  if (tool === 'eraser') {
    const rawP = typeof pressure === 'number' && pressure > 0 ? pressure : 0.5;
    const factor = 0.6 + Math.min(1, rawP) * 1.6;
    return Math.max(3, (baseWidth * 5 * factor) / 2);
  }

  // Caneta (pen):
  if (config.enabled === false) {
    return Math.max(1, baseWidth / 2);
  }

  const rawP = typeof pressure === 'number' && pressure > 0 ? pressure : 0.5;
  const clamped = Math.min(1, Math.max(0.01, rawP));

  // Expoente gama de acordo com a curva de resposta:
  // soft (0.70): curva côncava rápida -> toques leves já engrossam o traço
  // normal (0.85): curva balanceada para escrita e caligrafia natural
  // firm (1.20): curva convexa -> exige mais firmeza para atingir espessura máxima
  const gamma = config.curve === 'soft' ? 0.7 : config.curve === 'firm' ? 1.2 : 0.85;
  const curved = Math.pow(clamped, gamma);

  // Escala dinâmica com sensibilidade
  const factor =
    config.minWidthRatio +
    curved * (config.maxWidthRatio - config.minWidthRatio) * (config.sensitivity || 1.0);

  return Math.max(0.75, (baseWidth * factor) / 2);
}

/**
 * Detecta se o evento provém de uma caneta stylus/mesa digitalizadora e extrai a pressão normalizada.
 */
export function extractPointerPressure(
  e: { pressure?: number; pointerType?: string },
  knownPen: boolean = false
): { pressure: number; isPen: boolean } {
  const isPenType = e.pointerType === 'pen';
  const hasHardwarePressure =
    typeof e.pressure === 'number' &&
    e.pressure > 0 &&
    (isPenType || Math.abs(e.pressure - 0.5) > 0.005);

  const isPen = knownPen || isPenType || hasHardwarePressure;

  if (!isPen) {
    return { pressure: 0.5, isPen: false };
  }

  // Se for caneta, preserva pequenas pressões (ex: 0.02 - 0.10) sem truncar para 0.5
  let pressure = typeof e.pressure === 'number' ? e.pressure : 0.5;
  if (pressure <= 0) {
    pressure = 0.15; // Toque inicial leve antes do driver emitir o primeiro delta
  }

  return {
    pressure: Math.min(1, Math.max(0.01, pressure)),
    isPen: true,
  };
}

/**
 * Ajusta a cor para garantir legibilidade perfeita entre os modos claro e escuro.
 */
export function getContrastAdjustedColor(originalColor: string, isDarkMode: boolean): string {
  if (isDarkMode && (originalColor === '#111111' || originalColor === '#000000')) {
    return '#FFFFFF';
  }
  if (!isDarkMode && originalColor === '#FFFFFF') {
    return '#111111';
  }
  return originalColor;
}

/**
 * Renderiza um polígono de contorno retornado pelo perfect-freehand como um caminho fechado
 * com curvas suaves de Bézier quadráticas nos pontos médios.
 */
export function renderOutlinePath(ctx: CanvasRenderingContext2D, outline: number[][]): void {
  if (outline.length === 0) return;

  if (outline.length === 1) {
    const [x, y] = outline[0];
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.beginPath();
  const [x0, y0] = outline[0];
  const [x1, y1] = outline[1] || outline[0];
  ctx.moveTo((x0 + x1) / 2, (y0 + y1) / 2);

  for (let i = 0; i < outline.length; i++) {
    const [currX, currY] = outline[i];
    const [nextX, nextY] = outline[(i + 1) % outline.length];
    const midX = (currX + nextX) / 2;
    const midY = (currY + nextY) / 2;
    ctx.quadraticCurveTo(currX, currY, midX, midY);
  }

  ctx.closePath();
  ctx.fill();
}

/**
 * Desenha um segmento individual com largura variável e transição 100% contínua e sólida
 * entre dois pontos sucessivos. Usado para feedback instantâneo de desenho em tempo real.
 */
export function drawLiveSegment(
  ctx: CanvasRenderingContext2D,
  p1: StylusPoint,
  p2: StylusPoint,
  baseWidth: number,
  tool: PenTool,
  color: string,
  isDarkMode: boolean,
  config: StylusPressureConfig = DEFAULT_PRESSURE_CONFIG
): void {
  ctx.save();
  const renderColor = getContrastAdjustedColor(color, isDarkMode);

  if (tool === 'highlighter') {
    ctx.globalAlpha = isDarkMode ? 0.6 : 0.45;
    ctx.strokeStyle = renderColor;
    ctx.lineWidth = baseWidth * 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = isDarkMode ? 'screen' : 'multiply';

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const r1 = computePointRadius(baseWidth, p1.pressure, tool, config);
  const r2 = computePointRadius(baseWidth, p2.pressure, tool, config);

  if (tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000000';
  } else {
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = renderColor;
  }

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.hypot(dx, dy);

  if (dist < 0.2) {
    ctx.beginPath();
    ctx.arc(p2.x, p2.y, Math.max(r1, r2), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  const alpha = Math.atan2(dy, dx);
  const sinA = Math.sin(alpha);
  const cosA = Math.cos(alpha);

  // Vetores normais unitários: (-sinA, cosA)
  const nx = -sinA;
  const ny = cosA;

  // Cápsula sólida perfeita: contorno único fechado, sem subcaminhos sobrepostos
  ctx.beginPath();
  // Semicírculo ao redor de p1
  ctx.arc(p1.x, p1.y, r1, alpha - Math.PI / 2, alpha + Math.PI / 2, true);
  // Linha reta até a borda de p2
  ctx.lineTo(p2.x - nx * r2, p2.y - ny * r2);
  // Semicírculo ao redor de p2
  ctx.arc(p2.x, p2.y, r2, alpha + Math.PI / 2, alpha - Math.PI / 2, true);
  // Fecha conectando de volta à borda de p1
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Renderiza um traço completo preservando todas as variações de pressão ao longo do caminho,
 * gerando um contorno suave e contínuo sem nenhuma falha, buraco ou pontilhado.
 */
export function renderStroke(
  ctx: CanvasRenderingContext2D,
  stroke: DrawingStroke,
  isDarkMode: boolean,
  config: StylusPressureConfig = DEFAULT_PRESSURE_CONFIG
): void {
  const pts = stroke.points;
  if (!pts || pts.length === 0) return;

  ctx.save();
  const renderColor = getContrastAdjustedColor(stroke.color, isDarkMode);

  // 1. MARCA-TEXTO (Highlighter): traço translúcido uniforme e suave
  if (stroke.tool === 'highlighter') {
    ctx.globalAlpha = isDarkMode ? 0.6 : 0.45;
    ctx.strokeStyle = renderColor;
    ctx.lineWidth = stroke.width * 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = isDarkMode ? 'screen' : 'multiply';

    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, (stroke.width * 4) / 2, 0, Math.PI * 2);
      ctx.fillStyle = renderColor;
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const pPrev = pts[i - 1];
        const pCurr = pts[i];
        const mx = (pPrev.x + pCurr.x) / 2;
        const my = (pPrev.y + pCurr.y) / 2;
        ctx.quadraticCurveTo(pPrev.x, pPrev.y, mx, my);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // 2. BORRACHA (Eraser) ou CANETA (Pen)
  if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000000';
  } else {
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = renderColor;
  }

  // Caso especial: toque único isolado (ponto ou pontinho)
  if (pts.length === 1) {
    const r = computePointRadius(stroke.width, pts[0].pressure, stroke.tool, config);
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Com múltiplos pontos: constrói contorno fechado perfeito via perfect-freehand
  const isEraser = stroke.tool === 'eraser';
  const baseSize = isEraser ? stroke.width * 5 : stroke.width * 2.2;
  const isDynamic = config.enabled !== false;

  const pointsForStroke = pts.map((p) => {
    let pVal = typeof p.pressure === 'number' && p.pressure > 0 ? p.pressure : 0.5;
    if (config.curve === 'soft') {
      pVal = Math.pow(pVal, 0.7);
    } else if (config.curve === 'firm') {
      pVal = Math.pow(pVal, 1.25);
    }
    const scaledPressure = Math.min(1, Math.max(0.01, pVal * (config.sensitivity || 1.0)));
    return [p.x, p.y, scaledPressure] as [number, number, number];
  });

  const outline = getStroke(pointsForStroke, {
    size: baseSize,
    thinning: isDynamic ? 0.62 : 0,
    smoothing: 0.52,
    streamline: 0.45,
    simulatePressure: false,
    start: {
      taper: isEraser ? 0 : baseSize * 0.25,
      cap: true,
    },
    end: {
      taper: isEraser ? 0 : baseSize * 0.25,
      cap: true,
    },
  });

  renderOutlinePath(ctx, outline);
  ctx.restore();
}

/**
 * Redesenha todos os traços no canvas aplicando redimensionamento e DPR nativo.
 */
export function renderAllStrokes(
  canvas: HTMLCanvasElement,
  strokes: DrawingStroke[],
  isDarkMode: boolean,
  config: StylusPressureConfig = DEFAULT_PRESSURE_CONFIG
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

  for (const stroke of strokes) {
    renderStroke(ctx, stroke, isDarkMode, config);
  }
}
