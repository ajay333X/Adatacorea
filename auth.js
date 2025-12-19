// auth.js
import { auth } from "./firebase.js";
import { ensureUserDocument } from "./db.js";

import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

/* ================= LOGIN ================= */
window.handleLogin = async (e) => {
  e.preventDefault();

  const email = login-email.value.trim();
  const password = login-password.value;

  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);

    if (!user.emailVerified) {
      await signOut(auth);
      alert("Please verify your email before logging in.");
    }
  } catch (err) {
    alert(err.message);
  }
};

/* ================= REGISTER ================= */
window.handleRegister = async (e) => {
  e.preventDefault();

  const email = register-email.value.trim();
  const password = register-password.value;

  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(user);
    await signOut(auth);
    alert("Verification email sent.");
  } catch (err) {
    alert(err.message);
  }
};

/* ================= GOOGLE ================= */
window.handleGoogleLogin = async () => {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
};

/* ================= LOGOUT ================= */
window.handleLogout = async () => {
  await signOut(auth);
};

/* ================= OBSERVER ================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    document.dispatchEvent(new Event("auth:logout"));
    return;
  }

  const isGoogle = user.providerData.some(p => p.providerId === "google.com");
  if (!user.emailVerified && !isGoogle) return;

  await ensureUserDocument(user);

  document.dispatchEvent(
    new CustomEvent("auth:login", {
      detail: { uid: user.uid, email: user.email }
    })
  );
});
