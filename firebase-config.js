// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAGk7w72nKfJDtMx535wxgK6tAq6UugrJ8",
  authDomain: "make-a-splash-foundation.firebaseapp.com",
  projectId: "make-a-splash-foundation",
  storageBucket: "make-a-splash-foundation.firebasestorage.app",
  messagingSenderId: "259150039543",
  appId: "1:259150039543:web:9ac7d1c44befbbce65c6f2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const db = getFirestore(app);

export { storage, db, ref, uploadBytes, getDownloadURL, collection, addDoc, serverTimestamp };
