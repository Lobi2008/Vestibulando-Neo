/**
 * @file src/components/dashboard/EvolutionChart.tsx
 * @description Gráfico interativo de evolução (Nota TRI ENEM, Taxa de Acerto acumulada e
 * Média móvel das últimas 10 questões).
 * Recursos: filtro por vestibular e por período, séries ligáveis/desligáveis, cursor com
 * guia vertical, painel de detalhes da questão (hover ou fixada por clique), navegação por
 * teclado (← → Esc) e atalho para abrir a questão no caderno.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Pin, PinOff } from 'lucide-react';
import type { ExamType } from '../../types/index.ts';

export interface EvolutionPoint {
  attemptNumber: number;
  questionId: string;
  vestibular: ExamType;
  discipline: string;
  topic: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  triScore: number;
  timestamp: number;
}

interface EvolutionChartProps {
  points: EvolutionPoint[];
  onSelectQuestion: (questionId: string) => void;
}

type RangeKey = '20' | '50' | 'all';
type ExamFilter = ExamType | 'TODOS';

interface ChartPoint extends EvolutionPoint {
  accuracy: number; // acerto acumulado (%)
  rolling: number; // média móvel das últimas 10 (%)
}

// Geometria do SVG
const DEFAULT_W = 700;
const H = 190;
const PAD_L = 36;
const PAD_R = 40;
const PAD_T = 8;
const PLOT_BOTTOM = 146;
const PLOT_H = PLOT_BOTTOM - PAD_T;
const TRI_MIN = 350;
const TRI_MAX = 850;
const ROLLING_WINDOW = 10;

const COLOR_ACC = '#00B8D9';
const COLOR_ROLL = '#FF5A36';
const COLOR_OK = '#00B35A';
const COLOR_ERR = '#FF3366';

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string }> = [
  { key: '20', label: 'Últimas 20' },
  { key: '50', label: 'Últimas 50' },
  { key: 'all', label: 'Tudo' },
];

const Y_TICKS = [0, 0.25, 0.5, 0.75, 1];

const formatTime = (seconds: number): string => {
  const s = Math.max(0, Math.round(seconds));
  return s >= 60 ? `${Math.floor(s / 60)}min ${s % 60}s` : `${s}s`;
};

const formatDate = (ts: number): string =>
  new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

/** Mede a largura real do contêiner para o SVG não esticar (texto e marcadores sem distorção). */
function useElementWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState<number>(DEFAULT_W);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.max(320, el.clientWidth));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

const yFromFraction = (fraction: number): number => PLOT_BOTTOM - fraction * PLOT_H;
const triToFraction = (tri: number): number => Math.max(0, Math.min(1, (tri - TRI_MIN) / (TRI_MAX - TRI_MIN)));

const EvolutionChartComponent: React.FC<EvolutionChartProps> = ({ points, onSelectQuestion }) => {
  const [wrapRef, W] = useElementWidth<HTMLDivElement>();
  const PLOT_W = W - PAD_L - PAD_R;
  const [range, setRange] = useState<RangeKey>('50');
  const [exam, setExam] = useState<ExamFilter>('TODOS');
  const [showTri, setShowTri] = useState<boolean>(true);
  const [showAcc, setShowAcc] = useState<boolean>(true);
  const [showRolling, setShowRolling] = useState<boolean>(true);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const availableExams = useMemo(() => {
    const set = new Set<ExamType>();
    for (const p of points) set.add(p.vestibular);
    return Array.from(set);
  }, [points]);

  // A nota TRI só existe para o ENEM
  const triAvailable = exam === 'TODOS' || exam === 'ENEM';

  // Recalcula acerto acumulado e média móvel para o recorte escolhido, depois aplica o período
  const data = useMemo<ChartPoint[]>(() => {
    const subset = exam === 'TODOS' ? points : points.filter((p) => p.vestibular === exam);
    let correct = 0;
    const full: ChartPoint[] = subset.map((p, i) => {
      if (p.isCorrect) correct++;
      const windowStart = Math.max(0, i - ROLLING_WINDOW + 1);
      let winCorrect = 0;
      for (let j = windowStart; j <= i; j++) if (subset[j].isCorrect) winCorrect++;
      return {
        ...p,
        accuracy: Math.round((correct / (i + 1)) * 100),
        rolling: Math.round((winCorrect / (i - windowStart + 1)) * 100),
      };
    });
    return range === 'all' ? full : full.slice(-Number(range));
  }, [points, exam, range]);

  const n = data.length;
  const xAt = useCallback(
    (i: number): number => (n <= 1 ? PAD_L + PLOT_W / 2 : PAD_L + (i / (n - 1)) * PLOT_W),
    [n, PLOT_W]
  );

  const pinnedIdx = useMemo(() => {
    if (!pinnedId) return null;
    const idx = data.findIndex((p) => p.questionId === pinnedId);
    return idx === -1 ? null : idx;
  }, [data, pinnedId]);

  const activeIdx = hoverIdx ?? pinnedIdx;
  const active = activeIdx !== null ? data[activeIdx] : null;

  const linePath = useCallback(
    (getFraction: (p: ChartPoint) => number): string =>
      data.map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yFromFraction(getFraction(p)).toFixed(1)}`).join(' '),
    [data, xAt]
  );

  const accPath = useMemo(() => linePath((p) => p.accuracy / 100), [linePath]);
  const rollingPath = useMemo(() => linePath((p) => p.rolling / 100), [linePath]);
  const triPath = useMemo(
    () => linePath((p) => triToFraction(p.triScore)),
    [linePath]
  );

  // Resumo do recorte exibido
  const summary = useMemo(() => {
    if (n === 0) return null;
    const last = data[n - 1];
    const first = data[0];
    const bestTri = data.reduce((m, p) => Math.max(m, p.triScore), 0);
    return {
      lastTri: last.triScore,
      deltaTri: last.triScore - first.triScore,
      accuracy: last.accuracy,
      rolling: last.rolling,
      bestTri,
    };
  }, [data, n]);

  const indexFromPointer = useCallback(
    (clientX: number, svg: SVGSVGElement): number => {
      const rect = svg.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * W;
      if (n <= 1) return 0;
      const idx = Math.round(((x - PAD_L) / PLOT_W) * (n - 1));
      return Math.max(0, Math.min(n - 1, idx));
    },
    [n, W, PLOT_W]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => setHoverIdx(indexFromPointer(e.clientX, e.currentTarget)),
    [indexFromPointer]
  );

  // Ao sair do gráfico, mantém o último ponto no painel (para alcançar os botões);
  // se houver ponto fixado, volta a mostrá-lo.
  const handlePointerLeave = useCallback(() => setHoverIdx((prev) => (pinnedId ? null : prev)), [pinnedId]);

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const idx = indexFromPointer(e.clientX, e.currentTarget);
      const id = data[idx]?.questionId ?? null;
      setPinnedId((prev) => (prev === id ? null : id));
    },
    [data, indexFromPointer]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<SVGSVGElement>) => {
      if (n === 0) return;
      if (e.key === 'Escape') {
        setPinnedId(null);
        setHoverIdx(null);
        return;
      }
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const current = activeIdx ?? (e.key === 'ArrowRight' ? -1 : n);
      const next = Math.max(0, Math.min(n - 1, current + (e.key === 'ArrowRight' ? 1 : -1)));
      setHoverIdx(null);
      setPinnedId(data[next].questionId);
    },
    [activeIdx, data, n]
  );

  const chip = (on: boolean, disabled = false): string =>
    `px-2 py-0.5 text-[11px] font-bold border-2 border-line transition-colors flex items-center gap-1.5 ${
      disabled
        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
        : on
          ? 'bg-primary text-ink'
          : 'bg-surface text-ink-muted hover:bg-gray-100'
    }`;

  const isPinnedActive = pinnedIdx !== null && pinnedIdx === activeIdx;

  return (
    <div className="space-y-2">
      {/* Linha única: resumo + filtros */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {summary && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-bold text-ink-muted">
            {triAvailable && (
              <span>
                TRI <b className="text-sm font-black text-ink">{Math.round(summary.lastTri)}</b>{' '}
                <b style={{ color: summary.deltaTri >= 0 ? COLOR_OK : COLOR_ERR }}>
                  {summary.deltaTri >= 0 ? '▲' : '▼'} {Math.abs(Math.round(summary.deltaTri))}
                </b>
              </span>
            )}
            <span>
              Acerto <b className="text-sm font-black text-ink">{summary.accuracy}%</b>
            </span>
            <span>
              Últimas {ROLLING_WINDOW}{' '}
              <b className="text-sm font-black text-ink">{summary.rolling}%</b>{' '}
              <b style={{ color: summary.rolling >= summary.accuracy ? COLOR_OK : COLOR_ERR }}>
                {summary.rolling >= summary.accuracy ? '▲' : '▼'}
              </b>
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={exam}
            onChange={(e) => {
              setExam(e.target.value as ExamFilter);
              setPinnedId(null);
              setHoverIdx(null);
            }}
            className="text-[11px] font-bold px-1.5 py-0.5 border-2 border-line"
            aria-label="Filtrar por vestibular"
          >
            <option value="TODOS">Todos</option>
            {availableExams.map((ex) => (
              <option key={ex} value={ex}>
                {ex}
              </option>
            ))}
          </select>
          <div className="flex">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  setRange(opt.key);
                  setHoverIdx(null);
                }}
                className={`px-2 py-0.5 text-[11px] font-bold border-2 border-line -ml-0.5 first:ml-0 transition-colors ${
                  range === opt.key ? 'bg-primary text-ink' : 'bg-surface text-ink-muted hover:bg-gray-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Gráfico */}
      <div ref={wrapRef} className="bg-surface-2 border-2 border-line overflow-hidden">
        {n === 0 ? (
          <div className="text-center py-8 text-gray-400 text-xs">Nenhuma questão resolvida neste filtro.</div>
        ) : (
          <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            className="block select-none touch-none cursor-crosshair focus:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white"
            role="img"
            aria-label="Gráfico de evolução. Use as setas esquerda e direita para navegar entre as questões."
            tabIndex={0}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
          >
            {/* Grade e eixos: % à esquerda, nota TRI à direita */}
            {Y_TICKS.map((f) => {
              const y = yFromFraction(f);
              return (
                <g key={f}>
                  <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="currentColor" strokeOpacity={f === 0 ? 0.5 : 0.12} strokeWidth={1} className="text-ink" />
                  <text x={PAD_L - 5} y={y + 3} textAnchor="end" fontSize="9" fontWeight="700" className="fill-ink-muted font-mono">
                    {Math.round(f * 100)}%
                  </text>
                  {triAvailable && showTri && (
                    <text x={W - PAD_R + 5} y={y + 3} textAnchor="start" fontSize="9" fontWeight="700" className="fill-ink-muted font-mono">
                      {Math.round(TRI_MIN + f * (TRI_MAX - TRI_MIN))}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Área suave sob o acerto acumulado */}
            {n > 1 && showAcc && (
              <path d={`${accPath} L${xAt(n - 1).toFixed(1)},${PLOT_BOTTOM} L${xAt(0).toFixed(1)},${PLOT_BOTTOM} Z`} fill={COLOR_ACC} fillOpacity={0.12} />
            )}

            {/* Séries */}
            {n > 1 && showAcc && <path d={accPath} fill="none" stroke={COLOR_ACC} strokeWidth={2} strokeLinejoin="round" />}
            {n > 1 && showRolling && <path d={rollingPath} fill="none" stroke={COLOR_ROLL} strokeWidth={1.75} strokeDasharray="5 3" strokeLinejoin="round" />}
            {n > 1 && triAvailable && showTri && <path d={triPath} fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinejoin="round" className="text-ink" />}

            {/* Faixa de acertos/erros */}
            {data.map((p, i) => {
              const size = Math.max(2, Math.min(8, PLOT_W / n - 1.5));
              return (
                <rect
                  key={p.questionId + i}
                  x={xAt(i) - size / 2}
                  y={PLOT_BOTTOM + 8}
                  width={size}
                  height={7}
                  fill={p.isCorrect ? COLOR_OK : COLOR_ERR}
                  opacity={activeIdx === null || activeIdx === i ? 1 : 0.4}
                />
              );
            })}

            {/* Marcadores (apenas com poucos pontos) */}
            {n <= 30 &&
              data.map((p, i) => (
                <g key={`m-${p.questionId}-${i}`}>
                  {showAcc && <circle cx={xAt(i)} cy={yFromFraction(p.accuracy / 100)} r={2.5} fill={COLOR_ACC} />}
                  {triAvailable && showTri && (
                    <rect x={xAt(i) - 2.5} y={yFromFraction(triToFraction(p.triScore)) - 2.5} width={5} height={5} fill="var(--primary)" stroke="currentColor" strokeWidth={1} className="text-ink" />
                  )}
                </g>
              ))}

            {/* Guia vertical e destaque do ponto ativo */}
            {active && activeIdx !== null && (
              <g pointerEvents="none">
                <line x1={xAt(activeIdx)} x2={xAt(activeIdx)} y1={PAD_T} y2={PLOT_BOTTOM + 15} stroke="currentColor" strokeOpacity={0.6} strokeWidth={1} strokeDasharray="3 3" className="text-ink" />
                {showAcc && <circle cx={xAt(activeIdx)} cy={yFromFraction(active.accuracy / 100)} r={4.5} fill={COLOR_ACC} stroke="currentColor" strokeWidth={2} className="text-ink" />}
                {showRolling && <circle cx={xAt(activeIdx)} cy={yFromFraction(active.rolling / 100)} r={4} fill={COLOR_ROLL} stroke="currentColor" strokeWidth={1.5} className="text-ink" />}
                {triAvailable && showTri && (
                  <rect x={xAt(activeIdx) - 4.5} y={yFromFraction(triToFraction(active.triScore)) - 4.5} width={9} height={9} fill="var(--primary)" stroke="currentColor" strokeWidth={2} className="text-ink" />
                )}
              </g>
            )}

            {/* Rótulos do eixo X */}
            <text x={PAD_L} y={H - 4} textAnchor="start" fontSize="9" fontWeight="700" className="fill-ink-muted font-mono">
              Q{data[0].attemptNumber} • {formatDate(data[0].timestamp)}
            </text>
            <text x={W - PAD_R} y={H - 4} textAnchor="end" fontSize="9" fontWeight="700" className="fill-ink-muted font-mono">
              Q{data[n - 1].attemptNumber} • {formatDate(data[n - 1].timestamp)}
            </text>
          </svg>
        )}
      </div>

      {/* Legenda clicável + detalhes numa linha compacta */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={chip(showTri, !triAvailable)} disabled={!triAvailable} onClick={() => setShowTri((v) => !v)}>
            <span className="w-2 h-2 bg-primary border border-line inline-block" />
            Nota TRI
          </button>
          <button type="button" className={chip(showAcc)} onClick={() => setShowAcc((v) => !v)}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: COLOR_ACC }} />
            Acerto acumulado
          </button>
          <button type="button" className={chip(showRolling)} onClick={() => setShowRolling((v) => !v)}>
            <span className="w-3 h-0 border-t-2 border-dashed inline-block" style={{ borderColor: COLOR_ROLL }} />
            Últimas {ROLLING_WINDOW}
          </button>
        </div>

        {active ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
            <span className="px-1.5 py-0.5 font-black text-white" style={{ backgroundColor: active.isCorrect ? COLOR_OK : COLOR_ERR }}>
              Q{active.attemptNumber} {active.isCorrect ? '✓' : '✗'}
            </span>
            <span className="font-bold text-ink">
              {active.discipline}
              {active.topic ? ` — ${active.topic}` : ''}
            </span>
            <span className="font-mono font-bold text-ink-muted">
              {active.vestibular} • {formatTime(active.timeSpentSeconds)}
              {triAvailable ? ` • TRI ${Math.round(active.triScore)}` : ''} • {active.accuracy}%
            </span>
            <button
              type="button"
              onClick={() => setPinnedId((prev) => (prev === active.questionId ? null : active.questionId))}
              className="p-1 border-2 border-line bg-surface text-ink hover:bg-gray-100 transition-colors"
              title={isPinnedActive ? 'Soltar' : 'Fixar'}
              aria-label={isPinnedActive ? 'Soltar questão' : 'Fixar questão'}
            >
              {isPinnedActive ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
            </button>
            <button
              type="button"
              onClick={() => onSelectQuestion(active.questionId)}
              className="px-1.5 py-0.5 font-bold border-2 border-line bg-primary text-ink flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              Abrir
            </button>
          </div>
        ) : (
          <span className="text-[11px] font-bold text-ink-muted">Passe o mouse para ver cada questão • clique para fixar • ← →</span>
        )}
      </div>
    </div>
  );
};

export const EvolutionChart = memo(EvolutionChartComponent);