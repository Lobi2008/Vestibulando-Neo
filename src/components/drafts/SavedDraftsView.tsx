/**
 * @file src/components/drafts/SavedDraftsView.tsx
 * @description Seção dedicada para gerenciar e visualizar todos os rascunhos feitos nas questões.
 * Permite filtrar por Vestibular, Área de Conhecimento, Conteúdo Específico e Busca textual,
 * além de pré-visualizar os traços, abrir a questão com rascunho ativo ou exportar a imagem.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Edit3, 
  Search, 
  Trash2, 
  ExternalLink, 
  Download, 
  Layers, 
  RotateCcw,
  Sparkles,
  BookOpen,
  Filter
} from 'lucide-react';
import type { Question, ExamType, AreaOfKnowledge, DrawingStroke } from '../../types/index.ts';
import { richTextToPlain } from '../../utils/richText.ts';

interface SavedDraftsViewProps {
  questions: Question[];
  savedStrokesMap: Record<string, DrawingStroke[]>;
  onOpenQuestionWithDraft: (questionId: string) => void;
  onDeleteDraft: (questionId: string) => void;
  onNavigateToQuestions: () => void;
  isDarkMode?: boolean;
}

const EXAM_OPTIONS: Array<{ label: string; value: ExamType | 'TODOS' }> = [
  { label: 'Todos os Vestibulares', value: 'TODOS' },
  { label: 'ENEM', value: 'ENEM' },
  { label: 'UERJ', value: 'UERJ' },
  { label: 'FUVEST', value: 'FUVEST' },
  { label: 'UNICAMP', value: 'UNICAMP' },
  { label: 'Concursos Públicos', value: 'CONCURSOS' },
];

const AREA_OPTIONS: Array<{ label: string; value: AreaOfKnowledge | 'TODAS' }> = [
  { label: 'Todas as Áreas', value: 'TODAS' },
  { label: 'Ciências da Natureza', value: 'Ciências da Natureza e suas Tecnologias' },
  { label: 'Matemática', value: 'Matemática e suas Tecnologias' },
  { label: 'Ciências Humanas', value: 'Ciências Humanas e suas Tecnologias' },
  { label: 'Linguagens', value: 'Linguagens, Códigos e suas Tecnologias' },
];

/** Componente de miniatura que renderiza os traços salvos */
const DraftThumbnail: React.FC<{
  strokes: DrawingStroke[];
  isDarkMode?: boolean;
  onExportPng: () => void;
}> = ({ strokes, isDarkMode, onExportPng }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resolução física nítida
    const width = 340;
    const height = 180;
    canvas.width = width * 2;
    canvas.height = height * 2;
    ctx.scale(2, 2);

    // Fundo
    ctx.fillStyle = isDarkMode ? '#18181B' : '#FEFDF9';
    ctx.fillRect(0, 0, width, height);

    // Grid sutil
    ctx.strokeStyle = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (strokes.length === 0) return;

    // Calcula caixa delimitadora dos traços para auto-enquadramento
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const stroke of strokes) {
      for (const p of stroke.points) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
    }

    const strokeW = Math.max(10, maxX - minX);
    const strokeH = Math.max(10, maxY - minY);
    const scale = Math.min((width - 30) / strokeW, (height - 30) / strokeH, 1);
    const offsetX = (width - strokeW * scale) / 2 - minX * scale;
    const offsetY = (height - strokeH * scale) / 2 - minY * scale;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    for (const stroke of strokes) {
      if (stroke.points.length === 0) continue;

      let drawColor = stroke.color;
      if (isDarkMode && (drawColor === '#111111' || drawColor === '#000000')) {
        drawColor = '#FFFFFF';
      } else if (!isDarkMode && drawColor === '#FFFFFF') {
        drawColor = '#111111';
      }

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.tool === 'highlighter') {
        ctx.globalAlpha = isDarkMode ? 0.6 : 0.45;
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = stroke.width * 4;
        ctx.globalCompositeOperation = isDarkMode ? 'screen' : 'multiply';
      } else if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = stroke.width * 5;
      } else {
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = stroke.width;
        ctx.globalCompositeOperation = 'source-over';
      }

      const pts = stroke.points;
      if (pts.length === 1) {
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, stroke.width / 2, 0, Math.PI * 2);
        ctx.fillStyle = drawColor;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();
  }, [strokes, isDarkMode]);

  return (
    <div className="relative group overflow-hidden neo-border-sm bg-[#111111] dark:bg-[#000000]">
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '140px', display: 'block' }}
      />
      <button
        type="button"
        onClick={onExportPng}
        className="absolute bottom-2 right-2 bg-black/80 hover:bg-black text-white p-1.5 neo-border-sm text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
        title="Baixar como imagem"
      >
        <Download className="w-3 h-3" />
        <span>PNG</span>
      </button>
    </div>
  );
};

export const SavedDraftsView: React.FC<SavedDraftsViewProps> = ({
  questions,
  savedStrokesMap,
  onOpenQuestionWithDraft,
  onDeleteDraft,
  onNavigateToQuestions,
  isDarkMode = false,
}) => {
  // Filtros
  const [vestibular, setVestibular] = useState<ExamType | 'TODOS'>('TODOS');
  const [area, setArea] = useState<AreaOfKnowledge | 'TODAS'>('TODAS');
  const [topic, setTopic] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Identifica questões que têm rascunhos válidos (com pelo menos 1 traço)
  const questionMap = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);

  const draftItems = useMemo(() => {
    const list: Array<{ question: Question; strokes: DrawingStroke[] }> = [];
    for (const [qId, strokes] of Object.entries(savedStrokesMap)) {
      if (Array.isArray(strokes) && strokes.length > 0) {
        const q = questionMap.get(qId);
        if (q) {
          list.push({ question: q, strokes });
        }
      }
    }
    return list;
  }, [savedStrokesMap, questionMap]);

  // Tópicos disponíveis com base nos rascunhos existentes
  const availableTopics = useMemo(() => {
    const set = new Set<string>();
    for (const item of draftItems) {
      if (vestibular !== 'TODOS' && item.question.vestibular !== vestibular) continue;
      if (area !== 'TODAS' && item.question.area !== area) continue;
      if (item.question.topic) set.add(item.question.topic);
    }
    return Array.from(set).sort();
  }, [draftItems, vestibular, area]);

  // Rascunhos filtrados
  const filteredDrafts = useMemo(() => {
    return draftItems.filter(({ question, strokes }) => {
      if (vestibular !== 'TODOS' && question.vestibular !== vestibular) return false;
      if (area !== 'TODAS' && question.area !== area) return false;
      if (topic !== 'TODOS' && question.topic !== topic) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const statementPlain = richTextToPlain(question.statement).toLowerCase();
        const matchTopic = (question.topic || '').toLowerCase().includes(query);
        const matchDiscipline = (question.discipline || '').toLowerCase().includes(query);
        const matchStatement = statementPlain.includes(query);
        if (!matchTopic && !matchDiscipline && !matchStatement) return false;
      }

      return true;
    });
  }, [draftItems, vestibular, area, topic, searchQuery]);

  const handleExportPng = (question: Question, strokes: DrawingStroke[]) => {
    const canvas = document.createElement('canvas');
    const width = 1200;
    const height = 800;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = isDarkMode ? '#18181B' : '#FEFDF9';
    ctx.fillRect(0, 0, width, height);

    // Cabeçalho da exportação
    ctx.fillStyle = isDarkMode ? '#FFFFFF' : '#111111';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`Rascunho • ${question.vestibular} ${question.year} • ${question.discipline}`, 40, 50);

    for (const stroke of strokes) {
      if (stroke.points.length === 0) continue;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      let col = stroke.color;
      if (isDarkMode && (col === '#111111' || col === '#000000')) col = '#FFFFFF';
      else if (!isDarkMode && col === '#FFFFFF') col = '#111111';

      ctx.strokeStyle = col;
      ctx.lineWidth = stroke.width * 2;
      const pts = stroke.points;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y + 60);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y + 60);
      }
      ctx.stroke();
      ctx.restore();
    }

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `rascunho-${question.vestibular}-${question.id}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Cabeçalho da Seção */}
      <div className="bg-surface neo-border neo-shadow p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="bg-[#FF5A36] text-white p-2 neo-border-sm">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-ink uppercase tracking-tight">
                Meus rascunhos
              </h2>
              <p className="text-sm font-bold text-gray-700 dark:text-ink-muted">
                Seus cálculos e anotações feitos nas questões.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-primary text-ink px-3.5 py-1.5 neo-border-sm font-black text-xs flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-ink" />
            <span>{draftItems.length} rascunhos</span>
          </div>

          <button
            type="button"
            onClick={onNavigateToQuestions}
            className="px-3 py-1.5 text-xs font-black neo-btn bg-surface text-ink flex items-center gap-1.5"
          >
            <BookOpen className="w-4 h-4" />
            <span>Ir para Questões</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros Padrões */}
      <div className="bg-surface neo-border neo-shadow p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b-2 border-black dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-ink" />
            <span className="text-sm font-black uppercase tracking-wider text-ink">
              Filtros
            </span>
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
              ({filteredDrafts.length} de {draftItems.length})
            </span>
          </div>

          {(vestibular !== 'TODOS' || area !== 'TODAS' || topic !== 'TODOS' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setVestibular('TODOS');
                setArea('TODAS');
                setTopic('TODOS');
                setSearchQuery('');
              }}
              className="text-xs font-bold text-gray-700 dark:text-ink-muted hover:text-black dark:hover:text-white flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar filtros</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Nível 1: Vestibular */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-600 dark:text-ink-muted mb-1">
              Vestibular
            </label>
            <select
              value={vestibular}
              onChange={(e) => {
                setVestibular(e.target.value as any);
                setTopic('TODOS');
              }}
              className="w-full bg-surface-2 text-ink px-3 py-2 text-sm font-extrabold neo-border-sm focus:outline-none"
            >
              {EXAM_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Nível 2: Área de Conhecimento */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-600 dark:text-ink-muted mb-1">
              Área
            </label>
            <select
              value={area}
              onChange={(e) => {
                setArea(e.target.value as any);
                setTopic('TODOS');
              }}
              className="w-full bg-surface-2 text-ink px-3 py-2 text-sm font-extrabold neo-border-sm focus:outline-none"
            >
              {AREA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Nível 3: Conteúdo Específico */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-600 dark:text-ink-muted mb-1">
              Conteúdo
            </label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full bg-surface-2 text-ink px-3 py-2 text-sm font-extrabold neo-border-sm focus:outline-none"
            >
              <option value="TODOS">Todos os Conteúdos</option>
              {availableTopics.map((top) => (
                <option key={top} value={top}>
                  {top}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Busca por termo */}
        <div className="relative pt-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar pelo texto da questão..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm font-bold neo-border-sm bg-surface-2 text-ink focus:outline-none"
          />
        </div>
      </div>

      {/* Grade de Rascunhos Salvos */}
      {filteredDrafts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDrafts.map(({ question, strokes }) => {
            const statementPlain = richTextToPlain(question.statement);

            return (
              <div
                key={question.id}
                className="bg-surface neo-border neo-shadow flex flex-col justify-between overflow-hidden"
              >
                {/* Miniatura do Canvas */}
                <DraftThumbnail
                  strokes={strokes}
                  isDarkMode={isDarkMode}
                  onExportPng={() => handleExportPng(question, strokes)}
                />

                {/* Conteúdo e Metadados */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-primary text-ink neo-border-sm">
                        {question.vestibular} {question.year}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-gray-100 dark:bg-gray-800 text-ink neo-border-sm">
                        {question.discipline}
                      </span>
                      <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 ml-auto">
                        {strokes.length} traços
                      </span>
                    </div>

                    <h4 className="text-xs font-black text-blue-900 dark:text-blue-300 mb-1">
                      📌 {question.topic}
                    </h4>

                    <p className="text-xs font-medium text-gray-800 dark:text-ink line-clamp-3 mb-4 leading-relaxed">
                      {statementPlain}
                    </p>
                  </div>

                  {/* Ações */}
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenQuestionWithDraft(question.id)}
                      className="px-3 py-1.5 text-xs font-black neo-btn bg-secondary text-ink flex items-center gap-1.5 hover:scale-105"
                      title="Abrir questão"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir questão</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteDraft(question.id)}
                      className="p-1.5 text-xs font-bold neo-border-sm bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 hover:bg-red-200"
                      title="Excluir rascunho"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Estado Vazio */
        <div className="bg-surface neo-border neo-shadow p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-primary neo-border neo-shadow-sm mx-auto flex items-center justify-center">
            <Edit3 className="w-8 h-8 text-ink dark:text-yellow-300" />
          </div>

          <div>
            <h3 className="text-lg md:text-xl font-black text-ink">
              {draftItems.length === 0
                ? 'Nenhum rascunho salvo ainda'
                : 'Nenhum rascunho encontrado'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-ink-muted max-w-sm mx-auto mt-1 leading-relaxed">
              {draftItems.length === 0
                ? 'Ao resolver uma questão, clique em "Ativar Rascunho" para fazer anotações. Elas são salvas automaticamente.'
                : 'Tente mudar os filtros.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onNavigateToQuestions}
            className="px-5 py-2.5 text-xs font-black neo-btn bg-primary text-ink inline-flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            <span>Ir para as questões</span>
          </button>
        </div>
      )}
    </div>
  );
};