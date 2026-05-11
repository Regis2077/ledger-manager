import 'dotenv/config'
import { sql } from 'drizzle-orm'
import { db } from './index.js'
import { assets } from './schema.js'

const TOTAL = 100_000
const BATCH_SIZE = 1_000

const STOCKS = [
  { ticker: 'PETR3', name: 'Petrobras ON' },
  { ticker: 'PETR4', name: 'Petrobras PN' },
  { ticker: 'VALE3', name: 'Vale ON' },
  { ticker: 'ITUB4', name: 'Itaú Unibanco PN' },
  { ticker: 'BBDC4', name: 'Bradesco PN' },
  { ticker: 'WEGE3', name: 'WEG ON' },
  { ticker: 'RENT3', name: 'Localiza ON' },
  { ticker: 'SUZB3', name: 'Suzano ON' },
  { ticker: 'ABEV3', name: 'Ambev ON' },
  { ticker: 'BBAS3', name: 'Banco do Brasil ON' },
]

const FIIS = [
  { ticker: 'KNRI11', name: 'FII Kinea Renda Imobiliária' },
  { ticker: 'HGLG11', name: 'FII CSHG Logística' },
  { ticker: 'XPML11', name: 'FII XP Malls' },
  { ticker: 'VISC11', name: 'FII Vinci Shopping Centers' },
  { ticker: 'MXRF11', name: 'FII Maxi Renda' },
  { ticker: 'BCFF11', name: 'FII BC Fundo de Fundos' },
  { ticker: 'RBRF11', name: 'FII RBR Alpha' },
  { ticker: 'BTLG11', name: 'FII BTG Pactual Logística' },
]

const BONDS = [
  'Tesouro Selic 2026',
  'Tesouro Selic 2029',
  'Tesouro IPCA+ 2029',
  'Tesouro IPCA+ 2035',
  'Tesouro Prefixado 2027',
  'CDB Nubank 110% CDI',
  'CDB Inter 108% CDI',
  'LCI Itaú 95% CDI',
  'LCA Bradesco 90% CDI',
  'Debênture PETR 2028',
]

const ETFS = [
  { ticker: 'BOVA11', name: 'ETF iShares Ibovespa' },
  { ticker: 'IVVB11', name: 'ETF iShares S&P 500' },
  { ticker: 'SMAL11', name: 'ETF iShares Small Cap' },
  { ticker: 'HASH11', name: 'ETF Hashdex Nasdaq Crypto' },
  { ticker: 'GOLD11', name: 'ETF Trend Gold' },
]

// 70% active, 20% inactive, 10% pending
const STATUSES = [
  ...Array(70).fill('active'),
  ...Array(20).fill('inactive'),
  ...Array(10).fill('pending'),
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomValue(): string {
  // Skewed towards lower values: most assets have smaller positions
  return (Math.random() ** 1.5 * 499_900 + 100).toFixed(2)
}

function randomDate(): Date {
  const now = Date.now()
  const threeYearsAgo = now - 3 * 365 * 24 * 60 * 60 * 1000
  return new Date(threeYearsAgo + Math.random() * (now - threeYearsAgo))
}

function generateAsset() {
  const types = ['stock', 'fii', 'bond', 'etf'] as const
  const type = pick(types)
  const status = pick(STATUSES)
  const value = randomValue()
  const date = randomDate()
  const base = { type, status, value, currency: 'BRL', createdAt: date, updatedAt: date }

  if (type === 'stock') return { ...base, ...pick(STOCKS) }
  if (type === 'fii') return { ...base, ...pick(FIIS) }
  if (type === 'etf') return { ...base, ...pick(ETFS) }

  return { ...base, ticker: null, name: pick(BONDS) }
}

async function seed() {
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(assets)

  if (total > 0) {
    console.log(`Banco já possui ${total.toLocaleString('pt-BR')} registros. Seed abortado.`)
    process.exit(0)
  }

  console.log(`Inserindo ${TOTAL.toLocaleString('pt-BR')} registros em batches de ${BATCH_SIZE}...`)
  const start = Date.now()

  for (let i = 0; i < TOTAL; i += BATCH_SIZE) {
    const batch = Array.from({ length: BATCH_SIZE }, generateAsset)
    await db.insert(assets).values(batch)
    process.stdout.write(`\r${(i + BATCH_SIZE).toLocaleString('pt-BR')} / ${TOTAL.toLocaleString('pt-BR')}`)
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`\nConcluído em ${elapsed}s`)
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
