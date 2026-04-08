// Amount distribution logic for batch funding — auto split and manual tiers

const MIN_AMOUNT = 1
const MAX_AMOUNT = 15

/**
 * Validates total amount is within possible range for the given QR count (₹1–₹15 per QR)
 * @param {number} totalAmount
 * @param {number} qrCount
 */
function validateTotalAmount(totalAmount, qrCount = 500) {
  const min = qrCount * MIN_AMOUNT
  const max = qrCount * MAX_AMOUNT
  if (totalAmount < min) throw new Error(`Minimum total amount is ₹${min} (₹1 × ${qrCount} QRs)`)
  if (totalAmount > max) throw new Error(`Maximum total amount is ₹${max} (₹15 × ${qrCount} QRs)`)
  if (!Number.isInteger(totalAmount)) throw new Error('Total amount must be a whole number (no decimals)')
}

/**
 * Auto-distributes totalAmount across qrCount QRs, each between ₹1 and ₹15
 * @param {number} totalAmount
 * @param {number} qrCount
 * @returns {number[]}
 */
function autoDistribute(totalAmount, qrCount = 500) {
  validateTotalAmount(totalAmount, qrCount)

  const amounts = new Array(qrCount).fill(MIN_AMOUNT)
  let remaining = totalAmount - qrCount * MIN_AMOUNT

  while (remaining > 0) {
    const idx = Math.floor(Math.random() * qrCount)
    if (amounts[idx] < MAX_AMOUNT) {
      amounts[idx]++
      remaining--
    }
  }

  return amounts
}

/**
 * Expands manual tiers into an array of amounts (fills remainder with ₹1)
 * @param {Array<{qty: number, amount: number}>} tiers
 * @param {number} totalAmount
 * @param {number} qrCount
 * @returns {number[]}
 */
function manualDistribute(tiers, totalAmount, qrCount = 500) {
  if (!Array.isArray(tiers) || tiers.length === 0) {
    throw new Error('At least one tier is required')
  }

  let totalQty   = 0
  let tiersTotal = 0

  for (const tier of tiers) {
    if (!tier.qty || tier.qty < 1)              throw new Error('Each tier must have qty >= 1')
    if (!tier.amount || tier.amount < MIN_AMOUNT) throw new Error(`Each tier amount must be ≥ ₹${MIN_AMOUNT}`)
    if (tier.amount > MAX_AMOUNT)               throw new Error(`Each tier amount must be ≤ ₹${MAX_AMOUNT}`)
    if (!Number.isInteger(tier.amount))         throw new Error('Tier amounts must be whole numbers')
    totalQty   += tier.qty
    tiersTotal += tier.qty * tier.amount
  }

  if (totalQty > qrCount)       throw new Error(`Total QR count in tiers (${totalQty}) exceeds batch size (${qrCount})`)
  if (tiersTotal > totalAmount) throw new Error(`Tier totals (₹${tiersTotal}) exceed the budget (₹${totalAmount})`)

  const amounts = []
  for (const tier of tiers) {
    for (let i = 0; i < tier.qty; i++) amounts.push(tier.amount)
  }

  // Fill remaining with ₹1
  while (amounts.length < qrCount) amounts.push(1)

  // Fisher-Yates shuffle
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
