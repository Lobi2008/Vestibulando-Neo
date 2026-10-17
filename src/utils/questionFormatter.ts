/**
 * @file src/utils/questionFormatter.ts
 * @description Utilitários de formatação de enunciados e perguntas de questões.
 * Regras:
 * 1. Coloca em negrito a pergunta principal (comando) da questão.
 * 2. Para questões do ENEM cuja pergunta final não terminar com "?" e não possuir ":",
 *    adiciona automaticamente o caractere ":" ao final.
 */

export interface FormattedStatement {
  contextText: string;
  questionPrompt: string;
}

/**
 * Normaliza e formata a pergunta final da questão conforme as regras do ENEM.
 */
export function formatQuestionPrompt(prompt: string, vestibular?: string): string {
  let cleaned = (prompt || '').trim();
  if (!cleaned) return '';

  // Se for ENEM e não terminar com '?' e não possuir ':', adiciona ':'
  const isEnem = (vestibular || '').toUpperCase().includes('ENEM');
  if (isEnem) {
    if (!cleaned.endsWith('?') && !cleaned.includes(':')) {
      // Remove pontuação solta como ponto final antes de acrescentar dois pontos
      if (cleaned.endsWith('.')) {
        cleaned = cleaned.slice(0, -1).trim();
      }
      cleaned = `${cleaned}:`;
    }
  }

  return cleaned;
}

/**
 * Divide o enunciado em texto-base (contexto) e pergunta principal (comando).
 * Caso não haja quebra explícita de parágrafo, detecta a última frase/oração como o comando.
 */
export function splitStatementAndPrompt(
  statement: string,
  vestibular?: string
): FormattedStatement {
  const normalized = (statement || '').trim();
  if (!normalized) {
    return { contextText: '', questionPrompt: '' };
  }

  // Verifica se há parágrafos separados por quebra de linha
  const paragraphs = normalized.split(/\n+/).map((p) => p.trim()).filter(Boolean);

  if (paragraphs.length > 1) {
    // O último parágrafo é tipicamente o comando da questão
    const prompt = paragraphs[paragraphs.length - 1];
    const context = paragraphs.slice(0, paragraphs.length - 1).join('\n\n');
    return {
      contextText: context,
      questionPrompt: formatQuestionPrompt(prompt, vestibular),
    };
  }

  // Se for um único bloco longo, tenta separar a última oração interrogativa ou conjuntiva se fizer sentido
  // Se for curto ou indivisível, trata o bloco inteiro como a pergunta principal
  if (normalized.length <= 160) {
    return {
      contextText: '',
      questionPrompt: formatQuestionPrompt(normalized, vestibular),
    };
  }

  // Procura ponto final que antecede a pergunta clássica de vestibular ("Nesse contexto", "Com base", "A partir", "Considerando", etc.)
  const regex = /(?<=[.!?])\s+(?=(?:Considerando|Sabendo|Com base|A partir|Nesse contexto|Diante|O fenômeno|O processo|O trabalho|A quantidade|A intensidade|Nessas condições|De acordo|A alternativa|Nesse sentido|Em relação|Qual|Para que|O valor|O resultado)[^.!?]*$)/i;
  const match = normalized.split(regex);

  if (match.length >= 2) {
    const context = match.slice(0, match.length - 1).join(' ').trim();
    const prompt = match[match.length - 1].trim();
    return {
      contextText: context,
      questionPrompt: formatQuestionPrompt(prompt, vestibular),
    };
  }

  // Caso padrão: todo o texto como comando
  return {
    contextText: '',
    questionPrompt: formatQuestionPrompt(normalized, vestibular),
  };
}
