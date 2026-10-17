/**
 * @file src/services/ingestion/questionClassifier.ts
 * @description Classificador de Matéria (nível 2.5) e Conteúdo Específico (nível 3) das questões
 * importadas da API enem.dev. A API só informa a ÁREA (ciencias-natureza, ciencias-humanas,
 * linguagens, matematica); a matéria (Física, Química, História...) e o conteúdo (Genética,
 * Eletrodinâmica, Geometria Espacial...) são inferidos aqui por pontuação de palavras-chave.
 *
 * Cada conteúdo pertence a uma matéria. A questão recebe o conteúdo de maior pontuação dentro da
 * sua área; a matéria é a do conteúdo vencedor. Sem nenhum acerto, cai no conteúdo geral da área.
 */

import type { AreaOfKnowledge, DisciplineType } from '../../types/index.ts';

interface TopicRule {
  topic: string;
  discipline: DisciplineType;
  /** [expressão aplicada ao texto SEM acentos e em minúsculas, peso] */
  keywords: Array<[RegExp, number]>;
}

/** Remove acentos, markdown de imagem/URL e caixa alta para facilitar a busca por palavras-chave. */
export function normalizeForClassification(text: string): string {
  return (text || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// ---------------------------------------------------------------------------
// CIÊNCIAS DA NATUREZA
// ---------------------------------------------------------------------------
const NATUREZA_RULES: TopicRule[] = [
  // ---- FÍSICA
  { topic: 'Mecânica', discipline: 'Física', keywords: [
    [/\bforca\b|\bforcas\b/, 2], [/newton/, 3], [/aceleracao/, 3], [/\batrito/, 3], [/velocidade (media|escalar|constante)/, 2],
    [/movimento (uniform|retilineo|circular)/, 3], [/\bcolisao|\bcolidem|\bimpulso\b/, 3], [/quantidade de movimento/, 3],
    [/\balavanca|\btorque\b|\bmomento de uma forca/, 3], [/plano inclinado|\bpendulo|\bmola\b|lei de hooke/, 3],
    [/lancamento|queda livre|\bprojetil/, 3], [/\bfreia|\bfrenagem|\bderrap/, 2], [/\bpolia|\broldana/, 3],
  ]},
  { topic: 'Energia e Trabalho', discipline: 'Física', keywords: [
    [/energia (cinetica|potencial|mecanica)/, 4], [/\btrabalho (de uma|realizado)/, 2], [/\bjoule/, 2], [/conservacao da energia/, 4],
    [/\bpotencia (do|da|de|util|media|nominal)/, 2], [/\busina (hidreletrica|termeletrica|nuclear|eolica)/, 2], [/rendimento/, 2],
    [/\bkwh\b|quilowatt/, 3], [/\bturbina/, 2],
  ]},
  { topic: 'Eletrodinâmica', discipline: 'Física', keywords: [
    [/corrente eletrica/, 4], [/resistor|resistencia eletrica/, 4], [/\bcircuito/, 3], [/\bvoltagem|\btensao eletrica|diferenca de potencial|\bddp\b/, 4],
    [/\bampere|\bohm\b|\bvolts?\b/, 3], [/chuveiro eletrico|lampada|\bfusivel|\bdisjuntor|tomada|\bfiacao|\bfio de cobre/, 2],
    [/\bpotencia eletrica|consumo de energia eletrica|\bwatts?\b/, 3], [/\bcapacitor|\bbateria de celular/, 2], [/\bgerador|\bsuperaquecimento de fios/, 1],
  ]},
  { topic: 'Eletromagnetismo', discipline: 'Física', keywords: [
    [/campo magnetico|\bima\b|\bimas\b|\bmagnetismo|\bmagnetic/, 4], [/inducao eletromagnetica|\bindutor|\bbobina|\btransformador/, 4],
    [/campo eletrico|carga eletrica|eletrizacao|\beletrostatic|\bcoulomb|\bpara-?raios/, 4], [/\bmotor eletrico|\bdinamo|\bbussola/, 3],
    [/forca eletromotriz|\bfem\b|\bgaiola de faraday|\bfaraday/, 3],
  ]},
  { topic: 'Termologia', discipline: 'Física', keywords: [
    [/calor especifico|capacidade termica|\bcalorimetro/, 4], [/dilatacao|\bcondutividade termica|\bisolante termico|\bconducao|\bconveccao|\bconveccao/, 3],
    [/temperatura/, 1], [/\bcalor\b/, 1], [/termodinamic|maquina termica|\bciclo de carnot|\bcarnot/, 4], [/escala (celsius|kelvin|fahrenheit)|\bkelvin/, 3],
    [/mudanca de (fase|estado)|\bcalor latente|\bsensacao termica/, 2], [/\bgarrafa termica|\bgeladeira|refrigerador/, 2],
  ]},
  { topic: 'Óptica', discipline: 'Física', keywords: [
    [/\blente|\blentes/, 4], [/\bespelho/, 4], [/refracao|\brefrat|indice de refracao/, 4], [/reflexao|\brefletid|\brefletor/, 3],
    [/\bmiopia|\bhipermetropia|\bastigmatismo/, 3], [/\bluz (branca|visivel|solar)|\braio de luz|\braios de luz|\bprisma|\bpolariza/, 3],
    [/\bfibra optica|\bfotografica|\bcamera escura|\blupa\b|\bmicroscopio/, 3], [/\bcor\b.*\bluz|\bdispersao da luz|\barco-iris|\beclipse/, 3],
  ]},
  { topic: 'Ondulatória e Acústica', discipline: 'Física', keywords: [
    [/\bonda|\bondas|ondulatori/, 3], [/frequencia/, 2], [/comprimento de onda/, 4], [/\bsom\b|\bsonor|\bacustic|\bultrassom|\binfrassom/, 3],
    [/efeito doppler|\bdoppler/, 5], [/\bressonancia|\bintensidade sonora|\bdecibel|\bhertz/, 4], [/\binterferencia|\bdifracao|\bsuperposicao de ondas/, 3],
    [/\bmicro-?ondas|\bradiacao eletromagnetica|\bespectro eletromagnetico|\bsinal de (radio|wi)|\bantena/, 3], [/\bviolao|\bcorda vibrante|\binstrumento musical|\btimbre/, 3],
  ]},
  { topic: 'Hidrostática', discipline: 'Física', keywords: [
    [/\bempuxo/, 5], [/pressao (atmosferica|hidrostatica|do ar|da agua)|\bhidrostatic|\bvasos comunicantes|\bprincipio de (pascal|arquimedes|stevin)/, 5],
    [/\bflutu|\bafunda|\bsubmerso|\bbarometro/, 3], [/\bmanometro|\bseringa|\bmacaco hidraulico|\bprensa hidraulica/, 3], [/\bdensidade/, 1],
  ]},
  { topic: 'Gravitação e Astronomia', discipline: 'Física', keywords: [
    [/\bgravitacao|\bgravitacional|forca gravitacional|\bforca peso\b/, 4], [/\borbita|\borbital|\bsatelite|\bplaneta|\bsistema solar|\bgalaxia|\bastronom/, 3],
    [/\blua\b.*\bmare|\bmares\b|\bkepler|\bmovimento de translacao|\bgeoestacionario|\bgravidade\b/, 3], [/\bmicrogravidade|\bastronauta|\bestacao espacial/, 4],
  ]},
  { topic: 'Física Moderna e Radiação', discipline: 'Física', keywords: [
    [/efeito fotoeletrico|\bfoton|\bquantic|\brelatividade|\bboson/, 5], [/\braios? x\b|\braio gama|\braios gama|\bradiacao ionizante|\bradioatividade|\bradioativ/, 2],
    [/\bpainel (solar|fotovoltaico)|\bcelula (solar|fotovoltaica)|\benergia solar fotovoltaica/, 2],
  ]},

  // ---- QUÍMICA
  { topic: 'Química Orgânica', discipline: 'Química', keywords: [
    [/\bhidrocarboneto|\balcano|\balceno|\balcino|\bbenzeno|\baromatic/, 5], [/\bfuncao organica|\bgrupo funcional|\bcarboxil|\bhidroxil|\bamina\b|\bamida\b/, 5],
    [/\balcool\b|\balcoois|\betanol|\bmetanol|\bester\b|\besteres|\bcetona|\baldeido|\beter\b|\bfenol/, 3], [/\bisomer|\bpolimer|\bplastico|\bborracha\b|\bpoliester|\bpolietileno|\bpvc\b|\bnylon|\bnailon/, 3],
    [/\bsaponifica|\bsabao|\bsabao|\bdetergente|\btensoativo|\bgordura|\bacidos graxos|\btriglicer|\bbiodiesel|\btransesterifica/, 3],
    [/\bcadeia carbonica|\bcarbono (quiral|assimetrico)|\bquiral|\bdupla ligacao entre carbonos|\binsaturad|\bsaturad/, 4], [/\bpetroleo|\bgasolina|\bgas natural|\bdestilacao fracionada/, 2],
    [/\bacido (carboxilico|acetico|lactico|citrico|ascorbico)|\bvinagre/, 3], [/\baspirina|\bparacetamol|\bfarmaco|\bmedicamento.*molecula/, 2], [/formula estrutural|\bcomposto organico|\bmolecula organica/, 4],
  ]},
  { topic: 'Soluções e Concentração', discipline: 'Química', keywords: [
    [/\bsolucao|\bsolucoes/, 3], [/\bconcentracao/, 3], [/mol\/?\s?l|mol l|\bmolaridade|\bmol por litro|g\/l|\bppm\b/, 5], [/\bsoluto|\bsolvente|\bdiluic|\bdiluir|\bsolubilidade|\bsaturad/, 4],
    [/\bmisturas?\b.*\bhomogene|\bcoeficiente de solubilidade|\bevapora(cao|r) da agua/, 2], [/\bsoro (fisiologico|caseiro)|\bsalinidade|\bagua do mar/, 1],
  ]},
  { topic: 'Ácidos, Bases e pH', discipline: 'Química', keywords: [
    [/\bph\b|\bpoh\b/, 5], [/\bacido|\bacidos|\bacidez|\bacidific/, 2], [/\bbase\b.*\bhidroxido|\bhidroxido|\bbasico|\balcalin|\bantiacido|\bneutraliza/, 3],
    [/\bindicador (de ph|acido)|\bfenolftaleina|\btitulacao|\bsal (de|inorganico)|\bcarbonato|\bbicarbonato/, 3], [/\bchuva acida|\btampao|\bequilibrio ionico/, 3],
  ]},
  { topic: 'Eletroquímica', discipline: 'Química', keywords: [
    [/\bpilha|\bpilhas|\beletrodo|\banodo|\bcatodo|\bpotencial padrao|\bponte salina/, 5], [/\beletrolise|\beletrolitic|\bgalvanizacao|\bgalvanic|\bbateria\b/, 4],
    [/\boxidacao|\breducao|\boxirreducao|\bagente (oxidante|redutor)|\bnox\b|\bferrugem|\bcorrosao|\bcorroi|\bcorroer/, 3], [/\bzinco|\bcobre\b|\bprata\b|\bestanho|\bmagnesio.*\bcasco|\bprotecao catodica/, 1],
  ]},
  { topic: 'Termoquímica', discipline: 'Química', keywords: [
    [/\bentalpia|\btermoquimic|\breacao (exotermica|endotermica)|\bexotermic|\bendotermic|\bvariacao de entalpia|\bkj\/mol|\bkcal\/mol|\bkj mol|poder calorifico/, 5],
    [/\bcombustao|\bcombustivel|\bcombustiveis|\bcalor de (combustao|formacao|reacao)|\benergia liberada na/, 2], [/\blei de hess|\benergia de ligacao/, 5],
  ]},
  { topic: 'Cinética e Equilíbrio Químico', discipline: 'Química', keywords: [
    [/\bequilibrio quimico|\bconstante de equilibrio|\bprincipio de le chatelier|\bdeslocamento do equilibrio|\bdeslocar o equilibrio|\breacao reversivel/, 5],
    [/\bcinetica quimica|\bvelocidade (da|de) reacao|\bcatalisador|\bcatalis|\benergia de ativacao|\bvelocidade de decomposicao|\bvelocidade de reacao|\bmeia-vida\b/, 4],
    [/\bsuperficie de contato|\bfatores que alteram a velocidade|\bdecomposicao do/, 2],
  ]},
  { topic: 'Estequiometria e Cálculos Químicos', discipline: 'Química', keywords: [
    [/\bestequiometri|\bmassa molar|\bnumero de avogadro|\bconstante de avogadro|\bmols?\b|\brendimento da reacao|\breagente limitante|\bbalanceamento/, 4],
    [/\breacao quimica|\bequacao quimica|\bprodutos?\b.*\breagentes?\b|\breagentes?\b|\bmassa atomica/, 2], [/\bg\/mol|\bmassa de (carbono|oxigenio|hidrogenio)|\bvolume molar|\bcntp|\bcondicoes normais/, 4],
    [/\bgas ideal|\blei dos gases|\bgases (ideais|perfeitos)|\bpressao parcial|\btransformacao (isotermica|isobarica|isocoric)|\bpv\s?=\s?nrt/, 4],
  ]},
  { topic: 'Ligações Químicas e Propriedades', discipline: 'Química', keywords: [
    [/\bligacao (ionica|covalente|metalica|quimica)|\bligacoes (ionicas|covalentes|metalicas|quimicas|de hidrogenio)|\bpontes? de hidrogenio|\bforcas intermoleculares|\binteracao(oes)? intermolecular/, 5],
    [/\bpolar\b|\bapolar|\bpolaridade|\bgeometria molecular|\bponto de (fusao|ebulicao)|\bsolido ionico|\bcondutividade eletrica de (solidos|metais)|\bnuvem eletronica/, 3],
    [/\bsubstancia (simples|composta)|\bagua oxigenada|\bperoxido|\bozonio|\bnanotub|\bgrafite|\bdiamante|\bfulereno|\bgrafeno|\bnanomaterial|\bnanoparticul/, 2],
  ]},
  { topic: 'Atomística e Tabela Periódica', discipline: 'Química', keywords: [
    [/\btabela periodica|\bnumero atomico|\bnumero de massa|\bisotopo|\bisotopos|\beletronegatividade|\bdistribuicao eletronica|\bmodelo atomico|\bcamada de valencia|\bnivel de energia/, 5],
    [/\batomo\b|\batomos\b|\beletron|\bprotons?\b|\bneutron|\bnucleo atomico|\bcation|\banion|\bionico\b|\bions?\b|\belemento quimico|\bmetais? alcalin|\bgases nobres|\bhalogen/, 2],
  ]},
  { topic: 'Separação de Misturas e Materiais', discipline: 'Química', keywords: [
    [/\bdestilacao|\bdecantacao|\bfiltracao|\bcentrifugacao|\bcristalizacao|\bsublimacao|\bseparacao de (misturas|fases|componentes)|\bmistura (heterogenea|homogenea|azeotropica)|\bfase (aquosa|organica)|\bfuncionamento do filtro|\bcarvao ativado/, 5],
    [/\bliga metalica|\bmineral\b|\bminerio|\bmetalurgia|\bsiderurgia|\bcimento\b|\bvidro\b|\bceramica|\bpurificacao/, 2],
  ]},
  { topic: 'Química Ambiental', discipline: 'Química', keywords: [
    [/\befeito estufa|\baquecimento global|\bgases? (do efeito )?estufa|\bco2\b|\bdioxido de carbono|\bgas carbonico|\bmetano\b|\bmonoxido de carbono|\bnox\b|\bso2\b|\bdioxido de enxofre|\bcamada de ozonio|\bcfc\b/, 3],
    [/\bpoluic|\bpoluente|\bpolui|\bcontamina|\bmetais pesados|\bmercurio|\bchumbo|\bcadmio|\beutrofiza|\bresiduos?\b|\blixo\b|\breciclagem|\bchorume|\bagrotoxico|\bpesticida|\bagua potavel|\btratamento de (agua|esgoto)|\bdesinfec|\bcloracao|\bcloro\b/, 2],
    [/\bchuva acida|\bsmog|\bderramamento de petroleo|\bmares? negra|\bbiocombustivel|\bbiogas|\benergia renovavel|\bsustentavel/, 2],
  ]},
  { topic: 'Radioatividade', discipline: 'Química', keywords: [
    [/\bradioativ|\bradioisotopo|\bdecaimento|\bemissao (alfa|beta|gama)|\bparticulas? (alfa|beta)|\bfissao nuclear|\bfusao nuclear|\bmeia-vida|\bmeia vida|\bcarbono-14|\bcarbono 14|\buranio|\bplutonio|\bcesio|\bchernobyl|\bcesio-137|\breator nuclear|\busina nuclear|\bresiduo nuclear|\bdatacao/, 5],
  ]},

  // ---- BIOLOGIA
  { topic: 'Ecologia', discipline: 'Biologia', keywords: [
    [/\becossistema|\bcadeia alimentar|\bteia alimentar|\bnivel trofico|\bniveis troficos|\bproduto(r|res) primario|\bconsumidor(es)?\b|\bdecompositor|\bbioma|\bbiodiversidade|\bhabitat|\bnicho ecologico|\bpopulacao (de|natural)|\bcomunidade biologica/, 4],
    [/\bpredador|\bpresa\b|\bpresas\b|\bsimbiose|\bmutualismo|\bcomensalismo|\bparasitismo|\binquilinismo|\bcompeticao|\bciclo (do carbono|do nitrogenio|da agua|biogeoquimico)|\bsucessao ecologica|\bespecie (invasora|exotica|endemica)/, 4],
    [/\bmata atlantica|\bamazonia|\bcerrado|\bcaatinga|\bpantanal|\bmanguezal|\brestinga|\bfloresta|\bdesmatamento|\bqueimada|\bconservacao|\bextincao|\bunidade de conservacao|\bimpacto ambiental|\bsustentabilidade|\bpegada ecologica|\bmeio ambiente/, 1],
    [/\bbioacumul|\bmagnificacao trofica|\bequilibrio ecologico|\bpiramide (de|ecologica)|\bfluxo de energia|\bfitoplancton|\bzooplancton/, 4],
  ]},
  { topic: 'Genética', discipline: 'Biologia', keywords: [
    [/\bgene\b|\bgenes\b|\bgenetic|\balelo|\balelos|\bgenotipo|\bfenotipo|\bdominante|\brecessiv|\bheranca|\bheredit|\bhomozigot|\bheterozigot|\bmendel|\bcruzamento|\bcodominan|\bligada ao sexo/, 5],
    [/\bdna\b|\bacido desoxirribonucleico|\bcromossom|\bcariotipo|\bmutacao|\bmutacoes|\bmutagen|\bcancer|\bsindrome de|\btrissomia|\bdaltonismo|\bhemofilia|\banemia falciforme/, 3],
    [/\barn\b|\brna\b|\btranscricao|\btraducao do|\bcodon|\bcodigo genetico|\bsintese proteica|\bribossomo/, 3],
  ]},
  { topic: 'Biotecnologia e Engenharia Genética', discipline: 'Biologia', keywords: [
    [/\btransgenic|\borganismo geneticamente modificado|\bogm\b|\bclonagem|\bclone\b|\bclones\b|\bengenharia genetica|\bdna recombinante|\bpcr\b|\bgenoma|\bcelulas?-tronco|\bterapia genica|\bcrispr|\bteste de dna|\bexame de dna|\bpaternidade|\bimpressao genetica|\bvacina de dna|\bbiotecnolog/, 5],
    [/\bfermentacao industrial|\bproducao de (insulina|etanol|vacina)|\bmelhoramento|\bplasmideo|\benzima de restricao|\bbioreator|\bbioquimica industrial/, 3],
  ]},
  { topic: 'Evolução', discipline: 'Biologia', keywords: [
    [/\bevolucao|\bevolutiv|\bevoluiu|\bselecao natural|\bdarwin|\blamarck|\bespeciacao|\bancestral comum|\bfossil|\bfosseis|\badaptacao|\badaptativ|\bresistencia (a|aos) (antibiotico|inseticida|pesticida|herbicida)|\bhomologia|\banalogia|\borgaos vestigiais|\bderiva genetica|\bfiletic|\bfilogen|\barvore filogenetica|\bhominideo|\bhomo sapiens|\bneandertal|\borigem da vida|\babiogenese|\bgeracao espontanea|\bcoevolucao/, 5],
  ]},
  { topic: 'Citologia e Biologia Celular', discipline: 'Biologia', keywords: [
    [/\bcelula\b|\bcelulas\b|\bcelular\b|\bmembrana plasmatica|\bmitocondria|\bcloroplasto|\bnucleo celular|\borganela|\bcitoplasma|\bribossomos|\breticulo endoplasmatico|\bcomplexo de golgi|\blisossomo|\bparede celular|\beucarionte|\bprocarionte|\bosmose|\bdifusao|\btransporte (ativo|passivo)|\bmitose|\bmeiose|\bciclo celular|\bdivisao celular|\bapoptose|\bcitoesqueleto|\bcelula (animal|vegetal)/, 3],
  ]},
  { topic: 'Bioquímica e Metabolismo', discipline: 'Biologia', keywords: [
    [/\bfotossintese|\bfotossintet|\brespiracao celular|\brespiracao aerobica|\bfermentacao|\bglicolise|\bciclo de krebs|\batp\b|\benzima|\benzimas|\benzimatic|\bproteina|\bproteinas|\bcarboidrato|\blipidio|\blipideo|\bglicose|\bamido\b|\bglicogenio|\bcolesterol|\bvitamina|\bmetabolismo|\bmetabolic|\bfosforilacao|\bquimiossintese|\bclorofila|\bpigmento fotossintetico|\bluz.*\bcloroplasto/, 3],
  ]},
  { topic: 'Fisiologia Humana', discipline: 'Biologia', keywords: [
    [/\bsistema (nervoso|digestorio|digestivo|circulatorio|respiratorio|endocrino|imunologico|imune|excretor|urinario|reprodutor|muscular|esqueletico)/, 5],
    [/\bcoracao|\bsangue|\bhemacia|\bglobulos?|\bplaquetas|\bhemoglobina|\bpulmao|\bpulmoes|\brim\b|\brins\b|\bfigado|\bpancreas|\bintestino|\bestomago|\bneuronio|\bneuronios|\bsinapse|\bneurotransmissor|\bhormonio|\bhormonios|\binsulina|\bdiabetes|\bhipertensao|\bpressao arterial|\bcerebro|\bmusculo|\bosso\b|\bossos\b|\bpele\b|\bsuor|\bsistema linfatico|\banticorpo|\bantigeno|\bimunidade|\bfagocit|\blinfocit|\balergia|\bcirculacao|\bdigestao|\bapetite|\bobesidade|\btireoide|\bmenstru|\bciclo menstrual|\bovulacao|\banticoncepcional|\bgravidez|\bgestacao|\placenta|\bespermatozoide|\boocito|\bfecundacao|\bembriao|\bfeto\b|\bamamentacao/, 2],
  ]},
  { topic: 'Microbiologia e Saúde Pública', discipline: 'Biologia', keywords: [
    [/\bvirus\b|\bviral|\bbacteria|\bbacteriano|\bbacteriana|\bfungo|\bfungos|\bprotozoario|\bparasita|\bparasitose|\bverminose|\bhelminto|\bdoenca|\bdoencas|\bepidemia|\bpandemia|\bsurto|\bendemia|\bvacina|\bvacinacao|\bimuniza|\bantibiotico|\bmicroorganismo|\bmicrobio|\bpatogen|\binfeccao|\binfectad|\bdengue|\bzika|\bchikungunya|\bmalaria|\bchagas|\bleishmaniose|\besquistossomose|\bgripe|\bhiv\b|\baids\b|\bcovid|\bsars|\bcoronavirus|\btuberculose|\bhepatite|\bsaneamento|\bsaude publica|\bvetor\b|\btransmissao|\bmosquito|\baedes|\bhigiene|\bcolera|\bleptospirose|\btoxoplasmose|\bfebre amarela|\bsarampo|\bhpv\b|\bcandidiase|\blevedura|\bfermento biologico/, 3],
  ]},
  { topic: 'Botânica', discipline: 'Biologia', keywords: [
    [/\bplanta\b|\bplantas\b|\bvegetal\b|\bvegetais\b|\bfolha\b|\bfolhas\b|\braiz\b|\braizes\b|\bcaule|\bflor\b|\bflores\b|\bfruto|\bsemente|\bpolinizacao|\bpolinizador|\bestomato|\bxilema|\bfloema|\bseiva|\bgerminacao|\bauxina|\bfototropismo|\bgimnosperma|\bangiosperma|\bpteridofita|\briofita|\bsamambaia|\bmusgo|\balga\b|\balgas\b|\bcultivo|\bcultura agricola|\bhorta|\bsolo fertil|\badubo|\bfertilizante|\bagricultura|\blavoura|\bfotoperiodismo|\bhormonio vegetal|\betileno/, 3],
  ]},
  { topic: 'Zoologia', discipline: 'Biologia', keywords: [
    [/\banimal\b|\banimais\b|\binseto|\bartropode|\baracnideo|\bcrustaceo|\bmolusco|\bmamifero|\banfibio|\brepti(l|s)|\bave\b|\baves\b|\bpeixe|\bpeixes|\bvertebrado|\binvertebrado|\bcelenterado|\bcnidario|\bplatelminto|\bnematelminto|\bequinoderma|\bporifero|\bmetamorfose|\babelha|\bformiga|\bcupim|\bbaleia|\bgolfinho|\bcobra\b|\bserpente|\bveneno|\bpeconha|\banelideo|\bminhoca|\btartaruga|\bsapo\b|\bra\b|\bpassaro|\bmorcego|\bcamuflagem|\bmimetismo/, 2],
  ]},
];

// ---------------------------------------------------------------------------
// CIÊNCIAS HUMANAS
// ---------------------------------------------------------------------------
const HUMANAS_RULES: TopicRule[] = [
  // ---- HISTÓRIA
  { topic: 'Brasil Colônia', discipline: 'História', keywords: [
    [/\bbrasil colonia|\bperiodo colonial|\bcolonizacao portuguesa|\bcapitanias|\bengenho|\bbandeirante|\bjesuita|\bcatequese|\bcolonia portuguesa|\bpau-brasil|\bciclo do ouro|\bminas gerais colonial|\binconfidencia|\bconjuracao|\bcarta regia|\bpacto colonial|\bsistema colonial|\bquilombo|\bpalmares|\bzumbi|\bgovernador-geral|\bdominio holandes|\bholandeses no brasil|\binvasoes holandesas|\bcana-de-acucar|\bsesmaria/, 4],
  ]},
  { topic: 'Brasil Império', discipline: 'História', keywords: [
    [/\bbrasil imperio|\bsegundo reinado|\bprimeiro reinado|\bdom pedro (i|ii)\b|\bregencia|\bindependencia do brasil|\bguerra do paraguai|\blei do ventre livre|\blei aurea|\babolicao|\babolicionis|\blei eusebio de queiroz|\bcafeicultura|\bbarao do cafe|\bcabanagem|\bfarroupilha|\bsabinada|\bbalaiada|\bpoder moderador|\bimperador|\bimperio brasileiro|\bimigracao europeia|\bimigrantes (italianos|alemaes)|\bproclamacao da republica/, 4],
  ]},
  { topic: 'Brasil República (1889–1930)', discipline: 'História', keywords: [
    [/\brepublica velha|\bpolitica do cafe com leite|\bcafe com leite|\bcoronelismo|\bvoto de cabresto|\bcanudos|\bcontestado|\brevolta da (vacina|chibata)|\btenentismo|\bsemana de arte moderna|\bprimeira republica|\bpolitica dos governadores|\bcangaco|\bpadre cicero|\bindustrializacao inicial/, 4],
  ]},
  { topic: 'Era Vargas e República Populista', discipline: 'História', keywords: [
    [/\bvargas|\bestado novo|\brevolucao de 1930|\bclt\b|\bconsolidacao das leis do trabalho|\bpopulismo|\bjuscelino|\bjk\b|\bplano de metas|\bcinquenta anos em cinco|\bbrasilia\b.*\bconstru|\bjanio quadros|\bjoao goulart|\bjango|\bsuicidio de getulio|\bdutra|\bintegralismo|\bdasp|\bsindicato.*estado/, 4],
  ]},
  { topic: 'Ditadura Militar e Redemocratização', discipline: 'História', keywords: [
    [/\bditadura militar|\bregime militar|\bgolpe de 1964|\bai-?5\b|\bato institucional|\bmilagre economico|\bdiretas ja|\bconstituicao de 1988|\bredemocratizacao|\banistia|\btortura|\bdesaparecid|\bcensura|\bmovimento estudantil|\btropicalismo|\bmarcha dos cem mil|\bguerrilha do araguaia|\bcomissao da verdade|\bcollor|\bimpeachment|\bplano real|\bnova republica|\bmedici|\bgeisel/, 4],
  ]},
  { topic: 'Antiguidade e Idade Média', discipline: 'História', keywords: [
    [/\bgrecia|\bgrego|\bgregos|\broma antiga|\bromano|\bromanos|\bimperio romano|\bpolis\b|\batenas|\besparta|\bdemocracia ateniense|\bmesopotamia|\begito antigo|\begipcio|\bfaraos?\b|\bfenicio|\bhebreu|\bpersa|\bcristianismo primitivo|\bidade media|\bfeudal|\bfeudalismo|\bsenhor feudal|\bservidao|\bcruzadas|\bmedieval|\bigreja medieval|\bmonge|\bburgo|\bburgues medieval|\bmulcumano|\bislamismo|\bislamic|\barabe|\bmuculmano|\bmaometo|\bcarlos magno|\bbizantin|\bimperio bizantino|\bpeste negra|\binquisicao/, 4],
  ]},
  { topic: 'Idade Moderna e Revoluções Burguesas', discipline: 'História', keywords: [
    [/\brenascimento|\brenascentista|\breforma protestante|\blutero|\bcalvino|\bcontrarreforma|\babsolutismo|\bmercantilismo|\bgrandes navegacoes|\bexpansao maritima|\biluminismo|\biluminista|\brevolucao francesa|\brevolucao inglesa|\brevolucao gloriosa|\bindependencia dos estados unidos|\brevolucao americana|\bdespotismo esclarecido|\bnapoleao|\bsociedade de corte|\bluis xiv|\bcolonizacao da america|\bconquista da america|\bastecas?\b|\bincas?\b|\bmaias?\b|\btrafico negreiro|\btrafico de escravos|\btrabalho escravo|\bescravidao moderna|\bacumulacao primitiva/, 4],
  ]},
  { topic: 'Século XIX: Industrialização e Imperialismo', discipline: 'História', keywords: [
    [/\brevolucao industrial|\bproletariado|\boperari|\bluddismo|\bcartismo|\bsocialismo utopico|\bmarxismo|\bimperialismo|\bneocolonialismo|\bpartilha da africa|\bconferencia de berlim|\bunificacao (alema|italiana)|\bcapitalismo industrial|\bliberalismo|\brevolucoes de 1848|\bprimavera dos povos|\bguerra do opio|\bera vitoriana|\bsegunda revolucao industrial|\bdarwinismo social|\bracismo cientifico|\bbelle epoque|\bcomuna de paris/, 4],
  ]},
  { topic: 'Século XX: Guerras, Totalitarismos e Guerra Fria', discipline: 'História', keywords: [
    [/\bprimeira guerra mundial|\bsegunda guerra mundial|\bguerra mundial|\bnazismo|\bnazista|\bfascismo|\bfascista|\bholocausto|\bhitler|\bmussolini|\bstalin|\brevolucao russa|\bbolchevique|\bleninism|\bguerra fria|\bcortina de ferro|\bmuro de berlim|\bdescolonizacao|\bguerra do vietna|\bguerra da coreia|\bcrise de 1929|\bnew deal|\bgrande depressao|\burss\b|\buniao sovietica|\bcuba\b.*\brevolucao|\bcastro|\bchile\b.*\ballende|\bditaduras? (latino|na america)|\bcondor|\bonu\b|\bnato\b|\bpacto de varsovia|\bapartheid|\bmandela|\bterrorismo|\bpost-?guerra|\bpos-guerra|\bprimavera arabe|\bglobalizacao neoliberal|\bqueda do muro/, 4],
  ]},
  { topic: 'África, Povos Indígenas e Cultura Afro-brasileira', discipline: 'História', keywords: [
    [/\bafrica antiga|\breinos africanos|\bpovos africanos|\bafricanos escravizados|\bcultura afro|\bafro-brasileir|\bcandomble|\bumbanda|\bcapoeira|\bquilombola|\bpovos indigenas|\bpovos originarios|\bindigena|\bindigenas|\bindio\b|\bindios\b|\bterra indigena|\btupi|\bguarani|\bmovimento negro|\bconsciencia negra|\bracismo estrutural|\bcotas raciais|\bnegritude|\bdiaspora africana|\bsincretismo/, 4],
  ]},

  // ---- GEOGRAFIA
  { topic: 'Cartografia e Orientação', discipline: 'Geografia', keywords: [
    [/\bcartograf|\bmapa\b|\bmapas\b|\bescala (do mapa|cartografica|grafica|numerica)|\bprojecao cartografica|\bmercator|\bcoordenadas geograficas|\blatitude|\blongitude|\bfuso horario|\bmeridiano|\bparalelo|\bgps\b|\bsensoriamento remoto|\bgeoprocessamento|\bimagem de satelite|\blegenda do mapa|\bcurvas de nivel|\bcarta topografica|\brosa dos ventos|\borientacao/, 4],
  ]},
  { topic: 'Geografia Física: Relevo, Clima e Hidrografia', discipline: 'Geografia', keywords: [
    [/\brelevo|\bplanalto|\bplanicie|\bdepressao\b|\bserra\b|\bplacas tectonicas|\bterremoto|\bvulcao|\bvulcanismo|\bintemperismo|\berosao|\bsolo\b|\bsolos\b|\bpedologia|\bgeomorfolog|\bgeologia|\brocha\b|\brochas\b|\bclima\b|\bclimas\b|\bclimatic|\bclimatologia|\bmassas? de ar|\bfrente fria|\bel nino|\bla nina|\bchuva\b|\bchuvas\b|\bprecipitacao|\bmoncao|\bmonsao|\bfurac|\bciclone|\btornado|\bseca\b|\bsemiarido|\bhidrografia|\bbacia hidrografica|\brio\b|\brios\b|\baquifero|\blencol freatico|\bdeserti|\bglaciar|\bgeleira|\bcalota polar|\bgelo\b/, 2],
  ]},
  { topic: 'Biomas, Meio Ambiente e Sustentabilidade', discipline: 'Geografia', keywords: [
    [/\bbioma|\bdominios morfoclimaticos|\bdominios morfoclimaticos|\bmata atlantica|\bamazonia|\bcerrado|\bcaatinga|\bpampa|\bpantanal|\bdesmatamento|\bqueimada|\bdegradacao ambiental|\bsustentabilidade|\bdesenvolvimento sustentavel|\baquecimento global|\bmudancas climaticas|\bprotocolo de quioto|\bacordo de paris|\bcop\b|\bconferencia do rio|\becodesenvolvimento|\bunidades de conservacao|\bpreservacao ambiental|\bimpacto ambiental|\bcrise hidrica|\bescassez de agua|\bresiduos solidos|\bcoleta seletiva|\bdesertificacao|\barenizacao|\bareas de preservacao/, 3],
  ]},
  { topic: 'Geografia Urbana', discipline: 'Geografia', keywords: [
    [/\burbaniza|\burbano\b|\burbana\b|\bcidade\b|\bcidades\b|\bmetropole|\bregiao metropolitana|\bmegacidade|\bconurbacao|\bperiferia|\bfavela|\bsegregacao (urbana|socioespacial)|\bespeculacao imobiliaria|\bgentrifica|\bmobilidade urbana|\btransporte publico|\btransito\b|\bmoradia|\bdeficit habitacional|\bplano diretor|\bestatuto da cidade|\bverticaliza|\bilha de calor|\benchente|\balagamento|\bsaneamento basico|\brede urbana|\bhierarquia urbana|\bexodo rural/, 3],
  ]},
  { topic: 'Geografia Agrária', discipline: 'Geografia', keywords: [
    [/\bagricultura|\bagropecuaria|\bagronegocio|\bagrario|\bagraria|\breforma agraria|\bmst\b|\blatifundio|\bminifundio|\bmonocultura|\bpolicultura|\bagricultura familiar|\bagricultura de subsistencia|\bplantation|\bmecanizacao do campo|\brevolucao verde|\bcommodities|\bsoja\b|\bpecuaria|\bgado\b|\bfronteira agricola|\bcampesino|\bcamponeses|\bagroecologia|\borganicos?\b|\btransgenicos? na agricultura|\birrigacao|\bproducao de alimentos|\bseguranca alimentar|\bfome\b/, 3],
  ]},
  { topic: 'População, Migrações e Demografia', discipline: 'Geografia', keywords: [
    [/\bdemografi|\bpopulacao (mundial|brasileira|absoluta|relativa|economicamente)|\bdensidade demografica|\btaxa de (natalidade|mortalidade|fecundidade)|\bcrescimento vegetativo|\btransicao demografica|\bpiramide etaria|\benvelhecimento|\bexpectativa de vida|\bmigracao|\bmigrat|\bmigrante|\bmigrantes|\brefugiad|\bimigracao|\bimigrantes|\bemigracao|\bdiaspora|\bidh\b|\bindice de desenvolvimento humano|\bcenso\b|\bibge\b|\bdesigualdade regional|\bnordestin/, 3],
  ]},
  { topic: 'Economia, Indústria e Globalização', discipline: 'Geografia', keywords: [
    [/\bglobalizacao|\bglobalizad|\bmultinacional|\btransnacional|\bblocos economicos|\bmercosul|\buniao europeia|\bnafta|\bomc\b|\bfmi\b|\bbrics|\bdivisao internacional do trabalho|\bpaises (desenvolvidos|subdesenvolvidos|emergentes)|\bnorte-sul|\bindustria|\bindustrial|\bindustrializacao|\bdesindustrializacao|\bfordismo|\btoyotismo|\bpos-fordismo|\bterceirizacao|\bdescentralizacao industrial|\bguerra fiscal|\bzona franca|\bcomercio internacional|\bexportac|\bimportac|\bbalanca comercial|\bneoliberalismo|\bdesemprego|\binformalidade|\btrabalho informal|\bmercado de trabalho|\bterciario|\bsetor de servicos|\bturismo/, 3],
  ]},
  { topic: 'Geopolítica e Conflitos Territoriais', discipline: 'Geografia', keywords: [
    [/\bgeopolitic|\bfronteira|\bterritorio|\bterritorial|\bsoberania|\bconflito (territorial|armado|etnico|no oriente medio)|\boriente medio|\bisrael|\bpalestina|\bcrise (dos refugiados|ucraniana)|\bucrania|\brussia|\bchina\b|\bestados unidos|\bhegemonia|\bordem mundial|\bguerra fria|\bnovas ordem|\bterrorismo|\bseparatismo|\bcatalunha|\bkosovo|\bbalcas|\bcaxemira|\bartico|\bantartida|\bpetroleo.*\bgeopolit|\bmar territorial|\bzona economica exclusiva/, 3],
  ]},
  { topic: 'Energia e Recursos Naturais', discipline: 'Geografia', keywords: [
    [/\bmatriz energetica|\bmatriz eletrica|\bfontes? de energia|\benergia (hidreletrica|eolica|solar|nuclear|renovavel|geotermica|de biomassa)|\bhidreletrica|\busina|\bpetroleo|\bpre-?sal|\bgas natural|\bcarvao mineral|\bmineracao|\bgarimpo|\bminerio|\brecursos naturais|\brecursos minerais|\brecursos hidricos|\bbiocombustivel|\betanol|\bbiodiesel|\bapagao|\bdistribuicao de energia/, 3],
  ]},

  // ---- FILOSOFIA E SOCIOLOGIA
  { topic: 'Filosofia Antiga e Medieval', discipline: 'Filosofia e Sociologia', keywords: [
    [/\bplatao|\baristoteles|\bsocrates|\bsofista|\bpre-?socratic|\bmito da caverna|\bmaieutica|\bdialetica|\bepicur|\bestoic|\bceptic|\bsanto agostinho|\btomas de aquino|\bescolastica|\bfilosofia antiga|\bfilosofia grega|\bfilosofia medieval|\barete\b|\blogos\b|\bmetafisica|\bontologia|\bteoria das ideias/, 5],
  ]},
  { topic: 'Filosofia Moderna e Contemporânea', discipline: 'Filosofia e Sociologia', keywords: [
    [/\bdescartes|\bcogito|\bkant|\bimperativo categorico|\bhegel|\bnietzsche|\bschopenhauer|\bhume\b|\bempirism|\bracionalism|\bfenomenolog|\bexistencialism|\bsartre|\bsimone de beauvoir|\bheidegger|\bkierkegaard|\bwittgenstein|\bpopper|\bkuhn|\bfilosofo|\bfilosofa|\bfilosofia\b|\bteoria do conhecimento|\bepistemolog|\bcriticismo|\bpositivismo|\bcomte|\bfrankfurt|\badorno|\bhorkheimer|\bindustria cultural|\bhabermas|\bhannah arendt|\bbanalidade do mal|\bfoucault|\bbiopoder|\bsociedade disciplinar|\bderrida|\bbauman|\bmodernidade liquida|\bpos-modern/, 4],
  ]},
  { topic: 'Ética, Moral e Direitos Humanos', discipline: 'Filosofia e Sociologia', keywords: [
    [/\betica\b|\betico\b|\bmoral\b|\bmoralidade|\bvalores morais|\bdilema moral|\butilitarism|\bdeontolog|\blivre-?arbitrio|\bresponsabilidade (moral|etica)|\bdireitos humanos|\bdeclaracao universal|\bdignidade humana|\bbioetica|\btolerancia|\bpreconceito|\bdiscriminacao|\bintolerancia|\bviolencia|\bjustica\b|\bvirtude/, 3],
  ]},
  { topic: 'Política, Estado e Cidadania', discipline: 'Filosofia e Sociologia', keywords: [
    [/\bcontratualism|\bcontrato social|\bhobbes|\blocke|\brousseau|\bmontesquieu|\bmaquiavel|\bleviata|\bestado de natureza|\bdemocracia|\bdemocratic|\bcidadania|\bcidadao|\bcidadaos|\bdireitos (civis|politicos|sociais)|\bseparacao dos poderes|\bpoder (legislativo|executivo|judiciario)|\bpartido politico|\beleicao|\beleicoes|\bvoto\b|\bsufragio|\bpolitica\b|\bpoliticas publicas|\bestado de direito|\bautoritarismo|\btotalitarismo|\bliberalismo|\bsocialismo|\banarquismo|\bsociedade civil|\bparticipacao politica|\bmovimento social|\bmovimentos sociais|\bativismo|\bdemocracia direta|\brepublic/, 3],
  ]},
  { topic: 'Sociologia Clássica: Marx, Durkheim e Weber', discipline: 'Filosofia e Sociologia', keywords: [
    [/\bdurkheim|\bfato social|\banomia|\bsolidariedade (organica|mecanica)|\bweber|\bacao social|\btipos ideais|\bracionalizacao|\bburocracia|\betica protestante|\bmarx|\bmarxista|\bluta de classes|\bmais-?valia|\bmeios de producao|\bmodo de producao|\balienacao|\bfetichismo da mercadoria|\bideologia|\bclasses sociais|\bburguesia|\bproletariado|\bsociologia|\bsociologo|\bsociologa|\bpierre bourdieu|\bcapital cultural|\bhabitus|\bgilberto freyre|\bsergio buarque|\bflorestan fernandes|\bdarcy ribeiro|\bdemocracia racial|\bhomem cordial/, 4],
  ]},
  { topic: 'Cultura, Identidade e Diversidade', discipline: 'Filosofia e Sociologia', keywords: [
    [/\bcultura\b|\bculturas\b|\bculturais|\bidentidade|\bdiversidade cultural|\betnocentrismo|\brelativismo cultural|\bantropologia|\bantropologo|\blevi-?strauss|\bmalinowski|\bboas\b|\bcultura de massa|\bcultura popular|\bcultura (erudita|material)|\bmulticultural|\bhibridismo|\baculturacao|\bsincretismo|\btradicao|\brituais?\b|\bgenero\b|\bidentidade de genero|\bfeminismo|\bfeminista|\bpatriarcado|\bmachismo|\blgbt|\bhomofobia|\bracismo|\betnia|\betnico|\bminorias|\bestereotipo|\bsocializacao|\bsimbolic/, 3],
  ]},
  { topic: 'Trabalho, Desigualdade e Sociedade Contemporânea', discipline: 'Filosofia e Sociologia', keywords: [
    [/\btrabalho\b|\btrabalhador|\bdivisao do trabalho|\bprecarizacao|\buberizacao|\bflexibilizacao|\bdesigualdade social|\bdesigualdades|\bpobreza|\bexclusao social|\bmobilidade social|\bestratificacao|\bconsumismo|\bsociedade de consumo|\bsociedade da informacao|\bredes sociais|\bcibercultura|\bmidia|\bmeios de comunicacao|\bglobalizacao|\bindividualismo|\bsociedade do espetaculo|\bsociedade de risco|\bsistema capitalista|\bcapitalismo|\bneoliberalismo|\bterceiro setor|\bong\b|\bsindicato|\bgreve\b|\bdireitos trabalhistas/, 2],
  ]},
];

// ---------------------------------------------------------------------------
// MATEMÁTICA
// ---------------------------------------------------------------------------
const MATEMATICA_RULES: TopicRule[] = [
  { topic: 'Geometria Plana', discipline: 'Matemática', keywords: [
    [/\btriangulo|\bquadrado\b|\bretangulo|\bpoligono|\bhexagono|\bpentagono|\blosango|\btrapezio|\bparalelogramo|\bcirculo|\bcircunferencia|\braio\b|\bperimetro|\barea (do|da|de|total|da regiao|sombreada|do terreno|da figura)|\bpitagoras|\bteorema de tales|\bsemelhanca|\bangulo|\bangulos|\bbissetriz|\bdiagonal|\blado\b.*\bcm\b/, 2],
  ]},
  { topic: 'Geometria Espacial', discipline: 'Matemática', keywords: [
    [/\bvolume|\bcilindro|\bcone\b|\besfera|\bprisma|\bpiramide|\bcubo\b|\bparalelepipedo|\btronco de (cone|piramide)|\bcapacidade|\blitros?\b|\bcaixa d'?agua|\breservatorio|\brecipiente|\bsolido geometrico|\bsolidos|\bsuperficie lateral|\barea (lateral|da superficie)|\bplanificacao|\bembalagem|\bcisterna|\bpiscina/, 2],
  ]},
  { topic: 'Geometria Analítica', discipline: 'Matemática', keywords: [
    [/\bplano cartesiano|\bcoordenadas|\bponto de coordenadas|\bequacao da reta|\breta de equacao|\breta (que passa|paralela|perpendicular)|\bcoeficiente angular|\bdistancia entre (dois )?pontos|\beixo (x|y|das abscissas|das ordenadas)|\bplano xy|\bvertice\b.*\bcoordenad|\bmapa.*\bcoordenad|\bcirculo de equacao|\bequacao da circunferencia|\bcentro\b.*\braio|\bconica|\belipse|\bparabola|\bhiperbole/, 4],
  ]},
  { topic: 'Trigonometria', discipline: 'Matemática', keywords: [
    [/\bseno\b|\bcosseno|\btangente|\bsen\s?\(|\bcos\s?\(|\btg\s?\(|\btrigonometri|\bcirculo trigonometrico|\bradiano|\bangulo de (elevacao|depressao|inclinacao)|\bhipotenusa|\bcateto|\bsen\b\s?\d|\blei dos (senos|cossenos)|\brampa/, 4],
  ]},
  { topic: 'Funções', discipline: 'Matemática', keywords: [
    [/\bfuncao|\bfuncoes|\bf\s?\(\s?x\s?\)|\bgrafico da funcao|\bfuncao (afim|linear|quadratica|exponencial|logaritmica|modular|do (primeiro|segundo) grau)|\bparabola|\bvertice da parabola|\braizes? da (funcao|equacao)|\bcrescente|\bdecrescente|\bdominio\b|\bimagem da funcao|\bvalor maximo|\bvalor minimo|\bponto de maximo|\blucro maximo|\blog\s?\(|\blogaritmo|\bexponencial|\bmodelo matematico|\bmodelagem/, 3],
  ]},
  { topic: 'Estatística', discipline: 'Matemática', keywords: [
    [/\bmedia\b|\bmediana|\bmoda\b|\bdesvio padrao|\bvariancia|\bamplitude|\bamostra|\bpesquisa (de opiniao|eleitoral|realizada|estatistica)|\bhistograma|\bgrafico de (barras|setores|colunas|linhas|pizza)|\btabela de frequencia|\bfrequencia (absoluta|relativa|acumulada)|\bpopulacao pesquisada|\bnota media|\bmedia aritmetica|\bmedia ponderada|\bquartil|\bboxplot|\bdistribuicao de frequencias|\bdados da tabela|\bos dados|\bentrevistad|\bindice\b|\btaxa\b/, 2],
  ]},
  { topic: 'Probabilidade', discipline: 'Matemática', keywords: [
    [/\bprobabilidade|\bchance\b|\bchances\b|\bsorteio|\bsorteado|\bsorteada|\bsortear|\baleatori|\bevento|\bespaco amostral|\bexperimento|\bdado\b|\bdados\b.*\bface|\bmoeda\b|\bbaralho|\bprobabilidade condicional|\bindependentes|\burna\b|\bbolas?\b.*\bretirad|\bacertar|\bacerto ao acaso|\bloteria|\bmega-?sena|\brifa|\bacaso/, 3],
  ]},
  { topic: 'Análise Combinatória', discipline: 'Matemática', keywords: [
    [/\bcombinacao|\bpermutacao|\barranjo|\bde quantas (maneiras|formas|modos)|\bquantas (senhas|placas|comissoes|possibilidades|combinacoes|maneiras|formas|sequencias|filas|duplas|equipes|opcoes)|\banagrama|\bfatorial|\bprincipio (fundamental da contagem|multiplicativo)|\bordem (diferente|possivel)|\bdiferentes (maneiras|formas|modos)|\bposicoes diferentes|\bdistintas|\bdistintos|\bsenha\b|\bcodigo\b.*\bdigitos|\bcomissao/, 4],
  ]},
  { topic: 'Razão, Proporção e Regra de Três', discipline: 'Matemática', keywords: [
    [/\brazao\b|\bproporcao|\bproporcional|\bregra de tres|\bgrandezas|\bdiretamente proporcional|\binversamente proporcional|\bescala\b|\b1\s?:\s?\d{2,}|\bvelocidade media|\bdensidade demografica|\bconcentracao\b|\bvazao|\bconsumo medio|\brendimento\b.*\bkm|\bkm\/l|\bkm\/h|\bm\/s|\bgramas? por|\bpor (cada|metro|litro|quilo)|\bdividid[oa] (em|entre) partes|\bpartes iguais|\bpartes proporcionais/, 3],
  ]},
  { topic: 'Porcentagem e Matemática Financeira', discipline: 'Matemática', keywords: [
    [/\bporcentagem|\bpercentual|\d\s?%|\bjuros|\bjuro\b|\bmontante|\bcapital\b|\btaxa de juros|\bdesconto|\bacrescimo|\baumento de|\breajuste|\binflacao|\blucro|\bprejuizo|\bpreco\b|\bprecos|\bparcela|\bparcelas|\bprestacao|\bprestacoes|\bfinanciamento|\bemprestimo|\bsalario|\bimposto|\bicms|\binvestimento|\bpoupanca|\brendimento (mensal|anual)|\bcusto|\breceita|\bvalor (a vista|da compra)|\bcartao de credito|\bdivida|\bcambio|\bdolar|\breais\b|\br\$/, 2],
  ]},
  { topic: 'Progressões e Sequências', discipline: 'Matemática', keywords: [
    [/\bprogressao (aritmetica|geometrica)|\bpa\b|\bpg\b|\brazao da (pa|pg|progressao)|\btermo geral|\bsequencia|\bsucessao|\bpadrao\b.*\btermos|\bsoma dos (n )?primeiros termos|\bcada termo|\bcada ano.*\bmais|\bcresce em progressao|\bdobra a cada|\bpotencias de 2/, 4],
  ]},
  { topic: 'Álgebra, Equações e Sistemas', discipline: 'Matemática', keywords: [
    [/\bequacao|\bequacoes|\binequacao|\bsistema (de equacoes|linear)|\bincognita|\bpolinomio|\braiz quadrada|\bbhaskara|\bdelta\b|\bfatoracao|\bproduto notavel|\bexpressao algebrica|\bmatriz|\bmatrizes|\bdeterminante|\bnumeros complexos|\bnumero imaginario|\bvalor de x\b|\bsendo x\b|\bseja x\b/, 3],
  ]},
  { topic: 'Aritmética e Números', discipline: 'Matemática', keywords: [
    [/\bnumeros? (inteiros?|naturais|racionais|primos?|reais|decimais)|\bfracao|\bfracoes|\bmmc\b|\bmdc\b|\bmultiplo|\bdivisor|\bdivisivel|\bresto da divisao|\bnotacao cientifica|\bpotencia de (dez|10)|\bpotenciacao|\bradiciac|\bdizima|\bconjunto (dos|numerico)|\bintervalo|\bvalor absoluto|\bordem crescente|\barredondamento|\bmetade|\bterca parte|\bquarta parte|\bdobro|\btriplo/, 2],
  ]},
  { topic: 'Grandezas e Medidas', discipline: 'Matemática', keywords: [
    [/\bunidade de medida|\bconversao de unidades|\bquilometro|\bmetros?\b|\bcentimetros?|\bmilimetros?|\bhectare|\btonelada|\bquilograma|\bgramas?\b|\bhoras?\b|\bminutos?\b|\bsegundos?\b|\bdias?\b|\bsemanas?\b|\bmeses\b|\bpolegada|\bjarda|\bmilha|\bpe\b.*\bpolegada|\bfuso|\bmedida de (comprimento|massa|capacidade|tempo|area|volume)|\bregua|\bbalanca\b|\bfita metrica|\bhorario|\bduracao|\bcalendario|\btemperatura/, 1],
  ]},
];

// ---------------------------------------------------------------------------
// LINGUAGENS (a matéria é sempre Língua Portuguesa e Literatura, exceto línguas estrangeiras)
// ---------------------------------------------------------------------------
const LINGUAGENS_RULES: TopicRule[] = [
  { topic: 'Literatura e Movimentos Literários', discipline: 'Língua Portuguesa e Literatura', keywords: [
    [/\bromantismo|\brealismo|\bnaturalismo|\bparnasianismo|\bsimbolismo|\bbarroco|\barcadismo|\bmodernismo|\bpre-?modernismo|\bvanguarda|\bgeracao de (30|45)|\bescola literaria|\bmovimento literario|\bliteratura\b|\bliterario|\bliteraria|\bpoema\b|\bpoesia\b|\bpoeta\b|\bpoetic|\bsoneto|\beu lirico|\beu poetico|\beu-lirico|\bversos?\b|\bestrofe|\bromance\b|\bromancista|\bconto\b|\bcontista|\bcronica|\bcronista|\bnovela|\bteatro|\bdramaturg|\bmachado de assis|\bdrummond|\bjoao cabral|\bguimaraes rosa|\bclarice lispector|\bgraciliano|\bcecilia meireles|\bmanuel bandeira|\bmario de andrade|\boswald de andrade|\bcastro alves|\bgoncalves dias|\bjose de alencar|\bcamoes|\bfernando pessoa|\bnarrador|\bpersonagem|\benredo|\bobra\b|\bautor\b|\bescritor|\bescritora|\bromantic|\bmodernista|\bantropofagia|\bsaramago|\beca de queiroz|\baluisio azevedo/, 3],
  ]},
  { topic: 'Variação Linguística e Norma Culta', discipline: 'Língua Portuguesa e Literatura', keywords: [
    [/\bvariacao linguistica|\bvariedade (linguistica|padrao|regional|social)|\bvariedades linguisticas|\bnorma (culta|padrao|gramatical)|\bgiria|\bgirias|\bdialeto|\bregionalismo|\bsotaque|\boralidade|\bregistro (formal|informal|coloquial)|\bcoloquial|\bpreconceito linguistico|\blinguagem (formal|informal|coloquial|popular|regional)|\bgramatica normativa|\bestrangeirism|\bneologismo|\barcaismo|\bemprestimo linguistico|\bevolucao da lingua|\blinguistica|\bfala\b|\bfalante|\bfalantes|\blingua portuguesa|\blinguagem verbal|\blinguagem nao verbal/, 4],
  ]},
  { topic: 'Gramática e Recursos Linguísticos', discipline: 'Língua Portuguesa e Literatura', keywords: [
    [/\bconcordancia|\bregencia|\bcrase|\bpontuacao|\bvirgula|\bponto e virgula|\bdois-pontos|\breticencias|\baspas\b|\bparenteses|\bsintaxe|\bsintatic|\bmorfolog|\boracao|\boracoes|\bsujeito|\bpredicado|\bcomplemento|\badjunto|\bconjuncao|\bpreposicao|\bpronome|\bartigo\b|\badjetivo|\bsubstantivo|\badverbio|\bverbo|\bverbal|\btempo verbal|\bmodo verbal|\bsubjuntivo|\bgerundio|\binfinitivo|\bparticipio|\bvoz (passiva|ativa)|\bcoesao|\bcoerencia|\bconectivo|\bconector|\bsentido (figurado|literal|denotativo|conotativo)|\bdenotacao|\bconotacao|\bfigura de linguagem|\bmetafora|\bmetonimia|\bironia|\bantitese|\bhiperbole|\bprosopopeia|\bparadoxo|\bcomparacao|\bpolissemia|\bambiguidade|\bsinonim|\bantonim|\bhomonim|\bprefixo|\bsufixo|\bderivacao|\bcomposicao|\bvocabulo|\bpalavra\b|\bexpressao\b|\btermo\b|\bsentido da palavra|\bfuncao da linguagem|\bfuncao (emotiva|referencial|conativa|fatica|poetica|metalinguistica)|\bfuncoes da linguagem|\bmetalinguag|\bintertextualidade|\bpolifonia|\bparodia|\bparafrase|\bpronominal|\bacento|\bortografia/, 3],
  ]},
  { topic: 'Gêneros Textuais e Argumentação', discipline: 'Língua Portuguesa e Literatura', keywords: [
    [/\bgenero textual|\bgeneros textuais|\btipo textual|\bdissertativ|\bargumentativ|\bargumento|\bargumentos|\btese\b|\bartigo de opiniao|\beditorial|\bcarta (aberta|do leitor|ao leitor)|\bnoticia|\breportagem|\bentrevista|\bresenha|\bcharge|\bcartum|\bhistoria em quadrinhos|\btirinha|\bquadrinhos|\bpropaganda|\banuncio|\bpublicitari|\bcampanha (publicitaria|educativa|de conscientizacao)|\bslogan|\bpanfleto|\bcartaz|\bbula\b|\bmanual|\bregulamento|\blei\b|\bdecreto|\blog|\btweet|\bpostagem|\bmeme|\bverbete|\bdicionario|\bsinopse|\bresumo|\bcurriculo|\bdiscurso|\bdebate|\bpalestra|\bseminario|\bsermao|\bfabula|\bparabola|\blenda|\bmito\b|\bdiario|\bcarta pessoal|\bbilhete|\bepistola|\bpoema concreto|\bletra de (musica|cancao)|\bcancao|\bmusica\b|\bfinalidade do texto|\bobjetivo do texto|\bpublico-?alvo|\binterlocutor|\bdestinatario|\bemissor|\bautor do texto|\bposicionamento do autor|\bponto de vista/, 3],
  ]},
  { topic: 'Artes e Cultura', discipline: 'Língua Portuguesa e Literatura', keywords: [
    [/\bpintura|\bpintor|\bescultura|\bescultor|\bartista|\bartistas|\bobra de arte|\bartes visuais|\bfotografia|\bfotografo|\bcinema|\bfilme|\bdiretor de cinema|\bteatro|\bdanca|\bbailarin|\bcoreografia|\bmusical|\bmusico|\bmusicos|\bcompositor|\bsamba|\bchoro|\bbossa nova|\bfunk|\brap\b|\bhip hop|\bgrafite|\bgraffiti|\bmuseu|\bexposicao|\bgaleria|\binstalacao artistica|\barte (moderna|contemporanea|urbana|popular|rupestre|barroca|abstrata)|\bcubismo|\bsurrealismo|\bimpressionismo|\bexpressionismo|\bpop art|\bdadaismo|\bfolclore|\bfestas? (popular|junina|religiosa)|\bcarnaval|\bcultura popular|\bpatrimonio (cultural|historico|imaterial)|\barquitetura|\bdesign|\bmoda\b|\bvestuario|\bcordel|\bartesanato|\btelevisao|\bnovela|\bserie\b|\bradio\b/, 3],
  ]},
  { topic: 'Educação Física, Esporte e Corpo', discipline: 'Língua Portuguesa e Literatura', keywords: [
    [/\besporte|\besportes|\besportivo|\batleta|\batletas|\bjogos olimpicos|\bolimpiada|\bolimpico|\bparalimpico|\bcopa do mundo|\bfutebol|\bvolei|\bbasquete|\bhandebol|\bnatacao|\batletismo|\bginastica|\bjudo|\bcapoeira|\blutas?\b|\bartes marciais|\bjogo\b|\bjogos\b|\bbrincadeira|\bbrinquedo|\bpratica corporal|\bpraticas corporais|\batividade fisica|\bexercicio fisico|\bsedentarismo|\bcorpo\b|\bcorporal|\bculto ao corpo|\bpadrao de beleza|\bacademia\b|\bbodybuilding|\bdoping|\bdopagem|\btorcedor|\btorcida|\bestadio|\bmaratona|\bcorrida\b/, 3],
  ]},
  { topic: 'Tecnologia, Mídia e Comunicação Digital', discipline: 'Língua Portuguesa e Literatura', keywords: [
    [/\binternet|\bdigital|\bdigitais|\bredes? sociais|\bfacebook|\binstagram|\btwitter|\bwhatsapp|\btiktok|\byoutube|\bblog|\bblogueir|\binfluenciador|\binfluencer|\bcelular|\bsmartphone|\bcomputador|\baplicativo|\bapp\b|\bsite\b|\bonline|\bvirtual\b|\bvirtuais|\btecnologia|\btecnologias|\bfake news|\bdesinformacao|\bcibercultura|\bciberespaco|\bhipertexto|\bemoji|\bemoticon|\binteligencia artificial|\bcyberbullying|\bprivacidade|\bhacker|\bdados pessoais|\bstreaming|\bvideo game|\bgames?\b|\bjogos eletronicos|\bmidia|\bmidias|\bmeios de comunicacao/, 3],
  ]},
  // Conteúdo geral de Português: interpretação (fallback abaixo)
];

const FALLBACK_TOPIC: Record<string, { topic: string; discipline: DisciplineType }> = {
  'Ciências da Natureza e suas Tecnologias': { topic: 'Ciências da Natureza: Tópicos Gerais', discipline: 'Biologia' },
  'Ciências Humanas e suas Tecnologias': { topic: 'Ciências Humanas: Tópicos Gerais', discipline: 'História' },
  'Matemática e suas Tecnologias': { topic: 'Matemática Básica e Raciocínio Lógico', discipline: 'Matemática' },
  'Linguagens, Códigos e suas Tecnologias': { topic: 'Interpretação de Texto', discipline: 'Língua Portuguesa e Literatura' },
};

const RULES_BY_AREA: Record<string, TopicRule[]> = {
  'Ciências da Natureza e suas Tecnologias': NATUREZA_RULES,
  'Ciências Humanas e suas Tecnologias': HUMANAS_RULES,
  'Matemática e suas Tecnologias': MATEMATICA_RULES,
  'Linguagens, Códigos e suas Tecnologias': LINGUAGENS_RULES,
};

/** Pontuação mínima para aceitar um conteúdo (evita classificar por um único termo fraco). */
const MIN_SCORE = 3;
/** Linguagens tem muitos termos genéricos (texto, autor, obra...): exige evidência maior antes de rotular. */
const MIN_SCORE_LINGUAGENS = 7;

/** Cache das versões globais (/g) das expressões, criadas uma única vez. */
const GLOBAL_RE_CACHE = new Map<RegExp, RegExp>();
function globalVersion(re: RegExp): RegExp {
  let g = GLOBAL_RE_CACHE.get(re);
  if (!g) {
    g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    GLOBAL_RE_CACHE.set(re, g);
  }
  g.lastIndex = 0;
  return g;
}

function scoreTopic(rule: TopicRule, fullText: string, stemText: string): number {
  let total = 0;
  for (const [re, weight] of rule.keywords) {
    const hits = fullText.match(globalVersion(re));
    if (hits && hits.length > 0) {
      // 1º acerto vale o peso cheio; repetições valem um pouco mais (máx. +50%); termo no comando da questão vale +50%.
      total += weight * (1 + Math.min(hits.length - 1, 2) * 0.25);
      if (stemText.match(globalVersion(re))) total += weight * 0.5;
    }
  }
  return total;
}

export interface ClassificationInput {
  area: AreaOfKnowledge;
  /** Texto-base (contexto) da questão, se houver. */
  context?: string;
  /** Comando/enunciado da questão. */
  statement: string;
  /** Texto das alternativas. */
  alternatives: string[];
  /** 'ingles' | 'espanhol' quando a questão é de língua estrangeira. */
  foreignLanguage?: string | null;
}

export interface ClassificationResult {
  discipline: DisciplineType;
  topic: string;
}

/**
 * Infere matéria e conteúdo específico de uma questão a partir do seu texto.
 */
export function classifyQuestion(input: ClassificationInput): ClassificationResult {
  if (input.foreignLanguage) {
    const lang = input.foreignLanguage.toLowerCase().startsWith('esp') ? 'Espanhol' : 'Inglês';
    return { discipline: 'Língua Estrangeira (Inglês/Espanhol)', topic: `Língua Estrangeira: ${lang}` };
  }

  const fallback = FALLBACK_TOPIC[input.area] || FALLBACK_TOPIC['Linguagens, Códigos e suas Tecnologias'];
  const rules = RULES_BY_AREA[input.area] || [];

  // Texto do comando pesa mais do que o texto-base inteiro; alternativas ajudam em química/física.
  const stemText = normalizeForClassification(input.statement);
  const fullText = normalizeForClassification(
    [input.context || '', input.statement, ...input.alternatives].join(' \n ')
  );

  let best: { rule: TopicRule; score: number } | null = null;
  for (const rule of rules) {
    const score = scoreTopic(rule, fullText, stemText);
    if (score > 0 && (!best || score > best.score)) best = { rule, score };
  }

  const minScore = input.area === 'Linguagens, Códigos e suas Tecnologias' ? MIN_SCORE_LINGUAGENS : MIN_SCORE;

  if (best && best.score >= minScore) {
    return { discipline: best.rule.discipline, topic: best.rule.topic };
  }

  // Evidência fraca: mantém ao menos a matéria mais provável (Física/Química/Biologia, História/Geografia/Filosofia...)
  if (best && best.score > 0 && input.area !== 'Linguagens, Códigos e suas Tecnologias' && input.area !== 'Matemática e suas Tecnologias') {
    return { discipline: best.rule.discipline, topic: `${best.rule.discipline}: Tópicos Gerais` };
  }

  // Sem nenhuma pista: conteúdo geral da área
  return { discipline: fallback.discipline, topic: fallback.topic };
}

/** @internal Somente para diagnóstico/testes. */
export function __debugScores(input: ClassificationInput): Array<[string, number]> {
  const rules = RULES_BY_AREA[input.area] || [];
  const stemText = normalizeForClassification(input.statement);
  const fullText = normalizeForClassification([input.context || '', input.statement, ...input.alternatives].join(' \n '));
  return rules.map((r) => [r.topic, scoreTopic(r, fullText, stemText)] as [string, number]).sort((a, b) => b[1] - a[1]);
}
