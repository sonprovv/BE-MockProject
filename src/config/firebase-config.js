// Import the functions you need from the Firebase SDK
const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCBWsL2jKK78vFFYYHu4Y8dqV8wkxcyheM",
  authDomain: "tiki-clone-16c69.firebaseapp.com",
  projectId: "tiki-clone-16c69",
  storageBucket: "tiki-clone-16c69.appspot.com",  // Fixed storage bucket URL
  messagingSenderId: "908145015538",
  appId: "1:908145015538:web:49052cced4534dc3686e6b",
  measurementId: "G-Z6QR0B9H9B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

module.exports = { app, db, firebaseConfig };
