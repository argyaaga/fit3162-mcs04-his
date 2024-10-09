// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {getAuth, GoogleAuthProvider} from "firebase/auth";
import {getFirestore} from 'firebase/firestore';
import { getStorage } from "firebase/storage"; // Import the storage function

const firebaseConfig = {
// COPY PASTE THE CONTENTS OF THIS FROM FIREBASE
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider(app);

export const db = getFirestore(app);
export const storage = getStorage(app); // Initialize Firebase Storage