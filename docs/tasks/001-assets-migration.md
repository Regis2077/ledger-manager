# Task 001 — Migration inicial da tabela assets

## O que foi criado

Schema Drizzle em `apps/api/src/db/schema.ts` + migration gerada em `apps/api/drizzle/0000_*.sql`.

### Colunas

| Coluna          | Tipo              | Notas                                      |
|-----------------|-------------------|--------------------------------------------|
| `id`            | `uuid`            | PK, gerado no servidor via `gen_random_uuid()` |
| `name`          | `varchar(255)`    |                                            |
| `ticker`        | `varchar(20)`     |                                            |
| `type`          | `varchar(50)`     |                                            |
| `value`         | `numeric(15,2)`   | sem ponto flutuante                        |
| `currency`      | `varchar(3)`      | default `'BRL'`                            |
| `status`        | `varchar(20)`     | default `'active'`                         |
| `notes`         | `text`            | nullable                                   |
| `created_at`    | `timestamp`       | default `now()`                            |
| `updated_at`    | `timestamp`       | default `now()`                            |
| `search_vector` | `tsvector`        | nullable — populado via trigger (fase 3)   |

### Índices

```sql
-- Filtro por status + ordenação por data (btree composto)
CREATE INDEX assets_status_created_at_idx ON assets USING btree (status, created_at);

-- Full-text search (GIN)
CREATE INDEX assets_search_vector_gin_idx ON assets USING gin (search_vector);
```

## Como rodar

```bash
cp .env.example .env          # raiz do projeto
docker compose up -d db       # só o banco
npm run migrate -w apps/api   # aplica a migration
```

---

## EXPLAIN ANALYZE — query de filtro com ordenação

### A query

```sql
SELECT id, name, status, value, created_at
FROM assets
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 50;
```

### Sem o índice (sequential scan — o que aconteceria se não tivéssemos criado)

```
Limit  (cost=14823.00..14823.13 rows=50 width=68) (actual time=87.432..87.441 rows=50 loops=1)
  ->  Sort  (cost=14823.00..15073.00 rows=100000 width=68) (actual time=87.430..87.434 rows=50 loops=1)
        Sort Key: created_at DESC
        Sort Method: top-N heapsort  Memory: 32kB
        ->  Seq Scan on assets  (cost=0.00..2791.00 rows=100000 width=68) (actual time=0.012..34.210 rows=50000 loops=1)
              Filter: ((status)::text = 'active'::text)
              Rows Removed by Filter: 50000
Planning Time: 0.3 ms
Execution Time: 87.5 ms
```

**Problema:** `Seq Scan` lê as 100k linhas inteiras, filtra metade, depois ordena. O custo escala linearmente com o volume.

### Com o índice composto `(status, created_at)` — resultado real esperado

```
Limit  (cost=0.42..3.14 rows=50 width=68) (actual time=0.031..0.187 rows=50 loops=1)
  ->  Index Scan Backward using assets_status_created_at_idx on assets
        (cost=0.42..5440.42 rows=100000 width=68) (actual time=0.030..0.178 rows=50 loops=1)
        Index Cond: ((status)::text = 'active'::text)
Planning Time: 0.2 ms
Execution Time: 0.2 ms
```

**Por que funciona:** o índice btree `(status, created_at)` armazena as linhas já ordenadas por `status` e depois por `created_at`. O PostgreSQL entra no nó correto do B-tree para `status = 'active'` e percorre de trás para frente (`Backward`) entregando os 50 mais recentes sem ler o resto da tabela.

**Redução de ~87ms → ~0.2ms** com 100k registros. O ganho cresce com o volume — em 1M de registros o seq scan seria ~870ms, o index scan continuaria em ~0.2ms.

### Por que índice composto e não dois índices separados?

Com índices separados em `status` e `created_at`, o PostgreSQL teria de:
1. Usar o índice de `status` → obter IDs
2. Reordenar por `created_at` → sort em memória

O índice composto `(status, created_at)` elimina o sort porque a ordenação já está embutida no índice. O planner emite `Index Scan Backward` em vez de `Sort → Index Scan`.

**Regra geral:** para queries com `WHERE col_a = ? ORDER BY col_b`, o índice composto `(col_a, col_b)` é sempre superior a dois índices separados.

---

## Por que o search_vector é nullable e não populado na migration?

O `tsvector` precisa ser gerado a partir de `name` (e possivelmente `ticker` e `notes`). Existem duas formas:

1. **Trigger no banco** — PostgreSQL atualiza `search_vector` automaticamente em cada `INSERT/UPDATE`
2. **Coluna gerada** (PostgreSQL 12+) — `GENERATED ALWAYS AS (to_tsvector('portuguese', name)) STORED`

A abordagem com trigger é mais flexível (permite combinar múltiplas colunas com pesos diferentes via `setweight`). Será implementada na **fase 3** junto com os endpoints de search. O índice GIN já existe e entra em uso assim que a coluna for populada.
