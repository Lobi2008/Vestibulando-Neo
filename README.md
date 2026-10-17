# Vestibulando Neo 🎓⚡

> Um app de desktop para Windows 11 pra você resolver questões de vestibular do jeito que estudar deveria ser: com visual neobrutalista, nota calculada por TRI, suporte a mesa digitalizadora e tudo funcionando offline.

O Vestibulando Neo nasceu de uma vontade simples: ter um lugar só pra treinar ENEM e UERJ, sem depender de internet, sem aba aberta demais e com um rascunho de verdade ao lado da questão. Dá pra resolver no teclado, riscar com a caneta, ver sua evolução e manter a ofensiva em dia.

---

## O que tem aqui dentro

- **Questões de ENEM e UERJ**, com filtros em três níveis pra você chegar direto no assunto que precisa treinar.
- **Nota TRI de verdade** (modelo 3PL) pro ENEM e **conceitos A–D** pro Exame de Qualificação da UERJ.
- **Rascunho com caneta**: pressão, suavização de traço, marca-texto e borracha, tudo salvo por questão.
- **Gamificação**: ofensiva (streak), XP e níveis, no clima do RespostaCerta.
- **Modo offline**: banco de questões embutido e persistência local, então dá pra estudar sem sinal.
- **Exportação pra SQLite**, se você quiser mexer nos dados por fora.

---

## 1. Como o projeto está organizado

A ideia foi manter cada coisa no seu lugar, pra ficar fácil de dar manutenção, testar e deixar outra pessoa (ou outra IA) mexer sem medo.

```text
├── src/
│   ├── types/                     # Contratos e tipos TypeScript do domínio
│   │   └── index.ts               # Question, TRI, UserAttempt, Stylus, etc.
│   ├── services/
│   │   ├── tri/                   # O cérebro pedagógico
│   │   │   ├── triEngine.ts       # 3PL do ENEM (EAP Bayesiano) e conceitos da UERJ
│   │   │   └── triEngine.test.ts  # Testes unitários (test runner nativo do Node)
│   │   ├── ingestion/             # De onde vêm as questões
│   │   │   ├── apiIngestion.ts    # Conectores com a API enem.dev e o repo beatrizmilz
│   │   │   └── questionSeed.ts    # Banco embutido pra funcionar 100% offline
│   │   └── storage/               # Persistência local
│   │       ├── localDatabase.ts   # Abstração SQLite / IndexedDB + exportador SQLite
│   │       └── localDatabase.test.ts # Testes dos filtros por taxonomia
│   ├── components/
│   │   ├── canvas/
│   │   │   └── DigitalPenCanvas.tsx   # Rascunho com pressão, suavização Bézier e marca-texto
│   │   ├── desktop/
│   │   │   └── WindowTitleBar.tsx     # Barra de título estilo Windows 11 + status offline
│   │   ├── navigation/
│   │   │   └── HeaderStatsBar.tsx     # Ofensiva, XP e nível
│   │   ├── filters/
│   │   │   └── TaxonomyFilterBar.tsx  # Filtros hierárquicos em 3 níveis
│   │   ├── questions/
│   │   │   └── QuestionCard.tsx       # Enunciado, alternativas A–E, timer e gabarito
│   │   ├── dashboard/
│   │   │   └── PerformanceDashboard.tsx # Gráficos, nota TRI e conceito UERJ
│   │   ├── sync/
│   │   │   └── DataSyncHub.tsx        # Sincronização manual e exportação .sql
│   │   └── profile/
│   │       └── UserProfileTab.tsx     # Vestibular alvo e meta diária
│   ├── App.tsx                    # Junta tudo
│   ├── main.tsx                   # Ponto de entrada (React 19)
│   └── index.css                  # Design system neobrutalista e estilo de pauta
```

---

## 2. Como a nota é calculada

### ENEM: Teoria de Resposta ao Item (TRI)

Aqui a gente usa o **modelo logístico de 3 parâmetros (3PL)**. Em vez de só contar acertos, ele leva em conta *quais* questões você acertou:

$$P_i(\theta) = c_i + (1 - c_i) \frac{1}{1 + e^{-D \cdot a_i (\theta - b_i)}}$$

- **a (discriminação):** o quanto a questão separa quem sabe de quem quase sabe.
- **b (dificuldade):** o ponto da escala de proficiência $\theta$ em que a questão "vira".
- **c (acerto casual):** a chance de acertar chutando.

A proficiência $\hat{\theta}$ é estimada pelo **EAP (Expected A Posteriori)**: a verossimilhança das suas respostas é combinada com uma distribuição a priori $N(0, 1)$. Depois, o resultado vai pra escala do ENEM:

$$\text{Nota}_{\text{ENEM}} = 500 + 100 \cdot \hat{\theta}$$

O app também faz uma **checagem de coerência**: se você acerta questões bem difíceis mas erra as fáceis, isso pesa no índice de coerência pedagógica (é o famoso "acertou no chute").

### UERJ: Exame de Qualificação

Na UERJ a conta é mais direta: percentual de acertos em 60 questões, que vira um conceito.

| Conceito | Acertos | Bônus na 2ª fase |
|----------|---------|------------------|
| A | 70% ou mais | +20 pontos |
| B | 60% a 69,9% | +15 pontos |
| C | 50% a 59,9% | +10 pontos |
| D | 40% a 49,9% | +5 pontos |
| Reprovado | abaixo de 40% | 0 |

---

## 3. Rascunho com mesa digitalizadora

O `DigitalPenCanvas` foi pensado pra quem estuda com caneta: Wacom Intuos/One, Huion Inspiroy/Kamvas, XP-Pen Deco, Surface Pen e similares.

**Leitura da caneta**
- Detecta automaticamente quando é uma caneta (`e.pointerType === 'pen'`).
- Usa a pressão nativa (`e.pressure`) pra variar a espessura do traço, como numa caneta de verdade.

**Traço sem tremedeira**
- Uma janela móvel de pontos com curvas de Bézier quadráticas (`quadraticCurveTo`) liga os pontos médios e tira o tremido da mão.

**Ferramentas**
- **Canetas:** nanquim preto, azul Bic, vermelho de correção e verde de gabarito.
- **Marca-texto:** amarelo flúor, menta e rosa, com blend mode `multiply`, então o texto continua legível por baixo.
- **Borracha:** apaga tudo ou só na pontinha, quando você precisa de precisão.
- **Folhas:** quadriculada, pautada ou em branco.
- **Rascunho salvo:** seus traços ficam guardados por questão e voltam sozinhos quando você reabre.

---

## 4. Visual neobrutalista

O design segue o neobrutalismo sem fazer cerimônia: cor forte, borda grossa e sombra dura.

- **Cores:** amarelo `#FFE600`, ciano elétrico `#00F0FF`, laranja `#FF5A36`, verde lima `#00E599` e rosa choque `#FF3366`.
- **Bordas:** `3px` e `4px solid #111111`.
- **Sombras:** `box-shadow: 4px 4px 0px #111111`, sem blur nenhum.
- **Botões com peso:** eles afundam quando você clica (`active:translate-x-1 active:translate-y-1 active:shadow-none`).

**Atalhos de teclado**

| Tecla | O que faz |
|-------|-----------|
| `1`–`5` ou `A`–`E` | Marca a alternativa |
| `R` | Abre o rascunho da caneta |
| `F11` | Tela cheia |

---

## 5. Rodando o projeto

### O que você precisa
- **Node.js 22+** (a versão 20 roda o app, mas os testes em TypeScript precisam do Node 22)
- **npm** ou **pnpm**

### Modo de desenvolvimento

```bash
# 1. Instale as dependências
npm install

# 2. Rode os testes da lógica pura
node --test src/services/tri/triEngine.test.ts src/services/storage/localDatabase.test.ts

# 3. Suba o servidor de desenvolvimento
npm run dev
```

Depois é só abrir `http://localhost:3000` no navegador.

### Build de produção (Web / PWA)

```bash
npm run build
```

---

## 6. Gerando o instalador pra Windows 11 (.exe / .msi)

### Opção A: Tauri (recomendada: leve e seguro, com Rust)

1. Instale o Tauri CLI:
   ```bash
   npm install -D @tauri-apps/cli
   ```
2. Inicialize o Tauri no projeto:
   ```bash
   npx tauri init
   ```
   Na hora de responder as perguntas:
   - *App name:* VestibulandoNeo
   - *Window title:* Vestibulando Neo - Plataforma de Questões
   - *Web assets:* `../dist`
   - *Dev server URL:* `http://localhost:3000`
3. Gere o instalador:
   ```bash
   npx tauri build
   ```
   O `.msi` e o `.exe` ficam em `src-tauri/target/release/bundle/msi/`.

### Opção B: Electron

1. Instale o Electron e o Electron Builder:
   ```bash
   npm install -D electron electron-builder
   ```
2. Crie um `electron-main.js` apontando pro `dist/index.html`.
3. Adicione este script no `package.json`:
   ```json
   "build:desktop": "npm run build && electron-builder --win"
   ```
4. Rode `npm run build:desktop` e pronto: o instalador do Windows sai daí.

---

## 7. Banco SQLite offline

Quer abrir seus dados num SQLite de verdade? É rapidinho:

1. Vá na aba **"Ingestão & Banco Offline"** dentro do app.
2. Clique em **"Exportar Script SQLite Completo (.sql)"**.
3. O script cria as tabelas `user_profile`, `questions` e `attempts`, já com as chaves estrangeiras. Dá pra abrir no [DB Browser for SQLite](https://sqlitebrowser.org/) ou ligar por qualquer driver nativo.

---

Bons estudos! 🚀