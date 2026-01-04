/* =========================================================
   UI + Navigation Logic (NO Firebase INIT HERE)
   Uses db.js ONLY for data access
========================================================= */

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
  localStorage.setItem(
    THEME_KEY,
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );
});

/* ================= LOGO RENDER ================= */
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

  if (!loginForm || !registerForm) return;

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
function updateProfileUI(email, uid, role = "User") {
  if (!email) return;

  const storedName = localStorage.getItem("displayName");
  const name = storedName || email.split("@")[0].toUpperCase();

  document.getElementById("welcome-username") &&
    (document.getElementById("welcome-username").textContent = name + "!");

  document.getElementById("profile-username") &&
    (document.getElementById("profile-username").textContent = name);

  document.getElementById("sidebar-username") &&
    (document.getElementById("sidebar-username").textContent = name);

  // Sidebar UID
  const sidebarId = document.getElementById("sidebar-userid");
  if (sidebarId && uid) {
    sidebarId.textContent = uid.slice(0, 18) + "…";
sidebarId.title = uid; // full UID on hover

  }

  // ✅ Profile page UID
  // ✅ Copy UID button

const profileId = document.getElementById("profile-userid");
if (profileId && uid) {
  profileId.textContent = uid;
}
const copyBtn = document.getElementById("copy-uid-btn");
if (copyBtn && uid) {
  copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(uid);
      copyBtn.textContent = "✔";
      setTimeout(() => (copyBtn.textContent = "📋"), 1200);
    } catch (err) {
      alert("Failed to copy UID");
    }
  };
}


  // ✅ Profile page role
  const profileRole = document.getElementById("profile-role");
  if (profileRole) {
    profileRole.textContent = role;
  }
}


/* ================= NAVIGATION ================= */
window.navigateTo = (viewId) => {
  // hide all views
  document.querySelectorAll(".view").forEach(v => {
    v.classList.add("hidden");
    v.style.display = ""; // reset inline display if any
  });

  // find target
  const target = document.getElementById(viewId);

  if (!target) {
    console.warn("❌ Missing view:", viewId);
    return;
  }

  // ✅ MUST be a view container
  if (!target.classList.contains("view")) {
    console.error(
      `❌ ID "${viewId}" exists but is NOT a .view element.`,
      "This usually means duplicate IDs (like <a id='earnings-view'>...).",
      target
    );
    return;
  }

  // show target
  target.classList.remove("hidden");
  target.style.display = "block"; // force visible

  // ✅ always hide task workspace overlay
  const ws = document.getElementById("task-workspace-view");
  if (ws) {
    ws.classList.add("hidden");
    ws.style.display = "none";
  }

  // sidebar logic
  const sidebar = document.getElementById("sidebar");
  const topRight = document.getElementById("top-right-controls");

  const protectedViews = [
    "dashboard-view",
    "tasks-view",
    "profile-view",
    "payout-view",
    "quality-view",
    "earnings-view"
  ];

  if (protectedViews.includes(viewId)) {
    sidebar?.classList.remove("hidden");
    topRight?.classList.remove("hidden");
  } else {
    sidebar?.classList.add("hidden");
    topRight?.classList.add("hidden");
  }

  // ✅ debug: prove what is visible
  console.log("✅ navigateTo:", viewId, "=> showing:", target);

  window.scrollTo(0, 0);
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
document.addEventListener("auth:login", async (e) => {
  const { uid, email } = e.detail;

  localStorage.setItem(SESSION_KEY, "authenticated");

  // ✅ get user data FIRST (for role, stats)
  const data = await getUserData(uid);

  updateProfileUI(email, uid, data?.role || "User");

  navigateTo("dashboard-view");
  initThreeDotMenu();

  if (!data || !data.stats) return;

  // ✅ REPLACE the old ".border-xxx p" selectors with these:
  const pendingEl = document.querySelector('[data-metric="pending-earnings"]');
  const totalEl = document.querySelector('[data-metric="total-earnings"]');
  const tasksEl = document.querySelector('[data-metric="tasks"]');

  if (pendingEl) pendingEl.textContent = `$${Number(data.stats.pendingEarnings || 0).toFixed(2)}`;
  if (totalEl) totalEl.textContent = `$${Number(data.stats.totalEarnings || 0).toFixed(2)}`;
  if (tasksEl) tasksEl.textContent = Number(data.stats.tasksCompleted || 0);
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


window.saveProfile = function () {
  const nameInput = document.getElementById("profile-fullname-input");
  if (!nameInput) return;

  localStorage.setItem("displayName", nameInput.value.trim());
  alert("Profile updated");
};

// =============================
// Active Contract: Policy Modal
// =============================
function initContractPolicyModal() {
  const modal = document.getElementById("policy-modal");
  const backdrop = document.getElementById("policy-backdrop");

  const btnRead = document.getElementById("btn-read-policy");
  const btnProceed = document.getElementById("btn-proceed-policy");
  const btnClose = document.getElementById("btn-close-policy");
  const btnBack = document.getElementById("btn-back-from-policy");

  const btnAgree = document.getElementById("btn-agree-finish");
  const btnDisagree = document.getElementById("btn-disagree");

  const statusPill = document.getElementById("contract-status-pill");

  // If this view isn't present on the page, safely exit (prevents errors)
  if (!modal || !statusPill) return;

  function openModal() {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.body.style.overflow = "";
  }

  // Avoid double-binding if init runs multiple times
  function bind(el, event, handler) {
    if (!el) return;
    el.removeEventListener(event, handler);
    el.addEventListener(event, handler);
  }

  // Open
  bind(btnRead, "click", openModal);
  bind(btnProceed, "click", openModal);

  // Close
  bind(btnClose, "click", closeModal);
  bind(btnBack, "click", closeModal);
  bind(backdrop, "click", closeModal);

  // ESC close
  const escHandler = (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
  };
  document.removeEventListener("keydown", escHandler);
  document.addEventListener("keydown", escHandler);

  // Agree
  bind(btnAgree, "click", async () => {
    try {
      // ✅ Hook your real "accept contract" logic here:
      // Example:
      // await window.acceptContract?.("general_tasking_v1");

      // UI feedback
      statusPill.textContent = "Accepted ✅";
      statusPill.className =
        "text-xs px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-500/20";

      closeModal();

      // ✅ Navigate after accepting (change target)
      // window.navigateTo("tasks-view");
    } catch (err) {
      console.error(err);
      alert("Failed to accept contract. Please try again.");
    }
  });

  // Disagree
  bind(btnDisagree, "click", () => {
    statusPill.textContent = "Not accepted";
    statusPill.className =
      "text-xs px-3 py-1 rounded-full bg-red-500/15 text-red-200 border border-red-500/20";
    closeModal();
  });
}

// Run after DOM is ready (works even if script is in <head>)
document.addEventListener("DOMContentLoaded", () => {
  initContractPolicyModal();
});

