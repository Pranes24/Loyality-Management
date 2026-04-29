// Generates sticker SVGs and ZIP archives using inline SVG QR codes (no PNG rendering).
// SVG QR generation is ~9× faster than PNG and produces perfect vector output for printing.
const QRCode   = require('qrcode')
const JSZip    = require('jszip')
const fs       = require('fs')
const path     = require('path')
require('dotenv').config()

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'
const { generateQRBuffersParallel } = require('./qrWorkerPool')

// Load UPI logo once at startup as base64 data URI
const UPI_LOGO_PATH = path.join(__dirname, '../assets/upi-logo.png')
const UPI_LOGO_B64  = fs.existsSync(UPI_LOGO_PATH)
  ? `data:image/png;base64,${fs.readFileSync(UPI_LOGO_PATH).toString('base64')}`
  : null

const DEFAULT_CONFIG = {
  bg_color:    '#0f172a',
  accent_from: '#f59e0b',
  accent_to:   '#ea580c',
  tagline:     'LOYALTY REWARDS',
  show_badge:  true,
  badge_label: 'UPI',
  badge_color: '#5f259f',
}

function resolveConfig(config = {}) {
  return { ...DEFAULT_CONFIG, ...config }
}

function escSVG(str) {
  return String(str || '').replace(/[<>&"]/g, c =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]
  )
}

/**
 * Generates a single QR code PNG buffer (used outside batch contexts).
 * @param {string} qrId
 * @returns {Promise<Buffer>}
 */
async function generateQRBuffer(qrId) {
  return QRCode.toBuffer(`${BASE_URL}/redeem/${qrId}`, {
    type: 'png', width: 300, margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#1a1a1a', light: '#ffffff' },
  })
}

/**
 * Extracts the inner SVG content and viewBox from a QR SVG string.
 * Used to embed the QR directly into the sticker SVG (no base64 encoding).
 * @param {string} svgStr
 * @returns {{ viewBox: string, inner: string }}
 */
function extractQRSvgParts(svgStr) {
  const viewBox = svgStr.match(/viewBox="([^"]+)"/)?.[1] || '0 0 41 41'
  // Strip outer <svg ...> wrapper, keep only the child elements
  const inner   = svgStr.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '').trim()
  return { viewBox, inner }
}

/**
 * Generates one enterprise sticker SVG.
 * Embeds the QR code as an inline nested SVG (vector, no PNG rasterisation).
 *
 * @param {Object} opts
 * @param {string}  opts.qrId
 * @param {number}  opts.qrNumber  Per-org serial number
 * @param {string}  opts.orgName
 * @param {number?} opts.amount
 * @param {Object?} opts.config
 * @param {string?} opts.qrSvg    Pre-generated QR SVG string (from worker pool)
 * @returns {Promise<string>} SVG markup
 */
/**
 * @param {Object} opts
 * @param {string?} opts.logoRef  How to reference the UPI logo — 'inline' (base64) | relative path like '../assets/upi-logo.png'
 */
async function generateStickerSVG({ qrId, qrNumber, orgName, amount, config: rawConfig = {}, qrSvg, logoRef = null }) {
  const cfg     = resolveConfig(rawConfig)
  const svgStr  = qrSvg ?? await QRCode.toString(`${BASE_URL}/redeem/${qrId}`, {
    type: 'svg', errorCorrectionLevel: 'H',
    color: { dark: '#1a1a1a', light: '#ffffff' },
  })
  const { viewBox, inner } = extractQRSvgParts(svgStr)
  const numStr  = String(qrNumber || 0).padStart(6, '0')
  const shortId = qrId ? qrId.slice(0, 8).toUpperCase() : '--------'
  const safeOrg = escSVG(orgName || 'LOYALTY')
  const amtStr  = amount != null ? `\u20b9${Number(amount).toLocaleString('en-IN')}` : ''
  const tagline = escSVG(cfg.tagline || 'LOYALTY REWARDS')
  const badge   = escSVG(cfg.badge_label || 'UPI')
  // Logo href: relative path keeps files small; inline base64 for standalone stickers
  const logoHref = logoRef ?? UPI_LOGO_B64

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="460" height="240" viewBox="0 0 460 240">

  <defs>
    <linearGradient id="accentG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="${escSVG(cfg.accent_from)}"/>
      <stop offset="100%" stop-color="${escSVG(cfg.accent_to)}"/>
    </linearGradient>
    <clipPath id="roundAll"><rect width="460" height="240" rx="12" ry="12"/></clipPath>
    <clipPath id="leftPanel"><rect x="0" y="0" width="218" height="240"/></clipPath>
  </defs>

  <rect width="460" height="240" rx="12" fill="#f1f5f9"/>
  <rect width="460" height="240" rx="12" fill="none" stroke="#cbd5e1" stroke-width="1.5"/>
  <g clip-path="url(#roundAll)">
    <rect x="0" y="0" width="220" height="240" fill="${escSVG(cfg.bg_color)}"/>
  </g>
  <rect x="0" y="0" width="5" height="240" rx="2" fill="url(#accentG)"/>

  <g clip-path="url(#leftPanel)">
    <text x="18" y="64"
          font-family="Arial Black, Helvetica Neue, sans-serif"
          font-size="24" font-weight="900" fill="${escSVG(cfg.accent_from)}"
          textLength="196" lengthAdjust="spacingAndGlyphs"
          letter-spacing="0.5">${safeOrg}</text>
    <text x="18" y="80"
          font-family="Arial, Helvetica, sans-serif"
          font-size="7.5" fill="#64748b" letter-spacing="2">${tagline}</text>
    <line x1="18" y1="91" x2="204" y2="91" stroke="#1e293b" stroke-width="1"/>
    ${amtStr ? `
    <text x="18" y="108" font-family="Arial,sans-serif" font-size="7.5" fill="#64748b" letter-spacing="1.8">REWARD AMOUNT</text>
    <text x="18" y="134" font-family="Arial Black,sans-serif" font-size="24" font-weight="900" fill="#ffffff">${escSVG(amtStr)}</text>
    ` : `
    <text x="18" y="112" font-family="Arial,sans-serif" font-size="8" fill="#64748b" letter-spacing="1.5">SCAN TO CLAIM</text>
    <text x="18" y="128" font-family="Arial,sans-serif" font-size="8" fill="#64748b" letter-spacing="1.5">YOUR REWARD</text>
    `}
    ${cfg.show_badge ? `
    <rect x="14" y="183" width="196" height="34" rx="6" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
    ${logoHref
      ? `<image x="18" y="186" width="188" height="28" href="${escSVG(logoHref)}" preserveAspectRatio="xMidYMid meet"/>`
      : `<text x="110" y="203" font-family="Arial Black,sans-serif" font-size="13" font-weight="900" fill="#6b7280" text-anchor="middle" letter-spacing="2">${badge}</text>`
    }
    ` : ''}
  </g>

  <!-- Right panel white card -->
  <rect x="250" y="14" width="196" height="212" rx="10" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>

  <!-- QR code embedded as inline SVG (vector, perfect print quality) -->
  <svg x="252" y="16" width="192" height="182" viewBox="${viewBox}"
       xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"
       shape-rendering="crispEdges">
    ${inner}
  </svg>

  <!-- Serial number (left) + UUID short ID (right) -->
  <rect x="252" y="200" width="192" height="26" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>
  <text x="260" y="217" font-family="Courier New,monospace" font-size="9.5" font-weight="bold"
        fill="#64748b" text-anchor="start" letter-spacing="1">#${escSVG(numStr)}</text>
  <text x="438" y="217" font-family="Courier New,monospace" font-size="9.5" font-weight="bold"
        fill="#1e293b" text-anchor="end" letter-spacing="1.5">${escSVG(shortId)}</text>

</svg>`
}

/**
 * Generates a ZIP of sticker SVGs + plain QR SVGs + metadata.csv.
 * All QR codes generated as SVG via worker pool (fast parallel generation).
 * @param {Array<{id, qr_number, amount?}>} qrCodes
 * @param {string} orgName
 * @param {Object} config
 * @returns {Promise<Buffer>}
 */
async function generateQRZip(qrCodes, orgName = 'ORG', config = {}) {
  const svgMap  = await generateQRBuffersParallel(qrCodes.map(q => q.id))

  const zip     = new JSZip()
  const csvRows = ['qr_id,qr_number,amount,sticker_file,qr_file']

  // Include UPI logo as ONE shared file — stickers reference it via relative path.
  // This avoids embedding 38KB of base64 in every single sticker file.
  const LOGO_PATH_IN_ZIP = 'assets/upi-logo.png'
  const LOGO_REF_FROM_STICKER = '../assets/upi-logo.png'
  if (UPI_LOGO_B64) {
    const logoBuf = Buffer.from(UPI_LOGO_B64.split(',')[1], 'base64')
    zip.file(LOGO_PATH_IN_ZIP, logoBuf, { compression: 'STORE' })
  }

  const CHUNK = 500  // large chunks — sticker gen is fast (no PNG encoding)
  for (let i = 0; i < qrCodes.length; i += CHUNK) {
    const slice = qrCodes.slice(i, i + CHUNK)
    await Promise.all(slice.map(async qr => {
      const qrSvgStr = svgMap.get(qr.id)
      const numStr   = String(qr.qr_number || 0).padStart(6, '0')

      zip.file(`qr-codes/qr-${numStr}.svg`, qrSvgStr, { compression: 'DEFLATE', compressionOptions: { level: 3 } })

      const sticker = await generateStickerSVG({
        qrId: qr.id, qrNumber: qr.qr_number,
        orgName, amount: qr.amount, config,
        qrSvg:   qrSvgStr,
        logoRef: UPI_LOGO_B64 ? LOGO_REF_FROM_STICKER : null,
      })
      zip.file(`stickers/sticker-${numStr}.svg`, sticker, { compression: 'DEFLATE', compressionOptions: { level: 3 } })

      csvRows.push([qr.id, qr.qr_number || '', qr.amount || '',
        `stickers/sticker-${numStr}.svg`, `qr-codes/qr-${numStr}.svg`].join(','))
    }))
  }

  zip.file('metadata.csv', csvRows.join('\n'))
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 3 } })
}

/**
 * Generates a ZIP of plain QR SVG files + metadata.csv (no sticker design).
 * @param {Array<{id, qr_number, amount?}>} qrCodes
 * @returns {Promise<Buffer>}
 */
async function generateQRZipPlain(qrCodes) {
  const svgMap  = await generateQRBuffersParallel(qrCodes.map(q => q.id))

  const zip     = new JSZip()
  const csvRows = ['qr_id,qr_number,amount,qr_file']

  for (const qr of qrCodes) {
    const numStr = String(qr.qr_number || 0).padStart(6, '0')
    const svg    = svgMap.get(qr.id)
    zip.file(`qr-codes/qr-${numStr}.svg`, svg, { compression: 'DEFLATE', compressionOptions: { level: 3 } })
    csvRows.push([qr.id, qr.qr_number || '', qr.amount || '', `qr-codes/qr-${numStr}.svg`].join(','))
  }

  zip.file('metadata.csv', csvRows.join('\n'))
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 3 } })
}

module.exports = { generateQRBuffer, generateStickerSVG, generateQRZip, generateQRZipPlain, DEFAULT_CONFIG }
