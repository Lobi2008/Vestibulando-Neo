/**
 * @file src/utils/questionClipboard.ts
 * @description Monta o texto "bem formatado" para copiar o enunciado + alternativas e a resolução
 * de uma questão. Gera duas versões: texto puro (colar em qualquer lugar) e HTML (colar em Word,
 * Google Docs etc. mantendo negrito, itálico e imagens).
 */

import { parseRichText } from './richText.ts';
import type { InlineNode } from './richText.ts';
import type { Question } from '../types/index.ts';

export interface ClipboardPayload {
  text: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineToText(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case 'text':
          return node.value;
        case 'image':
          return `[Imagem: ${node.src}]`;
        case 'link': {
          const label = inlineToText(node.children);
          return label === node.href ? label : `${label} (${node.href})`;
        }
        case 'sup': {
          const inner = inlineToText(node.children);
          return inner.length === 1 ? `^${inner}` : `^(${inner})`;
        }
        case 'sub': {
          const inner = inlineToText(node.children);
          return inner.length === 1 ? `_${inner}` : `_(${inner})`;
        }
        default:
          return inlineToText(node.children);
      }
    })
    .join('');
}

function inlineToHtml(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case 'text':
          return escapeHtml(node.value);
        case 'bold':
          return `<strong>${inlineToHtml(node.children)}</strong>`;
        case 'italic':
          return `<em>${inlineToHtml(node.children)}</em>`;
        case 'underline':
          return `<u>${inlineToHtml(node.children)}</u>`;
        case 'sup':
          return `<sup>${inlineToHtml(node.children)}</sup>`;
        case 'sub':
          return `<sub>${inlineToHtml(node.children)}</sub>`;
        case 'image':
          return `<img src="${escapeHtml(node.src)}" alt="${escapeHtml(node.alt)}" style="max-width:100%">`;
        case 'link':
          return `<a href="${escapeHtml(node.href)}">${inlineToHtml(node.children)}</a>`;
        default:
          return '';
      }
    })
    .join('');
}

/** Cada parágrafo do texto bruto vira uma string de texto puro. */
export function toPlainParagraphs(raw: string | null | undefined): string[] {
  return parseRichText(raw).map((paragraph) => inlineToText(paragraph));
}

function toHtmlParagraphs(raw: string | null | undefined): string[] {
  return parseRichText(raw).map((paragraph) => `<p>${inlineToHtml(paragraph)}</p>`);
}

function headerLines(question: Question): string[] {
  const exam = `${question.vestibular} ${question.year}${question.edition ? ` — ${question.edition}` : ''}`;
  const subject = `${question.discipline} › ${question.topic}`;
  return [exam, subject];
}

/**
 * Enunciado (texto de apoio + comando) e alternativas, prontos para colar.
 * `contextText` e `questionPrompt` são os mesmos trechos exibidos no card.
 */
export function buildQuestionClipboard(
  question: Question,
  parts: { contextText: string; questionPrompt: string }
): ClipboardPayload {
  const [exam, subject] = headerLines(question);

  const bodyRaw = [question.contextSnippet, parts.contextText, parts.questionPrompt].filter(
    (value): value is string => !!value && value.trim().length > 0
  );

  const textBlocks: string[] = [`${exam}\n${subject}`];
  const htmlBlocks: string[] = [`<p><strong>${escapeHtml(exam)}</strong><br>${escapeHtml(subject)}</p>`];

  for (const raw of bodyRaw) {
    textBlocks.push(toPlainParagraphs(raw).join('\n\n'));
    htmlBlocks.push(...toHtmlParagraphs(raw));
  }

  const altText: string[] = [];
  const altHtml: string[] = [];
  for (const alt of question.alternatives) {
    const paragraphs = toPlainParagraphs(alt.text);
    const first = paragraphs[0] ?? '';
    const rest = paragraphs.slice(1).map((p) => `   ${p}`);
    altText.push([`${alt.id}) ${first}`, ...rest].join('\n'));
    altHtml.push(`<p><strong>${alt.id})</strong> ${parseRichText(alt.text).map(inlineToHtml).join('<br>')}</p>`);
  }
  if (altText.length > 0) {
    textBlocks.push(altText.join('\n'));
    htmlBlocks.push(...altHtml);
  }

  return { text: textBlocks.join('\n\n'), html: htmlBlocks.join('') };
}

/** Gabarito + resolução comentada, prontos para colar. */
export function buildResolutionClipboard(question: Question): ClipboardPayload {
  const [exam, subject] = headerLines(question);
  const title = `Resolução — ${exam}`;
  const gabarito = `Gabarito: Alternativa ${question.correctAlternative}`;
  const paragraphs = toPlainParagraphs(question.explanation);

  const text = [`${title}\n${subject}`, gabarito, paragraphs.join('\n\n')]
    .filter((block) => block.trim().length > 0)
    .join('\n\n');

  const html =
    `<p><strong>${escapeHtml(title)}</strong><br>${escapeHtml(subject)}</p>` +
    `<p><strong>${escapeHtml(gabarito)}</strong></p>` +
    toHtmlParagraphs(question.explanation).join('');

  return { text, html };
}

/** Copia texto + HTML para a área de transferência, com alternativas caso o navegador bloqueie. */
export async function copyToClipboard(payload: ClipboardPayload): Promise<boolean> {
  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.write === 'function' &&
      typeof ClipboardItem !== 'undefined'
    ) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([payload.text], { type: 'text/plain' }),
          'text/html': new Blob([payload.html], { type: 'text/html' }),
        }),
      ]);
      return true;
    }
  } catch {
    // segue para as alternativas
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(payload.text);
      return true;
    }
  } catch {
    // segue para a alternativa final
  }

  try {
    const area = document.createElement('textarea');
    area.value = payload.text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
