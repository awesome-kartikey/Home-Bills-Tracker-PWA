import { initializeApp } from 'firebase/app';

import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// We are forcing this configuration to ensure it connects to your specific project.
const firebaseConfig = {
  apiKey: "AIzaSyAPyQ_gmc1psJL-BbtjtExek_g5xE5wLp8",
  authDomain: "home-bills-tracker.firebaseapp.com",
  projectId: "home-bills-tracker",
  storageBucket: "home-bills-tracker.firebasestorage.app",
  messagingSenderId: "45318970914",
  appId: "1:45318970914:web:283a8d7819628959fc347b"
};

// Initialize Firebase directly with your config
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Hardcoded App ID to ensure consistent data storage path in Firestore
export const APP_ID = 'home-bills-tracker-v1';