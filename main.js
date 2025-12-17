import { Clerk } from "https://esm.sh/@clerk/clerk-js";
import { LOGO_FULL_SVG, LOGO_ICON_SVG } from "./logos.js";

let clerk = null;

/* ================= INIT ================= */
async function initClerk() {
  clerk = new Clerk(
    "pk_test_ZXZvbHZlZC1tYWNrZXJlbC01MC5jbGVyay5hY2NvdW50cy5kZXYk"
  );

  await clerk.load();
  window.clerk = clerk;

  renderLogos();

  if (clerk.isSignedIn) {
    syncUserToUI();
    navigateTo("dashboard-view");
  } else {
    navigateTo("landing-view");
  }
}

/* ================= LOGOS ================= */
function renderLogos() {
  const sidebarLogo = document.getElementById("sidebar-logo-icon");
  if (sidebarLogo) sidebarLogo.innerHTML = LOGO_ICON_SVG;

  const mobileLogo = document.getElementById("mobile-logo-icon");
  if (mobileLogo) mobileLogo.innerHTML = LOGO_ICON_SVG;

  const landingLogo = document.getElementById("landing-logo-large");
  if (landingLogo) landingLogo.innerHTML = LOGO_FULL_SVG;
}

/* ================= PAGE AUTH ================= */
window.openAuthPage = function (mode) {
  const root = document.getElementById("clerk-auth-root");
  const title = document.getElementById("auth-title");

  if (!root || !clerk) return;

  root.innerHTML = "";

  title.textContent =
    mode === "sign-up" ? "Create your account" : "Welcome back";

  navigateTo("auth-view");

  const onSuccess = function () {
    syncUserToUI();
    navigateTo("dashboard-view");
  };

  if (mode === "sign-up") {
    clerk.mountSignUp(root, { afterSignUp: onSuccess });
  } else {
    clerk.mountSignIn(root, { afterSignIn: onSuccess });
  }
};

/* ================= NAVIGATION ================= */
window.navigateTo = function (viewId) {
  const body = document.body;

  // toggle auth state
  if (viewId === "auth-view") {
    body.classList.add("auth-active");
  } else {
    body.classList.remove("auth-active");
  }

  const protectedViews = [
    "dashboard-view",
    "tasks-view",
    "payout-view",
    "history-view",
    "quality-view",
    "profile-view",
  ];

  if (protectedViews.includes(viewId)) {
    if (!clerk || !clerk.isSignedIn) {
      window.openAuthPage("sign-in");
      return;
    }
  }

  document.querySelectorAll(".view").forEach(v => {
    v.classList.add("hidden");
  });

  const target = document.getElementById(viewId);
  if (target) target.classList.remove("hidden");

  const sidebar = document.getElementById("sidebar");
  const controls = document.getElementById("top-right-controls");
  const header = document.getElementById("general-header");

  if (protectedViews.includes(viewId)) {
    sidebar?.classList.remove("hidden");
    controls?.classList.remove("hidden");
    header?.classList.add("hidden");
  } else {
    sidebar?.classList.add("hidden");
    controls?.classList.add("hidden");
    header?.classList.remove("hidden");
  }
};


/* ================= USER UI ================= */
function syncUserToUI() {
  if (!clerk || !clerk.isSignedIn) return;

  const user = clerk.user;
  const email = user.primaryEmailAddress?.emailAddress || "";
  const name =
    user.username ||
    user.firstName ||
    (email ? email.split("@")[0] : "User");

  const welcome = document.getElementById("welcome-username");
  if (welcome) welcome.textContent = name;

  const profileName = document.getElementById("profile-username");
  if (profileName) profileName.textContent = name;

  const profileEmail = document.getElementById("profile-email-input");
  if (profileEmail) profileEmail.value = email;

  const avatar = document.getElementById("profile-avatar");
  if (avatar && user.imageUrl) avatar.src = user.imageUrl;

  const menuUser = document.getElementById("menu-username");
  if (menuUser) menuUser.textContent = name;

  const menuEmail = document.getElementById("menu-email");
  if (menuEmail) menuEmail.textContent = email;
}

/* ================= LOGOUT ================= */
window.handleLogout = async function () {
  if (!clerk) return;
  await clerk.signOut();
  navigateTo("landing-view");
};

/* ================= DELETE ACCOUNT ================= */
window.handleDeleteAccount = async function () {
  if (!confirm("This will permanently delete your account. Continue?")) return;

  try {
    await clerk.user.delete();
    alert("Account deleted successfully.");
    navigateTo("landing-view");
  } catch (e) {
    console.error(e);
    alert("Failed to delete account.");
  }
};

/* ================= UI EVENTS ================= */
const threeDotBtn = document.getElementById("three-dot-btn");
if (threeDotBtn) {
  threeDotBtn.addEventListener("click", () => {
    const dd = document.getElementById("three-dot-dropdown");
    if (dd) dd.classList.toggle("hidden");
  });
}

const themeBtn = document.getElementById("theme-toggle-btn");
if (themeBtn) {
  themeBtn.addEventListener("click", () => {
    document.documentElement.classList.toggle("dark");
  });
}

/* ================= START ================= */
document.addEventListener("DOMContentLoaded", initClerk);
let taskList = [];
let currentTaskIndex = 0;
let completedTasks = [];

/* ================= LOAD TASKS ================= */
async function loadTasks() {
  const res = await fetch("./tasks.json");
  const data = await res.json();
  taskList = data.tasks;
}

/* ================= START TASK ================= */
window.startTaskFlow = async function () {
  if (taskList.length === 0) {
    await loadTasks();
  }

  currentTaskIndex = getNextTaskIndex();
  showTask(taskList[currentTaskIndex]);
};

/* ================= SHOW TASK ================= */
function showTask(task) {
  const container = document.getElementById("tasks-view");
  container.innerHTML = `
    <h1 class="text-2xl font-bold mb-4">${task.title}</h1>
    <p class="mb-4 text-gray-400">${task.description}</p>

    ${renderTaskInput(task)}

    <button
      class="mt-6 px-6 py-3 bg-violet-600 text-white rounded-xl"
      onclick="submitTask('${task.id}')">
      Submit Task
    </button>
  `;
}

/* ================= RENDER INPUT ================= */
function renderTaskInput(task) {
  if (task.type === "text") {
    return `
      <img src="${task.payload.imageUrl}" class="rounded mb-4" />
      <input id="task-answer" class="w-full p-3 rounded bg-gray-700" placeholder="Enter labels..." />
    `;
  }

  if (task.type === "choice") {
    return task.payload.options
      .map(
        opt => `
        <label class="block mb-2">
          <input type="radio" name="task-answer" value="${opt}" />
          ${opt}
        </label>`
      )
      .join("");
  }

  if (task.type === "textarea") {
    return `
      <p class="mb-2">${task.payload.text}</p>
      <textarea id="task-answer" class="w-full p-3 rounded bg-gray-700"></textarea>
    `;
  }

  return "";
}

/* ================= SUBMIT TASK ================= */
window.submitTask = function (taskId) {
  const answer =
    document.getElementById("task-answer")?.value ||
    document.querySelector("input[name='task-answer']:checked")?.value;

  completedTasks.push({
    taskId,
    answer,
    completedAt: new Date().toISOString()
  });

  // store progress locally
  localStorage.setItem("completedTasks", JSON.stringify(completedTasks));

  // move to next task
  const nextIndex = getNextTaskIndex();
  if (nextIndex === null) {
    alert("All tasks completed 🎉");
    return;
  }

  currentTaskIndex = nextIndex;
  showTask(taskList[currentTaskIndex]);
};

/* ================= TASK SELECTION ================= */
function getNextTaskIndex() {
  for (let i = 0; i < taskList.length; i++) {
    if (!completedTasks.find(t => t.taskId === taskList[i].id)) {
      return i;
    }
  }
  return null;
}

