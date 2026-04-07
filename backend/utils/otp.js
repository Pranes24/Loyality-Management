// OTP generation and validation helpers
require('dotenv').config()

/**
 * Generates a 6-digit OTP string
 * In POC mode (USE_STATIC_OTP=true) always returns STATIC_OTP
 * @returns {string}
 */
function generateOTP() {
  if (process.env.USE_STATIC_OTP === 'true') {
    return process.env.STATIC_OTP || '123456'
  }
  return String(Math.floor(100000 + Math.random() * 900000))
}

/**
 * Returns OTP expiry timestamp (5 minutes from now)
 * @returns {Date}
 */
function getOTPExpiry() {
  return new Date(Date.now() + 5 * 60 * 1000)
}

/**
 * Simulates sending OTP via SMS — logs to console in POC
 * Replace with real SMS gateway (MSG91, Twilio) in production
 * @param {string} mobile
 * @param {string} otp
 */
async function sendSMS(mobile, otp) {
  if (process.env.USE_STATIC_OTP === 'true') {
    console.log(`[POC SMS] Mobile: ${mobile} | OTP: ${otp}`)
    return
  }
  // TODO: integrate real SMS gateway here
  throw new Error('SMS gateway not configured for production')
}

module.exports = { generateOTP, getOTPExpiry, sendSMS }
