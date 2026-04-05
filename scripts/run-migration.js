#!/usr/bin/env node
/**
 * Run this script to execute the migration against Supabase.
 *
 * Usage:
 *   node scripts/run-migration.js
 *
 * Requires DATABASE_URL environment variable or will prompt.
 * The DATABASE_URL can be found in Supabase Dashboard > Settings > Database > Connection string (URI)
 */

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

async function main() {
  const dbUrl = process.env.DATABASE_URL || process.argv[2]

  if (!dbUrl) {
    console.error('Usage: DATABASE_URL=postgresql://... node scripts/run-migration.js')
    console.error('   or: node scripts/run-migration.js "postgresql://..."')
    console.error('')
    console.error('Get the connection string from:')
    console.error('Supabase Dashboard > Settings > Database > Connection string (URI)')
    process.exit(1)
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    console.log('Connected to database!')

    const migrationName = process.argv[3] || '001_initial_schema.sql'
    const sqlFile = path.join(__dirname, '..', 'supabase', 'migrations', migrationName)
    if (!fs.existsSync(sqlFile)) {
      console.error('Migration file not found:', sqlFile)
      process.exit(1)
    }
    const sql = fs.readFileSync(sqlFile, 'utf8')

    console.log('Running migration...')
    await client.query(sql)
    console.log('Migration completed!')

    const res = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    )
    console.log('Tables created:', res.rows.map(r => r.table_name).join(', '))
  } catch (err) {
    console.error('Migration failed:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
