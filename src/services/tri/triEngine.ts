/**
 * @file src/services/tri/triEngine.ts
 * @description Motor de cálculo de notas para vestibulares.
 * Contém a implementação da Teoria de Resposta ao Item (TRI) com o Modelo Logístico
 * de 3 Parâmetros (3PL) e estimador Bayesiano EAP (Expected A Posteriori) para o ENEM,
 * além do cálculo do Exame de Qualificação clássico da UERJ com atribuição de conceitos.
 */

import type { TriParameters, UerjScoreResult, EnemTriResult } from '../../types/index.ts';

/** Fator de escala padrão do modelo logístico (INEP utiliza D = 1.0 ou D = 1.7) */
const LOGISTIC_SCALE_D = 1.0;

/** Média e desvio padrão oficiais da escala ENEM */
export const ENEM_SCALE_MEAN = 500;
export const ENEM_SCALE_SD = 100;
export const ENEM_MIN_SCORE = 200;
export const ENEM_MAX_SCORE = 1000;

/**
 * Calcula a probabilidade de acerto de um item sob o modelo 3PL:
 * P(theta) = c + (1 - c) / (1 + exp(-D * a * (theta - b)))
 *
 * @param theta - Nível de proficiência do estudante (escala padrão -3 a +3)
 * @param params - Parâmetros do item (a: discriminação, b: dificuldade, c: acerto casual)
 * @returns Probabilidade de acerto entre 0 e 1
 */
export function calculateProbability3PL(theta: number, params: TriParameters): number {
  const { a, b, c } = params;
  const exponent = -LOGISTIC_SCALE_D * a * (theta - b);
  
  // Proteção contra overflow exponencial
  if (exponent > 40) return c;
  if (exponent < -40) return 1.0;

  const logistic = 1.0 / (1.0 + Math.exp(exponent));
  return c + (1.0 - c) * logistic;
}

/**
 * Avalia o logaritmo da verossimilhança de um padrão de respostas dado um teta.
 *
 * @param theta - Proficiência
 * @param items - Lista de itens com seus parâmetros e se o usuário acertou
 */
export function calculateLogLikelihood(
  theta: number, 
  items: Array<{ params: TriParameters; isCorrect: boolean }>
): number {
  let logLikelihood = 0;

  for (const item of items) {
    const p = calculateProbability3PL(theta, item.params);
    const clampedP = Math.max(1e-12, Math.min(1 - 1e-12, p));
    if (item.isCorrect) {
      logLikelihood += Math.log(clampedP);
    } else {
      logLikelihood += Math.log(1.0 - clampedP);
    }
  }

  return logLikelihood;
}

/**
 * Função de densidade da distribuição Normal Padrão N(0, 1) usada como prior Bayesiano
 */
function standardNormalPdf(x: number): number {
  return (1.0 / Math.sqrt(2.0 * Math.PI)) * Math.exp(-0.5 * x * x);
}

/**
 * Estima a proficiência (teta) do estudante pelo método EAP (Expected A Posteriori) com quadratura de Gauss.
 * Este é o algoritmo de referência do ENEM para atribuir notas coerentes.
 *
 * @param items - Respostas do candidato contendo os parâmetros TRI de cada item
 * @returns EnemTriResult contendo o teta, a nota na escala ENEM (0-1000) e erro padrão
 */
export function estimateEnemTri(
  items: Array<{ params: TriParameters; isCorrect: boolean }>
): EnemTriResult {
  if (items.length === 0) {
    return {
      theta: 0,
      enemScore: ENEM_SCALE_MEAN,
      standardError: 1.0,
      coherenceScore: 100,
    };
  }

  // Pontos de quadratura numérica entre -4.0 e +4.0 em passos de 0.1
  const step = 0.1;
  const minTheta = -4.0;
  const maxTheta = 4.0;

  // Para evitar subflow numérico ao multiplicar probabilidades muito pequenas,
  // normalizamos pela maior verossimilhança encontrada
  let maxLogLikelihood = -Infinity;
  const thetas: number[] = [];
  const logLikelihoods: number[] = [];

  for (let th = minTheta; th <= maxTheta; th += step) {
    thetas.push(th);
    const ll = calculateLogLikelihood(th, items);
    logLikelihoods.push(ll);
    if (ll > maxLogLikelihood) {
      maxLogLikelihood = ll;
    }
  }

  let numerator = 0;
  let denominator = 0;
  let varianceNumerator = 0;

  // Integração numérica do numerador e denominador do EAP
  for (let i = 0; i < thetas.length; i++) {
    const th = thetas[i];
    const prior = standardNormalPdf(th);
    // Verossimilhança reescalada para prevenir underflow
    const scaledLikelihood = Math.exp(logLikelihoods[i] - maxLogLikelihood);
    const weight = scaledLikelihood * prior * step;

    numerator += th * weight;
    denominator += weight;
  }

  const estimatedTheta = denominator > 0 ? numerator / denominator : 0;

  // Cálculo do erro padrão da estimativa (SE)
  for (let i = 0; i < thetas.length; i++) {
    const th = thetas[i];
    const prior = standardNormalPdf(th);
    const scaledLikelihood = Math.exp(logLikelihoods[i] - maxLogLikelihood);
    const weight = scaledLikelihood * prior * step;
    varianceNumerator += Math.pow(th - estimatedTheta, 2) * weight;
  }

  const posteriorVariance = denominator > 0 ? varianceNumerator / denominator : 1.0;
  const standardError = Math.sqrt(posteriorVariance);

  // Conversão para a escala ENEM oficial (Média 500, Desvio Padrão 100)
  let rawScore = ENEM_SCALE_MEAN + (estimatedTheta * ENEM_SCALE_SD);
  
  // Limites pedagógicos da escala ENEM
  rawScore = Math.max(ENEM_MIN_SCORE, Math.min(ENEM_MAX_SCORE, Math.round(rawScore * 10) / 10));

  // Coerência pedagógica: penaliza acertos em questões difíceis acompanhados de erros em fáceis
  const coherenceScore = calculateCoherenceIndex(items);

  return {
    theta: Math.round(estimatedTheta * 100) / 100,
    enemScore: rawScore,
    standardError: Math.round(standardError * 100) / 100,
    coherenceScore,
  };
}

/**
 * Calcula o índice de coerência pedagógica das respostas do candidato (0% a 100%).
 * Na TRI do ENEM, um candidato coerente acerta as fáceis, parte das médias e erra as difíceis.
 * O chute é detectado quando erra questões fáceis e acerta difíceis (curva invertida).
 */
export function calculateCoherenceIndex(
  items: Array<{ params: TriParameters; isCorrect: boolean }>
): number {
  if (items.length < 2) return 100;

  const sortedByDifficulty = [...items].sort((a, b) => a.params.b - b.params.b);
  let concordantPairs = 0;
  let discordantPairs = 0;

  for (let i = 0; i < sortedByDifficulty.length; i++) {
    for (let j = i + 1; j < sortedByDifficulty.length; j++) {
      const easier = sortedByDifficulty[i];
      const harder = sortedByDifficulty[j];

      // Se a mais fácil foi acertada e a mais difícil errada (ou ambas iguais), coerência mantida
      if (easier.isCorrect && !harder.isCorrect) {
        concordantPairs++;
      } else if (!easier.isCorrect && harder.isCorrect) {
        discordantPairs++; // Inversão pedagógica clássica de chute
      }
    }
  }

  const totalPairs = concordantPairs + discordantPairs;
  if (totalPairs === 0) return 100;

  const ratio = concordantPairs / totalPairs;
  return Math.round(ratio * 100);
}

/**
 * Calcula a pontuação e conceito clássico do Exame de Qualificação da UERJ.
 * Critérios oficiais UERJ:
 * - A: >= 70% de acertos (+20 pontos bônus na 2ª fase)
 * - B: 60% a 69.9% de acertos (+15 pontos)
 * - C: 50% a 59.9% de acertos (+10 pontos)
 * - D: 40% a 49.9% de acertos (+5 pontos)
 * - Reprovado: < 40% de acertos (0 pontos)
 *
 * @param correctCount - Número de acertos
 * @param totalQuestions - Total de questões avaliadas (padrão oficial 60)
 */
export function calculateUerjScore(
  correctCount: number, 
  totalQuestions: number = 60
): UerjScoreResult {
  if (totalQuestions <= 0) {
    return {
      totalQuestions: 0,
      correctCount: 0,
      percentage: 0,
      concept: 'Reprovado',
      bonusPoints: 0,
    };
  }

  const percentage = Math.round((correctCount / totalQuestions) * 1000) / 10;

  let concept: 'A' | 'B' | 'C' | 'D' | 'Reprovado';
  let bonusPoints: number;

  if (percentage >= 70.0) {
    concept = 'A';
    bonusPoints = 20;
  } else if (percentage >= 60.0) {
    concept = 'B';
    bonusPoints = 15;
  } else if (percentage >= 50.0) {
    concept = 'C';
    bonusPoints = 10;
  } else if (percentage >= 40.0) {
    concept = 'D';
    bonusPoints = 5;
  } else {
    concept = 'Reprovado';
    bonusPoints = 0;
  }

  return {
    totalQuestions,
    correctCount,
    percentage,
    concept,
    bonusPoints,
  };
}
