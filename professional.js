/* =========================================================
   ADATACORE PROFESSIONAL EXPERIENCE LAYER
   Paste this inside new file: professional.js
   Safe JS: adds active nav, toasts, button polish.
========================================================= */

(function () {
  const viewToNav = {
    "dashboard-view": "nav-dashboard",
    "active-contracts-view": "nav-tasks",
    "tasks-view": "nav-tasks",
    "earnings-view": "nav-earnings",
    "payout-view": "nav-payout",
    "quality-view": "nav-quality",
    "profile-view": "nav-profile"
  };

  function ensureToastRoot() {
    let root = document.getElementById("ac-toast-root");

    if (!root) {
      root = document.createElement("div");
      root.id = "ac-toast-root";
      document.body.appendChild(root);
    }

    return root;
  }

  window.acToast = function (title, message) {
    const root = ensureToastRoot();
    const toast = document.createElement("div");

    toast.className = "ac-toast";
    toast.innerHTML = `
      <div class="ac-toast-title">${title}</div>
      <div class="ac-toast-msg">${message}</div>
    `;

    root.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px) scale(0.98)";

      setTimeout(() => {
        toast.remove();
      }, 240);
    }, 3200);
  };

  function markActiveNav(viewId) {
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.remove("ac-active");
    });

    const navId = viewToNav[viewId];

    if (navId) {
      document.getElementById(navId)?.classList.add("ac-active");
    }
  }

  const oldNavigate = window.navigateTo;

  window.navigateTo = function (viewId) {
    if (typeof oldNavigate === "function") {
      oldNavigate(viewId);
    }

    markActiveNav(viewId);
  };

  document.addEventListener("click", (event) => {
    const btn = event.target.closest("button");

    if (!btn || btn.disabled || btn.dataset.noPolish === "true") {
      return;
    }

    btn.classList.add("ac-clicked");

    setTimeout(() => {
      btn.classList.remove("ac-clicked");
    }, 260);
  });

  document.addEventListener("DOMContentLoaded", () => {
    markActiveNav("dashboard-view");

    document.querySelectorAll("input").forEach((input) => {
      if (!input.getAttribute("autocomplete")) {
        input.setAttribute("autocomplete", "on");
      }
    });
  });
})();
