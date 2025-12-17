import { Clerk } from "https://esm.sh/@clerk/clerk-js";
import { LOGO_FULL_SVG, LOGO_ICON_SVG } from "./logos.js";

let clerk = null;
let clerkMounted = false;

function cleanupAuthView() {
  const authRoot = document.getElementById("clerk-auth-root");
  if (authRoot) {
    authRoot.innerHTML = "";
  }
  clerkMounted = false;
}

/* ================= INIT ================= */
async function initClerk() {
  clerk = new Clerk("pk_test_ZXZvbHZlZC1tYWNrZXJlbC01MC5jbGVyay5hY2NvdW50cy5kZXYk");
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
  document.getElementById("sidebar-logo-icon")?.replaceChildren();
  document.getElementById("sidebar-logo-icon")?.insertAdjacentHTML("beforeend", LOGO_ICON_SVG);

  document.getElementById("mobile-logo-icon")?.replaceChildren();
  document.getElementById("mobile-logo-icon")?.insertAdjacentHTML("beforeend", LOGO_ICON_SVG);

  document.getElementById("landing-logo-large")?.replaceChildren();
  document.getElementById("landing-logo-large")?.insertAdjacentHTML("beforeend", LOGO_FULL_SVG);
}

/* ================= AUTH ================= */
window.openAuthPage = function (mode = "sign-in") {
  const root = document.getElementById("clerk-auth-root");
  const title = document.getElementById("auth-title");

  if (!root || !clerk) return;
  if (clerkMounted) return;

  clerkMounted = true;
  root.innerHTML = "";

  title.textContent =
    mode === "sign-up" ? "Create your account" : "Welcome back";

  navigateTo("auth-view");

  const onSuccess = () => {
    cleanupAuthView();
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
window.navigateTo = (viewId) => {
  const protectedViews = [
    "dashboard-view",
    "tasks-view",
    "task-runner-view",
    "payout-view",
    "history-view",
    "quality-view",
    "profile-view",
  ];

  // 🔐 Auth guard
  if (protectedViews.includes(viewId) && !clerk?.isSignedIn) {
    openAuthPage("sign-in");
    return;
  }

  // 🧹 Clean auth ONLY when leaving auth-view
  if (
    document.getElementById("auth-view") &&
    !document.getElementById("auth-view").classList.contains("hidden") &&
    viewId !== "auth-view"
  ) {
    cleanupAuthView();
  }

  // Hide all views
  document.querySelectorAll(".view").forEach(v => {
    v.classList.add("hidden");
  });

  // Show target view
  document.getElementById(viewId)?.classList.remove("hidden");

  const isProtected = protectedViews.includes(viewId);

  document.getElementById("sidebar")?.classList.toggle("hidden", !isProtected);
  document
    .getElementById("top-right-controls")
    ?.classList.toggle("hidden", !isProtected);
  document
    .getElementById("general-header")
    ?.classList.toggle("hidden", isProtected);
};


/* ================= USER UI ================= */
function syncUserToUI() {
  if (!clerk?.isSignedIn) return;

  const user = clerk.user;
  const email = user.primaryEmailAddress?.emailAddress || "";
  const name = user.username || user.firstName || email.split("@")[0] || "User";

  document.getElementById("welcome-username")?.replaceChildren(name);
  document.getElementById("profile-username")?.replaceChildren(name);
  document.getElementById("profile-email-input") && (document.getElementById("profile-email-input").value = email);
  if (user.imageUrl) document.getElementById("profile-avatar")?.setAttribute("src", user.imageUrl);
}

/* ================= LOGOUT ================= */
window.handleLogout = async () => {
  await clerk.signOut();
  location.reload();
};

/* ================= TASK STATE ================= */
let taskList = [];
let taskState = { completedTasks: [], currentTaskIndex: null };

function getTaskKey() {
  return clerk?.user ? `adatacore_tasks_${clerk.user.id}` : null;
}

function saveUserTaskState() {
  const key = getTaskKey();
  if (key) localStorage.setItem(key, JSON.stringify(taskState));
}

/* ================= LOAD TASKS ================= */
async function loadTasks() {
  if (taskList.length) return;

  try {
    const res = await fetch(
      "https://script.google.com/macros/s/AKfycbwaDz8TJW3pMf1_wAoAXT0End9Dymw1RRs160xCWh6oq8IM_LEV4f1eqs48kafpEOxA/exec",
      { redirect: "follow" }
    );

    const data = await res.json();
    taskList = Array.isArray(data.tasks) ? data.tasks : [];

    if (!taskList.length) throw new Error("No tasks found");
  } catch (err) {
    console.error(err);
    alert("⚠️ Failed to load tasks");
  }
}

/* ================= TASK FLOW ================= */
function getNextTaskIndex() {
  return taskList.findIndex(
    t => !taskState.completedTasks.some(c => c.taskId === t.id)
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
  if (!task) return;

  document.getElementById("task-title").textContent = task.title || "Task";
  document.getElementById("task-desc").textContent = task.description || "";
  document.getElementById("task-body").innerHTML = renderTaskInput(task);
}

/* ================= RENDER INPUT ================= */
function renderTaskInput(task) {
  if (task.type === "textarea") {
    return `<textarea id="task-answer" class="w-full p-3 rounded bg-gray-700 text-white"></textarea>`;
  }

  if (task.type === "choice") {
    return task.payload.options.map(o =>
      `<label><input type="radio" name="task-answer" value="${o}"> ${o}</label>`
    ).join("");
  }

  return `<input id="task-answer" class="w-full p-3 rounded bg-gray-700 text-white" />`;
}

/* ================= SUBMIT ================= */
window.submitTask = () => {
  const answer =
    document.getElementById("task-answer")?.value ||
    document.querySelector("input[name='task-answer']:checked")?.value;

  if (!answer) return alert("Please complete the task");

  taskState.completedTasks.push({
    taskId: taskList[taskState.currentTaskIndex].id,
    answer,
    completedAt: new Date().toISOString(),
  });

  saveUserTaskState();
  startTaskFlow();
};

/* ================= UI EVENTS ================= */
document.getElementById("three-dot-btn")?.addEventListener("click", () => {
  document.getElementById("three-dot-dropdown")?.classList.toggle("hidden");
});

document.getElementById("theme-toggle-btn")?.addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");
});

document.addEventListener("DOMContentLoaded", initClerk);


