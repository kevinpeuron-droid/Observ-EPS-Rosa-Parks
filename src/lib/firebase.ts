import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCsNPNzUmK73IR444zl5WlJs54uRPG4-Hg",
  authDomain: "unified-zone-z4dh4.firebaseapp.com",
  projectId: "unified-zone-z4dh4",
  storageBucket: "unified-zone-z4dh4.firebasestorage.app",
  messagingSenderId: "911108146203",
  appId: "1:911108146203:web:4cbd24d70add541c8264be"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-epstracker-e91810a3-4212-421d-aae8-1fcff77b3339");

export { db };
