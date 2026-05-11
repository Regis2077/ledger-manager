import { pgTable, uuid, varchar, numeric, text, timestamp, index, customType } from 'drizzle-orm/pg-core'

const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector'
  },
})

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  ticker: varchar('ticker', { length: 20 }),
  type: varchar('type', { length: 50 }).notNull(),
  value: numeric('value', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  searchVector: tsvector('search_vector'),
}, (table) => [
  index('assets_status_created_at_idx').on(table.status, table.createdAt),
  index('assets_search_vector_gin_idx').using('gin', table.searchVector),
])

export type Asset = typeof assets.$inferSelect
export type NewAsset = typeof assets.$inferInsert
