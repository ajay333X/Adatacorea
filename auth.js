/* =========================================================
   Firebase Auth Module (NO UI LOGIC)
========================================================= */

import {
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";


import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

/* ================= FIREBASE CONFIG ================= */
const firebaseConfig = {
  apiKey: "AIzaSyBiqfcCEbTuoonEPbf0FzAuD5P2GWwmTJU",
  authDomain: "adatacorea-d9cd8.firebaseapp.com",
  projectId: "adatacorea-d9cd8",
  storageBucket: "adatacorea-d9cd8.appspot.com",
  messagingSenderId: "373933302640",
  appId: "1:373933302640:web:0dbc718f0c355f011ee5b5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.useDeviceLanguage();

/* ================= EXPORT AUTH ================= */
window.firebaseAuth = auth;

/* ================= AUTH ACTIONS ================= */
window.handleLogin = async (e) => {
  e.preventDefault();

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);

    if (!user.emailVerified) {
      await signOut(auth);
      alert("Please verify your email before logging in.");
      return;
    }

    // ✅ Verified → observer will redirect

  } catch (error) {
    alert(error.message);
  }
};



window.handleRegister = async (e) => {
  e.preventDefault();

  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;

  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);

    // 📩 Send verification email
    await sendEmailVerification(user);

    // 🔒 Force logout so observer does not redirect
    await signOut(auth);

    // ✅ Show message only
    alert(
      "Verification email sent. Please verify your email to log in."
    );

    // Stay on auth view
    window.navigateTo("auth-view");

  } catch (error) {
    alert(error.message);
  }
};


/* ================= GOOGLE LOGIN ================= */
window.handleGoogleLogin = async function (button) {
  try {
    if (button) {
      button.disabled = true;
      button.style.opacity = "0.7";
    }

    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    console.log("Google login success:", user.email);

    // Update UI
    document.getElementById("welcome-username").textContent =
      user.displayName || "User";
    document.getElementById("profile-username").textContent =
      user.displayName || "User";
    document.getElementById("sidebar-username").textContent =
      user.displayName || "User";
    document.getElementById("profile-email-input").value =
      user.email || "";

    // Show dashboard
    window.navigateTo("dashboard-view");

  } catch (error) {
    console.error("Google login error:", error);
    alert(error.message);
  } finally {
    if (button) {
      button.disabled = false;
      button.style.opacity = "1";
    }
  }
};


window.handleLogout = async () => {
  await signOut(auth);
};

/* ================= AUTH OBSERVER ================= */
onAuthStateChanged(auth, (user) => {
  // Not logged in
  if (!user) {
    document.dispatchEvent(new CustomEvent("auth:logout"));
    return;
  }

  // Logged in BUT email not verified → DO NOTHING
  if (!user.emailVerified) {
    console.log("User logged in but email not verified");
    return;
  }

  // ✅ Logged in AND verified
  document.dispatchEvent(
    new CustomEvent("auth:login", {
      detail: { email: user.email }
    })
  );
});



