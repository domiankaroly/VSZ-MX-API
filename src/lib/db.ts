import mysql from 'mysql2/promise'

let pool: mysql.Pool | null = null

function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'vsz_user',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'vsz',
      waitForConnections: true,
      connectionLimit: 20,
      charset: 'utf8mb4',
      timezone: '+01:00',
    })
  }
  return pool
}

// mysql2 nha Buffer objectet ad vissza CONCAT() / TEXT mezoknél
// { type: 'Buffer', data: [72, 101, ...] } -> "He..."
function sanitizeRow<T>(row: T): T {
  if (!row || typeof row !== 'object') return row
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
    if (v instanceof Buffer) {
      result[k] = v.toString('utf8')
    } else if (
      v !== null &&
      typeof v === 'object' &&
      'type' in (v as object) &&
      'data' in (v as object) &&
      (v as { type: string }).type === 'Buffer'
    ) {
      result[k] = Buffer.from((v as { data: number[] }).data).toString('utf8')
    } else {
      result[k] = v
    }
  }
  return result as T
}

export async function query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
  const p = getPool()
  const [rows] = await p.query(sql, params ?? [])
  return (rows as T[]).map(sanitizeRow)
}

export async function queryOne<T = unknown>(sql: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}

export async function execute(sql: string, params?: unknown[]): Promise<mysql.ResultSetHeader> {
  const p = getPool()
  const [result] = await p.query(sql, params ?? [])
  return result as mysql.ResultSetHeader
}

export async function callProcedure<T = unknown>(name: string, params?: unknown[]): Promise<T[]> {
  const placeholders = (params ?? []).map(() => '?').join(',')
  const rows = await query<T[]>(`CALL ${name}(${placeholders})`, params)
  return (rows[0] ?? []) as unknown as T[]
}

export async function testConnection(): Promise<boolean> {
  try {
    await query('SELECT 1')
    return true
  } catch {
    return false
  }
}
