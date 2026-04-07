// Generates QR code PNG buffers and ZIP archives for batch export
const QRCode = require('qrcode')
const JSZip  = require('jszip')
require('dotenv').config()

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'

/**
 * Generates a QR code PNG buffer for a given redemption URL
 * @param {string} qrId - UUID of the QR code
 * @returns {Promise<Buffer>}
 */
async function generateQRBuffer(qrId) {
  const url = `${BASE_URL}/redeem/${qrId}`
  return QRCode.toBuffer(url, {
    type:           'png',
    width:          400,
    margin:         2,
    errorCorrectionLevel: 'H',
    color: { dark: '#1a1a1a', light: '#ffffff' },
  })
}

/**
 * Generates a ZIP file containing one PNG per QR code
 * @param {Array<{id: string}>} qrCodes
 * @returns {Promise<Buffer>} ZIP buffer
 */
async function generateQRZip(qrCodes) {
  const zip = new JSZip()

  // Generate all QR images in parallel (batches of 50 to avoid memory spikes)
  const BATCH = 50
  for (let i = 0; i < qrCodes.length; i += BATCH) {
    const batch = qrCodes.slice(i, i + BATCH)
    const buffers = await Promise.all(batch.map(qr => generateQRBuffer(qr.id)))
    batch.forEach((qr, idx) => {
      zip.file(`${qr.id}.png`, buffers[idx])
    })
  }

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

module.exports = { generateQRBuffer, generateQRZip }
