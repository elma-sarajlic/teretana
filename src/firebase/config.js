// ============================================================
// FIREBASE KONFIGURACIJA
// Zamijenite ove vrijednosti sa vašim Firebase projektom!
// Upute: https://console.firebase.google.com → New Project → Web App
// ============================================================

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBjtI2dWAZlfQKoDTy8pSayqKPhmsK5jFY",
  authDomain: "fitcoach-dashboard.firebaseapp.com",
  projectId: "fitcoach-dashboard",
  storageBucket: "fitcoach-dashboard.firebasestorage.app",
  messagingSenderId: "590003453380",
  appId: "1:590003453380:web:8f0aa6da90cdf6dc6ab891"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
