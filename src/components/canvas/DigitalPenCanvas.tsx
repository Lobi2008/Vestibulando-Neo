/**
 * @file src/components/canvas/DigitalPenCanvas.tsx
 * @description Módulo de Mesa Digitalizadora e Caneta Stylus com sensibilidade
 * à pressão nativa (Pointer Events), estabilizador de traço anti-tremor (smoothing),
 * marca-texto com transparência, suporte completo a Modo Escuro (fundo escuro e caneta branca),
 * curvas de resposta de pressão (Suave, Normal, Firme) e botão dedicado de salvamento de rascunhos.
 */

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
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
  Sparkles, 
  X, 
  Save, 
  Check,
  Gauge
} from 'lucide-react';
import type { PenTool, StylusPoint, DrawingStroke, StylusLayoutMode } from '../../types/index.ts';
import {
  renderAllStrokes,
  drawLiveSegment,
  extractPointerPressure,
  computePointRadius,
  getContrastAdjustedColor,
  DEFAULT_PRESSURE_CONFIG,
  type StylusPressureConfig,
  type PressureCurveType,
} from '../../utils/canvasRenderer.ts';
import { eraseStrokesAlongSegment } from '../../utils/strokeEraser.ts';

interface DigitalPenCanvasProps {
  questionId: string;
  initialStrokes?: DrawingStroke[];
  onSaveStrokes?: (strokes: DrawingStroke[]) => void;
  mode?: 'overlay' | 'scratchpad';
  layoutMode?: StylusLayoutMode;
  isDarkMode?: boolean;
  onClose?: () => void;
  className?: string;
}

const LIGHT_PEN_COLORS = [
  { name: 'Preto', hex: '#111111' },
  { name: 'Azul', hex: '#0055FF' },
  { name: 'Vermelho', hex: '#FF0033' },
  { name: 'Verde', hex: '#00AA44' },
  { name: 'Roxo', hex: '#7C3AED' },
];

const DARK_PEN_COLORS = [
  { name: 'Branco', hex: '#FFFFFF' },
  { name: 'Ciano', hex: '#00F0FF' },
  { name: 'Amarelo', hex: '#FFE600' },
  { name: 'Rosa', hex: '#FF3399' },
  { name: 'Verde', hex: '#00E599' },
];

const HIGHLIGHTER_COLORS = [
  { name: 'Amarelo', hex: '#FFE600' },
  { name: 'Ciano', hex: '#00F0FF' },
  { name: 'Rosa', hex: '#FF3399' },
  { name: 'Laranja', hex: '#FF8800' },
];

export const DigitalPenCanvas: React.FC<DigitalPenCanvasProps> = ({
  questionId,
  initialStrokes = [],
  onSaveStrokes,
  mode = 'scratchpad',
  isDarkMode,
  onClose,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Detecta modo escuro (por prop ou classe HTML)
  const [effectiveDark, setEffectiveDark] = useState<boolean>(() => {
    if (typeof isDarkMode === 'boolean') return isDarkMode;
    return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    if (typeof isDarkMode === 'boolean') {
      setEffectiveDark(isDarkMode);
    } else {
      const isDark = document.documentElement.classList.contains('dark');
      setEffectiveDark(isDark);
    }
  }, [isDarkMode]);

  // Estado das ferramentas
  const [activeTool, setActiveTool] = useState<PenTool>('pen');
  const [selectedColor, setSelectedColor] = useState<string>(effectiveDark ? '#FFFFFF' : '#111111');
  const [highlighterColor, setHighlighterColor] = useState<string>('#FFE600');
  const [baseWidth, setBaseWidth] = useState<number>(3);
  const [stabilizerLevel, setStabilizerLevel] = useState<'off' | 'medium' | 'high'>('off');
  const [paperPattern, setPaperPattern] = useState<'grid' | 'lined' | 'blank'>('grid');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  
  // Configuração avançada de sensibilidade à pressão da mesa digitalizadora
  const [isPressureEnabled, setIsPressureEnabled] = useState<boolean>(true);
  const [pressureCurve, setPressureCurve] = useState<PressureCurveType>('normal');
  const [stylusPressure, setStylusPressure] = useState<number>(0);
  const [isPenDetected, setIsPenDetected] = useState<boolean>(false);
  const isPenDetectedRef = useRef<boolean>(false);
  const [savedFeedback, setSavedFeedback] = useState<boolean>(false);

  // Pilhas de traços para Undo / Redo (snapshots com restauração perfeita de traços apagados)
  const [strokes, setStrokes] = useState<DrawingStroke[]>(initialStrokes);
  const strokesRef = useRef<DrawingStroke[]>(initialStrokes);
  const [undoStack, setUndoStack] = useState<DrawingStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawingStroke[][]>([]);
  const isDrawingRef = useRef<boolean>(false);
  const currentPointsRef = useRef<StylusPoint[]>([]);
  // Linha reta: ativada ao pressionar o canvas com Ctrl; guarda só início e fim
  const isStraightLineRef = useRef<boolean>(false);

  // Rastreamento para borracha de traço por completo estilo OneNote
  const strokesAtGestureStartRef = useRef<DrawingStroke[]>([]);
  const hasErasedInCurrentGestureRef = useRef<boolean>(false);
  const lastEraserPointRef = useRef<StylusPoint | null>(null);

  // Sincroniza referência de traços
  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  const pressureConfig: StylusPressureConfig = useMemo(() => ({
    sensitivity: isPressureEnabled ? 1.0 : 0,
    curve: pressureCurve,
    minWidthRatio: isPressureEnabled ? 0.22 : 1.0,
    maxWidthRatio: isPressureEnabled ? 2.35 : 1.0,
    enabled: isPressureEnabled,
  }), [isPressureEnabled, pressureCurve]);

  // Sincroniza cor da caneta quando o modo escuro/claro alterna
  useEffect(() => {
    if (effectiveDark) {
      if (selectedColor === '#111111' || selectedColor === '#000000') {
        setSelectedColor('#FFFFFF');
      }
    } else {
      if (selectedColor === '#FFFFFF') {
        setSelectedColor('#111111');
      }
    }
  }, [effectiveDark]);

  // Sincroniza quando a questão mudar
  useEffect(() => {
    setStrokes(initialStrokes);
    strokesRef.current = initialStrokes;
    setUndoStack([]);
    setRedoStack([]);
  }, [questionId, initialStrokes]);

  // Redimensiona o canvas dinamicamente acompanhando o container e DPR nítido
  const updateCanvasDimensions = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    const targetW = Math.max(300, Math.floor(rect.width * dpr));
    const targetH = Math.max(250, Math.floor(rect.height * dpr));

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    }

    renderAllStrokes(canvas, strokes, effectiveDark, pressureConfig);
  }, [strokes, effectiveDark, pressureConfig]);

  useEffect(() => {
    updateCanvasDimensions();
    window.addEventListener('resize', updateCanvasDimensions);
    return () => window.removeEventListener('resize', updateCanvasDimensions);
  }, [updateCanvasDimensions]);

  // Re-renderiza traços ao mudar o modo escuro ou configuração de pressão
  useEffect(() => {
    if (canvasRef.current) {
      renderAllStrokes(canvasRef.current, strokes, effectiveDark, pressureConfig);
    }
  }, [effectiveDark, strokes, pressureConfig]);

  // Algoritmo de suavização do estabilizador anti-tremor
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

  // Tratadores de eventos Pointer nativos (Pointer Events API com sensibilidade à pressão)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Detecta mesa digitalizadora de forma síncrona e extrai pressão real
    const { pressure, isPen } = extractPointerPressure(e, isPenDetectedRef.current);
    if (isPen) {
      isPenDetectedRef.current = true;
      setIsPenDetected(true);
    }

    // Suporte nativo ao botão ou ponta de borracha da caneta stylus
    const isStylusEraser = isPen && ((e.buttons & 32) !== 0 || e.button === 5);
    const effectiveTool = isStylusEraser ? 'eraser' : activeTool;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignora erro em ambientes sem pointer capture
    }

    isDrawingRef.current = true;
    strokesAtGestureStartRef.current = strokesRef.current;
    hasErasedInCurrentGestureRef.current = false;

    const rect = canvas.getBoundingClientRect();
    setStylusPressure(pressure);

    const initialPoint: StylusPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure,
      time: Date.now(),
    };

    // MODO BORRACHA ESTILO ONENOTE: apaga traços por completo ao tocar
    if (effectiveTool === 'eraser') {
      lastEraserPointRef.current = initialPoint;
      const eraserRadius = Math.max(baseWidth * 2.5, 14);
      const { remainingStrokes, erasedStrokes } = eraseStrokesAlongSegment(
        strokesRef.current,
        initialPoint,
        null,
        eraserRadius
      );
      if (erasedStrokes.length > 0) {
        hasErasedInCurrentGestureRef.current = true;
        strokesRef.current = remainingStrokes;
        setStrokes(remainingStrokes);
        renderAllStrokes(canvas, remainingStrokes, effectiveDark, pressureConfig);
      }
      return;
    }

    currentPointsRef.current = [initialPoint];
    isStraightLineRef.current = e.ctrlKey;

    // Desenha imediatamente o ponto inicial com espessura proporcional à pressão
    const ctx = canvas.getContext('2d');
    if (ctx && !isStraightLineRef.current) {
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const r = computePointRadius(baseWidth, pressure, effectiveTool, pressureConfig);
      ctx.save();
      const renderColor = getContrastAdjustedColor(
        effectiveTool === 'highlighter' ? highlighterColor : selectedColor,
        effectiveDark
      );
      ctx.fillStyle = renderColor;
      ctx.beginPath();
      ctx.arc(initialPoint.x, initialPoint.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Monitora pressão em tempo real (mesmo em hover próximo ao canvas)
    const { pressure, isPen } = extractPointerPressure(e, isPenDetectedRef.current);
    if (isPen) {
      isPenDetectedRef.current = true;
      if (!isPenDetected) setIsPenDetected(true);
    }
    setStylusPressure(pressure);

    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    // Suporte ao botão ou ponta de borracha da caneta
    const isStylusEraser = isPen && ((e.buttons & 32) !== 0 || e.button === 5);
    const effectiveTool = isStylusEraser ? 'eraser' : activeTool;

    // Coalesced Events: processa micro-pontos intermediários de alta taxa de atualização (120Hz/240Hz)
    const nativeEvt = e.nativeEvent as PointerEvent;
    const coalescedEvents = (typeof nativeEvt.getCoalescedEvents === 'function')
      ? nativeEvt.getCoalescedEvents()
      : [e];

    // MODO BORRACHA ESTILO ONENOTE: ao arrastar a borracha, apaga qualquer traço colidido por completo
    if (effectiveTool === 'eraser') {
      const eraserRadius = Math.max(baseWidth * 2.5, 14);
      let strokesChanged = false;

      for (const evt of coalescedEvents) {
        const rawPoint: StylusPoint = {
          x: evt.clientX - rect.left,
          y: evt.clientY - rect.top,
          pressure: 0.5,
          time: Date.now(),
        };

        const prevPoint = lastEraserPointRef.current || rawPoint;
        const { remainingStrokes, erasedStrokes } = eraseStrokesAlongSegment(
          strokesRef.current,
          prevPoint,
          rawPoint,
          eraserRadius
        );
        lastEraserPointRef.current = rawPoint;

        if (erasedStrokes.length > 0) {
          hasErasedInCurrentGestureRef.current = true;
          strokesRef.current = remainingStrokes;
          strokesChanged = true;
        }
      }

      if (strokesChanged) {
        setStrokes([...strokesRef.current]);
        renderAllStrokes(canvas, strokesRef.current, effectiveDark, pressureConfig);
      }
      return;
    }

    const ctx = canvas.getContext('2d');
    if (ctx) {
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    for (const evt of coalescedEvents) {
      const { pressure: subPressure } = extractPointerPressure(evt, isPenDetectedRef.current);
      const rawPoint: StylusPoint = {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top,
        pressure: subPressure,
        time: Date.now(),
      };

      // Ctrl pressionado no início: pré-visualiza linha reta até a ponta atual
      if (isStraightLineRef.current) {
        const start = currentPointsRef.current[0];
        currentPointsRef.current = [start, rawPoint];
        const preview: DrawingStroke = {
          id: 'preview-straight-line',
          tool: effectiveTool,
          color: effectiveTool === 'highlighter' ? highlighterColor : selectedColor,
          width: baseWidth,
          points: currentPointsRef.current,
        };
        renderAllStrokes(canvas, [...strokesRef.current, preview], effectiveDark, pressureConfig);
        return;
      }

      // Ignora micro-jitter estático (< 0.5px de distância e pressão idêntica)
      const lastPoint = currentPointsRef.current[currentPointsRef.current.length - 1];
      if (lastPoint) {
        const dx = rawPoint.x - lastPoint.x;
        const dy = rawPoint.y - lastPoint.y;
        if (dx * dx + dy * dy < 0.25 && Math.abs(rawPoint.pressure - lastPoint.pressure) < 0.02) {
          continue;
        }
      }

      const smoothed = filterPointWithStabilizer(rawPoint, currentPointsRef.current);
      currentPointsRef.current.push(smoothed);

      if (ctx && currentPointsRef.current.length > 1) {
        const pts = currentPointsRef.current;
        const p1 = pts[pts.length - 2];
        const p2 = pts[pts.length - 1];
        const strokeColor = effectiveTool === 'highlighter' ? highlighterColor : selectedColor;

        drawLiveSegment(ctx, p1, p2, baseWidth, effectiveTool, strokeColor, effectiveDark, pressureConfig);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {}
    }

    const isStylusEraser = isPenDetectedRef.current && ((e.buttons & 32) !== 0 || e.button === 5);
    const effectiveTool = isStylusEraser ? 'eraser' : activeTool;

    // Conclusão do gesto de borracha estilo OneNote
    if (effectiveTool === 'eraser') {
      lastEraserPointRef.current = null;
      if (hasErasedInCurrentGestureRef.current) {
        // Salva estado anterior na pilha de Undo para permitir restaurar os traços com Ctrl+Z
        setUndoStack((prev) => [...prev, strokesAtGestureStartRef.current]);
        setRedoStack([]);
        onSaveStrokes?.(strokesRef.current);
        hasErasedInCurrentGestureRef.current = false;
      }
      currentPointsRef.current = [];
      return;
    }

    if (currentPointsRef.current.length > 0) {
      const finalColor = effectiveTool === 'highlighter' ? highlighterColor : selectedColor;

      const newStroke: DrawingStroke = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        tool: effectiveTool,
        color: finalColor,
        width: baseWidth,
        points: [...currentPointsRef.current],
      };

      const updated = [...strokesRef.current, newStroke];
      setUndoStack((prev) => [...prev, strokesAtGestureStartRef.current]);
      setRedoStack([]);
      strokesRef.current = updated;
      setStrokes(updated);
      // Salva automaticamente no banco local
      onSaveStrokes?.(updated);

      // Redesenha de forma completa com geometria contínua de largura variável
      if (canvas) {
        renderAllStrokes(canvas, updated, effectiveDark, pressureConfig);
      }
    }

    currentPointsRef.current = [];
    isStraightLineRef.current = false;
  };

  // Undo / Redo com snapshots completos de traços
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previousState = undoStack[undoStack.length - 1];
    const nextUndoStack = undoStack.slice(0, -1);
    setRedoStack((prev) => [...prev, strokesRef.current]);
    setUndoStack(nextUndoStack);
    strokesRef.current = previousState;
    setStrokes(previousState);
    onSaveStrokes?.(previousState);
    if (canvasRef.current) {
      renderAllStrokes(canvasRef.current, previousState, effectiveDark, pressureConfig);
    }
  }, [undoStack, onSaveStrokes, effectiveDark, pressureConfig]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[redoStack.length - 1];
    const nextRedoStack = redoStack.slice(0, -1);
    setUndoStack((prev) => [...prev, strokesRef.current]);
    setRedoStack(nextRedoStack);
    strokesRef.current = nextState;
    setStrokes(nextState);
    onSaveStrokes?.(nextState);
    if (canvasRef.current) {
      renderAllStrokes(canvasRef.current, nextState, effectiveDark, pressureConfig);
    }
  }, [redoStack, onSaveStrokes, effectiveDark, pressureConfig]);

  const handleClearAll = useCallback(() => {
    if (strokesRef.current.length === 0) return;
    setUndoStack((prev) => [...prev, strokesRef.current]);
    setRedoStack([]);
    strokesRef.current = [];
    setStrokes([]);
    onSaveStrokes?.([]);
    if (canvasRef.current) {
      renderAllStrokes(canvasRef.current, [], effectiveDark, pressureConfig);
    }
  }, [onSaveStrokes, effectiveDark, pressureConfig]);

  const handleManualSave = useCallback(() => {
    onSaveStrokes?.(strokesRef.current);
    setSavedFeedback(true);
    setTimeout(() => {
      setSavedFeedback(false);
    }, 1500);
  }, [onSaveStrokes]);

  // Atalhos de teclado (Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const patternClass = useMemo(() => {
    if (mode === 'overlay') return 'bg-transparent';
    if (paperPattern === 'blank') return effectiveDark ? 'bg-[#18181B]' : 'bg-[#FFFDF9]';
    if (paperPattern === 'lined') return effectiveDark ? 'bg-lined-pattern-dark bg-[#18181B]' : 'bg-lined-pattern bg-[#FFFDF9]';
    return effectiveDark ? 'bg-grid-pattern-dark bg-[#18181B]' : 'bg-grid-pattern bg-[#FFFDF9]';
  }, [mode, paperPattern, effectiveDark]);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-surface neo-border neo-shadow overflow-hidden transition-all ${
        isExpanded ? 'fixed inset-4 z-50 shadow-2xl' : 'relative h-full w-full'
      } ${className}`}
    >
      {/* Barra de Ferramentas Neobrutalista */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-primary border-b-3 border-black dark:border-gray-700">
        {/* Ferramentas Principais: Caneta, Marca-Texto, Borracha */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTool('pen')}
            className={`p-2 neo-border-sm flex items-center gap-1.5 font-bold text-xs ${
              activeTool === 'pen'
                ? 'bg-black text-white dark:bg-[#00F0FF] dark:text-black shadow-[2px_2px_0px_#000]'
                : 'bg-surface text-ink hover:bg-yellow-100 dark:hover:bg-gray-700'
            }`}
            title="Caneta com sensibilidade à pressão"
          >
            <Pen className="w-4 h-4" />
            <span className="hidden sm:inline">Caneta</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('highlighter')}
            className={`p-2 neo-border-sm flex items-center gap-1.5 font-bold text-xs ${
              activeTool === 'highlighter'
                ? 'bg-black text-white dark:bg-[#00F0FF] dark:text-black shadow-[2px_2px_0px_#000]'
                : 'bg-surface text-ink hover:bg-yellow-100 dark:hover:bg-gray-700'
            }`}
            title="Marca-texto translúcido"
          >
            <Highlighter className="w-4 h-4" />
            <span className="hidden sm:inline">Marca-texto</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('eraser')}
            className={`p-2 neo-border-sm flex items-center gap-1.5 font-bold text-xs ${
              activeTool === 'eraser'
                ? 'bg-black text-white dark:bg-[#00F0FF] dark:text-black shadow-[2px_2px_0px_#000]'
                : 'bg-surface text-ink hover:bg-yellow-100 dark:hover:bg-gray-700'
            }`}
            title="Borracha de traço (apaga o traço inteiro por completo, estilo OneNote)"
          >
            <Eraser className="w-4 h-4" />
            <span className="hidden sm:inline">Borracha</span>
          </button>
        </div>

        {/* Cores e Espessura */}
        <div className="flex items-center gap-2">
          {activeTool === 'pen' && (
            <div className="flex items-center gap-1 bg-surface p-1 neo-border-sm">
              {(effectiveDark ? DARK_PEN_COLORS : LIGHT_PEN_COLORS).map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setSelectedColor(c.hex)}
                  className={`w-5 h-5 rounded-none border-2 transition-transform ${
                    selectedColor === c.hex ? 'scale-110 border-black ring-2 ring-primary' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          )}

          {activeTool === 'highlighter' && (
            <div className="flex items-center gap-1 bg-surface p-1 neo-border-sm">
              {HIGHLIGHTER_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setHighlighterColor(c.hex)}
                  className={`w-5 h-5 rounded-none border-2 transition-transform ${
                    highlighterColor === c.hex ? 'scale-110 border-black ring-2 ring-primary' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          )}

          {/* Slider de Espessura Base */}
          <div className="flex items-center gap-1.5 bg-surface px-2 py-1 neo-border-sm">
            <span className="text-[10px] font-black uppercase text-ink">Tam</span>
            <input
              type="range"
              min="1"
              max="12"
              value={baseWidth}
              onChange={(e) => setBaseWidth(Number(e.target.value))}
              className="w-16 h-2 accent-black dark:accent-[#00F0FF] cursor-pointer"
              title={`Espessura base: ${baseWidth}px`}
            />
            <span className="text-[10px] font-mono font-bold text-ink">{baseWidth}px</span>
          </div>

          {/* Alternância de Curva de Pressão */}
          <button
            type="button"
            onClick={() =>
              setPressureCurve((prev) =>
                prev === 'normal' ? 'soft' : prev === 'soft' ? 'firm' : 'normal'
              )
            }
            className={`px-2 py-1 text-[11px] font-black neo-border-sm flex items-center gap-1 ${
              isPressureEnabled
                ? 'bg-surface text-ink hover:bg-yellow-100 dark:hover:bg-gray-700'
                : 'bg-gray-300 dark:bg-gray-800 text-gray-500 opacity-60'
            }`}
            title="Curva de resposta de pressão da mesa (Suave, Normal, Firme)"
          >
            <Gauge className="w-3 h-3 text-[#FF5A36] dark:text-[#00F0FF]" />
            <span className="hidden sm:inline">Pressão:</span>
            <span className="capitalize">{pressureCurve === 'soft' ? 'Suave' : pressureCurve === 'firm' ? 'Firme' : 'Normal'}</span>
          </button>

          {/* Estabilizador Anti-Tremor */}
          <button
            type="button"
            onClick={() =>
              setStabilizerLevel((prev) =>
                prev === 'off' ? 'medium' : prev === 'medium' ? 'high' : 'off'
              )
            }
            className={`px-2 py-1 text-[11px] font-bold neo-border-sm flex items-center gap-1 ${
              stabilizerLevel !== 'off'
                ? 'bg-[#00E599] text-black font-black'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-ink-muted'
            }`}
            title="Estabilizador de traço (reduz tremores)"
          >
            <Sliders className="w-3 h-3" />
            <span className="hidden sm:inline">Suavizar:</span>
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
              className="px-2 py-1 text-[11px] font-bold bg-surface text-ink neo-border-sm flex items-center gap-1 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Trocar padrão de fundo do papel"
            >
              <Grid className="w-3 h-3" />
              <span className="capitalize">{paperPattern === 'grid' ? 'Quadriculado' : paperPattern === 'lined' ? 'Pautado' : 'Liso'}</span>
            </button>
          )}

          {/* Botão de Salvar Rascunho */}
          <button
            type="button"
            onClick={handleManualSave}
            className={`px-2.5 py-1 text-xs font-black neo-border-sm flex items-center gap-1 transition-transform ${
              savedFeedback 
                ? 'bg-[#00E599] text-black scale-105' 
                : 'bg-surface text-black dark:text-white hover:bg-green-100 dark:hover:bg-green-950'
            }`}
            title="Salvar rascunho manualmente"
          >
            {savedFeedback ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3] text-ink" />
                <span>Salvo!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 text-[#FF5A36] dark:text-[#00F0FF]" />
                <span className="hidden sm:inline">Salvar</span>
              </>
            )}
          </button>

          {/* Ações de Histórico: Undo, Redo, Clear */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="p-1.5 bg-surface neo-border-sm disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Desfazer (Ctrl+Z)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-ink" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-1.5 bg-surface neo-border-sm disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Refazer (Ctrl+Y)"
            >
              <RotateCw className="w-3.5 h-3.5 text-ink" />
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              disabled={strokes.length === 0}
              className="p-1.5 bg-[#FF3366] text-white neo-border-sm disabled:opacity-40 hover:bg-red-600"
              title="Limpar todos os traços"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Expandir / Minimizar */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 bg-surface neo-border-sm hover:bg-gray-100 dark:hover:bg-gray-700 ml-1"
              title={isExpanded ? 'Restaurar tamanho' : 'Maximizar tela cheia'}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5 text-ink" /> : <Maximize2 className="w-3.5 h-3.5 text-ink" />}
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 bg-[#FF3366] text-white neo-border-sm hover:bg-red-700 ml-1"
                title="Fechar rascunho"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Indicador em Tempo Real da Mesa Digitalizadora e Medidor de Pressão */}
      <div className="flex items-center justify-between px-3 py-1 bg-surface border-b-2 border-black dark:border-gray-700 text-[11px] font-mono text-gray-600 dark:text-ink-muted">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isPenDetected ? 'bg-green-500 animate-pulse' : 'bg-blue-400'
              }`}
            />
            <span className="font-bold text-ink">
              {isPenDetected ? 'Mesa / Stylus ativa' : 'Aguardando toque da caneta'}
            </span>
          </span>

          {/* Medidor visual dinâmico de pressão */}
          <div className="flex items-center gap-1.5 bg-surface-2 px-2 py-0.5 neo-border-sm">
            <span className="text-[10px] uppercase font-bold text-ink">Pressão:</span>
            <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-none overflow-hidden border border-black dark:border-gray-600">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 via-yellow-400 to-rose-500 transition-all duration-75"
                style={{ width: `${Math.round(stylusPressure * 100)}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-ink w-7 text-right">
              {Math.round(stylusPressure * 100)}%
            </span>
          </div>

          {/* Botão de sensibilidade rápida */}
          <button
            type="button"
            onClick={() => setIsPressureEnabled((v) => !v)}
            className={`text-[10px] px-1.5 py-0.5 neo-border-sm font-bold ${
              isPressureEnabled ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' : 'bg-gray-200 text-gray-600'
            }`}
            title="Ativar/desativar resposta dinâmica de pressão"
          >
            {isPressureEnabled ? 'Dinâmica ON' : 'Dinâmica OFF'}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-ink font-bold">{strokes.length} traço(s)</span>
          <span>Questão: {questionId}</span>
        </div>
      </div>

      {/* Área do Canvas de Desenho */}
      <div className={`relative flex-1 min-h-[340px] overflow-hidden ${patternClass}`}>
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`stylus-canvas absolute inset-0 w-full h-full ${
            activeTool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'
          }`}
        />

        {strokes.length === 0 && mode === 'scratchpad' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-40 select-none">
            <Sparkles className="w-8 h-8 mb-2 text-gray-500 dark:text-gray-300" />
            <p className="text-sm font-bold text-gray-700 dark:text-ink-muted">Espaço para cálculos e rascunhos</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Sensibilidade à pressão ativada para canetas e mesas digitalizadoras</p>
          </div>
        )}
      </div>
    </div>
  );
};