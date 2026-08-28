import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// TODO: Replace with your actual Firebase project config from padashboard-2026
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "padashboard-2026.firebaseapp.com",
  projectId: "padashboard-2026",
  storageBucket: "padashboard-2026.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
