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
let currentTaskIndex = null;
let completedTasks = JSON.parse(localStorage.getItem("completedTasks") || "[]");

/* ================= LOAD TASKS ================= */
async function loadTasks() {
  const res = await fetch("./tasks.json");
  const data = await res.json();
  taskList = data.tasks || [];
}

/* ================= TASK SELECTION ================= */
function getNextTaskIndex() {
  const remaining = taskList.filter(
    t => !completedTasks.find(c => c.taskId === t.id)
  );

  if (remaining.length === 0) return null;

  const randomTask =
    remaining[Math.floor(Math.random() * remaining.length)];

  return taskList.findIndex(t => t.id === randomTask.id);
}

/* ================= START TASK ================= */
window.startTaskFlow = async function () {
  if (taskList.length === 0) {
    await loadTasks();
  }

  currentTaskIndex = getNextTaskIndex();

  if (currentTaskIndex === null) {
    alert("No tasks available 🎉");
    return;
  }

  showTask(taskList[currentTaskIndex]);
  navigateTo("task-runner-view");
};

/* ================= SHOW TASK ================= */
function showTask(task) {
  const container = document.getElementById("task-runner-view");
  const body = container.querySelector("#task-body");

  document.getElementById("task-title").innerText = task.title;
  document.getElementById("task-desc").innerText = task.description;

  body.innerHTML = renderTaskInput(task);
}

/* ================= RENDER INPUT ================= */
function renderTaskInput(task) {

  // TEXT INPUT (image labeling, short answer)
  if (task.type === "text") {
    return `
      ${task.payload.imageUrl ? 
        `<img src="${task.payload.imageUrl}" class="rounded mb-4 max-h-64 object-contain" />` 
        : ""}

      <input 
        id="task-answer"
        class="w-full p-3 rounded bg-gray-700 text-white"
        placeholder="Enter your answer..."
      />
    `;
  }

  // MULTIPLE CHOICE
  if (task.type === "choice") {
    return task.payload.options
      .map(
        opt => `
          <label class="block mb-2 text-gray-300">
            <input type="radio" name="task-answer" value="${opt}" class="mr-2" />
            ${opt}
          </label>
        `
      )
      .join("");
  }

  // LONG TEXT / FEEDBACK
  if (task.type === "textarea") {
    return `
      <p class="mb-2 text-gray-300">${task.payload.text || ""}</p>
      <textarea
        id="task-answer"
        class="w-full p-3 rounded bg-gray-700 text-white"
        rows="5"
        placeholder="Write your response..."
      ></textarea>
    `;
  }

  return `<p class="text-red-400">Unsupported task type</p>`;
}


/* ================= SUBMIT TASK ================= */
window.submitTask = function () {
  const answer =
    document.getElementById("task-answer")?.value ||
    document.querySelector("input[name='task-answer']:checked")?.value;

  if (!answer) {
    alert("Please complete the task");
    return;
  }

  completedTasks.push({
    taskId: taskList[currentTaskIndex].id,
    answer,
    completedAt: new Date().toISOString()
  });

  localStorage.setItem("completedTasks", JSON.stringify(completedTasks));

  currentTaskIndex = getNextTaskIndex();

  if (currentTaskIndex === null) {
    alert("All tasks completed 🎉");
    navigateTo("dashboard-view");
    return;
  }

  showTask(taskList[currentTaskIndex]);
};
