/**
 * @file src/components/filters/TaxonomyFilterBar.tsx
 * @description Barra de filtros hierárquicos obrigatórios em 3 níveis:
 * Nível 1: Vestibular (ENEM, UERJ, FUVEST, UNICAMP)
 * Nível 2: Tema / Área de Conhecimento (Ciências da Natureza, Humanas, Linguagens, Matemática)
 * Nível 3: Conteúdo Específico (Eletrodinâmica, Interpretação de Texto, Geometria Espacial, etc.)
 * Além de busca textual e filtro de status de resolução (não resolvidas, certas, erros).
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Filter, Search, RotateCcw, CheckCircle2, XCircle, HelpCircle, Layers, ChevronUp, ChevronDown } from 'lucide-react';
import type { FilterState, ExamType, AreaOfKnowledge, Question } from '../../types/index.ts';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.ts';

interface TaxonomyFilterBarProps {
  questions: Question[];
  filters: FilterState;
  onFilterChange: (updated: Partial<FilterState>) => void;
  onResetFilters: () => void;
  filteredCount: number;
}

const EXAM_OPTIONS: Array<{ value: ExamType | 'TODOS'; label: string }> = [
  { value: 'TODOS', label: 'Todos os Vestibulares' },
  { value: 'ENEM', label: 'ENEM' },
  { value: 'UERJ', label: 'UERJ' },
  { value: 'FUVEST', label: 'FUVEST' },
  { value: 'UNICAMP', label: 'UNICAMP' },
];

const AREA_OPTIONS: Array<{ value: AreaOfKnowledge | 'TODAS'; label: string }> = [
  { value: 'TODAS', label: 'Todas as Áreas' },
  { value: 'Ciências da Natureza e suas Tecnologias', label: 'Ciências da Natureza' },
  { value: 'Matemática e suas Tecnologias', label: 'Matemática' },
  { value: 'Ciências Humanas e suas Tecnologias', label: 'Ciências Humanas' },
  { value: 'Linguagens, Códigos e suas Tecnologias', label: 'Linguagens' },
];

const TaxonomyFilterBarComponent: React.FC<TaxonomyFilterBarProps> = ({
  questions,
  filters,
  onFilterChange,
  onResetFilters,
  filteredCount,
}) => {
  // Extrai dinamicamente a lista de conteúdos específicos disponíveis baseados no vestibular e área selecionados
  const availableTopics = useMemo(() => {
    let pool = questions;

    if (filters.vestibular !== 'TODOS') {
      pool = pool.filter((q) => q.vestibular === filters.vestibular);
    }

    if (filters.area !== 'TODAS') {
      pool = pool.filter((q) => q.area === filters.area);
    }

    const set = new Set<string>();
    for (const q of pool) {
      if (q.topic) set.add(q.topic);
    }
    return Array.from(set).sort();
  }, [questions, filters.vestibular, filters.area]);

  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);

  // Busca: o input é controlado por estado local (digitação instantânea) e só
  // propaga ao pai após o debounce, evitando refiltrar a lista a cada tecla.
  const [searchText, setSearchText] = useState<string>(filters.searchQuery);
  const debouncedSearch = useDebouncedValue(searchText, 250);

  useEffect(() => {
    if (debouncedSearch !== filters.searchQuery) {
      onFilterChange({ searchQuery: debouncedSearch });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Mantém o input sincronizado quando o pai altera a busca (ex.: "Limpar filtros")
  useEffect(() => {
    setSearchText((current) => (current === filters.searchQuery ? current : filters.searchQuery));
  }, [filters.searchQuery]);

  const toggleCollapsed = useCallback(() => setIsCollapsed((prev) => !prev), []);

  // Clique em qualquer ponto da caixa fechada expande os filtros (não recolhe se já estiver aberta)
  const expandIfCollapsed = useCallback(() => {
    if (isCollapsed) setIsCollapsed(false);
  }, [isCollapsed]);

  const handleResetClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation(); // limpar filtros não deve expandir a caixa
      onResetFilters();
    },
    [onResetFilters]
  );

  const handleVestibularChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      // Reseta conteúdo ao mudar o vestibular
      onFilterChange({ vestibular: e.target.value as FilterState['vestibular'], topic: 'TODOS' });
    },
    [onFilterChange]
  );

  const handleAreaChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      // Reseta conteúdo ao mudar a área
      onFilterChange({ area: e.target.value as FilterState['area'], topic: 'TODOS' });
    },
    [onFilterChange]
  );

  const handleTopicChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => onFilterChange({ topic: e.target.value }),
    [onFilterChange]
  );

  return (
    <div
      className={`bg-surface neo-border neo-shadow p-3 mb-4 transition-colors ${isCollapsed ? 'cursor-pointer' : ''}`}
      onClick={expandIfCollapsed}
    >
      <div className={`flex flex-wrap items-center justify-between gap-2 ${isCollapsed ? '' : 'pb-2 mb-2 border-b-2 border-black'}`}>
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-ink" />
          <span className="text-sm font-black uppercase tracking-wider text-ink">
            Filtros

          </span>
          <span className="text-xs bg-[#111111] text-white px-2 py-0.5 font-bold">
            {filteredCount} questões encontradas
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetClick}
            className="text-xs font-bold text-gray-700 dark:text-ink-muted hover:text-black flex items-center gap-1 hover:underline mr-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpar filtros</span>
          </button>

          <button
            type="button"
            onClick={toggleCollapsed}
            className="p-1 neo-border-sm bg-surface-2 hover:bg-black hover:text-white transition-colors"
            title={isCollapsed ? 'Mostrar filtros' : 'Ocultar filtros'}
            aria-label={isCollapsed ? 'Mostrar filtros' : 'Ocultar filtros'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="space-y-3">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* NÍVEL 1: VESTIBULAR */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-ink-muted mb-1">
            Vestibular
          </label>
          <select
            value={filters.vestibular}
            onChange={handleVestibularChange}
            className="w-full bg-surface-2 px-3 py-2 text-sm font-extrabold neo-border-sm focus:outline-none focus:bg-surface"
          >
            {EXAM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* NÍVEL 2: ÁREA DO CONHECIMENTO */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-ink-muted mb-1">
            Área
          </label>
          <select
            value={filters.area}
            onChange={handleAreaChange}
            className="w-full bg-surface-2 px-3 py-2 text-sm font-extrabold neo-border-sm focus:outline-none focus:bg-surface"
          >
            {AREA_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* NÍVEL 3: CONTEÚDO ESPECÍFICO */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-ink-muted mb-1">
            Conteúdo
          </label>
          <select
            value={filters.topic}
            onChange={handleTopicChange}
            className="w-full bg-surface-2 px-3 py-2 text-sm font-extrabold neo-border-sm focus:outline-none focus:bg-surface"
          >
            <option value="TODOS">Todos os conteúdos</option>
            {availableTopics.map((top) => (
              <option key={top} value={top}>
                {top}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Barra de Status e Busca por Palavra-chave */}
      <div className="mt-3 pt-2 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
        {/* Status de Resolução */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-gray-600 dark:text-ink-muted mr-1">Status:</span>

          <button
            type="button"
            onClick={() => onFilterChange({ status: 'TODAS' })}
            className={`px-2.5 py-1 text-xs font-bold neo-border-sm transition-colors ${
              filters.status === 'TODAS'
                ? 'bg-[#111111] text-white'
                : 'bg-gray-100 text-gray-800 dark:text-ink hover:bg-gray-200'
            }`}
          >
            Todas
          </button>

          <button
            type="button"
            onClick={() => onFilterChange({ status: 'NAO_RESOLVIDAS' })}
            className={`px-2.5 py-1 text-xs font-bold neo-border-sm transition-colors flex items-center gap-1 ${
              filters.status === 'NAO_RESOLVIDAS'
                ? 'bg-primary text-ink font-extrabold'
                : 'bg-gray-100 text-gray-800 dark:text-ink hover:bg-gray-200'
            }`}
          >
            <HelpCircle className="w-3 h-3" />
            Pendentes
          </button>

          <button
            type="button"
            onClick={() => onFilterChange({ status: 'ACERTADAS' })}
            className={`px-2.5 py-1 text-xs font-bold neo-border-sm transition-colors flex items-center gap-1 ${
              filters.status === 'ACERTADAS'
                ? 'bg-[#00E599] text-black font-extrabold'
                : 'bg-gray-100 text-gray-800 dark:text-ink hover:bg-gray-200'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            Acertadas
          </button>

          <button
            type="button"
            onClick={() => onFilterChange({ status: 'ERRADAS' })}
            className={`px-2.5 py-1 text-xs font-bold neo-border-sm transition-colors flex items-center gap-1 ${
              filters.status === 'ERRADAS'
                ? 'bg-[#FF3366] text-white font-extrabold'
                : 'bg-gray-100 text-gray-800 dark:text-ink hover:bg-gray-200'
            }`}
          >
            <XCircle className="w-3 h-3" />
            Erradas
          </button>
        </div>

        {/* Input de Busca Rápida */}
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar questão..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm neo-border-sm bg-surface-2 focus:bg-surface focus:outline-none"
          />
        </div>
      </div>
      </div>
      )}
    </div>
  );
};

export const TaxonomyFilterBar = memo(TaxonomyFilterBarComponent);