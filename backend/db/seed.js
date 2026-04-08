// Seeds default super_admin and Test Org admin accounts
// Run after migrations: node db/seed.js
const bcrypt = require('bcryptjs')
const pool   = require('./pool')

async function seed() {
  const hash = await bcrypt.hash('admin123', 10)

  // Super admin (no org)
  await pool.query(`
    INSERT INTO admin_users (email, password_hash, role, name)
    VALUES ($1, $2, 'super_admin', 'Super Admin')
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
  `, ['super@loyalty.com', hash])
  console.log('✓ super_admin: super@loyalty.com / admin123')

  // Test Org admin
  const orgRes = await pool.query('SELECT id FROM organizations WHERE org_code = $1', ['TESTORG'])
  if (!orgRes.rows.length) {
    console.log('✗ Test Org not found — run migrations first')
    process.exit(1)
  }

  await pool.query(`
    INSERT INTO admin_users (org_id, email, password_hash, role, name)
    VALUES ($1, $2, $3, 'org_admin', 'Test Org Admin')
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
  `, [orgRes.rows[0].id, 'admin@testorg.com', hash])
  console.log('✓ org_admin:   admin@testorg.com / admin123')

  console.log('\nSeed complete.')
  await pool.end()
}

seed().catch(err => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
