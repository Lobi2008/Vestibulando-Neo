/**
 * @file src/services/ingestion/questionSeed.ts
 * @description Banco robusto de questões enriquecido inicial para operação 100% offline imediata.
 * Cobre ENEM com parâmetros TRI (a, b, c), UERJ com estrutura de qualificação,
 * FUVEST, UNICAMP e Concursos Públicos (rodrigoborgesmachado/questoesConcursos),
 * categorizadas rigidamente na taxonomia: Vestibular -> Área -> Conteúdo Específico.
 */

import type { Question } from '../../types/index.ts';

export const INITIAL_QUESTION_SEED: Question[] = [
  // =========================================================================
  // 1. ENEM - FÍSICA - ELETRODINÂMICA
  // =========================================================================
  {
    id: 'enem-2023-fis-01',
    vestibular: 'ENEM',
    year: 2023,
    edition: 'Aplicação Regular',
    area: 'Ciências da Natureza e suas Tecnologias',
    discipline: 'Física',
    topic: 'Eletrodinâmica',
    subtopic: 'Consumo de Energia e Potência Elétrica',
    statement: 'Um circuito elétrico residencial é projetado para operar sob uma tensão de 127 V. Para economizar energia, um morador decide substituir uma lâmpada incandescente antiga de 60 W por uma lâmpada LED que fornece o mesmo fluxo luminoso, mas consome apenas 9 W. Considerando que ambas permanecem acesas durante 5 horas diárias ao longo de um mês de 30 dias, e sabendo que a tarifa de energia é de R$ 0,80 por kWh consumido, qual é a economia financeira mensal aproximada gerada por essa substituição?',
    contextSnippet: 'Eficiência energética e circuitos residenciais (ENEM 2023).',
    alternatives: [
      { id: 'A', text: 'R$ 6,12' },
      { id: 'B', text: 'R$ 7,65' },
      { id: 'C', text: 'R$ 15,30' },
      { id: 'D', text: 'R$ 61,20' },
      { id: 'E', text: 'R$ 76,50' },
    ],
    correctAlternative: 'A',
    explanation: `Passo a passo da resolução:
1. Variação de potência (ΔP): ΔP = 60 W - 9 W = 51 W = 0,051 kW.
2. Tempo total no mês: Δt = 5 h/dia × 30 dias = 150 h.
3. Economia de energia: ΔE = 0,051 kW × 150 h = 7,65 kWh.
4. Economia financeira: Custo = 7,65 kWh × R$ 0,80/kWh = R$ 6,12.
Portanto, a alternativa correta é a letra A.`,
    triParams: { a: 1.45, b: -0.42, c: 0.20 },
    difficultyLevel: 'Fácil',
    sourceUrl: 'https://enem.dev',
  },

  // =========================================================================
  // 2. ENEM - FÍSICA - ONDULATÓRIA / EFEITO DOPPLER
  // =========================================================================
  {
    id: 'enem-2022-fis-02',
    vestibular: 'ENEM',
    year: 2022,
    edition: 'Aplicação Regular',
    area: 'Ciências da Natureza e suas Tecnologias',
    discipline: 'Física',
    topic: 'Ondulatória',
    subtopic: 'Efeito Doppler e Frequência Aparente',
    statement: 'Uma ambulância trafega em uma via retilínea com velocidade constante emitindo um sinal sonoro de sirene com frequência própria de 800 Hz. Um pedestre parado na calçada percebe a frequência do som mudar à medida que o veículo se aproxima e, posteriormente, se afasta. Esse fenômeno ondulatório perceptível pelo pedestre é explicado pelo:',
    alternatives: [
      { id: 'A', text: 'aumento da amplitude da onda mecânica na aproximação e diminuição no afastamento.' },
      { id: 'B', text: 'Efeito Doppler, no qual o movimento relativo entre a fonte e o observador altera o comprimento de onda aparente percebido.' },
      { id: 'C', text: 'fenômeno da refração do som ao passar por camadas de ar com temperaturas desiguais.' },
      { id: 'D', text: 'batimento acústico gerado pela interferência destrutiva entre as ondas sonoras e o pavimento.' },
      { id: 'E', text: 'aumento da velocidade de propagação do som no ar quando a fonte emissora se move velozmente.' },
    ],
    correctAlternative: 'B',
    explanation: `O Efeito Doppler consiste na alteração da frequência aparente percebida pelo observador devido ao movimento relativo entre ele e a fonte sonora. Na aproximação, as frentes de onda se comprimem (menor comprimento de onda aparente, maior frequência/som mais agudo). No afastamento, o comprimento de onda aparente aumenta (menor frequência/som mais grave). A velocidade do som no meio depende apenas das propriedades do ar e permanece constante. Alternativa B.`,
    triParams: { a: 1.58, b: -0.10, c: 0.20 },
    difficultyLevel: 'Médio',
    sourceUrl: 'https://enem.dev',
  },

  // =========================================================================
  // 3. ENEM - BIOLOGIA - ECOLOGIA / BIOMAGNIFICAÇÃO
  // =========================================================================
  {
    id: 'enem-2023-bio-03',
    vestibular: 'ENEM',
    year: 2023,
    edition: 'Aplicação Regular',
    area: 'Ciências da Natureza e suas Tecnologias',
    discipline: 'Biologia',
    topic: 'Ecologia',
    subtopic: 'Biomagnificação Trófica e Poluição',
    statement: 'Compostos organoclorados e metais pesados como o metilmercúrio possuem alta estabilidade química e caráter lipofílico, sendo dificilmente metabolizados ou excretados pelos seres vivos. Ao entrarem em uma cadeia alimentar aquática (fitoplâncton → zooplâncton → peixes herbívoros → peixes carnívoros → aves piscívoras), a concentração dessas substâncias tóxicas:',
    alternatives: [
      { id: 'A', text: 'atinge o valor máximo nos produtores primários e dilui-se progressivamente ao longo dos níveis tróficos.' },
      { id: 'B', text: 'permanece constante e homogênea em todos os elos tróficos devido à homeostase celular.' },
      { id: 'C', text: 'acumula-se progressivamente, atingindo as maiores concentrações nos consumidores do topo da cadeia trófica.' },
      { id: 'D', text: 'é anulada pela ação bacteriana decompositora na coluna d’água antes de alcançar os peixes carnívoros.' },
      { id: 'E', text: 'restringe-se unicamente ao trato digestório dos peixes sem ser absorvida para a corrente sanguínea.' },
    ],
    correctAlternative: 'C',
    explanation: `O fenômeno é a biomagnificação trófica (ou magnificação trófica). Como esses poluentes não são biodegradáveis e são lipossolúveis, acumulam-se nos tecidos (bioacumulação). A cada transferência de energia na teia trófica, a concentração por unidade de biomassa aumenta, fazendo com que os carnívoros de topo (ex: aves piscívoras ou mamíferos marinhos) sofram as maiores doses tóxicas. Alternativa C.`,
    triParams: { a: 1.70, b: -0.35, c: 0.20 },
    difficultyLevel: 'Fácil',
    sourceUrl: 'https://enem.dev',
  },

  // =========================================================================
  // 4. ENEM - BIOLOGIA - GENÉTICA MENDELIANA
  // =========================================================================
  {
    id: 'enem-2022-bio-04',
    vestibular: 'ENEM',
    year: 2022,
    edition: 'Aplicação Regular',
    area: 'Ciências da Natureza e suas Tecnologias',
    discipline: 'Biologia',
    topic: 'Genética',
    subtopic: 'Primeira Lei de Mendel e Heredograma',
    statement: 'A fenilcetonúria (PKU) é uma doença metabólica autossômica recessiva causada pela mutação no gene da enzima fenilalanina hidroxilase. Um casal fenotipicamente normal tem um primeiro filho diagnosticado com a doença logo após o teste do pezinho. Sabendo disso, qual é a probabilidade de esse mesmo casal gerar uma segunda criança que seja do sexo feminino e não afetada pela fenilcetonúria?',
    alternatives: [
      { id: 'A', text: '1/8' },
      { id: 'B', text: '1/4' },
      { id: 'C', text: '3/8' },
      { id: 'D', text: '1/2' },
      { id: 'E', text: '3/4' },
    ],
    correctAlternative: 'C',
    explanation: `Resolução genética:
1. Como o casal é normal e gerou uma criança afetada (aa), ambos os pais são obrigatoriamente heterozigotos (Aa × Aa).
2. Probabilidade de a criança ser saudável (AA ou Aa): P(não afetado) = 3/4.
3. Probabilidade de ser do sexo feminino: P(menina) = 1/2.
4. Como são eventos independentes (Regra do 'E'):
   P(menina E saudável) = (3/4) × (1/2) = 3/8.
Alternativa C.`,
    triParams: { a: 1.82, b: 0.45, c: 0.20 },
    difficultyLevel: 'Médio',
    sourceUrl: 'https://enem.dev',
  },

  // =========================================================================
  // 5. ENEM - QUÍMICA - EQUILÍBRIO QUÍMICO / LE CHATELIER
  // =========================================================================
  {
    id: 'enem-2023-qui-05',
    vestibular: 'ENEM',
    year: 2023,
    edition: 'Aplicação Regular',
    area: 'Ciências da Natureza e suas Tecnologias',
    discipline: 'Química',
    topic: 'Físico-Química',
    subtopic: 'Princípio de Le Chatelier e Síntese de Haber-Bosch',
    statement: 'A síntese da amônia pelo processo Haber-Bosch ocorre de acordo com a equação exotérmica: N₂(g) + 3 H₂(g) ⇌ 2 NH₃(g), com ΔH = -92 kJ/mol. Para aumentar o rendimento na produção de amônia no equilíbrio, os engenheiros químicos industriais devem:',
    alternatives: [
      { id: 'A', text: 'aumentar a temperatura e diminuir a pressão do reator.' },
      { id: 'B', text: 'diminuir a pressão do reator e introduzir um gás nobre inerte sob volume constante.' },
      { id: 'C', text: 'aumentar a pressão do reator e operar em temperatura moderadamente baixa.' },
      { id: 'D', text: 'adicionar um catalisador metálico de ferro, o qual desloca a constante de equilíbrio para a direita.' },
      { id: 'E', text: 'remover continuamente os reagentes N₂ e H₂ do interior da câmara de combustão.' },
    ],
    correctAlternative: 'C',
    explanation: `Pelo Princípio de Le Chatelier:
1. Pressão: No lado dos reagentes há 1 + 3 = 4 mols gasosos; no lado do produto há 2 mols gasosos. O aumento da pressão desloca o equilíbrio para o sentido de menor volume (formação de NH₃).
2. Temperatura: Como a reação é exotérmica (ΔH < 0), a redução da temperatura favorece o sentido direto (exotérmico).
Portanto, elevar a pressão e resfriar relativamente deslocam o equilíbrio para a amônia. (Lembrando que o catalisador apenas reduz a energia de ativação e aumenta a velocidade, sem alterar o rendimento no equilíbrio). Alternativa C.`,
    triParams: { a: 1.65, b: 0.20, c: 0.20 },
    difficultyLevel: 'Médio',
    sourceUrl: 'https://enem.dev',
  },

  // =========================================================================
  // 6. ENEM - MATEMÁTICA - FUNÇÕES / LOGARITMOS
  // =========================================================================
  {
    id: 'enem-2022-mat-06',
    vestibular: 'ENEM',
    year: 2022,
    edition: 'Aplicação Regular',
    area: 'Matemática e suas Tecnologias',
    discipline: 'Matemática',
    topic: 'Funções Exponenciais e Logarítmicas',
    subtopic: 'Escala Richter e Energia Liberada',
    statement: 'A magnitude R de um terremoto na escala Richter é calculada pela relação logarítmica R = (2/3) · log₁₀(E / E₀), onde E é a energia liberada pelo sismo em joules e E₀ = 10⁴⁴ J é uma constante de referência. Se um terremoto de magnitude R₁ = 7,0 atingiu determinada região, e outro abalo sísmico de magnitude R₂ = 5,0 ocorreu no mesmo local semanas depois, qual é a razão (E₁ / E₂) entre as energias liberadas nos dois sismos?',
    alternatives: [
      { id: 'A', text: '10' },
      { id: 'B', text: '100' },
      { id: 'C', text: '1.000' },
      { id: 'D', text: '10.000' },
      { id: 'E', text: '100.000' },
    ],
    correctAlternative: 'C',
    explanation: `Passo a passo:
1. R₁ - R₂ = 7,0 - 5,0 = 2,0.
2. Usando a fórmula:
   (2/3) · log₁₀(E₁ / E₀) - (2/3) · log₁₀(E₂ / E₀) = 2,0
   (2/3) · [log₁₀(E₁ / E₂)] = 2,0
3. Multiplicando ambos os lados por 3/2:
   log₁₀(E₁ / E₂) = 2,0 × (3/2) = 3.
4. Aplicando a definição de logaritmo decimal:
   E₁ / E₂ = 10³ = 1.000.
Portanto, a energia do primeiro abalo foi 1.000 vezes maior que a do segundo. Alternativa C.`,
    triParams: { a: 1.95, b: 0.85, c: 0.18 },
    difficultyLevel: 'Difícil',
    sourceUrl: 'https://enem.dev',
  },

  // =========================================================================
  // 7. ENEM - MATEMÁTICA - GEOMETRIA ESPACIAL
  // =========================================================================
  {
    id: 'enem-2023-mat-07',
    vestibular: 'ENEM',
    year: 2023,
    edition: 'Aplicação Regular',
    area: 'Matemática e suas Tecnologias',
    discipline: 'Matemática',
    topic: 'Geometria Espacial',
    subtopic: 'Cilindros e Capacidade em Litros',
    statement: 'Um reservatório de água tem a forma de um cilindro circular reto com raio da base medindo 2 metros e altura de 5 metros. Devido à estiagem, o nível da água baixou de modo que o volume restante ocupa exatamente 60% da capacidade total do reservatório. Considerando π ≈ 3,14, quantos litros de água são necessários para encher completamente esse reservatório até sua capacidade máxima?',
    alternatives: [
      { id: 'A', text: '25.120 litros' },
      { id: 'B', text: '37.680 litros' },
      { id: 'C', text: '62.800 litros' },
      { id: 'D', text: '12.560 litros' },
      { id: 'E', text: '18.840 litros' },
    ],
    correctAlternative: 'A',
    explanation: `Passo a passo:
1. Volume total do cilindro: V = π · r² · h = 3,14 · (2)² · 5 = 62,8 m³.
2. Para encher completamente restam 40% (100% - 60%):
   V_restante = 0,40 · 62,8 = 25,12 m³.
3. Conversão para litros (1 m³ = 1000 L):
   Volume em litros = 25,12 · 1000 = 25.120 L.
Alternativa A.`,
    triParams: { a: 1.78, b: 0.35, c: 0.18 },
    difficultyLevel: 'Médio',
    sourceUrl: 'https://enem.dev',
  },

  // =========================================================================
  // 8. ENEM - MATEMÁTICA - ANÁLISE COMBINATÓRIA E PROBABILIDADE
  // =========================================================================
  {
    id: 'enem-2023-mat-08',
    vestibular: 'ENEM',
    year: 2023,
    edition: 'Aplicação Regular',
    area: 'Matemática e suas Tecnologias',
    discipline: 'Matemática',
    topic: 'Análise Combinatória',
    subtopic: 'Princípio Multiplicativo e Permutações',
    statement: 'Um comitê de ética hospitalar é composto por 5 médicos e 4 enfermeiros. Para analisar um caso urgente, deve ser formada uma comissão especial de 4 profissionais contendo obrigatoriamente pelo menos 2 médicos e pelo menos 1 enfermeiro. De quantas maneiras distintas essa comissão pode ser constituída?',
    alternatives: [
      { id: 'A', text: '60 maneiras' },
      { id: 'B', text: '70 maneiras' },
      { id: 'C', text: '100 maneiras' },
      { id: 'D', text: '105 maneiras' },
      { id: 'E', text: '126 maneiras' },
    ],
    correctAlternative: 'C',
    explanation: `A comissão tem 4 membros e precisa de pelo menos 2 médicos e 1 enfermeiro.
Casos possíveis:
Caso 1: 2 Médicos e 2 Enfermeiros
C(5, 2) × C(4, 2) = 10 × 6 = 60.
Caso 2: 3 Médicos e 1 Enfermeiro
C(5, 3) × C(4, 1) = 10 × 4 = 40.
Total de composições = 60 + 40 = 100 maneiras.
Alternativa C.`,
    triParams: { a: 1.88, b: 0.92, c: 0.18 },
    difficultyLevel: 'Difícil',
    sourceUrl: 'https://enem.dev',
  },

  // =========================================================================
  // 9. ENEM - LINGUAGENS - INTERPRETAÇÃO E FIGURAS DE LINGUAGEM
  // =========================================================================
  {
    id: 'enem-2023-ling-09',
    vestibular: 'ENEM',
    year: 2023,
    edition: '1º Dia',
    area: 'Linguagens, Códigos e suas Tecnologias',
    discipline: 'Língua Portuguesa e Literatura',
    topic: 'Interpretação de Texto',
    subtopic: 'Funções da Linguagem e Modernismo',
    statement: 'No poema modernista, a ruptura com o parnasianismo não se dá apenas na métrica livre, mas na apropriação do falar coloquial das ruas e na estetização do cotidiano despretensioso. Em "Poética", Manuel Bandeira proclama: "Quero antes o lirismo dos loucos / O lirismo dos bêbados / O lirismo difícil e pungente dos loucos". Esse manifesto estético tem como objetivo central:',
    alternatives: [
      { id: 'A', text: 'estabelecer um novo cânone acadêmico fundamentado no rigor formal dos clássicos greco-latinos.' },
      { id: 'B', text: 'criticar a artificialidade da erudição vazia e reivindicar uma poesia autêntica conectada à intensidade humana.' },
      { id: 'C', text: 'deslegitimar toda manifestação emotiva na lírica brasileira do século XX.' },
      { id: 'D', text: 'exaltar exclusivamente a racionalidade iluminista frente ao descontrole emocional moderno.' },
      { id: 'E', text: 'restringir o público leitor de poesia às camadas cultas das capitais litorâneas.' },
    ],
    correctAlternative: 'B',
    explanation: `Bandeira insurge-se contra o formalismo parnasiano estéril ("o lirismo bem comportado"). Ao reivindicar o lirismo dos loucos e ébrios, o modernismo abre a literatura brasileira para a vitalidade da linguagem cotidiana e para as comoções genuínas do ser humano. Alternativa B.`,
    triParams: { a: 1.35, b: -0.70, c: 0.20 },
    difficultyLevel: 'Fácil',
    sourceUrl: 'https://enem.dev',
  },

  // =========================================================================
  // 10. ENEM - CIÊNCIAS HUMANAS - HISTÓRIA / BRASIL REPÚBLICA
  // =========================================================================
  {
    id: 'enem-2022-hum-10',
    vestibular: 'ENEM',
    year: 2022,
    edition: '1º Dia',
    area: 'Ciências Humanas e suas Tecnologias',
    discipline: 'História',
    topic: 'Brasil República',
    subtopic: 'Era Vargas e Legislação Trabalhista',
    statement: 'Durante o primeiro governo de Getúlio Vargas (1930-1945), a criação do Ministério do Trabalho, Indústria e Comércio e a posterior promulgação da Consolidação das Leis do Trabalho (CLT) em 1943 representaram uma estratégia política caracterizada pelo:',
    alternatives: [
      { id: 'A', text: 'corporativismo estatal, que concedia direitos sociais ao operariado enquanto atrelava os sindicatos à tutela governamental.' },
      { id: 'B', text: 'liberalismo econômico estrito, extinguindo a intervenção pública nas relações entre patrões e empregados.' },
      { id: 'C', text: 'fortalecimento irrestrito do anarcossindicalismo e da independência das greves gerais urbanas.' },
      { id: 'D', text: 'alinhamento imediato com as teses marxistas revolucionárias da Internacional Comunista.' },
      { id: 'E', text: 'desmonte do processo de industrialização nacional em favor dos barões do café do oeste paulista.' },
    ],
    correctAlternative: 'A',
    explanation: `Vargas instituiu a tutela estatal sindical (sindicato único atrelado ao Ministério do Trabalho com cobrança do imposto sindical obrigatório). Em troca da concessão pioneira de direitos trabalhistas (salário mínimo, férias regulamentadas, jornada legal), o Estado desmobilizou os movimentos operários autônomos e comunistas, consolidando o pacto corporativo varguista. Alternativa A.`,
    triParams: { a: 1.55, b: 0.10, c: 0.20 },
    difficultyLevel: 'Médio',
    sourceUrl: 'https://enem.dev',
  },

  // =========================================================================
  // 11. UERJ - FÍSICA - TERMODINÂMICA
  // =========================================================================
  {
    id: 'uerj-2024-eq1-11',
    vestibular: 'UERJ',
    year: 2024,
    edition: '1º Exame de Qualificação',
    area: 'Ciências da Natureza e suas Tecnologias',
    discipline: 'Física',
    topic: 'Termodinâmica',
    subtopic: 'Trabalho em Transformações Isobáricas',
    statement: 'Em um laboratório, uma amostra contendo 2,0 mols de um gás ideal monoatômico sofre uma expansão isobárica sob pressão constante de 1,5 × 10⁵ Pa. Durante o processo, o volume do gás aumenta de 0,02 m³ para 0,06 m³. Sabendo que o trabalho mecânico realizado pelo gás em uma transformação isobárica é dado por W = P · ΔV, o trabalho realizado pelo gás nessa expansão é igual a:',
    alternatives: [
      { id: 'A', text: '3,0 × 10³ J' },
      { id: 'B', text: '6,0 × 10³ J' },
      { id: 'C', text: '9,0 × 10³ J' },
      { id: 'D', text: '1,2 × 10⁴ J' },
    ],
    correctAlternative: 'B',
    explanation: `Resolução UERJ:
ΔV = V_final - V_inicial = 0,06 - 0,02 = 0,04 m³.
W = P · ΔV = (1,5 × 10⁵) × (0,04) = 6,0 × 10³ J.
Alternativa B.`,
    difficultyLevel: 'Fácil',
    sourceUrl: 'https://github.com/beatrizmilz/BancoDeQuestoes',
  },

  // =========================================================================
  // 12. UERJ - QUÍMICA - EQUILÍBRIO IÔNICO E PH
  // =========================================================================
  {
    id: 'uerj-2023-eq2-12',
    vestibular: 'UERJ',
    year: 2023,
    edition: '2º Exame de Qualificação',
    area: 'Ciências da Natureza e suas Tecnologias',
    discipline: 'Química',
    topic: 'Equilíbrio Iônico',
    subtopic: 'Cálculo de pH e Constante de Ionização',
    statement: 'O ácido clorídrico (HCl) presente no suco gástrico humano é um ácido monoprótico forte com ionização praticamente completa. Uma amostra laboratorial de suco gástrico coletada em jejum apresentou concentração de íons hidrônio [H₃O⁺] igual a 1,0 × 10⁻² mol/L. O valor do pH dessa amostra e sua respectiva classificação ácida são:',
    alternatives: [
      { id: 'A', text: 'pH = 2, fortemente ácida' },
      { id: 'B', text: 'pH = 12, fortemente básica' },
      { id: 'C', text: 'pH = 7, neutra' },
      { id: 'D', text: 'pH = 1, moderadamente ácida' },
    ],
    correctAlternative: 'A',
    explanation: `Cálculo de pH:
pH = -log₁₀[H⁺] = -log₁₀(1,0 × 10⁻²) = -(-2) = 2.
Como pH = 2 < 7, a solução é fortemente ácida, típica do estômago humano. Alternativa A.`,
    difficultyLevel: 'Fácil',
    sourceUrl: 'https://github.com/beatrizmilz/BancoDeQuestoes',
  },

  // =========================================================================
  // 13. UERJ - LINGUAGENS - ANÁLISE LITERÁRIA MACHADO DE ASSIS
  // =========================================================================
  {
    id: 'uerj-2023-eq2-13',
    vestibular: 'UERJ',
    year: 2023,
    edition: '2º Exame de Qualificação',
    area: 'Linguagens, Códigos e suas Tecnologias',
    discipline: 'Língua Portuguesa e Literatura',
    topic: 'Figuras de Linguagem',
    subtopic: 'Ironia e Pós-Morte em Brás Cubas',
    statement: 'No romance machadiano "Memórias Póstumas de Brás Cubas", o narrador defunto dedica sua obra ao primeiro verme que roeu as frias carnes de seu cadáver. Essa dedicatória inicial instaura o tom narrativo da obra por meio da:',
    alternatives: [
      { id: 'A', text: 'idealização romântica da finitude corpórea e exaltação do sentimentalismo pueril.' },
      { id: 'B', text: 'ironia corrosiva e do distanciamento cético em relação às convenções e hipocrisias da sociedade burguesa.' },
      { id: 'C', text: 'adesão ingênua às explicações metafísicas e religiosas sobre a salvação da alma.' },
      { id: 'D', text: 'linguagem pomposa e hiperbólica destinada a enaltecer os feitos heróicos de sua linhagem familiar.' },
    ],
    correctAlternative: 'B',
    explanation: `A perspectiva de narrador defunto liberta Brás Cubas de quaisquer constrangimentos mundanos. Ele pode desmascarar o egoísmo, o parasitismo e a hipocrisia de sua classe social sem temer julgamentos. A dedicatória ao verme consagra o pessimismo lúcido e a ironia machadiana. Alternativa B.`,
    difficultyLevel: 'Médio',
    sourceUrl: 'https://github.com/beatrizmilz/BancoDeQuestoes',
  },

  // =========================================================================
  // 14. UERJ - GEOGRAFIA - GENTRIFICAÇÃO URBANA
  // =========================================================================
  {
    id: 'uerj-2023-eq1-14',
    vestibular: 'UERJ',
    year: 2023,
    edition: '1º Exame de Qualificação',
    area: 'Ciências Humanas e suas Tecnologias',
    discipline: 'Geografia',
    topic: 'Geografia Urbana',
    subtopic: 'Gentrificação e Especulação Imobiliária',
    statement: 'A intervenção urbanística em antigas zonas portuárias e industriais degradadas, com instalação de museus de grande porte, complexos corporativos e edifícios residenciais de alto padrão, frequentemente expulsa as populações de menor renda residentes no entorno devido à intensa elevação dos aluguéis e do custo de vida. Esse processo é conceituado na geografia crítica como:',
    alternatives: [
      { id: 'A', text: 'desmetropolização.' },
      { id: 'B', text: 'gentrificação.' },
      { id: 'C', text: 'conurbação espontânea.' },
      { id: 'D', text: 'reforma agrária periférica.' },
    ],
    correctAlternative: 'B',
    explanation: `Gentrificação (gentrification) é a intervenção que transforma áreas urbanas populares ou deterioradas em espaços atrativos para classes médias e altas, valorizando o solo e empurrando os antigos moradores para periferias mais desprovidas de infraestrutura. Alternativa B.`,
    difficultyLevel: 'Fácil',
    sourceUrl: 'https://github.com/beatrizmilz/BancoDeQuestoes',
  },

  // =========================================================================
  // 15. FUVEST - QUÍMICA ORGÂNICA - ISOMERIA ÓPTICA
  // =========================================================================
  {
    id: 'fuvest-2024-fase1-15',
    vestibular: 'FUVEST',
    year: 2024,
    edition: '1ª Fase',
    area: 'Ciências da Natureza e suas Tecnologias',
    discipline: 'Química',
    topic: 'Química Orgânica',
    subtopic: 'Isomeria Óptica e Carbono Assimétrico',
    statement: 'A talidomida é um exemplo trágico e notório na história da farmacologia de como enantiômeros (isômeros ópticos que são imagens especulares não sobreponíveis) podem apresentar atividades biológicas radicalmente distintas: enquanto o enantiômero (R) possui propriedades sedativas benéficas, o enantiômero (S) é fortemente teratogênico. Para que uma molécula orgânica apresente isomeria óptica por quiraldade pontual, é condição necessária a presença de:',
    alternatives: [
      { id: 'A', text: 'pelo menos uma ligação dupla entre dois carbonos com ligantes idênticos em cada extremidade.' },
      { id: 'B', text: 'um anel benzênico dissubstituído nas posições orto e para.' },
      { id: 'C', text: 'pelo menos um átomo de carbono tetraédrico ligado a quatro grupos ou átomos distintos entre si.' },
      { id: 'D', text: 'uma cadeia carbônica cíclica conjugada com deslocalização de elétrons pi.' },
      { id: 'E', text: 'dois átomos de oxigênio formando uma ponte peróxido de alta instabilidade.' },
    ],
    correctAlternative: 'C',
    explanation: `A assimetria pontual (quiralidade) exige a existência de um estereocentro, tipicamente um carbono sp³ tetraédrico com quatro ligantes distintos (–C*R₁R₂R₃R₄). Isso impede a presença de planos ou centros de simetria interna, permitindo desvio do plano da luz polarizada. Alternativa C.`,
    difficultyLevel: 'Médio',
    sourceUrl: 'https://github.com/beatrizmilz/BancoDeQuestoes',
  },

  // =========================================================================
  // 16. FUVEST - BIOLOGIA - BOTÂNICA / FOTOSSÍNTESE
  // =========================================================================
  {
    id: 'fuvest-2023-fase1-16',
    vestibular: 'FUVEST',
    year: 2023,
    edition: '1ª Fase',
    area: 'Ciências da Natureza e suas Tecnologias',
    discipline: 'Biologia',
    topic: 'Fisiologia Vegetal',
    subtopic: 'Fotossíntese e Trocas Gasosas nos Estômatos',
    statement: 'Em um dia ensolarado e de seca extrema, as plantas terrestres enfrentam o dilema entre a absorção de CO₂ para a fotossíntese e a perda de água por transpiração. Sob estresse hídrico agudo, o fechamento estomático rápido é mediado principalmente pela ação do hormônio vegetal:',
    alternatives: [
      { id: 'A', text: 'ácido abscísico (ABA).' },
      { id: 'B', text: 'auxina (AIA).' },
      { id: 'C', text: 'giberelina.' },
      { id: 'D', text: 'etileno gasoso.' },
      { id: 'E', text: 'citocinina.' },
    ],
    correctAlternative: 'A',
    explanation: `O ácido abscísico (ABA) é o fitormônio central de resposta ao estresse hídrico. Sintetizado nas raízes e folhas quando há escassez de água no solo, ele induz o efluxo de íons potássio (K⁺) das células-guarda dos estômatos, provocando saída de água por osmose e subsequente fechamento do ostíolo para conter a desidratação. Alternativa A.`,
    difficultyLevel: 'Médio',
    sourceUrl: 'https://github.com/beatrizmilz/BancoDeQuestoes',
  },

  // =========================================================================
  // 17. UNICAMP - MATEMÁTICA - FUNÇÕES EXPONENCIAIS
  // =========================================================================
  {
    id: 'unicamp-2024-fase1-17',
    vestibular: 'UNICAMP',
    year: 2024,
    edition: '1ª Fase',
    area: 'Matemática e suas Tecnologias',
    discipline: 'Matemática',
    topic: 'Funções Exponenciais e Logarítmicas',
    subtopic: 'Crescimento de Populações',
    statement: 'Uma cultura de bactérias em placa de Petri cresce de acordo com a função exponencial N(t) = N₀ · 2^(k·t), onde t é medido em horas e N₀ é a população inicial. No início do experimento (t = 0), havia 500 bactérias. Após 3 horas, a contagem registrou 4.000 bactérias. Quantas horas a partir do início serão necessárias para que a colônia atinja 32.000 bactérias?',
    alternatives: [
      { id: 'A', text: '5 horas' },
      { id: 'B', text: '6 horas' },
      { id: 'C', text: '8 horas' },
      { id: 'D', text: '9 horas' },
    ],
    correctAlternative: 'B',
    explanation: `N(3) = 500 · 2^(3k) = 4000 => 2^(3k) = 8 = 2³ => 3k = 3 => k = 1.
Para 32.000 bactérias:
500 · 2^(1·t) = 32000 => 2^t = 64 = 2⁶ => t = 6 horas.
Alternativa B.`,
    difficultyLevel: 'Fácil',
    sourceUrl: 'https://github.com/beatrizmilz/BancoDeQuestoes',
  },

  // =========================================================================
  // 18. CONCURSOS - DIREITO CONSTITUCIONAL / ADMINISTRAÇÃO PÚBLICA
  // =========================================================================
  {
    id: 'conc-2023-rbm-18',
    vestibular: 'CONCURSOS',
    year: 2023,
    edition: 'Questões de Concursos Públicos',
    area: 'Ciências Humanas e suas Tecnologias',
    discipline: 'Filosofia e Sociologia',
    topic: 'Administração Pública e Cidadania',
    subtopic: 'Princípios Constitucionais do Art. 37 (LIMPE)',
    statement: 'A Constituição Federal de 1988 estabelece em seu Artigo 37 que a administração pública direta e indireta de qualquer dos Poderes da União, dos Estados, do Distrito Federal e dos Municípios obedecerá a princípios fundamentais expressos. Dentre eles, o princípio que proíbe que constem nomes, símbolos ou imagens que caracterizem promoção pessoal de autoridades ou servidores públicos em publicidade governamental decorre diretamente da:',
    alternatives: [
      { id: 'A', text: 'Eficiência operacional.' },
      { id: 'B', text: 'Impessoalidade.' },
      { id: 'C', text: 'Legalidade estrita.' },
      { id: 'D', text: 'Publicidade ampla.' },
      { id: 'E', text: 'Autotutela administrativa.' },
    ],
    correctAlternative: 'B',
    explanation: `Pelo Art. 37, § 1º da CF/88, a publicidade dos atos, programas, obras, serviços e campanhas dos órgãos públicos deverá ter caráter educativo, informativo ou de orientação social, dela não podendo constar nomes, símbolos ou imagens que caracterizem promoção pessoal de autoridades ou servidores públicos. Isso consagra o princípio constitucional da IMPESSOALIDADE. Alternativa B.`,
    difficultyLevel: 'Fácil',
    sourceUrl: 'https://github.com/rodrigoborgesmachado/questoesConcursos',
  },

  // =========================================================================
  // 19. CONCURSOS - LÍNGUA PORTUGUESA / CRASE E REGÊNCIA
  // =========================================================================
  {
    id: 'conc-2023-rbm-19',
    vestibular: 'CONCURSOS',
    year: 2023,
    edition: 'Questões de Concursos Públicos',
    area: 'Linguagens, Códigos e suas Tecnologias',
    discipline: 'Língua Portuguesa e Literatura',
    topic: 'Gramática Normativa',
    subtopic: 'Emprego do Acento Indicativo de Crase',
    statement: 'Assinale a alternativa em que o uso do acento indicativo de crase está estritamente correto de acordo com a norma-padrão da língua portuguesa:',
    alternatives: [
      { id: 'A', text: 'O diretor comunicou a decisão às pessoas presentes na assembleia geral.' },
      { id: 'B', text: 'O candidato começou à redigir a resposta no cartão definitivo.' },
      { id: 'C', text: 'Encaminhamos o relatório financeiro à Vossa Excelência com urgência.' },
      { id: 'D', text: 'Eles viajaram à pé pela trilha ecológica da serra.' },
      { id: 'E', text: 'A entrega das provas ocorrerá de segunda à sexta.' },
    ],
    correctAlternative: 'A',
    explanation: `Regras de crase:
A) Correto: "comunicou a decisão a (preposição regida por comunicar) + as pessoas (artigo feminino plural) = às pessoas".
B) Incorreto: não ocorre crase antes de verbos no infinitivo (redigir).
C) Incorreto: não ocorre crase antes de pronomes de tratamento (Vossa Excelência), com raras exceções (senhora, senhorita).
D) Incorreto: não ocorre crase antes de palavras masculinas (pé).
E) Incorreto: na correlação "de... a", não há artigo antes de segunda ("de"), portanto não há antes de sexta ("a sexta"). Alternativa A.`,
    difficultyLevel: 'Médio',
    sourceUrl: 'https://github.com/rodrigoborgesmachado/questoesConcursos',
  },

  // =========================================================================
  // 20. FUVEST - FÍSICA - CINEMÁTICA E DINÂMICA
  // =========================================================================
  {
    id: 'fuvest-2023-fase1-20',
    vestibular: 'FUVEST',
    year: 2023,
    edition: '1ª Fase',
    area: 'Ciências da Natureza e suas Tecnologias',
    discipline: 'Física',
    topic: 'Mecânica Clássica',
    subtopic: 'Leis de Newton e Força de Atrito',
    statement: 'Um bloco de massa m = 4,0 kg repousa sobre uma superfície horizontal áspera cujo coeficiente de atrito estático é μ_e = 0,40 e o coeficiente de atrito cinético é μ_c = 0,30. Uma força horizontal F de intensidade 12 N é aplicada sobre o bloco. Considerando g = 10 m/s², qual é o valor da força de atrito exercida pela superfície sobre o bloco?',
    alternatives: [
      { id: 'A', text: '12 N' },
      { id: 'B', text: '16 N' },
      { id: 'C', text: '40 N' },
      { id: 'D', text: '0 N' },
      { id: 'E', text: '4,0 N' },
    ],
    correctAlternative: 'A',
    explanation: `Passo a passo:
1. Normal: N = P = m · g = 4,0 · 10 = 40 N.
2. Força de atrito estático máxima (destacamento):
   Fat_max = μ_e · N = 0,40 · 40 = 16 N.
3. Como a força aplicada (F = 12 N) é menor que a força de atrito estático máxima (16 N), o bloco permanece em repouso!
4. Em equilíbrio estático, a força de atrito estático se iguala exatamente à força solicitadora:
   Fat = F = 12 N.
Alternativa A.`,
    difficultyLevel: 'Médio',
    sourceUrl: 'https://github.com/beatrizmilz/BancoDeQuestoes',
  },

  // =========================================================================
  // 21. ENEM - MATEMÁTICA - ESTATÍSTICA (MEDIANA E MÉDIA)
  // =========================================================================
  {
    id: 'enem-2023-mat-21',
    vestibular: 'ENEM',
    year: 2023,
    edition: 'Aplicação Regular',
    area: 'Matemática e suas Tecnologias',
    discipline: 'Matemática',
    topic: 'Estatística Básica',
    subtopic: 'Medidas de Tendência Central (Média e Mediana)',
    statement: 'Um técnico de atletismo registrou os tempos (em segundos) obtidos por um velocista em seis corridas preparatórias de 100 metros rasos: 10,2 s; 10,6 s; 10,1 s; 10,8 s; 10,4 s e 10,3 s. Para fins de classificação interna, o treinador utiliza a mediana desses tempos. Qual é a mediana, em segundos, dos tempos desse atleta?',
    alternatives: [
      { id: 'A', text: '10,25 s' },
      { id: 'B', text: '10,35 s' },
      { id: 'C', text: '10,40 s' },
      { id: 'D', text: '10,45 s' },
      { id: 'E', text: '10,50 s' },
    ],
    correctAlternative: 'B',
    explanation: `Passo a passo:
1. Organizar os dados em rol (ordem crescente):
   10,1 s; 10,2 s; 10,3 s; 10,4 s; 10,6 s; 10,8 s.
2. Como o número de elementos é par (n = 6), a mediana é a média aritmética dos dois termos centrais (3º e 4º termos):
   Mediana = (10,3 + 10,4) / 2 = 20,7 / 2 = 10,35 s.
Portanto, a alternativa correta é a letra B.`,
    triParams: { a: 1.62, b: -0.65, c: 0.20 },
    difficultyLevel: 'Fácil',
    sourceUrl: 'https://enem.dev',
  },

  // =========================================================================
  // 22. ENEM - BIOLOGIA - IMUNOLOGIA (VACINAS VS SOROS)
  // =========================================================================
  {
    id: 'enem-2022-bio-22',
    vestibular: 'ENEM',
    year: 2022,
    edition: 'Aplicação Regular',
    area: 'Ciências da Natureza e suas Tecnologias',
    discipline: 'Biologia',
    topic: 'Fisiologia Humana',
    subtopic: 'Imunologia: Imunização Ativa vs Passiva',
    statement: 'Após sofrer um acidente com um prego enferrujado em um canteiro de obras, um trabalhador é levado ao pronto-socorro. Como ele não sabe se sua vacinação antitetânica está em dia e o risco de infecção pela toxina da bactéria Clostridium tetani é imediato, o protocolo médico de emergência indica a administração de soro antitetânico. A justificativa para a escolha do soro, em vez da vacina, nessa situação de emergência é que o soro:',
    alternatives: [
      { id: 'A', text: 'estimula a produção endógena de anticorpos de memória a longo prazo.' },
      { id: 'B', text: 'contém anticorpos prontos que neutralizam a toxina imediatamente por imunização passiva.' },
      { id: 'C', text: 'contém antígenos atenuados que aceleram a diferenciação de plasmócitos.' },
      { id: 'D', text: 'induz imunidade celular mediada exclusivamente por linfócitos T citotóxicos.' },
      { id: 'E', text: 'promove imunização ativa profilática com eficácia duradoura por vários anos.' },
    ],
    correctAlternative: 'B',
    explanation: `Passo a passo:
- Vacina: Contém antígenos (mortos, atenuados ou fragmentos de RNAm). Promove imunização ativa (o próprio corpo produz anticorpos e células de memória), sendo profilática (preventiva) e com ação retardada (dias a semanas).
- Soro: Contém anticorpos pré-formados (geralmente produzidos em cavalos). Promove imunização passiva, sendo curativo e de ação imediata em casos de emergência (como tétano já inoculado ou picadas de serpentes peçonhentas).
Logo, a resposta correta é a Alternativa B.`,
    triParams: { a: 1.88, b: -0.20, c: 0.20 },
    difficultyLevel: 'Fácil',
    sourceUrl: 'https://enem.dev',
  },

  // =========================================================================
  // 23. ENEM - QUÍMICA - ELETROQUÍMICA (PILHAS)
  // =========================================================================
  {
    id: 'enem-2023-qui-23',
    vestibular: 'ENEM',
    year: 2023,
    edition: 'Aplicação Regular',
    area: 'Ciências da Natureza e suas Tecnologias',
    discipline: 'Química',
    topic: 'Físico-Química',
    subtopic: 'Eletroquímica e Pilha de Daniell',
    statement: 'Considere uma pilha galvânica padrão constituída por eletrodos de zinco metálico imerso em solução de Zn²⁺ e cobre metálico imerso em solução de Cu²⁺ a 25 °C. Os potenciais padrão de redução são: Zn²⁺(aq) + 2e⁻ → Zn(s) (E° = -0,76 V) e Cu²⁺(aq) + 2e⁻ → Cu(s) (E° = +0,34 V). A respeito do funcionamento espontâneo dessa pilha, é correto afirmar que:',
    alternatives: [
      { id: 'A', text: 'o zinco atua como cátodo e sua massa metálica aumenta com o tempo.' },
      { id: 'B', text: 'o fluxo espontâneo de elétrons no circuito externo ocorre do eletrodo de zinco para o eletrodo de cobre.' },
      { id: 'C', text: 'a diferença de potencial padrão (ΔE°) dessa pilha é igual a 0,42 V.' },
      { id: 'D', text: 'o cobre sofre oxidação por possuir maior potencial padrão de redução.' },
      { id: 'E', text: 'a concentração de íons Cu²⁺ na solução aumenta durante a descarga da pilha.' },
    ],
    correctAlternative: 'B',
    explanation: `Passo a passo da Eletroquímica:
1. Compara-se os potenciais padrão de redução:
   E°(Cu²⁺/Cu) = +0,34 V > E°(Zn²⁺/Zn) = -0,76 V.
2. Como o cobre tem maior potencial de redução, ele se reduz (cátodo, polo positivo):
   Cu²⁺ + 2e⁻ → Cu(s) (ganho de elétrons, a massa da placa aumenta).
3. O zinco, com menor potencial de redução, sofre oxidação (ânodo, polo negativo):
   Zn(s) → Zn²⁺ + 2e⁻ (perda de elétrons, placa se desgasta).
4. O fluxo de elétrons pelo fio externo sempre parte do ânodo (Zn) em direção ao cátodo (Cu).
5. ΔE° = E°maior - E°menor = +0,34 - (-0,76) = +1,10 V.
Alternativa B.`,
    triParams: { a: 1.75, b: 0.35, c: 0.20 },
    difficultyLevel: 'Médio',
    sourceUrl: 'https://enem.dev',
  },

  // =========================================================================
  // 24. ENEM - FÍSICA - ÓPTICA GEOMÉTRICA (REFRAÇÃO E LEI DE SNELL)
  // =========================================================================
  {
    id: 'enem-2021-fis-24',
    vestibular: 'ENEM',
    year: 2021,
    edition: 'Aplicação Regular',
    area: 'Ciências da Natureza e suas Tecnologias',
    discipline: 'Física',
    topic: 'Óptica Geométrica',
    subtopic: 'Refração e Lei de Snell-Descartes',
    statement: 'Um feixe de luz monocromática incide do ar (índice de refração n_ar = 1,0) sobre a superfície plana de um bloco de acrílico com ângulo de incidência de 30° em relação à reta normal. Sabendo que o índice de refração do acrílico é n_acrilico = 1,5 e adotando sen 30° = 0,50, qual é o valor do seno do ângulo de refração no acrílico?',
    alternatives: [
      { id: 'A', text: '0,25' },
      { id: 'B', text: '0,33' },
      { id: 'C', text: '0,50' },
      { id: 'D', text: '0,75' },
      { id: 'E', text: '1,00' },
    ],
    correctAlternative: 'B',
    explanation: `Passo a passo pela Lei de Snell-Descartes:
n_1 · sen(θ_1) = n_2 · sen(θ_2)
1,0 · sen(30°) = 1,5 · sen(θ_2)
1,0 · 0,50 = 1,5 · sen(θ_2)
0,50 = 1,5 · sen(θ_2)
sen(θ_2) = 0,50 / 1,5 = 1/3 ≈ 0,333...
Portanto, alternativa correta é a letra B.`,
    triParams: { a: 1.55, b: -0.15, c: 0.20 },
    difficultyLevel: 'Médio',
    sourceUrl: 'https://enem.dev',
  },

  // =========================================================================
  // 25. UERJ - MATEMÁTICA - ANÁLISE COMBINATÓRIA
  // =========================================================================
  {
    id: 'uerj-2024-mat-25',
    vestibular: 'UERJ',
    year: 2024,
    edition: '1º Exame de Qualificação',
    area: 'Matemática e suas Tecnologias',
    discipline: 'Matemática',
    topic: 'Análise Combinatória',
    subtopic: 'Combinação Simples e Agrupamentos',
    statement: 'Para formar uma comissão multidisciplinar de saúde comunitária, um hospital dispõe de 6 médicos e 4 enfermeiros. A comissão deve ser composta por exatamente 3 médicos e 2 enfermeiros. De quantas maneiras distintas essa comissão pode ser formada?',
    alternatives: [
      { id: 'A', text: '60' },
      { id: 'B', text: '120' },
      { id: 'C', text: '240' },
      { id: 'D', text: '720' },
    ],
    correctAlternative: 'B',
    explanation: `Passo a passo da UERJ:
1. A ordem dos membros não importa, logo usamos combinação simples.
2. Escolha dos médicos: C(6, 3) = 6! / (3! · 3!) = (6 · 5 · 4) / (3 · 2 · 1) = 20 maneiras.
3. Escolha dos enfermeiros: C(4, 2) = 4! / (2! · 2!) = (4 · 3) / (2 · 1) = 6 maneiras.
4. Pelo Princípio Fundamental da Contagem:
   Total = C(6, 3) × C(4, 2) = 20 × 6 = 120 maneiras.
Alternativa B.`,
    difficultyLevel: 'Médio',
    sourceUrl: 'https://github.com/beatrizmilz/BancoDeQuestoes',
  },

  // =========================================================================
  // 26. UERJ - LÍNGUA PORTUGUESA - RECURSOS ESTILÍSTICOS
  // =========================================================================
  {
    id: 'uerj-2023-port-26',
    vestibular: 'UERJ',
    year: 2023,
    edition: '2º Exame de Qualificação',
    area: 'Linguagens, Códigos e suas Tecnologias',
    discipline: 'Língua Portuguesa e Literatura',
    topic: 'Estilística e Figuras de Linguagem',
    subtopic: 'Metáfora, Metonímia e Antítese',
    statement: 'No verso modernista "A cidade era um monstro de concreto que devorava as horas dos operários", a figura de linguagem predominante que confere expressividade dramática ao texto por meio de uma comparação implícita é a:',
    alternatives: [
      { id: 'A', text: 'metonímia.' },
      { id: 'B', text: 'metáfora.' },
      { id: 'C', text: 'eufemismo.' },
      { id: 'D', text: 'hipérbato.' },
    ],
    correctAlternative: 'B',
    explanation: `Passo a passo:
A metáfora consiste no emprego de uma palavra com sentido figurado fundado em uma relação de semelhança e comparação implícita, sem conectivo comparativo ("a cidade era um monstro").
A metonímia é a substituição pelo princípio de contiguidade (autor pela obra, parte pelo todo).
O eufemismo suaviza uma ideia desagradável.
O hipérbato é a inversão sintática.
Portanto, a resposta correta é a metáfora (Alternativa B).`,
    difficultyLevel: 'Fácil',
    sourceUrl: 'https://github.com/beatrizmilz/BancoDeQuestoes',
  },

  // =========================================================================
  // 27. UERJ - FÍSICA - ELETROSTÁTICA (LEI DE COULOMB)
  // =========================================================================
  {
    id: 'uerj-2024-fis-27',
    vestibular: 'UERJ',
    year: 2024,
    edition: 'Exame Único de Qualificação',
    area: 'Ciências da Natureza e suas Tecnologias',
    discipline: 'Física',
    topic: 'Eletrostática',
    subtopic: 'Lei de Coulomb e Força Eletrostática',
    statement: 'Duas pequenas esferas condutoras idênticas, fixadas no vácuo a uma distância d, possuem cargas elétricas puntiformes iguais a +Q e +3Q, repelindo-se com uma força de intensidade F. As esferas são colocadas em contato momentâneo e, em seguida, retornam às suas posições originais à mesma distância d. A nova força de repulsão entre elas terá intensidade igual a:',
    alternatives: [
      { id: 'A', text: 'F' },
      { id: 'B', text: '(4/3) F' },
      { id: 'C', text: '(3/4) F' },
      { id: 'D', text: '2 F' },
    ],
    correctAlternative: 'B',
    explanation: `Passo a passo da UERJ:
1. Força inicial:
   F = k · |Q · 3Q| / d² = 3 · (k · Q² / d²).
   Logo, k · Q² / d² = F / 3.
2. Contato entre esferas idênticas:
   Carga total = Q + 3Q = 4Q.
   Após o contato, cada esfera fica com carga média: Q' = 4Q / 2 = 2Q.
3. Nova força de repulsão à mesma distância d:
   F' = k · |2Q · 2Q| / d² = 4 · (k · Q² / d²).
4. Substituindo k · Q² / d² = F / 3:
   F' = 4 · (F / 3) = (4/3) F.
Alternativa B.`,
    difficultyLevel: 'Médio',
    sourceUrl: 'https://github.com/beatrizmilz/BancoDeQuestoes',
  },

  // =========================================================================
  // 28. FUVEST - MATEMÁTICA - GEOMETRIA ESPACIAL
  // =========================================================================
  {
    id: 'fuvest-2024-mat-28',
    vestibular: 'FUVEST',
    year: 2024,
    edition: '1ª Fase',
    area: 'Matemática e suas Tecnologias',
    discipline: 'Matemática',
    topic: 'Geometria Espacial',
    subtopic: 'Cilindros Circulares e Esferas Inscritas',
    statement: 'Uma esfera de raio R está perfeitamente inscrita em um cilindro circular reto. A razão entre o volume da esfera e o volume do cilindro circunscrito é expressa pela fração irreduzível:',
    alternatives: [
      { id: 'A', text: '1/3' },
      { id: 'B', text: '1/2' },
      { id: 'C', text: '2/3' },
      { id: 'D', text: '3/4' },
      { id: 'E', text: '4/5' },
    ],
    correctAlternative: 'C',
    explanation: `Passo a passo (Teorema clássico de Arquimedes):
1. Cilindro circunscrito à esfera de raio R:
   - Raio da base do cilindro: r = R.
   - Altura do cilindro: h = 2R (diâmetro da esfera).
2. Volume da esfera:
   V_esfera = (4/3) · π · R³.
3. Volume do cilindro:
   V_cilindro = A_base · h = (π · R²) · (2R) = 2 · π · R³.
4. Razão:
   Razão = V_esfera / V_cilindro = [(4/3) · π · R³] / [2 · π · R³] = (4/3) / 2 = 4/6 = 2/3.
Alternativa C.`,
    difficultyLevel: 'Médio',
    sourceUrl: 'https://github.com/beatrizmilz/BancoDeQuestoes',
  },

  // =========================================================================
  // 29. FUVEST - HISTÓRIA - BRASIL COLÔNIA
  // =========================================================================
  {
    id: 'fuvest-2023-his-29',
    vestibular: 'FUVEST',
    year: 2023,
    edition: '1ª Fase',
    area: 'Ciências Humanas e suas Tecnologias',
    discipline: 'História',
    topic: 'Brasil Colônia',
    subtopic: 'Economia Mineradora e Tratado de Methuen',
    statement: 'Durante o século XVIII, a descoberta de jazidas de ouro na região das Minas Gerais dinamizou a economia colonial brasileira e intensificou as relações com a metrópole portuguesa. No entanto, grande parcela do ouro extraído no Brasil acabou transferida para a Inglaterra, processo este favorecido principalmente pelo:',
    alternatives: [
      { id: 'A', text: 'Tratado de Methuen (Panos e Vinhos, 1703), que gerou deficit comercial crônico a Portugal.' },
      { id: 'B', text: 'Tratado de Madri (1750), que obrigou a Coroa portuguesa a pagar indenizações territoriais aos britânicos.' },
      { id: 'C', text: 'Bloqueio Continental napoleônico, que impôs a abertura imediata dos portos da colônia.' },
      { id: 'D', text: 'Pacto Colonial pombalino, que proibiu as manufaturas têxteis exclusivamente nas colônias espanholas.' },
      { id: 'E', text: 'Alvará de 1785 de D. Maria I, que incentivou a indústria siderúrgica pesada em Minas Gerais.' },
    ],
    correctAlternative: 'A',
    explanation: `Resolução Histórica da FUVEST:
O Tratado de Methuen (Tratado de Panos e Vinhos), assinado em 1703 entre Portugal e Inglaterra, estabelecia que os tecidos ingleses entrariam em Portugal com tarifas reduzidas, enquanto os vinhos portugueses teriam tarifas preferenciais na Inglaterra.
Como a demanda por manufaturados ingleses era muito superior ao valor das exportações vinícolas de Portugal, a balança comercial portuguesa tornou-se amplamente deficitária. Esse rombo comercial era coberto com o ouro recém-extraído no Brasil colonial, financiando assim a acumulação de capital da Revolução Industrial britânica.
Alternativa A.`,
    difficultyLevel: 'Médio',
    sourceUrl: 'https://github.com/beatrizmilz/BancoDeQuestoes',
  },

  // =========================================================================
  // 30. UNICAMP - FÍSICA - HIDROSTÁTICA
  // =========================================================================
  {
    id: 'unicamp-2024-fis-30',
    vestibular: 'UNICAMP',
    year: 2024,
    edition: '1ª Fase',
    area: 'Ciências da Natureza e suas Tecnologias',
    discipline: 'Física',
    topic: 'Mecânica dos Fluidos',
    subtopic: 'Princípio de Pascal e Prensa Hidráulica',
    statement: 'Um elevador hidráulico de oficina mecânica é constituído por dois pistões circulares comunicantes preenchidos por óleo incompressível. O pistão menor tem raio r_1 = 10 cm e o pistão maior tem raio r_2 = 50 cm. Para manter em equilíbrio um automóvel de massa 1.500 kg posicionado sobre o pistão maior, qual é a força mínima F_1 que deve ser aplicada verticalmente sobre o pistão menor? (Considere g = 10 m/s²).',
    alternatives: [
      { id: 'A', text: '300 N' },
      { id: 'B', text: '600 N' },
      { id: 'C', text: '1.500 N' },
      { id: 'D', text: '3.000 N' },
    ],
    correctAlternative: 'B',
    explanation: `Passo a passo UNICAMP:
1. Peso do automóvel no pistão 2:
   F_2 = m · g = 1.500 · 10 = 15.000 N.
2. Pelo Princípio de Pascal:
   P_1 = P_2 => F_1 / A_1 = F_2 / A_2 => F_1 = F_2 · (A_1 / A_2).
3. Razão entre as áreas dos pistões circulares:
   A_1 / A_2 = (π · r_1²) / (π · r_2²) = (r_1 / r_2)² = (10 / 50)² = (1/5)² = 1/25.
4. Força no pistão menor:
   F_1 = 15.000 / 25 = 600 N.
Alternativa B.`,
    difficultyLevel: 'Médio',
    sourceUrl: 'https://github.com/beatrizmilz/BancoDeQuestoes',
  },

  // =========================================================================
  // 31. UNICAMP - BIOLOGIA - BOTÂNICA
  // =========================================================================
  {
    id: 'unicamp-2023-bio-31',
    vestibular: 'UNICAMP',
    year: 2023,
    edition: '1ª Fase',
    area: 'Ciências da Natureza e suas Tecnologias',
    discipline: 'Biologia',
    topic: 'Botânica',
    subtopic: 'Fisiologia Vegetal e Transporte no Xilema',
    statement: 'Em árvores de grande porte, como as sequoias-gigantes, a seiva bruta (água e sais minerais) é transportada das raízes até as folhas mais altas a dezenas de metros de altura. O principal mecanismo fisiológico que explica a ascensão contínua dessa coluna ininterrupta de água pelo xilema baseia-se na:',
    alternatives: [
      { id: 'A', text: 'pressão positiva da raiz gerada exclusivamente por bombeamento ativo de ATP no córtex.' },
      { id: 'B', text: 'Teoria da Coesão-Tensão (Dixon), impulsionada pela transpiração estomática foliar.' },
      { id: 'C', text: 'gravitropismo negativo que inverte a permeabilidade seletiva do cilindro vascular.' },
      { id: 'D', text: 'osmose reversa nos vasos crivados do floema que succiona a água do lenho.' },
    ],
    correctAlternative: 'B',
    explanation: `Resolução Biológica UNICAMP:
A Teoria da Coesão-Tensão (proposta por Dixon) afirma que a perda de água por transpiração nas folhas gera uma tensão (pressão negativa) que puxa a água dos vasos do xilema. Graças às pontes de hidrogênio entre as moléculas de água (coesão) e a adesão às paredes dos vasos, forma-se uma coluna de água ininterrupta da raiz às folhas.
Alternativa B.`,
    difficultyLevel: 'Fácil',
    sourceUrl: 'https://github.com/beatrizmilz/BancoDeQuestoes',
  },

  // =========================================================================
  // 32. UNICAMP - QUÍMICA - EQUILÍBRIO QUÍMICO
  // =========================================================================
  {
    id: 'unicamp-2024-qui-32',
    vestibular: 'UNICAMP',
    year: 2024,
    edition: '1ª Fase',
    area: 'Ciências da Natureza e suas Tecnologias',
    discipline: 'Química',
    topic: 'Físico-Química',
    subtopic: 'Equilíbrio Químico e Princípio de Le Chatelier',
    statement: 'A síntese industrial de amônia pelo processo de Haber-Bosch é representada pela equação termoquímica: N₂(g) + 3 H₂(g) ⇌ 2 NH₃(g) (ΔH < 0, reação exotérmica). De acordo com o Princípio de Le Chatelier, para aumentar o rendimento na produção de amônia no equilíbrio, deve-se:',
    alternatives: [
      { id: 'A', text: 'aumentar a temperatura e diminuir a pressão do sistema reacional.' },
      { id: 'B', text: 'aumentar a pressão total e diminuir a temperatura do sistema reacional.' },
      { id: 'C', text: 'adicionar um catalisador heterogêneo de ferro e reduzir a concentração de N₂.' },
      { id: 'D', text: 'retirar constantemente gás hidrogênio mantendo o volume do reator constante.' },
    ],
    correctAlternative: 'B',
    explanation: `Passo a passo do Princípio de Le Chatelier:
1. Efeito da Pressão:
   Lado dos reagentes: 1 mol N₂ + 3 mol H₂ = 4 mol de gás.
   Lado dos produtos: 2 mol NH₃ = 2 mol de gás.
   O aumento da pressão desloca o equilíbrio no sentido de menor volume gasoso (sentido direto da formação de NH₃).
2. Efeito da Temperatura:
   Como a reação é exotérmica (ΔH < 0, libera calor), a diminuição da temperatura desloca o equilíbrio no sentido exotérmico, aumentando a produção de NH₃.
3. Observação: Catalisadores aumentam apenas a velocidade para atingir o equilíbrio, não alterando o rendimento final!
Alternativa B.`,
    difficultyLevel: 'Médio',
    sourceUrl: 'https://github.com/beatrizmilz/BancoDeQuestoes',
  },

  // =========================================================================
  // 33. CONCURSOS - RACIOCÍNIO LÓGICO - PROPOSIÇÕES
  // =========================================================================
  {
    id: 'conc-2023-rbm-33',
    vestibular: 'CONCURSOS',
    year: 2023,
    edition: 'Questões de Concursos Públicos',
    area: 'Matemática e suas Tecnologias',
    discipline: 'Matemática',
    topic: 'Raciocínio Lógico e Quantitativo',
    subtopic: 'Negação de Proposição Condicional (Se P então Q)',
    statement: 'Considere a proposição condicional: "Se o candidato estuda com afinco, então ele é aprovado no vestibular dos seus sonhos". De acordo com as leis do cálculo proposicional, a negação lógica correta dessa afirmação é expressa por:',
    alternatives: [
      { id: 'A', text: 'Se o candidato não estuda com afinco, então ele não é aprovado.' },
      { id: 'B', text: 'O candidato estuda com afinco e não é aprovado no vestibular dos seus sonhos.' },
      { id: 'C', text: 'O candidato não estuda com afinco ou é aprovado no vestibular dos seus sonhos.' },
      { id: 'D', text: 'Se o candidato é aprovado, então ele estudou com afinco.' },
      { id: 'E', text: 'O candidato não estuda com afinco e não é aprovado.' },
    ],
    correctAlternative: 'B',
    explanation: `Regra de Ouro do Raciocínio Lógico (Regra do MANÉ):
A negação de uma proposição condicional "P → Q" é "P ∧ ~Q" (Mantém a primeira e NEGA a segunda).
P = "O candidato estuda com afinco"
Q = "Ele é aprovado no vestibular dos seus sonhos"
Negação: "O candidato estuda com afinco E NÃO é aprovado no vestibular dos seus sonhos".
Alternativa B.`,
    difficultyLevel: 'Fácil',
    sourceUrl: 'https://github.com/rodrigoborgesmachado/questoesConcursos',
  },

  // =========================================================================
  // 34. CONCURSOS - LÍNGUA PORTUGUESA - CONCORDÂNCIA VERBAL
  // =========================================================================
  {
    id: 'conc-2023-rbm-34',
    vestibular: 'CONCURSOS',
    year: 2023,
    edition: 'Questões de Concursos Públicos',
    area: 'Linguagens, Códigos e suas Tecnologias',
    discipline: 'Língua Portuguesa e Literatura',
    topic: 'Gramática Normativa',
    subtopic: 'Concordância Verbal com Verbos Impessoais e Partícula "Se"',
    statement: 'Assinale a opção em que a concordância verbal obedece rigorosamente ao padrão culto da língua portuguesa:',
    alternatives: [
      { id: 'A', text: 'Houveram muitos incidentes durante a aplicação da primeira fase da prova.' },
      { id: 'B', text: 'Fazem dez anos que a comissão examinadora reformulou o edital.' },
      { id: 'C', text: 'Aluga-se salas comerciais no edifício central da universidade.' },
      { id: 'D', text: 'Tratam-se de questões prioritárias para a melhoria da infraestrutura.' },
      { id: 'E', text: 'Divulgaram-se as listas oficiais de classificação ontem à tarde.' },
    ],
    correctAlternative: 'E',
    explanation: `Análise Gramatical:
A) Incorreto: O verbo "haver" no sentido de existir ou ocorrer é impessoal, devendo ficar na 3ª pessoa do singular: "Houve muitos incidentes".
B) Incorreto: O verbo "fazer" indicando tempo transcorrido é impessoal: "Faz dez anos".
C) Incorreto: Com partícula apassivadora "se", o verbo concorda com o sujeito paciente: "Alugam-se salas comerciais".
D) Incorreto: Com índice de indeterminação do sujeito ("tratar-se de"), o verbo fica no singular: "Trata-se de questões".
E) Correto: "as listas oficiais de classificação" é sujeito paciente plural, logo o verbo passivo vai para o plural: "Divulgaram-se as listas".
Alternativa E.`,
    difficultyLevel: 'Médio',
    sourceUrl: 'https://github.com/rodrigoborgesmachado/questoesConcursos',
  },

  // =========================================================================
  // 35. ENEM - MATEMÁTICA - PROBABILIDADE CONDICIONAL
  // =========================================================================
  {
    id: 'enem-2023-mat-35',
    vestibular: 'ENEM',
    year: 2023,
    edition: 'Aplicação Regular',
    area: 'Matemática e suas Tecnologias',
    discipline: 'Matemática',
    topic: 'Probabilidade',
    subtopic: 'Probabilidade Condicional e Espaço Amostral Reduzido',
    statement: 'Em um grupo de 100 vestibulandos inscritos para o ENEM, 60 optaram por realizar a prova de Língua Inglesa e 40 por Língua Espanhola. Entre os que escolheram Inglês, 45 são do sexo feminino. Entre os que escolheram Espanhol, 25 são do sexo feminino. Sorteando-se ao acaso um estudante desse grupo e sabendo antecipadamente que se trata de uma mulher, qual é a probabilidade de ela ter escolhido a opção de Língua Inglesa?',
    alternatives: [
      { id: 'A', text: '9/14' },
      { id: 'B', text: '9/20' },
      { id: 'C', text: '3/4' },
      { id: 'D', text: '5/7' },
      { id: 'E', text: '1/2' },
    ],
    correctAlternative: 'A',
    explanation: `Passo a passo pela Probabilidade Condicional P(A|B):
1. Espaço amostral reduzido (total de mulheres):
   Mulheres com Inglês: 45
   Mulheres com Espanhol: 25
   Total de mulheres = 45 + 25 = 70.
2. Casos favoráveis (mulheres que escolheram Inglês): 45.
3. Probabilidade Condicional:
   P(Inglês | Mulher) = 45 / 70.
4. Simplificando a fração por 5:
   45 / 5 = 9
   70 / 5 = 14
   P = 9/14.
Alternativa A.`,
    triParams: { a: 1.80, b: 0.60, c: 0.20 },
    difficultyLevel: 'Difícil',
    sourceUrl: 'https://enem.dev',
  },
];

