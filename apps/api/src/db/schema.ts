import { pgTable, uuid, varchar, numeric, text, timestamp } from 'drizzle-orm/pg-core'

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

export type Asset = typeof assets.$inferSelect
export type NewAsset = typeof assets.$inferInsert
