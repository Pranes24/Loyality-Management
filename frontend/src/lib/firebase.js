// Firebase app + Phone Auth initialization
import { initializeApp } from 'firebase/app'
import { getAuth }       from 'firebase/auth'

const firebaseConfig = {
  apiKey:            'AIzaSyCFJE-g1uGNHym32C3tvUWC33MoYdNXDYg',
  authDomain:        'loyalitymanagement-b3e61.firebaseapp.com',
  projectId:         'loyalitymanagement-b3e61',
  storageBucket:     'loyalitymanagement-b3e61.firebasestorage.app',
  messagingSenderId: '1021076271969',
  appId:             '1:1021076271969:web:a9468b060505ee0b40cb20',
  measurementId:     'G-XC1PW6CZWL',
}

const app  = initializeApp(firebaseConfig)
export const auth = getAuth(app)

// DEV ONLY — bypasses reCAPTCHA Enterprise for test phone numbers
// Remove this line before going to production (enable billing instead)
auth.settings.appVerificationDisabledForTesting = true
