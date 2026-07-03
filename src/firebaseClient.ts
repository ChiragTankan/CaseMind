/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User
} from "firebase/auth";

// Direct reading of provisioned project credentials from configuration
const firebaseConfig = {
  apiKey: "AIzaSyBS5TYRFru6eJmfzxJG-FrdapO_rPyRXn4",
  authDomain: "viral-clip-pipeline.firebaseapp.com",
  projectId: "viral-clip-pipeline",
  storageBucket: "viral-clip-pipeline.firebasestorage.app",
  messagingSenderId: "200456172335",
  appId: "1:200456172335:web:9a9023104a4ac447e127da"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged };
export type { User };
