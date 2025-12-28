// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import {
  getDatabase
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";
const firebaseConfig = {
  apiKey: "AIzaSyBiqfcCEbTuoonEPbf0FzAuD5P2GWwmTJU",
  authDomain: "adatacorea-d9cd8.firebaseapp.com",
  projectId: "adatacorea-d9cd8",
  storageBucket: "adatacorea-d9cd8.appspot.com",
  messagingSenderId: "373933302640",
  appId: "1:373933302640:web:0dbc718f0c355f011ee5b5"
};

const app = initializeApp(firebaseConfig);

// ✅ OLD STYLE GLOBALS (your project expects these)
const auth = getAuth(app);
const db = getFirestore(app);

window.firebaseApp = app;
window.firebaseAuth = auth;
window.db = db;
window.rtdb = getDatabase(app);

// ✅ also export (safe if you ever import)
export { app, auth, db };
