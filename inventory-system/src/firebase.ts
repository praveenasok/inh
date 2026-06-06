import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "inhsuite",
  appId: "1:354912080861:web:05d3903253cdfdd78c1c34",
  storageBucket: "inhsuite.firebasestorage.app",
  apiKey: "AIzaSyB-38dsS5XPZA3lvtW7bqRzaWURTlSnWIk",
  authDomain: "inhsuite.firebaseapp.com",
  messagingSenderId: "354912080861",
  measurementId: "G-T0MTY8584L"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
