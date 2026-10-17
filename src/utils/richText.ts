/**
 * @file src/utils/richText.ts
 * @description Interpretador leve do texto vindo das APIs de questões (markdown simplificado
 * + algumas tags HTML). Converte o texto bruto em uma árvore de nós que o componente
 * `RichText` renderiza: parágrafos, imagens, itálico, negrito, links, sobrescrito e subscrito.
 */

export type InlineNode =
  | { type: 'text'; value: string }
  | { type: 'bold' | 'italic' | 'underline' | 'sup' | 'sub'; children: InlineNode[] }
  | { type: 'image'; src: string; alt: string }
  | { type: 'link'; href: string; children: InlineNode[] };

/** Um parágrafo é uma lista de nós inline. */
export type Paragraph = InlineNode[];

const IMAGE_URL_REGEX = /\.(?:png|jpe?g|gif|webp|svg|bmp|avif)(?:[?#][^\s]*)?$/i;

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: '\u00A0',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const num = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(num) && num > 0 && num <= 0x10ffff ? String.fromCodePoint(num) : match;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? match;
  });
}

/**
 * Grupos de captura:
 *  1 alt da imagem   2 url da imagem        ![alt](url)
 *  3 texto do link   4 url do link          [texto](url)
 *  5 negrito **x**   6 negrito __x__
 *  7 itálico *x*     8 itálico _x_
 *  9 tag HTML        10 conteúdo da tag     <i>x</i>, <b>x</b>, <sup>x</sup>...
 * 11 URL solta (http/https)
 */
const INLINE_REGEX = new RegExp(
  [
    String.raw`!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)`,
    String.raw`\[([^\]]+)\]\(\s*([^)\s]+)\s*\)`,
    String.raw`\*\*(?=\S)([\s\S]+?)(?<=\S)\*\*`,
    String.raw`__(?=\S)([\s\S]+?)(?<=\S)__`,
    String.raw`(?<![\p{L}\p{N}_*])\*(?=[^\s*])([^*\n]+?)(?<=[^\s*])\*(?![\p{L}\p{N}*])`,
    String.raw`(?<![\p{L}\p{N}_])_(?=[^\s_])([^_\n]+?)(?<=[^\s_])_(?![\p{L}\p{N}_])`,
    String.raw`<(i|em|b|strong|u|sup|sub)>([\s\S]+?)<\/\9>`,
    String.raw`(https?:\/\/[^\s<>]+)`,
  ].join('|'),
  'giu'
);

const TAG_TO_TYPE: Record<string, 'bold' | 'italic' | 'underline' | 'sup' | 'sub'> = {
  i: 'italic',
  em: 'italic',
  b: 'bold',
  strong: 'bold',
  u: 'underline',
  sup: 'sup',
  sub: 'sub',
};

function pushText(nodes: InlineNode[], value: string) {
  if (!value) return;
  const decoded = decodeEntities(value);
  const last = nodes[nodes.length - 1];
  if (last && last.type === 'text') {
    last.value += decoded;
  } else {
    nodes.push({ type: 'text', value: decoded });
  }
}

function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  // Regex nova por chamada: o estado `lastIndex` não pode ser compartilhado entre chamadas recursivas.
  const regex = new RegExp(INLINE_REGEX.source, INLINE_REGEX.flags);
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    pushText(nodes, text.slice(cursor, match.index));
    cursor = match.index + match[0].length;

    if (match[2] !== undefined) {
      nodes.push({ type: 'image', src: match[2], alt: decodeEntities(match[1] || '') });
    } else if (match[4] !== undefined) {
      nodes.push({ type: 'link', href: match[4], children: parseInline(match[3]) });
    } else if (match[5] !== undefined || match[6] !== undefined) {
      nodes.push({ type: 'bold', children: parseInline(match[5] ?? match[6]) });
    } else if (match[7] !== undefined || match[8] !== undefined) {
      nodes.push({ type: 'italic', children: parseInline(match[7] ?? match[8]) });
    } else if (match[9] !== undefined) {
      nodes.push({ type: TAG_TO_TYPE[match[9].toLowerCase()], children: parseInline(match[10]) });
    } else if (match[11] !== undefined) {
      // Pontuação final colada na URL não faz parte do endereço
      const raw = match[11];
      const trimmed = raw.replace(/[.,;:!?)\]'"]+$/, '');
      const trailing = raw.slice(trimmed.length);
      if (IMAGE_URL_REGEX.test(trimmed)) {
        nodes.push({ type: 'image', src: trimmed, alt: '' });
      } else {
        nodes.push({ type: 'link', href: trimmed, children: [{ type: 'text', value: trimmed }] });
      }
      pushText(nodes, trailing);
    }
  }

  pushText(nodes, text.slice(cursor));
  return nodes;
}

/** Converte o texto bruto em parágrafos (cada quebra de linha vira um novo parágrafo). */
export function parseRichText(raw: string | null | undefined): Paragraph[] {
  if (raw === null || raw === undefined) return [];

  const normalized = String(raw)
    .replace(/\r\n?/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?p(?:\s[^>]*)?>/gi, '\n');

  return normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => parseInline(line))
    .filter((paragraph) => paragraph.length > 0);
}

function inlineToPlain(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === 'text') return node.value;
      if (node.type === 'image') return '[imagem]';
      return inlineToPlain(node.children);
    })
    .join('');
}

/** Versão em texto puro (sem marcações), útil para prévias de uma ou duas linhas. */
export function richTextToPlain(raw: string | null | undefined): string {
  return parseRichText(raw)
    .map((paragraph) => inlineToPlain(paragraph))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
