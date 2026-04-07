// Amount distribution logic for batch funding — auto split and manual tiers

const MIN_AMOUNT = 1
const MAX_AMOUNT = 15
const QR_COUNT   = 500

/**
 * Validates total amount is within possible range for 500 QRs
 * @param {number} totalAmount
 */
function validateTotalAmount(totalAmount) {
  const min = QR_COUNT * MIN_AMOUNT
  const max = QR_COUNT * MAX_AMOUNT
  if (totalAmount < min) throw new Error(`Minimum total amount is ₹${min} (₹1 × 500 QRs)`)
  if (totalAmount > max) throw new Error(`Maximum total amount is ₹${max} (₹15 × 500 QRs)`)
  if (!Number.isInteger(totalAmount)) throw new Error('Total amount must be a whole number (no decimals)')
}

/**
 * Auto-distributes totalAmount across 500 QRs, each between ₹1 and ₹15
 * @param {number} totalAmount
 * @returns {number[]} Array of 500 amounts
 */
function autoDistribute(totalAmount) {
  validateTotalAmount(totalAmount)

  const amounts = new Array(QR_COUNT).fill(MIN_AMOUNT)
  let remaining = totalAmount - QR_COUNT * MIN_AMOUNT

  // Randomly distribute remaining amount, capped at MAX per QR
  while (remaining > 0) {
    const idx = Math.floor(Math.random() * QR_COUNT)
    if (amounts[idx] < MAX_AMOUNT) {
      amounts[idx]++
      remaining--
    }
  }

  return amounts
}

/**
 * Expands manual tiers into an array of 500 amounts
 * @param {Array<{qty: number, amount: number}>} tiers
 * @param {number} totalAmount - must match sum of tier subtotals
 * @returns {number[]} Array of amounts (shuffled)
 */
function manualDistribute(tiers, totalAmount) {
  if (!Array.isArray(tiers) || tiers.length === 0) {
    throw new Error('At least one tier is required')
  }

  let totalQty    = 0
  let tiersTotal  = 0

  for (const tier of tiers) {
    if (!tier.qty || tier.qty < 1)         throw new Error('Each tier must have qty >= 1')
    if (!tier.amount || tier.amount < MIN_AMOUNT) throw new Error(`Each tier amount must be ≥ ₹${MIN_AMOUNT}`)
    if (tier.amount > MAX_AMOUNT)          throw new Error(`Each tier amount must be ≤ ₹${MAX_AMOUNT}`)
    if (!Number.isInteger(tier.amount))    throw new Error('Tier amounts must be whole numbers')
    totalQty   += tier.qty
    tiersTotal += tier.qty * tier.amount
  }

  if (totalQty > QR_COUNT) throw new Error(`Total QR count in tiers (${totalQty}) exceeds ${QR_COUNT}`)
  if (tiersTotal !== totalAmount) throw new Error(`Tier totals (₹${tiersTotal}) do not match budget (₹${totalAmount})`)

  // Expand tiers into flat array and shuffle
  const amounts = []
  for (const tier of tiers) {
    for (let i = 0; i < tier.qty; i++) amounts.push(tier.amount)
  }

  // Fisher-Yates shuffle so amounts are randomised across QRs
  for (let i = amounts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[amounts[i], amounts[j]] = [amounts[j], amounts[i]]
  }

  return amounts
}

/**
 * Returns a distribution summary — how many QRs fall into each amount bucket
 * @param {number[]} amounts
 * @returns {Object} { '1': count, '2': count, ... }
 */
function summariseDistribution(amounts) {
  return amounts.reduce((acc, val) => {
    acc[val] = (acc[val] || 0) + 1
    return acc
  }, {})
}

module.exports = { autoDistribute, manualDistribute, summariseDistribution, validateTotalAmount }
