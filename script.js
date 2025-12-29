// script.js
import { getUserData } from "./db.js";

const SESSION_KEY = "adatacore_session";
const THEME_KEY = "adatacore_theme";

/* ================= THEME ================= */
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  document.documentElement.classList.toggle("dark", saved !== "light");
}

document.getElementById("theme-toggle-btn")?.addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");
  localStorage.setItem(THEME_KEY, document.documentElement.classList.contains("dark") ? "dark" : "light");
});

/* ================= LOGO RENDER ================= */
function renderLogo(targetId, size = 140) {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 380" width="${size}" height="${size}">
      <defs>
        <linearGradient id="g-${targetId}" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#3b82f6"/><stop offset="50%" stop-color="#a855f7"/><stop offset="100%" stop-color="#ec4899"/>
        </linearGradient>
      </defs>
      <g transform="translate(200, 190)">
        <g fill="none" stroke="url(#g-${targetId})" stroke-width="25">
          <ellipse cx="0" cy="0" rx="70" ry="160" transform="rotate(30)" />
          <ellipse cx="0" cy="0" rx="70" ry="160" transform="rotate(90)" />
          <ellipse cx="0" cy="0" rx="70" ry="160" transform="rotate(150)" />
        </g>
        <circle cx="0" cy="0" r="60" fill="none" stroke="#ec4899" stroke-width="15"/>
      </g>
    </svg>`;
}

/* ================= AUTH FORM TOGGLE ================= */
window.toggleAuthForm = function (forceRegister = null) {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const title = document.getElementById("auth-title");
  const toggleText = document.getElementById("auth-toggle-text");

  if (!loginForm || !registerForm) return;
  const showRegister = forceRegister !== null ? forceRegister : registerForm.classList.contains("hidden");

  if (showRegister) {
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
    title.textContent = "Create Account";
    toggleText.innerHTML = `Already have an account? <button class="text-violet-600 font-medium" onclick="window.toggleAuthForm(false)">Log In</button>`;
  } else {
    registerForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
    title.textContent = "Welcome Back";
    toggleText.innerHTML = `Don't have an account? <button class="text-violet-600 font-medium" onclick="window.toggleAuthForm(true)">Sign Up</button>`;
  }
};

/* ================= PROFILE UI ================= */
function updateProfileUI(email, uid, role = "User") {
  if (!email) return;
  const name = localStorage.getItem("displayName") || email.split("@")[0].toUpperCase();
  ["welcome-username", "profile-username", "sidebar-username"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = id === "welcome-username" ? name + "!" : name;
  });

  const sidebarId = document.getElementById("sidebar-userid");
  if (sidebarId && uid) {
    sidebarId.textContent = uid.slice(0, 18) + "…";
    sidebarId.title = uid;
  }
  const profileId = document.getElementById("profile-userid");
  if (profileId) profileId.textContent = uid;

  const profileRole = document.getElementById("profile-role");
  if (profileRole) profileRole.textContent = role;
}

/* ================= NAVIGATION ================= */
window.navigateTo = (viewId) => {
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  document.getElementById(viewId)?.classList.remove("hidden");

  const sidebar = document.getElementById("sidebar");
  const topRight = document.getElementById("top-right-controls");
  const protectedViews = ["dashboard-view", "tasks-view", "profile-view", "payout-view", "quality-view", "history-view"];

  if (protectedViews.includes(viewId)) {
    sidebar?.classList.remove("hidden");
    topRight?.classList.remove("hidden");
  } else {
    sidebar?.classList.add("hidden");
    topRight?.classList.add("hidden");
  }
};

/* ================= AUTH EVENTS ================= */
document.addEventListener("auth:login", async (e) => {
  const { uid, email } = e.detail;
  localStorage.setItem(SESSION_KEY, "authenticated");
  const data = await getUserData(uid);
  updateProfileUI(email, uid, data?.role || "User");
  window.navigateTo("dashboard-view");
});

document.addEventListener("auth:logout", () => {
  localStorage.removeItem(SESSION_KEY);
  window.navigateTo("landing-view");
});

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  renderLogo("landing-logo-large", 160);
  renderLogo("auth-logo-large", 140);
  renderLogo("sidebar-logo-icon", 36);
  renderLogo("mobile-logo-icon", 48);

  // महत्वपूर्ण: रिफ्रेश होने पर तुरंत लैंडिंग पर न भेजें
  const isAuth = localStorage.getItem(SESSION_KEY);
  if (isAuth !== "authenticated") {
    window.navigateTo("landing-view");
  } else {
    console.log("Session found, waiting for Firebase...");
    // यहाँ आप चाहें तो एक Loading Spinner दिखा सकते हैं
  }
});
