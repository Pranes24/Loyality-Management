// Worker thread: generates QR code SVG strings for a subset of QR codes.
// SVG generation is ~9× faster than PNG since it's pure string building (no pixel rendering).
// Runs persistently — handles multiple job messages from the pool.
const { parentPort } = require('worker_threads')
const QRCode = require('qrcode')

const QR_OPTS = {
  type:                 'svg',
  errorCorrectionLevel: 'H',
  color: { dark: '#1a1a1a', light: '#ffffff' },
}

parentPort.on('message', async ({ jobId, qrIds, baseUrl }) => {
  const CHUNK   = 50  // larger chunks are fine since SVG gen is fast
  const results = []

  for (let i = 0; i < qrIds.length; i += CHUNK) {
    const slice = qrIds.slice(i, i + CHUNK)
    const svgs  = await Promise.all(
      slice.map(id => QRCode.toString(`${baseUrl}/redeem/${id}`, QR_OPTS))
    )
    slice.forEach((id, j) => results.push({ id, svg: svgs[j] }))
  }

  parentPort.postMessage({ jobId, results })
})
