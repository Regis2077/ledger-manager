# Kickstarter — Ledger Manager

Documentação completa da estrutura base do projeto: o que foi criado, por que cada decisão foi tomada e como as peças se conectam. Escrita para fins de estudo — nada é dado como óbvio.

---

## Índice

1. [O que é um kickstarter?](#1-o-que-é-um-kickstarter)
2. [Visão geral da estrutura](#2-visão-geral-da-estrutura)
3. [Monorepo com npm workspaces](#3-monorepo-com-npm-workspaces)
4. [TypeScript em toda a stack](#4-typescript-em-toda-a-stack)
5. [tsconfig.base.json — configuração compartilhada](#5-tsconfigbasejson--configuração-compartilhada)
6. [Backend — Fastify](#6-backend--fastify)
7. [Banco de dados — PostgreSQL + Drizzle ORM](#7-banco-de-dados--postgresql--drizzle-orm)
8. [Frontend — Next.js com App Router](#8-frontend--nextjs-com-app-router)
9. [Infraestrutura — Docker e docker-compose](#9-infraestrutura--docker-e-docker-compose)
10. [Arquivo por arquivo](#10-arquivo-por-arquivo)
11. [Como tudo se conecta](#11-como-tudo-se-conecta)
12. [O que vem a seguir](#12-o-que-vem-a-seguir)

---

## 1. O que é um kickstarter?

Um kickstarter é a estrutura inicial de um projeto — o esqueleto sobre o qual tudo será construído. Ele não tem funcionalidade de negócio ainda, mas estabelece:

- A organização de pastas e responsabilidades
- As ferramentas e suas configurações base
- A forma como os diferentes serviços se comunicam
- Os padrões que serão seguidos em todo o projeto

Fazer um bom kickstarter economiza retrabalho. Decisões ruins de estrutura no início custam caro depois, porque estão espalhadas por todo o código.

---

## 2. Visão geral da estrutura

```
ledger-manager/
├── apps/
│   ├── api/                  → backend (Fastify + Drizzle)
│   │   ├── src/
│   │   │   ├── index.ts      → ponto de entrada da API
│   │   │   ├── db/
│   │   │   │   ├── index.ts  → conexão com o banco
│   │   │   │   └── schema.ts → definição das tabelas
│   │   │   └── routes/
│   │   │       └── health.ts → endpoint de verificação
│   │   ├── drizzle.config.ts → configuração das migrations
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   └── .env.example
│   └── web/                  → frontend (Next.js)
│       ├── src/
│       │   └── app/
│       │       ├── layout.tsx → layout raiz da aplicação
│       │       └── page.tsx   → página inicial
│       ├── next.config.ts
│       ├── package.json
│       ├── tsconfig.json
│       ├── Dockerfile
│       └── .env.example
├── docs/                     → documentação técnica
├── docker-compose.yml        → orquestração dos serviços
├── package.json              → raiz do monorepo
├── tsconfig.base.json        → configuração TypeScript base
├── .gitignore
└── README.md
```

A separação entre `apps/api` e `apps/web` não é apenas organização visual — ela representa dois processos distintos, com responsabilidades, dependências e ciclos de vida independentes. O backend não sabe nada sobre React. O frontend não sabe nada sobre PostgreSQL.

---

## 3. Monorepo com npm workspaces

### O que é um monorepo?

Um monorepo é um único repositório Git que contém múltiplos projetos ou serviços. A alternativa é ter um repositório separado para o backend e outro para o frontend (multirepo).

### Por que monorepo aqui?

Neste projeto, a escolha é pragmática: **facilidade de navegação e estudo**. Ter tudo em um lugar permite:

- Ver o projeto completo de uma vez
- Fazer commit de mudanças que afetam frontend e backend juntos
- Rodar tudo com um único comando de desenvolvimento

### Como npm workspaces funciona?

A chave está no `package.json` da raiz:

```json
{
  "workspaces": ["apps/*"]
}
```

Isso diz ao npm: *"trate cada pasta dentro de `apps/` como um pacote separado"*. Ao rodar `npm install` na raiz, o npm instala as dependências de todos os workspaces e cria um único `node_modules` compartilhado na raiz — evitando duplicação de pacotes.

Cada app ainda tem seu próprio `package.json` com suas dependências específicas. O npm resolve quais ficam na raiz e quais precisam ficar dentro do app.

### Por que não Turborepo ou Nx?

Essas ferramentas adicionam caching de build, execução paralela otimizada e pipelines declarativos. São valiosas em monorepos grandes com dezenas de pacotes. Aqui temos dois apps e nenhuma necessidade de build encadeado por enquanto — o overhead de configuração não compensa.

---

## 4. TypeScript em toda a stack

### Por que TypeScript?

TypeScript adiciona tipagem estática ao JavaScript. Isso significa que erros de tipo são capturados em tempo de desenvolvimento (antes de rodar o código), não em produção.

Para um projeto de estudo, a vantagem é ainda mais clara: o editor consegue mostrar exatamente quais propriedades um objeto tem, quais parâmetros uma função aceita e o que ela retorna. Isso reduz a necessidade de ficar consultando documentação.

### Por que TypeScript em toda a stack (frontend e backend)?

Porque o contrato entre a API e o frontend é um dos pontos mais frágeis de qualquer aplicação. Se o backend retorna `{ created_at: string }` e o frontend espera `{ createdAt: string }`, o bug aparece em runtime — geralmente em produção.

Com TypeScript em ambos os lados, esse tipo de inconsistência pode ser detectado mais cedo. No futuro, quando compartilharmos tipos entre os apps, essa proteção fica ainda mais forte.

---

## 5. tsconfig.base.json — configuração compartilhada

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  }
}
```

Este arquivo define as opções TypeScript que são iguais em toda a stack. Cada app herda daqui com `"extends": "../../tsconfig.base.json"` e sobrescreve só o que é diferente.

### Cada opção explicada

**`target: "ES2022"`**
Define para qual versão do JavaScript o TypeScript vai compilar o código. ES2022 é suportado por todas as versões modernas do Node.js e browsers atuais, e inclui recursos modernos como `async/await`, `Array.at()`, e top-level `await`.

**`strict: true`**
Ativa um conjunto de verificações mais rígidas. A mais importante é `strictNullChecks`: sem ela, qualquer variável pode ser `null` ou `undefined` silenciosamente, o que é fonte de muitos bugs. Com ela ativa, você precisa tratar explicitamente os casos em que um valor pode não existir.

**`skipLibCheck: true`**
Ignora erros de tipo dentro dos arquivos `.d.ts` das bibliotecas externas (`node_modules`). Sem isso, TypeScript verificaria os tipos de todas as bibliotecas instaladas — o que às vezes gera erros em bibliotecas mal tipadas que não têm nada a ver com o nosso código.

**`esModuleInterop: true`**
Permite importar módulos CommonJS (o sistema de módulos antigo do Node.js) com a sintaxe de `import` do ES Modules. Sem isso, `import Fastify from 'fastify'` não funcionaria para pacotes que exportam no formato CommonJS.

**`resolveJsonModule: true`**
Permite importar arquivos `.json` diretamente no TypeScript com tipagem automática. Útil para configs e fixtures.

---

## 6. Backend — Fastify

### Por que Fastify em vez de Express?

Express é o framework Node.js mais conhecido — mas foi criado em 2010, quando JavaScript não tinha `async/await`. Ele usa callbacks por padrão, o que gera código mais verboso e propenso a erros quando se trabalha com operações assíncronas (como acessar o banco).

Fastify foi criado em 2016 com suporte nativo a `async/await` e com foco explícito em performance e developer experience. As diferenças relevantes para este projeto:

| | Express | Fastify |
|---|---|---|
| Logging | Precisa instalar e configurar | `pino` embutido, JSON por padrão |
| TypeScript | Tipos adicionados depois | Suporte nativo |
| `async/await` | Suporte básico | Suporte completo com tratamento de erros automático |
| Performance | Baseline | ~20% mais rápido em throughput |
| Schema validation | Manual ou biblioteca externa | Validação JSON Schema embutida |

Para este projeto, o ponto decisivo é o **logging estruturado em JSON embutido**. Um dos requisitos é que todas as rotas tenham logs com `requestId` e tempo de execução. O Fastify entrega isso sem nenhuma configuração adicional — o Express exigiria instalar e configurar o `winston` ou `morgan` manualmente.

### Como o Fastify é inicializado

```typescript
// apps/api/src/index.ts
const app = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',   // formata os logs durante desenvolvimento
      options: { colorize: true },
    },
  },
})
```

O `logger` aqui configura o `pino` — a biblioteca de logging embutida no Fastify. Em produção, os logs saem como JSON puro (sem `pino-pretty`), o que facilita integração com ferramentas de observabilidade como Datadog, Loki ou CloudWatch.

### Por que `"type": "module"` no package.json da API?

```json
{
  "type": "module"
}
```

Isso diz ao Node.js para tratar os arquivos `.js` como ES Modules em vez de CommonJS. ES Modules é o padrão atual do JavaScript — permite `import/export` em vez de `require/module.exports`.

A consequência prática: nas importações internas, precisamos incluir a extensão `.js` mesmo em arquivos `.ts`:

```typescript
import { healthRoute } from './routes/health.js'  // correto
import { healthRoute } from './routes/health'      // erro em ESM
```

O TypeScript compila `.ts` para `.js`, então a extensão `.js` já está correta em tempo de execução.

### tsx — executando TypeScript sem compilar

```json
"dev": "tsx watch src/index.ts"
```

`tsx` é uma ferramenta que executa arquivos TypeScript diretamente, sem a etapa de compilação para JavaScript. É o equivalente ao `ts-node`, mas mais rápido e com suporte a ES Modules.

A flag `watch` reinicia o processo automaticamente quando um arquivo muda — equivalente ao `nodemon` para projetos JavaScript.

### Rotas como plugins

O Fastify organiza rotas como plugins:

```typescript
// apps/api/src/routes/health.ts
export async function healthRoute(app: FastifyInstance) {
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() }
  })
}

// apps/api/src/index.ts
await app.register(healthRoute)
```

Isso mantém cada grupo de rotas isolado em seu próprio arquivo, com seu próprio escopo. É o padrão recomendado pelo Fastify e escala bem conforme o projeto cresce.

---

## 7. Banco de dados — PostgreSQL + Drizzle ORM

### Por que PostgreSQL?

PostgreSQL é o banco relacional open source mais avançado disponível. Para este projeto, três recursos são determinantes:

**Índices GIN para full-text search**
O requisito de busca em menos de 100ms em 100.000 registros exige um índice especializado. O GIN (Generalized Inverted Index) do PostgreSQL indexa o conteúdo textual de forma que buscas por partes de palavras sejam rápidas. Isso será implementado na Fase 3.

**`EXPLAIN ANALYZE`**
Comando que mostra o plano de execução real de uma query — quantas linhas foram varridas, qual índice foi usado, quanto tempo cada etapa levou. Imprescindível para diagnosticar e documentar a diferença de performance antes e depois de criar índices.

**Transações ACID**
As transações do PostgreSQL garantem Atomicidade, Consistência, Isolamento e Durabilidade. Quando múltiplas operações precisam ser executadas juntas (ex: criar um ativo e registrar no log de auditoria), a transação garante que ou tudo acontece ou nada acontece — nunca um estado intermediário.

### Por que Drizzle ORM em vez de Prisma?

Ambos permitem definir o schema do banco em TypeScript e gerar queries tipadas. A diferença está na filosofia:

**Prisma** abstrai o SQL quase completamente. Você raramente vê a query que está sendo executada. Para desenvolvimento rápido de CRUDs, é excelente. Para um projeto cujo objetivo inclui entender como as queries funcionam, inspecionar índices e trabalhar com cursor-based pagination, a abstração atrapalha.

**Drizzle** é SQL-first: o schema em TypeScript é um espelho direto do schema SQL. As queries Drizzle se parecem com SQL. Você sabe exatamente o que vai ser executado no banco.

Comparação do mesmo schema:

```typescript
// Drizzle — você escreve isso
export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// O SQL gerado é exatamente o que você esperaria:
// CREATE TABLE assets (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   name varchar(255) NOT NULL,
//   created_at timestamp NOT NULL DEFAULT now()
// );
```

Para cursor-based pagination (Fase 1), Drizzle permite escrever a cláusula `WHERE id > $cursor` de forma direta. Com Prisma, a mesma lógica exigiria workarounds ou raw queries.

### O schema de assets

```typescript
// apps/api/src/db/schema.ts
export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  ticker: varchar('ticker', { length: 20 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  value: numeric('value', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

**Por que `uuid` como chave primária em vez de `serial` (inteiro auto-incrementado)?**

UUIDs são gerados no cliente, não pelo banco — o que permite criar o ID antes de inserir o registro. Isso é fundamental para **idempotência** (Fase 4): se o cliente gera o ID, ele pode tentar criar o mesmo registro múltiplas vezes com o mesmo ID sem criar duplicatas.

**Por que `numeric` para `value` em vez de `float`?**

`float` usa representação binária de ponto flutuante, que introduz erros de arredondamento em valores decimais. `0.1 + 0.2` em float resulta em `0.30000000000000004`. Para valores monetários ou financeiros, isso é inaceitável. `numeric` armazena a representação decimal exata.

**Por que separar `currency` do `value`?**

Um ativo pode ter valor em BRL, USD ou EUR. Armazenar a moeda junto com o valor permite comparações e conversões corretas — sem moeda, o número `1000.00` não tem significado completo.

### Conexão com o banco

```typescript
// apps/api/src/db/index.ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export const db = drizzle(pool, { schema })
```

**Por que `Pool` em vez de `Client`?**

Um `Client` abre uma única conexão com o banco. Em um servidor web que recebe múltiplas requisições simultâneas, cada requisição precisaria esperar a anterior terminar de usar a conexão.

Um `Pool` mantém um conjunto de conexões abertas e reutilizáveis. Quando uma requisição chega, ela pega uma conexão disponível do pool, usa e devolve. Isso permite múltiplas operações simultâneas no banco sem o custo de abrir e fechar uma nova conexão TCP para cada requisição.

### drizzle.config.ts

```typescript
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

Este arquivo configura o `drizzle-kit` — a CLI do Drizzle para gerenciar migrations. Quando o schema muda, rodamos `npm run db:generate` para gerar os arquivos SQL de migration, e `npm run db:migrate` para aplicar no banco.

O `!` em `process.env.DATABASE_URL!` é um Non-null assertion do TypeScript: estamos dizendo ao compilador que sabemos que essa variável de ambiente existe. Em produção, uma validação explícita seria melhor.

---

## 8. Frontend — Next.js com App Router

### Por que Next.js em vez de Vite + React puro?

Next.js é um framework completo sobre React que adiciona:

- **Roteamento baseado em arquivos**: criar `src/app/assets/page.tsx` automaticamente cria a rota `/assets`
- **Server Components**: componentes que rodam no servidor e não enviam JavaScript para o cliente
- **Otimizações de build**: code splitting, lazy loading e otimização de imagens automáticos

Para este projeto, o motivo principal é realismo: em contextos de produção, Next.js é mais comum que React puro com Vite. Estudar Next.js aqui prepara para o cenário real.

### App Router vs Pages Router

O Next.js tem dois sistemas de roteamento:

**Pages Router** (legado, mas estável): arquivos em `pages/` definem rotas. É o sistema antigo, mais simples e amplamente documentado.

**App Router** (atual): arquivos em `app/` definem rotas, com suporte a Server Components, layouts aninhados, e colocação de código de servidor junto com o código de UI.

Escolhemos o App Router porque é o presente e o futuro do Next.js. Todo desenvolvimento novo da Vercel é focado nele.

### Estrutura do App Router

```
src/app/
├── layout.tsx   → layout raiz (sempre renderizado)
└── page.tsx     → conteúdo da rota "/"
```

**`layout.tsx`** define a estrutura HTML que envolve todas as páginas. O `<html>` e `<body>` ficam aqui — e são renderizados uma vez, não a cada navegação.

**`page.tsx`** é o conteúdo específico de cada rota. Criar `src/app/assets/page.tsx` adiciona a rota `/assets` automaticamente.

### next.config.ts

```typescript
const nextConfig: NextConfig = {
  output: 'standalone',
}
```

`output: 'standalone'` gera uma pasta `standalone` no build com apenas os arquivos necessários para rodar a aplicação — sem os arquivos de desenvolvimento. Isso produz imagens Docker menores e mais seguras.

---

## 9. Infraestrutura — Docker e docker-compose

### O que é Docker?

Docker empacota uma aplicação e todas as suas dependências em um container — uma unidade isolada que roda da mesma forma em qualquer máquina. Sem Docker, "funciona na minha máquina" é um problema real: versões diferentes de Node.js, PostgreSQL ou sistema operacional podem causar comportamentos diferentes.

### O que é docker-compose?

`docker-compose` orquestra múltiplos containers. Em vez de iniciar o banco, a API e o frontend em terminais separados com comandos diferentes, um único `docker-compose up` sobe tudo.

### Análise do docker-compose.yml

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ledger
      POSTGRES_PASSWORD: ledger
      POSTGRES_DB: ledger_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ledger -d ledger_db"]
      interval: 5s
      timeout: 5s
      retries: 5
```

**`image: postgres:16-alpine`**: usa a imagem oficial do PostgreSQL 16. O sufixo `-alpine` indica que é baseada no Alpine Linux — uma distribuição minimalista que resulta em imagens muito menores.

**`volumes: postgres_data`**: sem um volume, os dados do banco seriam perdidos toda vez que o container fosse reiniciado. O volume persiste os dados fora do container.

**`healthcheck`**: verifica se o PostgreSQL está pronto para aceitar conexões. Isso é crítico porque o container do banco pode estar rodando mas o PostgreSQL ainda estar inicializando — sem healthcheck, a API tentaria conectar antes do banco estar pronto.

```yaml
  api:
    depends_on:
      db:
        condition: service_healthy
```

**`condition: service_healthy`**: o container da API só inicia depois que o healthcheck do banco passar. Sem isso, a API tentaria conectar ao banco durante sua inicialização e falharia.

```yaml
    volumes:
      - ./apps/api:/app
      - /app/node_modules
```

O primeiro volume monta o código local dentro do container — mudanças no código refletem imediatamente sem reconstruir a imagem. O segundo volume (`/app/node_modules`) garante que o `node_modules` dentro do container não seja sobrescrito pelo `node_modules` da máquina local (que pode ter binários compilados para um sistema operacional diferente).

### Variáveis de ambiente

Cada app tem um `.env.example` com as variáveis necessárias. O arquivo `.env` real não vai para o Git (está no `.gitignore`) porque pode conter senhas e chaves secretas. O `.env.example` documenta quais variáveis são necessárias sem expor os valores reais.

---

## 10. Arquivo por arquivo

### `package.json` (raiz)

```json
{
  "name": "ledger-manager",
  "private": true,
  "workspaces": ["apps/*"],
  "scripts": {
    "dev": "concurrently \"npm run dev -w apps/api\" \"npm run dev -w apps/web\""
  }
}
```

- `private: true`: impede que o pacote raiz seja publicado acidentalmente no npm
- `workspaces`: declara os apps do monorepo
- `concurrently`: roda múltiplos comandos em paralelo no mesmo terminal, com outputs identificados por cor

### `.gitignore`

```
node_modules/    → dependências instaladas (regeneradas com npm install)
.next/           → build do Next.js (regenerado com npm run build)
dist/            → build do TypeScript (regenerado com npm run build)
.env             → variáveis de ambiente com segredos
```

Arquivos no `.gitignore` não são versionados. Isso mantém o repositório limpo, sem arquivos grandes ou sensíveis.

### `apps/api/src/index.ts`

O ponto de entrada da API. Responsável por:
1. Carregar variáveis de ambiente (`dotenv/config`)
2. Criar a instância do Fastify com o logger configurado
3. Registrar os plugins (cors, rotas)
4. Iniciar o servidor na porta configurada

### `apps/api/src/db/schema.ts`

Define as tabelas do banco em TypeScript. O Drizzle usa esse arquivo para:
- Gerar as migrations SQL
- Inferir os tipos TypeScript das queries (`Asset`, `NewAsset`)

### `apps/api/src/routes/health.ts`

O endpoint `GET /health` retorna `{ status: "ok" }`. Parece simples, mas é fundamental:
- Docker usa para verificar se o serviço está saudável
- Load balancers usam para remover instâncias com problema
- Equipes de on-call usam como primeira verificação quando algo falha

---

## 11. Como tudo se conecta

```
┌─────────────────────────────────────────────────────┐
│                   docker-compose                     │
│                                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐  │
│  │  web     │───▶│  api     │───▶│  db          │  │
│  │ :3000    │    │ :3001    │    │ :5432        │  │
│  │ Next.js  │    │ Fastify  │    │ PostgreSQL   │  │
│  └──────────┘    └──────────┘    └──────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

1. O usuário acessa `localhost:3000` no browser
2. O Next.js serve a interface React
3. O frontend faz requisições HTTP para `localhost:3001` (a API)
4. O Fastify recebe a requisição, consulta o PostgreSQL via Drizzle
5. O banco retorna os dados, a API responde em JSON, o frontend exibe

Em desenvolvimento local sem Docker, cada serviço roda em seu próprio terminal. Com Docker, `docker-compose up` cuida de tudo.

---

## 12. O que vem a seguir

### Fase 1 — Fundação

- Schema definitivo com todos os índices
- Migration via `drizzle-kit`
- Seed de 100.000 registros no banco
- Endpoint de listagem com paginação cursor-based (sem `OFFSET`)
- `EXPLAIN ANALYZE` antes e depois dos índices, documentado

### Fase 2 — Lista virtualizada

- Virtual scroll no frontend (TanStack Virtual)
- Store com `Map<id, Asset>` para acesso O(1)
- `IntersectionObserver` para carregar a próxima página automaticamente

### Fase 3 — Busca

- Índice GIN no PostgreSQL para full-text search
- Debounce no input (evita requisição a cada tecla)
- `AbortController` para cancelar requisições obsoletas
- Cache por termo no backend

### Fase 4 — Mutações

- CRUD completo (criar, editar, remover ativos)
- Transações no banco com rollback demonstrável
- Idempotência via `idempotency-key` no header
- Retry com backoff exponencial para chamadas externas

### Fase 5 — Qualidade

- Logs estruturados em JSON com `requestId` em todas as rotas
- Testes de integração com Jest + Supertest
- Docker finalizado para produção
- README completo com todas as decisões documentadas
