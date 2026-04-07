// Runs all SQL migration files in order against the configured PostgreSQL database
const fs   = require('fs')
const path = require('path')
const pool = require('./pool')

async function migrate() {
  const migrationsDir = path.join(__dirname, 'migrations')
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()

  console.log(`Running ${files.length} migration(s)...`)

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    console.log(`  → ${file}`)
    await pool.query(sql)
  }

  console.log('Migrations complete.')
  await pool.end()
}

migrate().catch(err => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
