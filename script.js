/* =========================================================
   UI + Navigation Logic (NO Firebase)
========================================================= */

const SESSION_KEY = "adatacore_session";
const THEME_KEY = "adatacore_theme";

/* ================= THEME ================= */
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  document.documentElement.classList.toggle("dark", saved !== "light");
}

document.getElementById("theme-toggle-btn")?.addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");
  localStorage.setItem(
    THEME_KEY,
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );
});

// ================= LOGO RENDER =================
function renderLogo(targetId, size = 140) {
  const el = document.getElementById(targetId);
  if (!el) return;

  el.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg"
         viewBox="0 0 400 380"
         width="${size}"
         height="${size}"
         aria-label="Adatacore Logo">
      <defs>
        <linearGradient id="g-${targetId}" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#3b82f6"/>
          <stop offset="50%" stop-color="#a855f7"/>
          <stop offset="100%" stop-color="#ec4899"/>
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
    </svg>
  `;
}
document.addEventListener("DOMContentLoaded", () => {
  renderLogo("landing-logo-large", 160);
  renderLogo("auth-logo-large", 140);
  renderLogo("sidebar-logo-icon", 36);
  renderLogo("mobile-logo-icon", 48);
});


/* ================= AUTH FORM TOGGLE ================= */
window.toggleAuthForm = function (forceRegister = null) {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const title = document.getElementById("auth-title");
  const toggleText = document.getElementById("auth-toggle-text");

  if (!loginForm || !registerForm) {
    console.warn("Auth forms not found");
    return;
  }

  const showRegister =
    forceRegister !== null
      ? forceRegister
      : registerForm.classList.contains("hidden");

  if (showRegister) {
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
    title.textContent = "Create Account";
    toggleText.innerHTML =
      `Already have an account?
       <button class="text-violet-600 font-medium" onclick="window.toggleAuthForm(false)">Log In</button>`;
  } else {
    registerForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
    title.textContent = "Welcome Back";
    toggleText.innerHTML =
      `Don't have an account?
       <button class="text-violet-600 font-medium" onclick="window.toggleAuthForm(true)">Sign Up</button>`;
  }
};

/* ================= PROFILE UI ================= */
function updateProfileUI(email) {
  if (!email) return;

  const name = email.split("@")[0].toUpperCase();

  document.getElementById("welcome-username") &&
    (document.getElementById("welcome-username").textContent = name + "!");

  document.getElementById("profile-username") &&
    (document.getElementById("profile-username").textContent = name + " User");

  document.getElementById("profile-email-input") &&
    (document.getElementById("profile-email-input").value = email);

  const sidebarName = document.getElementById("sidebar-username");
  if (sidebarName) sidebarName.textContent = name;
}

/* ================= NAVIGATION ================= */
window.navigateTo = (viewId) => {
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  document.getElementById(viewId)?.classList.remove("hidden");

  const sidebar = document.getElementById("sidebar");
  const topRight = document.getElementById("top-right-controls");

  const protectedViews = [
    "dashboard-view",
    "tasks-view",
    "profile-view",
    "payout-view",
    "quality-view",
    "history-view"
  ];

  if (protectedViews.includes(viewId)) {
    sidebar?.classList.remove("hidden");
    topRight?.classList.remove("hidden");
  } else {
    sidebar?.classList.add("hidden");
    topRight?.classList.add("hidden");
  }
};

/* ================= 3 DOT MENU ================= */
function initThreeDotMenu() {
  const btn = document.getElementById("three-dot-btn");
  const dropdown = document.getElementById("three-dot-dropdown");

  if (!btn || !dropdown) return;

  btn.onclick = (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("hidden");
  };

  document.addEventListener("click", () => {
    dropdown.classList.add("hidden");
  });
}

/* ================= AUTH EVENTS ================= */
document.addEventListener("auth:login", (e) => {
  const email = e.detail.email;
  localStorage.setItem(SESSION_KEY, "authenticated");

  updateProfileUI(email);
  navigateTo("dashboard-view");
  initThreeDotMenu();
});

document.addEventListener("auth:logout", () => {
  localStorage.removeItem(SESSION_KEY);
  navigateTo("landing-view");
});

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  navigateTo("landing-view");
});
