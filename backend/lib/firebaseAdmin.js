// Firebase Admin SDK singleton — lazy init so server starts even if credentials are missing
const admin = require('firebase-admin')

let initError = null

function getAdmin() {
  if (initError) throw initError

  if (!admin.apps.length) {
    const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env

    if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
      initError = new Error(
        '[Firebase] Missing env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY'
      )
      throw initError
    }

    // Handle both escaped \\n (from .env files) and literal newlines (from Docker/Coolify env vars)
    const privateKey = FIREBASE_PRIVATE_KEY.includes('\\n')
      ? FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : FIREBASE_PRIVATE_KEY

    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId:   FIREBASE_PROJECT_ID,
          clientEmail: FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      })
      console.log('[Firebase] Admin SDK initialized successfully')
    } catch (err) {
      initError = new Error(`[Firebase] Init failed: ${err.message}`)
      throw initError
    }
  }

  return admin
}

module.exports = getAdmin
