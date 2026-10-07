import { initializeApp } from 'firebase/app'
import { getDatabase, ref } from 'firebase/database'

const env = import.meta.env
// 未設定環境變數時，沿用既有 ai-quiz Firebase 專案（資料放在獨立路徑，不會互相干擾）
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyD2P6Lsw8w-NlEowq_yBpFbE8y1yud27kw',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'ai-quiz-77a0a.firebaseapp.com',
  databaseURL: env.VITE_FIREBASE_DATABASE_URL || 'https://ai-quiz-77a0a-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'ai-quiz-77a0a',
  appId: env.VITE_FIREBASE_APP_ID || '1:396765055068:web:22783cc5ee75a2e6fcfe99',
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)
export const ROOT = env.VITE_QUIZ_ROOT || 'ccl-quiz-20261008'
export const HOST_PIN = env.VITE_HOST_PIN || '1008'
export const r = (path = '') => ref(db, path ? `${ROOT}/${path}` : ROOT)
