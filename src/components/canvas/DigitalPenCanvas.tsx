/**
 * @file src/components/canvas/DigitalPenCanvas.tsx
 * @description Módulo de Mesa Digitalizadora e Caneta Stylus com sensibilidade
 * à pressão nativa (Pointer Events), estabilizador de traço anti-tremor (smoothing),
 * marca-texto com transparência e persistência de anotações por questão.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Pen, 
  Highlighter, 
  Eraser, 
  RotateCcw, 
  RotateCw, 
  Trash2, 
  Sliders, 
  Grid, 
  Maximize2,
  Minimize2,
  Minus,
  Sparkles,
  X
} from 'lucide-react';
import type { PenTool, StylusPoint, DrawingStroke, StylusLayoutMode } from '../../types/index.ts';

interface DigitalPenCanvasProps {
  questionId: string;
  initialStrokes?: DrawingStroke[];
  onSaveStrokes?: (strokes: DrawingStroke[]) => void;
  mode?: 'overlay' | 'scratchpad';
  layoutMode?: StylusLayoutMode;
  onClose?: () => void;
  className?: string;
}

const PEN_COLORS = [
  { name: 'Nanquim', hex: '#111111' },
  { name: 'Azul Caneta', hex: '#0055FF' },
  { name: 'Vermelho Correção', hex: '#FF0033' },
  { name: 'Verde Gabarito', hex: '#00AA44' },
];

const HIGHLIGHTER_COLORS = [
  { name: 'Amarelo Flúor', hex: '#FFE600' },
  { name: 'Verde Menta', hex: '#00F0FF' },
  { name: 'Rosa Choque', hex: '#FF3399' },
  { name: 'Laranja Luz', hex: '#FF8800' },
];

export const DigitalPenCanvas: React.FC<DigitalPenCanvasProps> = ({
  questionId,
  initialStrokes = [],
  onSaveStrokes,
  mode = 'scratchpad',
  onClose,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Estado das ferramentas
  const [activeTool, setActiveTool] = useState<PenTool>('pen');
  const [selectedColor, setSelectedColor] = useState<string>('#111111');
  const [highlighterColor, setHighlighterColor] = useState<string>('#FFE600');
  const [baseWidth, setBaseWidth] = useState<number>(3);
  const [stabilizerLevel, setStabilizerLevel] = useState<'off' | 'medium' | 'high'>('medium');
  const [paperPattern, setPaperPattern] = useState<'grid' | 'lined' | 'blank'>('grid');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [stylusPressure, setStylusPressure] = useState<number>(0);
  const [isPenDetected, setIsPenDetected] = useState<boolean>(false);

  // Pilhas de traços para Undo / Redo
  const [strokes, setStrokes] = useState<DrawingStroke[]>(initialStrokes);
  const [redoStack, setRedoStack] = useState<DrawingStroke[]>([]);
  const isDrawingRef = useRef<boolean>(false);
  const currentPointsRef = useRef<StylusPoint[]>([]);

  // Sincroniza quando a questão mudar
  useEffect(() => {
    setStrokes(initialStrokes);
    setRedoStack([]);
  }, [questionId, initialStrokes]);

  // Redesenha todos os traços no canvas
  const renderStrokes = useCallback((canvas: HTMLCanvasElement, strokeList: DrawingStroke[]) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokeList) {
      if (stroke.points.length === 0) continue;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.tool === 'highlighter') {
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width * 4;
        ctx.globalCompositeOperation = 'multiply';
      } else if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = stroke.width * 5;
      } else {
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.globalCompositeOperation = 'source-over';
      }

      const pts = stroke.points;
      if (pts.length === 1) {
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, (stroke.width * (pts[0].pressure || 1)) / 2, 0, Math.PI * 2);
        ctx.fillStyle = stroke.color;
        ctx.fill();
      } else if (pts.length === 2) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.stroke();
      } else {
        // Suavização Bézier quadrática contínua entre pontos médios
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);

        for (let i = 1; i < pts.length - 1; i++) {
          const midX = (pts[i].x + pts[i + 1].x) / 2;
          const midY = (pts[i].y + pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
        }

        const last = pts[pts.length - 1];
        ctx.lineTo(last.x, last.y);
        ctx.stroke();
      }

      ctx.restore();
    }
  }, []);

  // Redimensiona o canvas dinamicamente acompanhando o container
  const updateCanvasDimensions = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Ajusta resolução física do canvas para nitidez em telas High-DPI / Retina
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = Math.max(300, Math.floor(rect.width * dpr));
      canvas.height = Math.max(250, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    }

    renderStrokes(canvas, strokes);
  }, [renderStrokes, strokes]);

  useEffect(() => {
    updateCanvasDimensions();
    window.addEventListener('resize', updateCanvasDimensions);
    return () => window.removeEventListener('resize', updateCanvasDimensions);
  }, [updateCanvasDimensions]);

  // Algoritmo de suavização do estabilizador
  const filterPointWithStabilizer = (rawPoint: StylusPoint, history: StylusPoint[]): StylusPoint => {
    if (stabilizerLevel === 'off' || history.length === 0) {
      return rawPoint;
    }

    const windowSize = stabilizerLevel === 'high' ? 4 : 2;
    const recent = history.slice(-windowSize);

    let sumX = rawPoint.x;
    let sumY = rawPoint.y;
    let sumP = rawPoint.pressure;

    for (const p of recent) {
      sumX += p.x;
      sumY += p.y;
      sumP += p.pressure;
    }

    const count = recent.length + 1;
    return {
      x: sumX / count,
      y: sumY / count,
      pressure: sumP / count,
      time: rawPoint.time,
    };
  };

  // Tratadores de eventos Pointer nativos
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Detecta caneta ou stylus da mesa digitalizadora
    if (e.pointerType === 'pen') {
      setIsPenDetected(true);
    }

    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;

    const rect = canvas.getBoundingClientRect();
    const rawPressure = e.pressure > 0 ? e.pressure : 0.5;
    setStylusPressure(rawPressure);

    const initialPoint: StylusPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: rawPressure,
      time: Date.now(),
    };

    currentPointsRef.current = [initialPoint];
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const rawPressure = e.pressure > 0 ? e.pressure : 0.5;
    setStylusPressure(rawPressure);

    const rawPoint: StylusPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: rawPressure,
      time: Date.now(),
    };

    const smoothed = filterPointWithStabilizer(rawPoint, currentPointsRef.current);
    currentPointsRef.current.push(smoothed);

    // Desenha em tempo real
    const ctx = canvas.getContext('2d');
    if (ctx && currentPointsRef.current.length > 1) {
      const pts = currentPointsRef.current;
      const p1 = pts[pts.length - 2];
      const p2 = pts[pts.length - 1];

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const strokeColor = activeTool === 'highlighter' ? highlighterColor : selectedColor;
      const pressureMultiplier = isPenDetected ? Math.max(0.4, p2.pressure * 1.8) : 1.0;

      if (activeTool === 'highlighter') {
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = baseWidth * 4;
        ctx.globalCompositeOperation = 'multiply';
      } else if (activeTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = baseWidth * 6;
      } else {
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = baseWidth * pressureMultiplier;
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.restore();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }

    if (currentPointsRef.current.length > 0) {
      const finalColor = activeTool === 'highlighter' ? highlighterColor : selectedColor;
      const newStroke: DrawingStroke = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        tool: activeTool,
        color: finalColor,
        width: baseWidth,
        points: [...currentPointsRef.current],
      };

      const updated = [...strokes, newStroke];
      setStrokes(updated);
      setRedoStack([]);
      onSaveStrokes?.(updated);
    }

    currentPointsRef.current = [];
  };

  // Undo / Redo
  const handleUndo = () => {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    const remaining = strokes.slice(0, -1);
    setStrokes(remaining);
    setRedoStack((prev) => [last, ...prev]);
    onSaveStrokes?.(remaining);
    if (canvasRef.current) {
      renderStrokes(canvasRef.current, remaining);
    }
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const [next, ...restRedo] = redoStack;
    const updated = [...strokes, next];
    setStrokes(updated);
    setRedoStack(restRedo);
    onSaveStrokes?.(updated);
    if (canvasRef.current) {
      renderStrokes(canvasRef.current, updated);
    }
  };

  const handleClearAll = () => {
    setStrokes([]);
    setRedoStack([]);
    onSaveStrokes?.([]);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const patternClass =
    mode === 'scratchpad'
      ? paperPattern === 'grid'
        ? 'bg-grid-pattern bg-[#FEFDF9]'
        : paperPattern === 'lined'
        ? 'bg-lined-pattern bg-[#FEFDF9]'
        : 'bg-[#FFFFFF]'
      : 'bg-transparent';

  return (
    <div
      ref={containerRef}
      className={`flex flex-col ${
        mode === 'overlay'
          ? 'bg-transparent border-3 border-dashed border-[#FF3366]'
          : 'neo-border bg-[#F5F2EA]'
      } transition-all duration-150 ${
        isExpanded ? 'fixed inset-4 z-50 shadow-2xl' : 'relative'
      } ${className}`}
    >
      {/* Barra Superior de Controles Neobrutalistas */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 ${
          mode === 'overlay' ? 'bg-[#FF3366] text-white' : 'bg-[#FFE600] text-black'
        } border-b-3 border-[#111111]`}
      >
        {mode === 'overlay' && (
          <span className="text-xs font-black uppercase tracking-wider bg-black text-white px-2 py-0.5 mr-1">
            ✍️ Riscar Prova (Sobre o Texto)
          </span>
        )}
        {/* Ferramentas de Desenho */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTool('pen')}
            className={`p-1.5 flex items-center gap-1 text-xs font-bold neo-border-sm transition-all ${
              activeTool === 'pen' ? 'bg-[#111111] text-white shadow-none' : 'bg-white text-black hover:bg-yellow-100'
            }`}
            title="Caneta de Precisão (Pressão nativa da mesa)"
          >
            <Pen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Caneta</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('highlighter')}
            className={`p-1.5 flex items-center gap-1 text-xs font-bold neo-border-sm transition-all ${
              activeTool === 'highlighter' ? 'bg-[#111111] text-white shadow-none' : 'bg-white text-black hover:bg-yellow-100'
            }`}
            title="Marca-texto Translúcido"
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Marca-texto</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('eraser')}
            className={`p-1.5 flex items-center gap-1 text-xs font-bold neo-border-sm transition-all ${
              activeTool === 'eraser' ? 'bg-[#111111] text-white shadow-none' : 'bg-white text-black hover:bg-yellow-100'
            }`}
            title="Borracha de Rascunho"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Borracha</span>
          </button>
        </div>

        {/* Paleta de Cores Rápida */}
        <div className="flex items-center gap-1.5 bg-white px-2 py-1 neo-border-sm">
          {activeTool === 'highlighter' ? (
            HIGHLIGHTER_COLORS.map((col) => (
              <button
                key={col.hex}
                type="button"
                onClick={() => setHighlighterColor(col.hex)}
                className={`w-4 h-4 rounded-full border border-black transition-transform ${
                  highlighterColor === col.hex ? 'scale-125 ring-2 ring-black' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: col.hex }}
                title={col.name}
              />
            ))
          ) : (
            PEN_COLORS.map((col) => (
              <button
                key={col.hex}
                type="button"
                onClick={() => setSelectedColor(col.hex)}
                className={`w-4 h-4 rounded-full border border-black transition-transform ${
                  selectedColor === col.hex ? 'scale-125 ring-2 ring-black' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: col.hex }}
                title={col.name}
              />
            ))
          )}
        </div>

        {/* Espessura e Estabilizador */}
        <div className="flex items-center gap-2">
          {/* Espessura */}
          <div className="flex items-center gap-1 text-xs font-bold bg-white px-1.5 py-0.5 neo-border-sm">
            <span className="text-[10px] text-gray-600">Esp:</span>
            <input
              type="range"
              min="1"
              max="8"
              value={baseWidth}
              onChange={(e) => setBaseWidth(Number(e.target.value))}
              className="w-14 accent-black cursor-pointer"
              title={`Espessura base: ${baseWidth}px`}
            />
            <span className="text-[10px] font-mono">{baseWidth}px</span>
          </div>

          {/* Estabilizador Anti-Tremor */}
          <button
            type="button"
            onClick={() =>
              setStabilizerLevel((prev) =>
                prev === 'off' ? 'medium' : prev === 'medium' ? 'high' : 'off'
              )
            }
            className={`px-2 py-1 text-[11px] font-bold neo-border-sm flex items-center gap-1 ${
              stabilizerLevel !== 'off' ? 'bg-[#00E599] text-black' : 'bg-gray-200 text-gray-700'
            }`}
            title="Estabilizador de Traço para Mesa Digitalizadora (elimina micro-tremores manuais)"
          >
            <Sliders className="w-3 h-3" />
            <span className="hidden md:inline">Filtro:</span>
            <span>{stabilizerLevel === 'off' ? 'Off' : stabilizerLevel === 'medium' ? 'Médio' : 'Alto'}</span>
          </button>

          {/* Padrão de Fundo (Papel) */}
          {mode === 'scratchpad' && (
            <button
              type="button"
              onClick={() =>
                setPaperPattern((prev) =>
                  prev === 'grid' ? 'lined' : prev === 'lined' ? 'blank' : 'grid'
                )
              }
              className="px-2 py-1 text-[11px] font-bold bg-white neo-border-sm flex items-center gap-1 hover:bg-gray-100"
              title="Trocar folha: Quadriculado / Pautado / Branco"
            >
              <Grid className="w-3 h-3" />
              <span className="capitalize">{paperPattern === 'grid' ? 'Grid' : paperPattern === 'lined' ? 'Pautas' : 'Liso'}</span>
            </button>
          )}

          {/* Ações de Histórico */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleUndo}
              disabled={strokes.length === 0}
              className="p-1.5 bg-white neo-border-sm disabled:opacity-40 hover:bg-gray-100"
              title="Desfazer (Ctrl+Z)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-black" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-1.5 bg-white neo-border-sm disabled:opacity-40 hover:bg-gray-100"
              title="Refazer (Ctrl+Y)"
            >
              <RotateCw className="w-3.5 h-3.5 text-black" />
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              disabled={strokes.length === 0}
              className="p-1.5 bg-[#FF3366] text-white neo-border-sm disabled:opacity-40 hover:bg-red-600"
              title="Limpar Rascunho"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Expandir / Minimizar */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 bg-white neo-border-sm hover:bg-gray-100 ml-1"
              title={isExpanded ? 'Restaurar tamanho' : 'Maximizar área de rascunho'}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 bg-[#FF3366] text-white neo-border-sm hover:bg-red-700 ml-1"
                title="Fechar mesa de rascunho"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Indicador de Status da Caneta / Mesa Digitalizadora */}
      <div className="flex items-center justify-between px-3 py-1 bg-white border-b-2 border-black text-[10px] font-mono text-gray-600">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span
              className={`w-2 h-2 rounded-full ${
                isPenDetected ? 'bg-green-500 animate-pulse' : 'bg-blue-400'
              }`}
            />
            {isPenDetected ? 'Mesa / Stylus Conectada' : 'Modo Caneta / Mouse Ativo'}
          </span>
          {isPenDetected && (
            <span className="bg-yellow-100 px-1 border border-black">
              Pressão: {Math.round(stylusPressure * 100)}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span>{strokes.length} traços salvos</span>
          <span>Questão: {questionId}</span>
        </div>
      </div>

      {/* Área do Canvas de Desenho */}
      <div className={`relative flex-1 min-h-[320px] overflow-hidden ${patternClass}`}>
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="stylus-canvas absolute inset-0 w-full h-full"
        />

        {strokes.length === 0 && mode === 'scratchpad' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-40 select-none">
            <Sparkles className="w-8 h-8 mb-2 text-gray-500" />
            <p className="text-sm font-bold text-gray-700">Espaço de Rascunho para Cálculos e Anotações</p>
            <p className="text-xs text-gray-500">Desenhe diretamente com a caneta da mesa digitalizadora ou mouse</p>
          </div>
        )}
      </div>
    </div>
  );
};
