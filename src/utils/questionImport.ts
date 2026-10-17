/**
 * @file src/utils/questionImport.ts
 * @description Leitura, validação e modelos do arquivo de banco de questões enviado pelo aluno.
 * Formatos aceitos: JSON (.json) e planilha CSV (.csv, separador ; , ou tabulação — o CSV do
 * Excel em português usa ";"). Os nomes das colunas estão em português.
 */

import type {
  AreaOfKnowledge,
  DisciplineType,
  ExamType,
  Question,
} from '../types/index.ts';

export interface ImportError {
  /** Linha da planilha (cabeçalho = 1) ou posição do item no JSON (primeiro = 1). */
  row: number;
  message: string;
}

export interface ImportResult {
  questions: Question[];
  errors: ImportError[];
  /** Quantidade de linhas/itens lidos (válidos + com erro). */
  totalRows: number;
}

type RawRow = Record<string, string>;

const EXAMS: ExamType[] = ['ENEM', 'UERJ', 'FUVEST', 'UNICAMP', 'CONCURSOS'];

const DISCIPLINE_AREA: Record<DisciplineType, AreaOfKnowledge> = {
  'Física': 'Ciências da Natureza e suas Tecnologias',
  'Química': 'Ciências da Natureza e suas Tecnologias',
  'Biologia': 'Ciências da Natureza e suas Tecnologias',
  'História': 'Ciências Humanas e suas Tecnologias',
  'Geografia': 'Ciências Humanas e suas Tecnologias',
  'Filosofia e Sociologia': 'Ciências Humanas e suas Tecnologias',
  'Língua Portuguesa e Literatura': 'Linguagens, Códigos e suas Tecnologias',
  'Língua Estrangeira (Inglês/Espanhol)': 'Linguagens, Códigos e suas Tecnologias',
  'Matemática': 'Matemática e suas Tecnologias',
};

/** Texto sem acento, minúsculo e com espaços simples — para comparar valores digitados à mão. */
function norm(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const DISCIPLINE_ALIASES: Array<[string[], DisciplineType]> = [
  [['fisica'], 'Física'],
  [['quimica'], 'Química'],
  [['biologia'], 'Biologia'],
  [['historia'], 'História'],
  [['geografia'], 'Geografia'],
  [['filosofia e sociologia', 'filosofia', 'sociologia'], 'Filosofia e Sociologia'],
  [
    ['lingua portuguesa e literatura', 'lingua portuguesa', 'portugues', 'literatura'],
    'Língua Portuguesa e Literatura',
  ],
  [
    ['lingua estrangeira (ingles/espanhol)', 'lingua estrangeira', 'ingles', 'espanhol'],
    'Língua Estrangeira (Inglês/Espanhol)',
  ],
  [['matematica'], 'Matemática'],
];

function parseDiscipline(value: string): DisciplineType | null {
  const key = norm(value);
  for (const [aliases, discipline] of DISCIPLINE_ALIASES) {
    if (aliases.includes(key)) return discipline;
  }
  return null;
}

function parseDifficulty(value: string): Question['difficultyLevel'] | null {
  const key = norm(value);
  if (key === '') return 'Médio';
  if (key === 'facil') return 'Fácil';
  if (key === 'medio') return 'Médio';
  if (key === 'dificil') return 'Difícil';
  return null;
}

/** Normaliza o nome de uma coluna: "Alternativa A" -> "alternativa_a". */
function normKey(key: string): string {
  return norm(key).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

function detectDelimiter(headerLine: string): string {
  const counts: Array<[string, number]> = [';', ',', '\t'].map((d) => [d, headerLine.split(d).length - 1]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ';';
}

/** Leitor de CSV (RFC 4180): aspas, aspas duplicadas e quebras de linha dentro de células. */
export function parseCsv(content: string): string[][] {
  const text = content.replace(/^\uFEFF/, '');
  const firstLine = text.split(/\r\n|\n|\r/, 1)[0] ?? '';
  const delimiter = detectDelimiter(firstLine);

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function csvToRows(content: string): { rows: RawRow[]; lineNumbers: number[] } {
  const table = parseCsv(content);
  if (table.length === 0) return { rows: [], lineNumbers: [] };

  const header = table[0].map(normKey);
  const rows: RawRow[] = [];
  const lineNumbers: number[] = [];

  for (let r = 1; r < table.length; r++) {
    const cells = table[r];
    if (cells.every((c) => c.trim() === '')) continue;
    const obj: RawRow = {};
    header.forEach((key, idx) => {
      if (key) obj[key] = (cells[idx] ?? '').trim();
    });
    rows.push(obj);
    lineNumbers.push(r + 1);
  }

  return { rows, lineNumbers };
}

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

function stringify(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function jsonItemToRow(item: unknown): RawRow | null {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const source = item as Record<string, unknown>;
  const obj: RawRow = {};

  for (const [key, value] of Object.entries(source)) {
    const k = normKey(key);
    if (k === 'alternativas') continue;
    obj[k] = stringify(value);
  }

  const alts = source[Object.keys(source).find((k) => normKey(k) === 'alternativas') ?? ''];
  if (Array.isArray(alts)) {
    alts.slice(0, 5).forEach((text, idx) => {
      obj[`alternativa_${'abcde'[idx]}`] = stringify(text);
    });
  } else if (alts && typeof alts === 'object') {
    for (const [letter, text] of Object.entries(alts as Record<string, unknown>)) {
      const l = norm(letter);
      if (l.length === 1 && 'abcde'.includes(l)) obj[`alternativa_${l}`] = stringify(text);
    }
  }

  return obj;
}

function jsonToRows(content: string): { rows: RawRow[]; lineNumbers: number[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content.replace(/^\uFEFF/, ''));
  } catch (e: any) {
    throw new Error(`O arquivo não é um JSON válido (${e?.message || 'erro de sintaxe'}).`);
  }

  let list: unknown = parsed;
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const holder = parsed as Record<string, unknown>;
    list = holder.questoes ?? holder.questões ?? holder.questions;
  }
  if (!Array.isArray(list)) {
    throw new Error('Formato inválido: o JSON deve ser uma lista de questões ou um objeto com a chave "questoes".');
  }

  const rows: RawRow[] = [];
  const lineNumbers: number[] = [];
  list.forEach((item, idx) => {
    const row = jsonItemToRow(item);
    rows.push(row ?? {});
    lineNumbers.push(idx + 1);
  });
  return { rows, lineNumbers };
}

// ---------------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------------

function hashString(value: string): string {
  let h = 5381;
  for (let i = 0; i < value.length; i++) {
    h = ((h << 5) + h + value.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

function rowToQuestion(row: RawRow): { question?: Question; error?: string } {
  const get = (key: string) => (row[key] ?? '').trim();

  const vestibular = EXAMS.find((e) => e === get('vestibular').toUpperCase());
  if (!vestibular) {
    return { error: `vestibular inválido ("${get('vestibular')}"). Use: ${EXAMS.join(', ')}.` };
  }

  const year = Number(get('ano'));
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    return { error: `ano inválido ("${get('ano')}"). Use um número como 2023.` };
  }

  const discipline = parseDiscipline(get('disciplina'));
  if (!discipline) {
    return { error: `disciplina inválida ("${get('disciplina')}"). Veja a lista de disciplinas aceitas.` };
  }

  const topic = get('conteudo');
  if (!topic) return { error: 'o campo "conteudo" está vazio.' };

  const statement = get('enunciado');
  if (!statement) return { error: 'o campo "enunciado" está vazio.' };

  // Alternativas: A, B, C... em sequência, sem buracos
  const alternatives: Question['alternatives'] = [];
  let gap = false;
  for (const letter of LETTERS) {
    const text = get(`alternativa_${letter.toLowerCase()}`);
    if (text === '') {
      gap = true;
      continue;
    }
    if (gap) {
      return { error: `alternativa ${letter} preenchida, mas uma alternativa anterior está vazia.` };
    }
    alternatives.push({ id: letter, text });
  }
  if (alternatives.length < 2) {
    return { error: 'preencha pelo menos as alternativas A e B.' };
  }

  const gabaritoRaw = get('gabarito').replace(/[^a-zA-Z]/g, '').toUpperCase();
  const gabarito = LETTERS.find((l) => l === gabaritoRaw);
  if (!gabarito) {
    return { error: `gabarito inválido ("${get('gabarito')}"). Use uma letra de A a E.` };
  }
  if (!alternatives.some((a) => a.id === gabarito)) {
    return { error: `o gabarito ${gabarito} não corresponde a nenhuma alternativa preenchida.` };
  }

  const difficulty = parseDifficulty(get('dificuldade'));
  if (!difficulty) {
    return { error: `dificuldade inválida ("${get('dificuldade')}"). Use Fácil, Médio ou Difícil (ou deixe vazio).` };
  }

  const idSeed = [vestibular, year, statement, alternatives.map((a) => a.text).join('|')].join('::');

  const question: Question = {
    id: `user-${hashString(idSeed)}`,
    vestibular,
    year,
    ...(get('edicao') ? { edition: get('edicao') } : {}),
    area: DISCIPLINE_AREA[discipline],
    discipline,
    topic,
    ...(get('subconteudo') ? { subtopic: get('subconteudo') } : {}),
    statement,
    ...(get('texto_apoio') ? { contextSnippet: get('texto_apoio') } : {}),
    alternatives,
    correctAlternative: gabarito,
    explanation: get('resolucao'),
    difficultyLevel: difficulty,
    ...(get('fonte_url') ? { sourceUrl: get('fonte_url') } : {}),
  };

  return { question };
}

/** Lê o conteúdo de um arquivo .json ou .csv e devolve as questões válidas e os erros por linha. */
export function parseQuestionFile(fileName: string, content: string): ImportResult {
  const lowerName = fileName.toLowerCase();
  const trimmed = content.replace(/^\uFEFF/, '').trimStart();
  const isJson = lowerName.endsWith('.json') || (!lowerName.endsWith('.csv') && /^[[{]/.test(trimmed));

  if (trimmed === '') {
    throw new Error('O arquivo está vazio.');
  }

  const { rows, lineNumbers } = isJson ? jsonToRows(content) : csvToRows(content);

  if (rows.length === 0) {
    throw new Error('Nenhuma questão encontrada no arquivo.');
  }

  const questions: Question[] = [];
  const errors: ImportError[] = [];
  const seenIds = new Set<string>();

  rows.forEach((row, idx) => {
    const { question, error } = rowToQuestion(row);
    if (error || !question) {
      errors.push({ row: lineNumbers[idx], message: error || 'questão inválida.' });
      return;
    }
    if (seenIds.has(question.id)) {
      errors.push({ row: lineNumbers[idx], message: 'questão repetida dentro do próprio arquivo (ignorada).' });
      return;
    }
    seenIds.add(question.id);
    questions.push(question);
  });

  return { questions, errors, totalRows: rows.length };
}

// ---------------------------------------------------------------------------
// Modelos para download
// ---------------------------------------------------------------------------

export const IMPORT_FIELD_GUIDE: Array<{ field: string; required: boolean; description: string }> = [
  { field: 'vestibular', required: true, description: 'ENEM, UERJ, FUVEST, UNICAMP ou CONCURSOS.' },
  { field: 'ano', required: true, description: 'Ano da prova, ex.: 2023.' },
  { field: 'edicao', required: false, description: 'Ex.: "1º Exame de Qualificação" ou "Aplicação Regular".' },
  {
    field: 'disciplina',
    required: true,
    description:
      'Física, Química, Biologia, História, Geografia, Filosofia e Sociologia, Língua Portuguesa e Literatura, Língua Estrangeira (Inglês/Espanhol) ou Matemática. A área de conhecimento é preenchida automaticamente.',
  },
  { field: 'conteudo', required: true, description: 'Conteúdo específico, ex.: "Eletrodinâmica".' },
  { field: 'subconteudo', required: false, description: 'Detalhe do conteúdo (opcional).' },
  { field: 'texto_apoio', required: false, description: 'Texto curto exibido em destaque antes do enunciado (opcional).' },
  {
    field: 'enunciado',
    required: true,
    description:
      'Texto da questão. Quebras de linha viram parágrafos e o ÚLTIMO parágrafo é tratado como a pergunta (fica em negrito). Imagens: ![descrição](https://link-da-imagem.png). Itálico: *texto*.',
  },
  { field: 'alternativa_a … alternativa_e', required: true, description: 'Mínimo A e B; preencha em sequência (a E é opcional).' },
  { field: 'gabarito', required: true, description: 'Letra da alternativa correta (A a E).' },
  { field: 'resolucao', required: false, description: 'Resolução comentada. Se ficar vazia, você pode adicioná-la depois no próprio app.' },
  { field: 'dificuldade', required: false, description: 'Fácil, Médio ou Difícil (padrão: Médio).' },
  { field: 'fonte_url', required: false, description: 'Link da fonte da questão (opcional).' },
];

const TEMPLATE_ROWS: RawRow[] = [
  {
    vestibular: 'ENEM',
    ano: '2023',
    edicao: 'Aplicação Regular',
    disciplina: 'Física',
    conteudo: 'Eletrodinâmica',
    subconteudo: 'Potência elétrica',
    texto_apoio: '',
    enunciado:
      'Uma lâmpada incandescente de 60 W é substituída por uma lâmpada de LED de 9 W, ambas ligadas 5 horas por dia.\nQual é a economia de energia, em kWh, ao longo de 30 dias?',
    alternativa_a: '7,65',
    alternativa_b: '9,00',
    alternativa_c: '15,30',
    alternativa_d: '76,50',
    alternativa_e: '90,00',
    gabarito: 'A',
    resolucao:
      'A diferença de potência é 60 W − 9 W = 51 W = 0,051 kW.\nO tempo total é 5 h × 30 dias = 150 h.\nA economia é 0,051 kW × 150 h = 7,65 kWh. Alternativa A.',
    dificuldade: 'Fácil',
    fonte_url: '',
  },
  {
    vestibular: 'UERJ',
    ano: '2022',
    edicao: 'Exame de Qualificação',
    disciplina: 'Matemática',
    conteudo: 'Probabilidade',
    subconteudo: '',
    texto_apoio: '',
    enunciado: 'Lançando-se um dado comum e honesto, qual é a probabilidade de sair um número par?',
    alternativa_a: '1/6',
    alternativa_b: '1/3',
    alternativa_c: '1/2',
    alternativa_d: '2/3',
    alternativa_e: '',
    gabarito: 'C',
    resolucao: '',
    dificuldade: '',
    fonte_url: '',
  },
];

const TEMPLATE_COLUMNS = [
  'vestibular',
  'ano',
  'edicao',
  'disciplina',
  'conteudo',
  'subconteudo',
  'texto_apoio',
  'enunciado',
  'alternativa_a',
  'alternativa_b',
  'alternativa_c',
  'alternativa_d',
  'alternativa_e',
  'gabarito',
  'resolucao',
  'dificuldade',
  'fonte_url',
];

/** Modelo JSON: objeto com instruções + exemplos. As alternativas ficam agrupadas em "alternativas". */
export function buildJsonTemplate(): string {
  const questoes = TEMPLATE_ROWS.map((row) => {
    const { alternativa_a, alternativa_b, alternativa_c, alternativa_d, alternativa_e, ...rest } = row;
    const alternativas: Record<string, string> = {
      A: alternativa_a,
      B: alternativa_b,
      C: alternativa_c,
      D: alternativa_d,
    };
    if (alternativa_e) alternativas.E = alternativa_e;
    return {
      vestibular: rest.vestibular,
      ano: Number(rest.ano),
      edicao: rest.edicao,
      disciplina: rest.disciplina,
      conteudo: rest.conteudo,
      subconteudo: rest.subconteudo,
      texto_apoio: rest.texto_apoio,
      enunciado: rest.enunciado,
      alternativas,
      gabarito: rest.gabarito,
      resolucao: rest.resolucao,
      dificuldade: rest.dificuldade,
      fonte_url: rest.fonte_url,
    };
  });

  return JSON.stringify(
    {
      instrucoes: [
        'Modelo de banco de questões do Vestibulando Neo. Apague os 2 exemplos e coloque as suas questões na lista "questoes".',
        'Obrigatórios: vestibular, ano, disciplina, conteudo, enunciado, alternativas (mínimo A e B) e gabarito. Os demais campos podem ficar vazios.',
        'vestibular: ENEM, UERJ, FUVEST, UNICAMP ou CONCURSOS.',
        'disciplina: Física, Química, Biologia, História, Geografia, Filosofia e Sociologia, Língua Portuguesa e Literatura, Língua Estrangeira (Inglês/Espanhol) ou Matemática.',
        'enunciado: use \\n para separar parágrafos; o último parágrafo é tratado como a pergunta. Imagens: ![descrição](https://link.png).',
        'gabarito: letra da alternativa correta (A a E). dificuldade: Fácil, Médio ou Difícil.',
      ],
      questoes,
    },
    null,
    2
  );
}

function csvCell(value: string): string {
  return /[;"\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Modelo CSV (separador ";" e BOM UTF-8, para abrir direto no Excel em português). */
export function buildCsvTemplate(): string {
  const lines = [TEMPLATE_COLUMNS.join(';')];
  for (const row of TEMPLATE_ROWS) {
    lines.push(TEMPLATE_COLUMNS.map((col) => csvCell(row[col] ?? '')).join(';'));
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
