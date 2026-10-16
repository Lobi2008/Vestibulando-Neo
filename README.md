# Vestibulando Neo 🎓⚡
> **Plataforma Desktop Neobrutalista para Windows 11 de Resolução de Questões de Vestibulares com Motor TRI (3PL), UERJ, Suporte Nativo a Mesa Digitalizadora e Persistência Offline.**

---

## 🏛️ 1. Arquitetura e Separação de Camadas (Clean Architecture)

O projeto foi projetado com separação rigorosa de responsabilidades para garantir manutenibilidade, testabilidade e escalabilidade por outros desenvolvedores ou agentes de IA:

```text
├── src/
│   ├── types/                     # Camada de Domínio e Contratos TypeScript
│   │   └── index.ts               # Tipagens (Question, TRI, UserAttempt, Stylus, etc.)
│   ├── services/
│   │   ├── tri/                   # Motor de Avaliação Pedagógica
│   │   │   ├── triEngine.ts       # Modelo 3PL do ENEM (EAP Bayesiano) e Conceitos UERJ
│   │   │   └── triEngine.test.ts  # Testes unitários puros (Node 22 native runner)
│   │   ├── ingestion/             # Camada de Ingestão e Consumo de Dados
│   │   │   ├── apiIngestion.ts    # Conectores com API enem.dev e repo beatrizmilz
│   │   │   └── questionSeed.ts    # Banco enriquecido para operação 100% offline
│   │   └── storage/               # Camada de Persistência Local
│   │       ├── localDatabase.ts   # SQLite / IndexedDB abstraction + SQLite exporter
│   │       └── localDatabase.test.ts # Testes de filtros taxonômicos
│   ├── components/
│   │   ├── canvas/                # Módulo de Mesa Digitalizadora (Stylus/Pen)
│   │   │   └── DigitalPenCanvas.tsx # Canvas com pressão, Bézier smoothing e marca-texto
│   │   ├── desktop/               # Componentes do Shell Windows 11
│   │   │   └── WindowTitleBar.tsx # Barra de título com controles e status offline
│   │   ├── navigation/            # Cabeçalho e Gamificação
│   │   │   └── HeaderStatsBar.tsx # Ofensiva (streaks), XP, Nível estilo RespostaCerta
│   │   ├── filters/               # Taxonomia Hierárquica
│   │   │   └── TaxonomyFilterBar.tsx # Filtros em 3 níveis estritos
│   │   ├── questions/             # Resolução de Questões
│   │   │   └── QuestionCard.tsx   # Enunciado, alternativas A-E, timer e gabarito
│   │   ├── dashboard/             # Estatísticas & Evolução
│   │   │   └── PerformanceDashboard.tsx # Gráficos, nota TRI calculada, conceito UERJ
│   │   ├── sync/                  # Central de Ingestão e SQLite
│   │   │   └── DataSyncHub.tsx    # Sincronização manual e exportação .sql
│   │   └── profile/               # Perfil e Metas
│   │       └── UserProfileTab.tsx # Vestibular alvo e meta diária de questões
│   ├── App.tsx                    # Orquestrador da aplicação
│   ├── main.tsx                   # Ponto de montagem React 19
│   └── index.css                  # Design System Neobrutalista e estilos de pauta
```

---

## 🧮 2. Lógica de Avaliação e Motores de Pontuação

### A. Teoria de Resposta ao Item (TRI) - ENEM
Para os itens do ENEM, a aplicação adota o **Modelo Logístico Unidimensional de 3 Parâmetros (3PL)**:
$$P_i(\theta) = c_i + (1 - c_i) \frac{1}{1 + e^{-D \cdot a_i (\theta - b_i)}}$$

- **$a_i$ (Discriminação):** Poder de diferenciar candidatos com proficiências próximas.
- **$b_i$ (Dificuldade):** Ponto de inflexão na escala de proficiência $\theta$.
- **$c_i$ (Acerto casual):** Probabilidade de acerto por chute.
- **Estimador EAP (Expected A Posteriori):** Calcula $\hat{\theta}$ integrando a verossimilhança $L(\theta)$ multiplicada por uma distribuição a priori $N(0, 1)$.
- **Escala ENEM Oficial:** Convertida pela transformação linear:
  $$\text{Nota}_{\text{ENEM}} = 500 + 100 \cdot \hat{\theta}$$
- **Detecção de Incoerência:** Mede pares discordantes onde o candidato acerta questões muito difíceis e erra fáceis, penalizando o índice de coerência pedagógica.

### B. Exame de Qualificação da UERJ
A UERJ adota cálculo percentual clássico de 60 questões com atribuição de conceitos:
- **Conceito A ($\ge 70\%$ de acertos):** +20 pontos de bônus na 2ª fase.
- **Conceito B ($60\%$ a $69.9\%$):** +15 pontos de bônus.
- **Conceito C ($50\%$ a $59.9\%$):** +10 pontos de bônus.
- **Conceito D ($40\%$ a $49.9\%$):** +5 pontos de bônus.
- **Reprovado ($< 40\%$):** 0 pontos.

---

## 🖊️ 3. Compatibilidade com Mesa Digitalizadora (Stylus Tablet)

O módulo `DigitalPenCanvas` foi desenvolvido especificamente para mesas digitalizadoras (Wacom Intuos/One, Huion Inspiroy/Kamvas, XP-Pen Deco, Apple Pencil e Microsoft Surface Pen):

1. **Pointer Events de Alta Precisão:**
   - Detecção automática de caneta (`e.pointerType === 'pen'`).
   - Leitura de pressão nativa (`e.pressure`) modulando dinamicamente a espessura do traço.
2. **Estabilizador de Traço Anti-Tremor (Smoothing):**
   - Algoritmo de janela móvel e interpolação spline Bézier quadrática (`quadraticCurveTo`) ligando os pontos médios, eliminando jitter manual.
3. **Ferramentas Pedagógicas:**
   - **Caneta Nanquim / Gel:** Nanquim preto, Azul Bic, Vermelho correção e Verde gabarito.
   - **Marca-Texto Translúcido:** Amarelo flúor, Menta e Rosa com blend mode `multiply` para destacar textos sem ocultar caracteres.
   - **Borracha de Precisão:** Destrutiva ou em ponta fina.
   - **Tipos de Folha de Rascunho:** Papel Quadriculado (Grid), Pautado (Lined) ou Branco (Blank).
   - **Persistência de Rascunho:** Traços salvos e restaurados automaticamente por questão.

---

## 🎨 4. Design System Neobrutalista

A interface obedece rigidamente aos princípios do **Neobrutalismo**:
- **Cores Sólidas Vibrantes:** Amarelo `#FFE600`, Ciano Elétrico `#00F0FF`, Laranja `#FF5A36`, Verde Lima `#00E599`, Rosa Choque `#FF3366`.
- **Bordas Espessas:** `3px` e `4px solid #111111`.
- **Sombras Duras:** `box-shadow: 4px 4px 0px #111111` sem blur gaussiano.
- **Micro-interações Táteis:** Botões que afundam fisicamente ao clique (`active:translate-x-1 active:translate-y-1 active:shadow-none`).
- **Atalhos Rápidos de Desktop:** `[1-5]` ou `[A-E]` para marcar alternativas, `[R]` para abrir rascunho da caneta, `[F11]` para modo tela cheia.

---

## 🚀 5. Como Executar e Empacotar no Windows 11

### Pré-requisitos
- **Node.js 20+** (recomendado Node 22+)
- **npm** ou **pnpm**

### Execução em Modo de Desenvolvimento
```bash
# 1. Instalar as dependências
npm install

# 2. Executar os testes unitários da lógica pura
node --test src/services/tri/triEngine.test.ts src/services/storage/localDatabase.test.ts

# 3. Iniciar o servidor de desenvolvimento
npm run dev
```
Acesse `http://localhost:3000` no seu navegador.

### Compilação de Produção Web / PWA
```bash
npm run build
```

---

## 📦 6. Empacotando como Desktop Nativo para Windows 11 (.exe / .msi)

### Opção A: Com **Tauri** (Recomendado - Ultra Leve & Seguro com Rust)
1. Instale o Tauri CLI:
   ```bash
   npm install -D @tauri-apps/cli
   ```
2. Inicialize o Tauri no projeto:
   ```bash
   npx tauri init
   ```
   - *App name:* VestibulandoNeo
   - *Window title:* Vestibulando Neo - Plataforma de Questões
   - *Web assets:* `../dist`
   - *Dev server URL:* `http://localhost:3000`
3. Gere o instalador nativo do Windows 11:
   ```bash
   npx tauri build
   ```
   O instalador `.msi` e executável `.exe` serão gerados em `src-tauri/target/release/bundle/msi/`.

### Opção B: Com **Electron**
1. Instale o Electron e Electron Builder:
   ```bash
   npm install -D electron electron-builder
   ```
2. Crie o arquivo `electron-main.js` apontando para `dist/index.html`.
3. Adicione ao `package.json`:
   ```json
   "build:desktop": "npm run build && electron-builder --win"
   ```
4. Execute `npm run build:desktop` para gerar o instalador do Windows 11.

---

## 💾 7. Base de Dados SQLite Offline

Para usar com SQLite nativo no Windows 11:
1. Abra a aba **"Ingestão & Banco Offline"** na aplicação.
2. Clique em **"Exportar Script SQLite Completo (.sql)"**.
3. O script cria automaticamente as tabelas `user_profile`, `questions` e `attempts` com chaves estrangeiras, permitindo abrir com [DB Browser for SQLite](https://sqlitebrowser.org/) ou conectar via driver nativo.
