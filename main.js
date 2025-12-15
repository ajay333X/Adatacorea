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
  document.getElementById("sidebar-logo-icon")?.innerHTML = LOGO_ICON_SVG;
  document.getElementById("mobile-logo-icon")?.innerHTML = LOGO_ICON_SVG;
  document.getElementById("landing-logo-large")?.innerHTML = LOGO_FULL_SVG;
}

/* ================= AUTH PAGE ================= */
window.openAuthPage = function (mode) {
  const root = document.getElementById("clerk-auth-root");
  const title = document.getElementById("auth-title");
  if (!root || !clerk) return;

  root.innerHTML = "";
  title.textContent = mode === "sign-up" ? "Create your account" : "Welcome back";

  navigateTo("auth-view");

  const onSuccess = () => {
    syncUserToUI();
    navigateTo("dashboard-view");
  };

  mode === "sign-up"
    ? clerk.mountSignUp(root, { afterSignUp: onSuccess })
    : clerk.mountSignIn(root, { afterSignIn: onSuccess });
};

/* ================= NAVIGATION ================= */
window.navigateTo = function (viewId) {
  const protectedViews = [
    "dashboard-view",
    "tasks-view",
    "task-runner-view",
    "payout-view",
    "history-view",
    "quality-view",
    "profile-view",
  ];

  if (protectedViews.includes(viewId) && (!clerk || !clerk.isSignedIn)) {
    openAuthPage("sign-in");
    return;
  }

  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  document.getElementById(viewId)?.classList.remove("hidden");

  document.getElementById("sidebar")?.classList.toggle("hidden", !protectedViews.includes(viewId));
  document.getElementById("top-right-controls")?.classList.toggle("hidden", !protectedViews.includes(viewId));
  document.getElementById("general-header")?.classList.toggle("hidden", protectedViews.includes(viewId));
};

/* ================= USER UI ================= */
function syncUserToUI() {
  if (!clerk?.isSignedIn) return;

  const user = clerk.user;
  const email = user.primaryEmailAddress?.emailAddress || "";
  const name = user.username || user.firstName || email.split("@")[0];

  document.getElementById("welcome-username")?.textContent = name;
  document.getElementById("profile-username")?.textContent = name;
  document.getElementById("profile-email-input")?.value = email;
  document.getElementById("menu-username")?.textContent = name;
  document.getElementById("menu-email")?.textContent = email;

  if (user.imageUrl) {
    document.getElementById("profile-avatar")?.setAttribute("src", user.imageUrl);
  }

  loadUserTaskState();
}

/* ================= LOGOUT ================= */
window.handleLogout = async () => {
  await clerk.signOut();
  navigateTo("landing-view");
};

/* ================= TASK STORAGE (PER USER) ================= */
let taskList = [];
let taskState = { completedTasks: [], currentTaskIndex: null };

function getTaskKey() {
  return clerk?.user ? `adatacore_tasks_${clerk.user.id}` : null;
}

function loadUserTaskState() {
  const key = getTaskKey();
  if (!key) return;

  taskState =
    JSON.parse(localStorage.getItem(key)) ||
    { completedTasks: [], currentTaskIndex: null };
}

function saveUserTaskState() {
  const key = getTaskKey();
  if (key) localStorage.setItem(key, JSON.stringify(taskState));
}

/* ================= LOAD TASKS ================= */
async function loadTasks() {
  if (taskList.length) return;
  const res = await fetch("./tasks.json");
  const data = await res.json();
  taskList = data.tasks || [];
}

/* ================= TASK FLOW ================= */
function getNextTaskIndex() {
  return taskList.findIndex(
    t => !taskState.completedTasks.find(c => c.taskId === t.id)
  );
}

window.startTaskFlow = async () => {
  await loadTasks();

  const next = getNextTaskIndex();
  if (next === -1) {
    alert("🎉 All tasks completed!");
    return;
  }

  taskState.currentTaskIndex = next;
  saveUserTaskState();

  navigateTo("task-runner-view");
  showTask(taskList[next]);
};

function showTask(task) {
  document.getElementById("task-title").textContent = task.title;
  document.getElementById("task-desc").textContent = task.description;
  document.getElementById("task-body").innerHTML = renderTaskInput(task);
}

/* ================= INPUT RENDER ================= */
function renderTaskInput(task) {
  if (task.type === "text") {
    return `
      ${task.payload.imageUrl ? `<img src="${task.payload.imageUrl}" class="mb-4 rounded" />` : ""}
      <input id="task-answer" class="w-full p-3 rounded bg-gray-700 text-white" />
    `;
  }

  if (task.type === "choice") {
    return task.payload.options
      .map(o => `<label class="block"><input type="radio" name="task-answer" value="${o}"/> ${o}</label>`)
      .join("");
  }

  if (task.type === "textarea") {
    return `<textarea id="task-answer" class="w-full p-3 rounded bg-gray-700 text-white"></textarea>`;
  }

  return `<p>Unsupported task type</p>`;
}

/* ================= SUBMIT TASK ================= */
window.submitTask = () => {
  const answer =
    document.getElementById("task-answer")?.value ||
    document.querySelector("input[name='task-answer']:checked")?.value;

  if (!answer) return alert("Please complete the task");

  taskState.completedTasks.push({
    taskId: taskList[taskState.currentTaskIndex].id,
    answer,
    completedAt: new Date().toISOString()
  });

  const next = getNextTaskIndex();
  taskState.currentTaskIndex = next;
  saveUserTaskState();

  if (next === -1) {
    alert("🎉 All tasks completed!");
    navigateTo("dashboard-view");
    return;
  }

  showTask(taskList[next]);
};

/* ================= UI EVENTS ================= */
document.getElementById("three-dot-btn")?.addEventListener("click", () => {
  document.getElementById("three-dot-dropdown")?.classList.toggle("hidden");
});

document.getElementById("theme-toggle-btn")?.addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");
});

document.addEventListener("DOMContentLoaded", initClerk);

