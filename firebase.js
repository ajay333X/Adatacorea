// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBiqfcCEbTuoonEPbf0FzAuD5P2GWwmTJU",
  authDomain: "adatacorea-d9cd8.firebaseapp.com",
  projectId: "adatacorea-d9cd8",
  storageBucket: "adatacorea-d9cd8.appspot.com",
  messagingSenderId: "373933302640",
  appId: "1:373933302640:web:0dbc718f0c355f011ee5b5"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
