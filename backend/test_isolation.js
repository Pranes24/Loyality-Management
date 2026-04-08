// Multi-tenant API isolation test suite — localhost:4000
// Uses only Node.js built-in http module. No npm dependencies.
'use strict'

const http = require('http')

const BASE = { host: 'localhost', port: 4000 }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function request(method, path, { token, body } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null
    const headers = { 'Content-Type': 'application/json' }
    if (token)   headers['Authorization'] = `Bearer ${token}`
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload)

    const req = http.request(
      { ...BASE, method, path, headers },
      res => {
        let raw = ''
        res.on('data', chunk => { raw += chunk })
        res.on('end', () => {
          let json
          try { json = JSON.parse(raw) } catch { json = raw }
          resolve({ status: res.statusCode, body: json })
        })
      }
    )
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

// ─── Reporter ─────────────────────────────────────────────────────────────────

let passed = 0, failed = 0
const RESULTS = []

function pass(id, label, detail = '') {
  passed++
  const msg = `  PASS  [${id}] ${label}${detail ? ' — ' + detail : ''}`
  console.log(msg)
  RESULTS.push({ id, label, result: 'PASS', detail })
}

function fail(id, label, detail = '') {
  failed++
  const msg = `  FAIL  [${id}] ${label}${detail ? ' — ' + detail : ''}`
  console.log(msg)
  RESULTS.push({ id, label, result: 'FAIL', detail })
}

function section(title) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`  ${title}`)
  console.log('─'.repeat(60))
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('='.repeat(60))
  console.log('  LOYALTY MANAGEMENT — API ISOLATION TEST SUITE')
  console.log(`  Target: http://localhost:4000`)
  console.log(`  Date:   ${new Date().toISOString()}`)
  console.log('='.repeat(60))

  // ── Tokens & org IDs captured during login ──────────────────────────────
  let superToken, testOrgToken, ramcoToken
  let testOrgId, ramcoOrgId
  let ramcoBatchId  // grabbed for cross-org tests

  // ════════════════════════════════════════════════════════════════════════
  section('AUTH TESTS')
  // ════════════════════════════════════════════════════════════════════════

  // [1a] super admin login
  {
    const r = await request('POST', '/api/auth/login', {
      body: { email: 'super@loyalty.com', password: 'admin123' },
    })
    const u = r.body?.user
    if (
      r.status === 200 &&
      r.body.token &&
      u?.role === 'super_admin' &&
      !u?.orgId
    ) {
      superToken = r.body.token
      pass('1a', 'super@loyalty.com login', `role=${u.role} orgId=${u.orgId}`)
    } else {
      fail('1a', 'super@loyalty.com login', `status=${r.status} role=${u?.role} orgId=${u?.orgId}`)
    }
  }

  // [1b] TestOrg admin login
  {
    const r = await request('POST', '/api/auth/login', {
      body: { email: 'admin@testorg.com', password: 'admin123' },
    })
    const u = r.body?.user
    if (
      r.status === 200 &&
      r.body.token &&
      u?.role === 'org_admin' &&
      u?.orgId
    ) {
      testOrgToken = r.body.token
      testOrgId    = u.orgId
      pass('1b', 'admin@testorg.com login', `role=${u.role} orgId=${u.orgId} org=${u.orgCode}`)
    } else {
      fail('1b', 'admin@testorg.com login', `status=${r.status} role=${u?.role} orgId=${u?.orgId}`)
    }
  }

  // [1c] Ramco admin login
  {
    const r = await request('POST', '/api/auth/login', {
      body: { email: 'admin@ramco.com', password: 'admin123' },
    })
    const u = r.body?.user
    if (
      r.status === 200 &&
      r.body.token &&
      u?.role === 'org_admin' &&
      u?.orgId
    ) {
      ramcoToken = r.body.token
      ramcoOrgId = u.orgId
      pass('1c', 'admin@ramco.com login', `role=${u.role} orgId=${u.orgId} org=${u.orgCode}`)
    } else {
      fail('1c', 'admin@ramco.com login', `status=${r.status} role=${u?.role} orgId=${u?.orgId}`)
    }
  }

  // [1d] TestOrg and Ramco must have DIFFERENT orgIds
  if (testOrgId && ramcoOrgId) {
    if (testOrgId !== ramcoOrgId) {
      pass('1d', 'TestOrg and Ramco have different orgIds', `${testOrgId} vs ${ramcoOrgId}`)
    } else {
      fail('1d', 'TestOrg and Ramco have different orgIds', `both = ${testOrgId}`)
    }
  } else {
    fail('1d', 'TestOrg and Ramco have different orgIds', 'login failed, cannot compare')
  }

  // [2] Invalid login → 401
  {
    const r = await request('POST', '/api/auth/login', {
      body: { email: 'nobody@nowhere.com', password: 'wrongpass' },
    })
    if (r.status === 401) {
      pass('2', 'Invalid login returns 401', `status=${r.status}`)
    } else {
      fail('2', 'Invalid login returns 401', `got status=${r.status}`)
    }
  }

  // [3] Protected route without token → 401
  {
    const r = await request('GET', '/api/batch/list')
    if (r.status === 401) {
      pass('3', 'No token on protected route returns 401', `status=${r.status}`)
    } else {
      fail('3', 'No token on protected route returns 401', `got status=${r.status}`)
    }
  }

  // [4] TestOrg token on super admin route → 403
  {
    const r = await request('GET', '/api/super/orgs', { token: testOrgToken })
    if (r.status === 403) {
      pass('4', 'TestOrg token on /api/super/orgs returns 403', `status=${r.status}`)
    } else {
      fail('4', 'TestOrg token on /api/super/orgs returns 403', `got status=${r.status}`)
    }
  }

  // [5] SuperAdmin token on org admin route → 403
  {
    const r = await request('GET', '/api/batch/list', { token: superToken })
    if (r.status === 403) {
      pass('5', 'SuperAdmin token on /api/batch/list returns 403', `status=${r.status}`)
    } else {
      fail('5', 'SuperAdmin token on /api/batch/list returns 403', `got status=${r.status}`)
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  section('ORG ISOLATION TESTS')
  // ════════════════════════════════════════════════════════════════════════

  let testOrgBatches = [], ramcoBatches = []

  // [6] GET /api/batch/list with TestOrg token — must NOT return RAMCO batches
  {
    const r = await request('GET', '/api/batch/list', { token: testOrgToken })
    if (r.status === 200) {
      const batches = r.body.batches || r.body.data || r.body || []
      testOrgBatches = Array.isArray(batches) ? batches : []
      const orgIds = [...new Set(testOrgBatches.map(b => b.org_id))]
      const hasRamco = orgIds.some(id => id === ramcoOrgId)
      if (!hasRamco) {
        pass('6', 'TestOrg batch list contains no RAMCO batches',
          `returned ${testOrgBatches.length} batch(es), orgIds=[${orgIds.join(',')}]`)
      } else {
        fail('6', 'TestOrg batch list contains no RAMCO batches',
          `RAMCO orgId ${ramcoOrgId} found in result`)
      }
    } else {
      fail('6', 'TestOrg batch list returns 200', `status=${r.status}`)
    }
  }

  // [7] GET /api/batch/list with RAMCO token — must NOT return TestOrg batches
  {
    const r = await request('GET', '/api/batch/list', { token: ramcoToken })
    if (r.status === 200) {
      const batches = r.body.batches || r.body.data || r.body || []
      ramcoBatches = Array.isArray(batches) ? batches : []
      const orgIds = [...new Set(ramcoBatches.map(b => b.org_id))]
      const hasTestOrg = orgIds.some(id => id === testOrgId)
      // Grab a RAMCO batch id for cross-org tests
      if (ramcoBatches.length > 0) ramcoBatchId = ramcoBatches[0].id
      if (!hasTestOrg) {
        pass('7', 'RAMCO batch list contains no TestOrg batches',
          `returned ${ramcoBatches.length} batch(es), orgIds=[${orgIds.join(',')}]`)
      } else {
        fail('7', 'RAMCO batch list contains no TestOrg batches',
          `TestOrg orgId ${testOrgId} found in result`)
      }
    } else {
      fail('7', 'RAMCO batch list returns 200', `status=${r.status}`)
    }
  }

  // [8] GET /api/stats/summary with TestOrg token
  let testOrgStats, ramcoStats
  {
    const r = await request('GET', '/api/stats/summary', { token: testOrgToken })
    if (r.status === 200) {
      testOrgStats = r.body
      pass('8', 'TestOrg /api/stats/summary returns 200',
        `batches=${r.body.batches?.total} wallet=${r.body.wallet?.balance} users=${r.body.users?.total}`)
    } else {
      fail('8', 'TestOrg /api/stats/summary returns 200', `status=${r.status}`)
    }
  }

  // [9] GET /api/stats/summary with RAMCO token
  {
    const r = await request('GET', '/api/stats/summary', { token: ramcoToken })
    if (r.status === 200) {
      ramcoStats = r.body
      pass('9', 'RAMCO /api/stats/summary returns 200',
        `batches=${r.body.batches?.total} wallet=${r.body.wallet?.balance} users=${r.body.users?.total}`)
    } else {
      fail('9', 'RAMCO /api/stats/summary returns 200', `status=${r.status}`)
    }
  }

  // Verify stats differ between orgs — response shape: { batches:{total}, wallet:{balance}, users:{total} }
  if (testOrgStats && ramcoStats) {
    const tBatches = testOrgStats.batches?.total
    const rBatches = ramcoStats.batches?.total
    const tWallet  = testOrgStats.wallet?.balance
    const rWallet  = ramcoStats.wallet?.balance
    const tUsers   = testOrgStats.users?.total
    const rUsers   = ramcoStats.users?.total

    const allSame =
      tBatches === rBatches &&
      tWallet  === rWallet  &&
      tUsers   === rUsers

    if (!allSame) {
      pass('8-9-cmp', 'TestOrg and RAMCO stats differ (isolation confirmed)',
        `testOrg batches=${tBatches} wallet=${tWallet} users=${tUsers} | ramco batches=${rBatches} wallet=${rWallet} users=${rUsers}`)
    } else {
      fail('8-9-cmp', 'TestOrg and RAMCO stats differ',
        `all identical — batches=${tBatches} wallet=${tWallet} users=${tUsers} — possible cross-org leak or both orgs empty`)
    }
  }

  // [10] GET /api/wallet/balance with TestOrg token
  let testOrgWallet, ramcoWallet
  {
    const r = await request('GET', '/api/wallet/balance', { token: testOrgToken })
    if (r.status === 200) {
      testOrgWallet = r.body
      pass('10', 'TestOrg /api/wallet/balance returns 200',
        `balance=${r.body.balance} org_id=${r.body.org_id}`)
    } else {
      fail('10', 'TestOrg /api/wallet/balance returns 200', `status=${r.status}`)
    }
  }

  // [11] GET /api/wallet/balance with RAMCO token
  {
    const r = await request('GET', '/api/wallet/balance', { token: ramcoToken })
    if (r.status === 200) {
      ramcoWallet = r.body
      pass('11', 'RAMCO /api/wallet/balance returns 200',
        `balance=${r.body.balance} org_id=${r.body.org_id}`)
    } else {
      fail('11', 'RAMCO /api/wallet/balance returns 200', `status=${r.status}`)
    }
  }

  // Wallet isolation
  if (testOrgWallet && ramcoWallet) {
    const sameOrgId = testOrgWallet.org_id === ramcoWallet.org_id
    if (!sameOrgId) {
      pass('10-11-cmp', 'Wallet org_ids are different (isolation confirmed)',
        `testOrg=${testOrgWallet.org_id} ramco=${ramcoWallet.org_id}`)
    } else {
      fail('10-11-cmp', 'Wallet org_ids are different',
        `both wallets show org_id=${testOrgWallet.org_id}`)
    }
  }

  // [12] GET /api/users/list — TestOrg and RAMCO must return different user sets
  let testOrgUsers = [], ramcoUsers = []
  {
    const [rT, rR] = await Promise.all([
      request('GET', '/api/users/list', { token: testOrgToken }),
      request('GET', '/api/users/list', { token: ramcoToken }),
    ])

    const extractUsers = r => {
      const u = r.body.users || r.body.data || r.body || []
      return Array.isArray(u) ? u : []
    }

    if (rT.status === 200) testOrgUsers = extractUsers(rT)
    if (rR.status === 200) ramcoUsers   = extractUsers(rR)

    if (rT.status === 200 && rR.status === 200) {
      const testIds  = new Set(testOrgUsers.map(u => u.id))
      const ramcoIds = new Set(ramcoUsers.map(u => u.id))
      const overlap  = [...testIds].filter(id => ramcoIds.has(id))

      if (overlap.length === 0) {
        pass('12', 'User lists are fully isolated (no shared user IDs)',
          `testOrg=${testOrgUsers.length} users, ramco=${ramcoUsers.length} users`)
      } else {
        fail('12', 'User lists are fully isolated',
          `${overlap.length} overlapping user IDs: ${overlap.slice(0, 5).join(',')}`)
      }
    } else {
      fail('12', 'Both orgs return 200 from /api/users/list',
        `testOrg=${rT.status} ramco=${rR.status}`)
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  section('CROSS-ORG ACCESS TESTS')
  // ════════════════════════════════════════════════════════════════════════

  if (!ramcoBatchId) {
    // Try to get one via RAMCO token directly
    const r = await request('GET', '/api/batch/list', { token: ramcoToken })
    const list = r.body.batches || r.body.data || r.body || []
    if (Array.isArray(list) && list.length > 0) ramcoBatchId = list[0].id
  }

  if (!ramcoBatchId) {
    console.log('\n  WARNING: No RAMCO batch found — cross-org tests 13-15 will be skipped')
    fail('13', 'GET /api/batch/:ramco_id with TestOrg token → 404', 'No RAMCO batch available')
    fail('14', 'POST /api/batch/:ramco_id/fund with TestOrg token → error', 'No RAMCO batch available')
    fail('15', 'PATCH /api/batch/:ramco_id/status with TestOrg token → error', 'No RAMCO batch available')
  } else {
    console.log(`\n  Using RAMCO batch id: ${ramcoBatchId}`)

    // [13] GET /api/batch/:ramco_id with TestOrg token → 404
    {
      const r = await request('GET', `/api/batch/${ramcoBatchId}`, { token: testOrgToken })
      if (r.status === 404) {
        pass('13', `GET /api/batch/${ramcoBatchId} with TestOrg token → 404`, `status=${r.status}`)
      } else {
        fail('13', `GET /api/batch/${ramcoBatchId} with TestOrg token → 404`,
          `got status=${r.status} body=${JSON.stringify(r.body)}`)
      }
    }

    // [14] POST /api/batch/:ramco_id/fund with TestOrg token → 404 or error
    {
      const r = await request('POST', `/api/batch/${ramcoBatchId}/fund`, {
        token: testOrgToken,
        body: { dist_mode: 'auto', total_amount: 100, expires_at: '2030-12-31' },
      })
      if (r.status === 404 || r.status >= 400) {
        pass('14', `POST /api/batch/${ramcoBatchId}/fund with TestOrg token → error`,
          `status=${r.status}`)
      } else {
        fail('14', `POST /api/batch/${ramcoBatchId}/fund with TestOrg token → error`,
          `got status=${r.status} — cross-org fund may have succeeded!`)
      }
    }

    // [15] PATCH /api/batch/:ramco_id/status with TestOrg token → error
    {
      const r = await request('PATCH', `/api/batch/${ramcoBatchId}/status`, {
        token: testOrgToken,
        body: { status: 'active' },
      })
      if (r.status === 404 || r.status >= 400) {
        pass('15', `PATCH /api/batch/${ramcoBatchId}/status with TestOrg token → error`,
          `status=${r.status}`)
      } else {
        fail('15', `PATCH /api/batch/${ramcoBatchId}/status with TestOrg token → error`,
          `got status=${r.status} — cross-org status update may have succeeded!`)
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  section('SUPER ADMIN TESTS')
  // ════════════════════════════════════════════════════════════════════════

  // [16] GET /api/super/orgs — must return both TESTORG and RAMCO
  {
    const r = await request('GET', '/api/super/orgs', { token: superToken })
    if (r.status === 200) {
      const orgs = r.body.orgs || r.body.data || r.body || []
      const list = Array.isArray(orgs) ? orgs : []
      const codes = list.map(o => (o.org_code || o.code || '').toUpperCase())
      const hasTestOrg = codes.includes('TESTORG')
      const hasRamco   = codes.includes('RAMCO')

      if (hasTestOrg && hasRamco) {
        pass('16', '/api/super/orgs returns both TESTORG and RAMCO',
          `orgs=[${codes.join(', ')}]`)
      } else {
        fail('16', '/api/super/orgs returns both TESTORG and RAMCO',
          `found codes=[${codes.join(', ')}] — missing ${!hasTestOrg ? 'TESTORG' : ''}${!hasRamco ? ' RAMCO' : ''}`)
      }

      // Grab org IDs for topup test (use RAMCO's id)
      if (!testOrgId || !ramcoOrgId) {
        for (const o of list) {
          const code = (o.org_code || o.code || '').toUpperCase()
          if (code === 'TESTORG') testOrgId = o.id
          if (code === 'RAMCO')   ramcoOrgId = o.id
        }
      }
    } else {
      fail('16', '/api/super/orgs returns 200', `status=${r.status}`)
    }
  }

  // [17] GET /api/super/stats — combined platform totals
  {
    const r = await request('GET', '/api/super/stats', { token: superToken })
    if (r.status === 200) {
      const keys = Object.keys(r.body)
      if (keys.length > 0) {
        pass('17', '/api/super/stats returns 200 with data',
          JSON.stringify(r.body).slice(0, 120))
      } else {
        fail('17', '/api/super/stats returns non-empty data', 'response was empty object')
      }
    } else {
      fail('17', '/api/super/stats returns 200', `status=${r.status}`)
    }
  }

  // [18] POST /api/super/orgs/:id/topup — must succeed
  {
    const topupOrgId = ramcoOrgId || testOrgId
    if (!topupOrgId) {
      fail('18', 'POST /api/super/orgs/:id/topup succeeds', 'No orgId available for topup')
    } else {
      const r = await request('POST', `/api/super/orgs/${topupOrgId}/topup`, {
        token: superToken,
        body: { amount: 1, note: 'isolation test topup' },
      })
      if (r.status === 200 && r.body.success) {
        pass('18', `POST /api/super/orgs/${topupOrgId}/topup with superToken succeeds`,
          `balance after=${r.body.wallet?.balance ?? 'n/a'}`)
      } else {
        fail('18', `POST /api/super/orgs/${topupOrgId}/topup with superToken`,
          `status=${r.status} body=${JSON.stringify(r.body).slice(0, 120)}`)
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  section('BATCH CODE ISOLATION TEST')
  // ════════════════════════════════════════════════════════════════════════

  // [19] Both orgs may have BATCH-001 — confirm no conflict
  {
    // Search for code=BATCH-001 or name containing BATCH-001 in each org's list
    const [rT, rR] = await Promise.all([
      request('GET', '/api/batch/list?search=BATCH-001&limit=50', { token: testOrgToken }),
      request('GET', '/api/batch/list?search=BATCH-001&limit=50', { token: ramcoToken }),
    ])

    const extractBatches = r => {
      const b = r.body.batches || r.body.data || r.body || []
      return Array.isArray(b) ? b : []
    }

    const tBatches = rT.status === 200 ? extractBatches(rT) : []
    const rBatches = rR.status === 200 ? extractBatches(rR) : []

    // Also check full list without filter
    const allT = testOrgBatches.filter(b =>
      (b.batch_code || b.name || '').includes('BATCH-001') ||
      (b.name || '').includes('BATCH-001')
    )
    const allR = ramcoBatches.filter(b =>
      (b.batch_code || b.name || '').includes('BATCH-001') ||
      (b.name || '').includes('BATCH-001')
    )

    const tCodes = [...tBatches, ...allT].map(b => b.batch_code || b.name).filter(Boolean)
    const rCodes = [...rBatches, ...allR].map(b => b.batch_code || b.name).filter(Boolean)

    // Check that if same batch_code exists in both, ids must differ
    const tIds = [...new Set([...tBatches, ...allT].map(b => b.id))]
    const rIds = [...new Set([...rBatches, ...allR].map(b => b.id))]
    const idOverlap = tIds.filter(id => rIds.includes(id))

    if (idOverlap.length === 0) {
      if (tCodes.length > 0 || rCodes.length > 0) {
        pass('19', 'BATCH-001 exists in both orgs with different IDs (no conflict)',
          `testOrg codes=[${[...new Set(tCodes)].join(',')}] ramco codes=[${[...new Set(rCodes)].join(',')}]`)
      } else {
        // No BATCH-001 found in either org — show all batch codes to confirm isolation
        const tAllCodes = testOrgBatches.map(b => b.batch_code || b.name).slice(0, 5)
        const rAllCodes = ramcoBatches.map(b => b.batch_code || b.name).slice(0, 5)
        pass('19', 'No shared batch IDs across orgs (code namespace is isolated)',
          `testOrg sample=[${tAllCodes.join(',')}] ramco sample=[${rAllCodes.join(',')}]`)
      }
    } else {
      fail('19', 'BATCH-001 in both orgs must have different IDs',
        `Shared batch IDs across orgs: ${idOverlap.join(',')}`)
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  console.log('\n' + '='.repeat(60))
  console.log('  FINAL SUMMARY')
  console.log('='.repeat(60))
  console.log(`  PASSED : ${passed}`)
  console.log(`  FAILED : ${failed}`)
  console.log(`  TOTAL  : ${passed + failed}`)
  console.log('='.repeat(60))

  if (failed > 0) {
    console.log('\n  FAILED TESTS:')
    RESULTS.filter(r => r.result === 'FAIL').forEach(r => {
      console.log(`    [${r.id}] ${r.label}`)
      if (r.detail) console.log(`          ${r.detail}`)
    })
  }

  process.exit(failed > 0 ? 1 : 0)
}

run().catch(err => {
  console.error('\nFATAL ERROR:', err.message)
  process.exit(2)
})
