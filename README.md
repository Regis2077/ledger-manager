# Ledger Manager

Módulo fullstack de gestão de ativos capaz de operar com até 100.000 registros simultaneamente.

## Como rodar

```bash
docker-compose up
```

Isso sobe o banco PostgreSQL, a API e o frontend em um único comando.

## Estrutura

```
ledger-manager/
├── apps/
│   ├── web/   → Next.js App Router
│   └── api/   → Fastify + Drizzle ORM
├── docker-compose.yml
└── package.json
```

## Decisões técnicas

### Monorepo com npm workspaces
Repositório único para facilitar visualização e navegação entre frontend e backend. Sem pacotes compartilhados — cada app é autônomo. `npm workspaces` sem overhead de ferramentas como Turborepo porque o projeto não tem builds encadeadas no momento.

### Fastify em vez de Express
Fastify tem logging estruturado em JSON embutido via `pino`, sem configuração adicional. Isso cobre o requisito de logs com `requestId` e tempo de execução nativamente. Performance superior ao Express em throughput de requisições.

### Drizzle ORM em vez de Prisma
Drizzle é SQL-first: o schema é definido em TypeScript mas o SQL gerado é previsível e legível. Isso é essencial para trabalhar com `EXPLAIN ANALYZE`, cursor-based pagination e índices de forma consciente — o Prisma abstrai demais para um projeto cujo objetivo é entender e controlar o acesso ao banco.

### PostgreSQL
Suporte nativo a `uuid`, índices GIN para full-text search, transações ACID, e `EXPLAIN ANALYZE` com planos de execução detalhados. A escolha óbvia para os requisitos de consistência e performance do projeto.

### Paginação cursor-based (a implementar na Fase 1)
`OFFSET` tem custo O(n) — o banco precisa varrer todos os registros anteriores antes de retornar a página solicitada. Cursor-based pagina pelo valor do último registro visto, mantendo a query O(log n) com índice adequado.

### Virtual scroll (a implementar na Fase 2)
Renderizar 100.000 linhas no DOM simultaneamente trava o browser. A lista virtualizada mantém no DOM apenas as linhas visíveis na viewport, independente do total de registros em memória.

### Store baseado em Map (a implementar na Fase 2)
Arrays exigem `find` e `filter` para acesso e remoção — custo O(n). `Map<id, Asset>` garante acesso, atualização e remoção em O(1), independente do volume de dados.

### AbortController para busca (a implementar na Fase 3)
Evita race conditions: quando o usuário digita rápido, requisições anteriores são canceladas antes que a resposta chegue fora de ordem e sobrescreva um resultado mais recente.

## Fases

| Fase | Conteúdo |
|------|----------|
| 1 — Fundação | Schema, seed de 100k registros, paginação cursor-based |
| 2 — Lista virtualizada | Virtual scroll, store com Map, IntersectionObserver |
| 3 — Busca | Debounce, índice GIN, cache por termo, AbortController |
| 4 — Mutações | CRUD, retry/backoff, transações, idempotency-key |
| 5 — Qualidade | Logs JSON, testes de integração, health check, Docker |
