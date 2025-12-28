// auth.js
import { ensureUserDocument } from "./db.js";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

/* ✅ REUSE EXISTING AUTH INSTANCE */
const auth = window.firebaseAuth;

/* ================= LOGIN ================= */
window.handleLogin = async (e) => {
  e.preventDefault();

  const email = document.getElementById("login-email")?.value?.trim();
  const password = document.getElementById("login-password")?.value;

  if (!email || !password) {
    alert("Email and password required.");
    return;
  }

  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);

    const isGoogle = user.providerData.some(p => p.providerId === "google.com");
    if (!user.emailVerified && !isGoogle) {
      await signOut(auth);
      alert("Please verify your email before logging in.");
      return;
    }
  } catch (err) {
    alert(err.message);
  }
};

/* ================= REGISTER ================= */
window.handleRegister = async (e) => {
  e.preventDefault();

  const email = document.getElementById("register-email")?.value?.trim();
  const password = document.getElementById("register-password")?.value;

  if (!email || !password) {
    alert("Email and password required.");
    return;
  }

  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(user);
    await signOut(auth);
    alert("Verification email sent. Please check your inbox.");
  } catch (err) {
    alert(err.message);
  }
};

/* ================= GOOGLE ================= */
window.handleGoogleLogin = async function () {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);

    const user = result.user;

    document.dispatchEvent(
      new CustomEvent("auth:login", {
        detail: { uid: user.uid, email: user.email }
      })
    );
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
};

/* ================= LOGOUT ================= */
window.handleLogout = async () => {
  await signOut(auth);
};

/* ================= OBSERVER ================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.currentUser = null;
    document.dispatchEvent(new Event("auth:logout"));
    return;
  }

  const isGoogle = user.providerData.some(
    p => p.providerId === "google.com"
  );

  if (!user.emailVerified && !isGoogle) return;

  // 🔐 STORE USER GLOBALLY (CRITICAL)
  window.currentUser = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email.split("@")[0],
    role: "cb"
  };

  await ensureUserDocument(user);

  document.dispatchEvent(
    new CustomEvent("auth:login", {
      detail: window.currentUser
    })
  );
});

/* ================= RESET PASSWORD ================= */
window.resetPassword = async function () {
  const auth = window.firebaseAuth;

  if (!auth || !auth.currentUser) {
    alert("No logged-in user found.");
    return;
  }

  const email = auth.currentUser.email;
  if (!email) {
    alert("User email not available.");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    alert("Password reset email sent. Please check your inbox.");
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
};

document.addEventListener("auth:login", (e) => {
  const user = e.detail;

  const emailInput = document.getElementById("profile-email-input");
  const idText = document.getElementById("profile-user-id");

  if (emailInput) {
    emailInput.value = user.email;
  }

  if (idText) {
    idText.textContent = user.uid;
  }
});
