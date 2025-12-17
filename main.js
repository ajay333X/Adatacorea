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
  if (!clerk || !clerk.isSignedIn) return;

  const user = clerk.user;
  const email = user.primaryEmailAddress
    ? user.primaryEmailAddress.emailAddress
    : "";

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
/* ================= LOAD TASKS ================= */
async function loadTasks() {
  if (taskList.length) return;

  try {
    const res = await fetch(
      "https://script.google.com/macros/s/AKfycbwaDz8TJW3pMf1_wAoAXT0End9Dymw1RRs160xCWh6oq8IM_LEV4f1eqs48kafpEOxA/exec"
    );

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }

    const data = await res.json();
    taskList = Array.isArray(data.tasks) ? data.tasks : [];

    if (!taskList.length) {
      alert("No tasks available right now.");
    }
  } catch (err) {
    console.error("Failed to load tasks:", err);
    alert("⚠️ Unable to load tasks. Please try again later.");
  }
}


/* ================= TASK FLOW ================= */
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
    navigateTo("dashboard-view");
    return;
  }

  taskState.currentTaskIndex = next;
  saveUserTaskState();

  navigateTo("task-runner-view");
  showTask(taskList[next]);
};
}
function showTask(task) {
  const title = document.getElementById("task-title");
  const desc = document.getElementById("task-desc");
  const body = document.getElementById("task-body");

  if (!title || !desc || !body) {
    console.error("Task runner elements missing");
    return;
  }

  title.textContent = task.title || "Task";
  desc.textContent = task.description || "";
  body.innerHTML = renderTaskInput(task);
}


/* ================= INPUT RENDER ================= */
function renderTaskInput(task) {
  if (task.type === "text") {
    return `
      ${task.payload?.imageUrl ? `<img src="${task.payload.imageUrl}" class="mb-4 rounded" />` : ""}
      <input id="task-answer" class="w-full p-3 rounded bg-gray-700 text-white" />
    `;
  }

  if (task.type === "choice") {
    return task.payload.options
      .map(
        o => `
        <label class="block mb-2">
          <input type="radio" name="task-answer" value="${o}" />
          <span class="ml-2">${o}</span>
        </label>
      `
      )
      .join("");
  }

  if (task.type === "textarea") {
    return `
      <textarea id="task-answer" class="w-full p-3 rounded bg-gray-700 text-white"></textarea>
    `;
  }

  /* 🎙 AUDIO TASK */
  if (task.type === "audio") {
    return `
      <p class="text-sm text-gray-400 mb-3">
        Language: ${task.payload?.language || "N/A"}
      </p>

      <button id="record-btn" class="px-4 py-2 bg-red-600 rounded text-white">
        🎙 Start Recording
      </button>

      <audio id="audio-preview" controls class="hidden mt-4 w-full"></audio>
    `;
  }

  return `<p class="text-red-500">Unsupported task type</p>`;
}


/* ================= SUBMIT TASK ================= */
/* ================= SUBMIT TASK ================= */
window.submitTask = () => {
  const answer =
    document.getElementById("task-answer")?.value ||
    document.querySelector("input[name='task-answer']:checked")?.value;

  if (!answer) {
    alert("Please complete the task");
    return;
  }

  taskState.completedTasks.push({
    taskId: taskList[taskState.currentTaskIndex].id,
    answer,
    completedAt: new Date().toISOString(),
  });

  saveUserTaskState();

  const next = getNextTaskIndex();
  taskState.currentTaskIndex = next;

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

