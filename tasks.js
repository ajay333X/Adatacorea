// ================================================================
// tasks.js (FIXED – Workspace visibility & flow + Firestore + Apps Script)
// ================================================================

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";


const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwZyjFFPwHkNNTriYNSdWPPkH4gB5wNKgsvrzpYW3-xhb1y9wMnufZCHA6elZYLtYJY/exec";

let currentTask = null;
let mediaRecorder = null;
let audioChunks = [];
let taskStartTime = null;
let taskActive = false;
let hasUnsavedProgress = false;
let taskTimerInterval = null;

// ✅ HARD FIX: ensure overlay is not trapped inside transformed/overflow parents
(function ensureWorkspaceOnBody() {
  const ws = document.getElementById("task-workspace-view");
  if (!ws) return;

  if (ws.parentElement !== document.body) {
    document.body.appendChild(ws);
  }

  ws.style.position = "fixed";
  ws.style.inset = "0";
  ws.style.zIndex = "2147483647";
})();

// ================================================================
// FIRESTORE HELPERS
// ================================================================


async function ensureUserDoc(user) {
  // ✅ HARD GUARD
  if (!user || !user.uid) {
    console.warn("ensureUserDoc called without a signed-in user yet:", user);
    return;
  }
  if (!window.db) {
    console.warn("Firestore (window.db) not ready yet");
    return;
  }

  const userRef = doc(window.db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      displayName: user.displayName || (user.email ? user.email.split("@")[0] : "User"),
      email: user.email || "",
      role: "cb",
      stats: { tasksCompleted: 0, totalEarnings: 0, pendingEarnings: 0 },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } else {
    // ✅ update only meta (NO stats reset)
    await setDoc(userRef, {
      displayName: user.displayName || (user.email ? user.email.split("@")[0] : "User"),
      email: user.email || "",
      role: "cb",
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
}



function startDashboardLive(uid) {
  const userRef = doc(window.db, "users", uid);

  return onSnapshot(userRef, (snap) => {
    if (!snap.exists()) return;

    const stats = snap.data().stats || {};
    document.querySelector("[data-metric='tasks']").textContent =
      stats.tasksCompleted || 0;

    document.querySelector("[data-metric='total-earnings']").textContent =
      `$${Number(stats.totalEarnings || 0).toFixed(2)}`;

    document.querySelector("[data-metric='pending-earnings']").textContent =
      `$${Number(stats.pendingEarnings || 0).toFixed(2)}`;
  });
}

window.addEventListener("DOMContentLoaded", () => {
  const wait = setInterval(() => {
    if (window.firebaseAuth && window.db) {
      clearInterval(wait);

      onAuthStateChanged(window.firebaseAuth, async (user) => {
        if (!user) return;

        await ensureUserDoc(user);        // ✅ always pass user
        startDashboardLive(user.uid);     // ✅ or startDashboardLive(user)
      });
    }
  }, 50);
});
;




// ================================================================
// DASHBOARD → START NEXT TASK
// ================================================================
window.handleStartNextTask = async function () {
  console.log("✅ Start Task clicked (NEW SYSTEM)");

  const user = window.firebaseAuth?.currentUser;
  if (!user) {
    alert("Not logged in");
    return;
  }

  try {
    await assignAndRenderTask();
  } catch (err) {
    console.error("❌ Failed to start task:", err);
  }
};

// ================================================================
// FETCH + SHOW TASK
// ================================================================
async function assignAndRenderTask() {
  console.log("📡 Fetching task...");

  const user = window.firebaseAuth.currentUser;
  const idToken = await user.getIdToken();

  const params = new URLSearchParams({
    action: "assignAudioTask",
    idToken
  });

  const res = await fetch(APPS_SCRIPT_URL + "?" + params.toString(), {
    method: "POST"
  });

  const data = await res.json();
  console.log("📦 Apps Script response:", data);

  if (!data.ok) {
    alert(data.error || "No task available");
    forceShowDashboard();
    return;
  }

  hideAllViews();
  hideSidebar();
  showWorkspace();

  currentTask = data.task;
  renderTaskWorkspace(currentTask);
}

// ================================================================
// UI HELPERS
// ================================================================
function hideAllViews() {
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
}

function hideSidebar() {
  document.getElementById("sidebar")?.classList.add("hidden");
}

function showWorkspace() {
  const ws = document.getElementById("task-workspace-view");
  if (!ws) {
    console.error("workspace not found");
    return;
  }

  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));

  ws.classList.remove("hidden");
  ws.classList.add("block");

  document.getElementById("sidebar")?.classList.add("hidden");

  console.log("✅ Workspace forced visible");
}

// ================================================================
// RENDER TASK
// ================================================================
window.renderTaskWorkspace = function (task) {
  console.log("🧩 Rendering task to UI:", task);

  const ws = document.getElementById("task-workspace-view");
  const taskIdEl = document.getElementById("workspace-task-id");
  const instructionEl = document.getElementById("task-instruction");
  const audioEl = document.getElementById("task-audio");

  if (!ws || !taskIdEl || !instructionEl || !audioEl) {
    console.error("❌ Task workspace elements missing", {
      ws,
      taskIdEl,
      instructionEl,
      audioEl
    });
    return;
  }

  ws.classList.remove("hidden");
  ws.style.display = "block";
  ws.style.visibility = "visible";
  ws.style.opacity = "1";
  ws.style.pointerEvents = "auto";

  taskIdEl.textContent = `Task ID: ${task.taskId}`;
  instructionEl.textContent = task.instruction || "";

  audioEl.pause();
  audioEl.src = task.audioUrl || "";
  audioEl.load();

  currentTask = task;
  taskActive = true;
  hasUnsavedProgress = true;
  taskStartTime = Date.now();

  startTaskTimer();
  startAutosave();

  console.log("✅ Task rendered successfully");
};

// ================================================================
// TIMER
// ================================================================
function startTaskTimer() {
  taskStartTime = Date.now();

  if (taskTimerInterval) clearInterval(taskTimerInterval);

  taskTimerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - taskStartTime) / 1000);
    const min = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const sec = String(elapsed % 60).padStart(2, "0");

    const el = document.getElementById("task-timer");
    if (el) el.textContent = `Time: ${min}:${sec}`;
  }, 1000);
}

// ================================================================
// EXIT / DASHBOARD
// ================================================================
window.safeExitTaskWorkspace = function () {
  console.log("🚪 Workspace closing");

  const workspace = document.getElementById("task-workspace-view");
  if (workspace) {
    workspace.classList.add("hidden");
    workspace.style.display = "none";
  }

  currentTask = null;
  taskActive = false;
  hasUnsavedProgress = false;

  if (typeof stopAutosave === "function") stopAutosave();

  if (typeof window.navigateTo === "function") {
    window.navigateTo("dashboard-view");
  }

  console.log("✅ Workspace closed safely");
};

function forceShowDashboard() {
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));

  document.getElementById("dashboard-view")?.classList.remove("hidden");
  document.getElementById("sidebar")?.classList.remove("hidden");
  document.getElementById("task-workspace-view")?.classList.add("hidden");

  document.body.classList.remove("overflow-hidden");
  console.log("🏠 Dashboard restored");
}

// ================================================================
// RECORDING
// ================================================================
window.startRecording = async function () {
  try {
    audioChunks = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.start();
    document.getElementById("start-recording-btn")?.classList.add("hidden");
    document.getElementById("stop-recording-btn")?.classList.remove("hidden");
  } catch (err) {
    alert("Microphone permission denied");
  }
};

window.stopRecording = function () {
  if (!mediaRecorder) return;
  mediaRecorder.stop();

  document.getElementById("stop-recording-btn")?.classList.add("hidden");
  document.getElementById("start-recording-btn")?.classList.remove("hidden");
};

// ================================================================
// AUTOSAVE
// ================================================================
let autosaveInterval = null;

function startAutosave() {
  stopAutosave();
  autosaveInterval = setInterval(() => {
    console.log("💾 Autosaving...");
  }, 15000);
}

function stopAutosave() {
  if (autosaveInterval) {
    clearInterval(autosaveInterval);
    autosaveInterval = null;
  }
}

window.addEventListener("beforeunload", (e) => {
  if (taskActive && hasUnsavedProgress) {
    e.preventDefault();
    e.returnValue = "";
  }
});

// ================================================================
// SUBMIT + LOAD NEXT TASK (Apps Script first, then Firestore)
// ================================================================
window.submitAndLoadNextTask = async function () {
  if (!currentTask) {
    alert("No active task");
    return;
  }

  stopAutosave();

  const user = window.firebaseAuth?.currentUser;
  const db = window.db;
  if (!user || !db) {
    alert("Not logged in / DB not ready");
    return;
  }

  const uid = user.uid;
  const idToken = await user.getIdToken();

  const taskId = currentTask.taskId;
  const durationSec = Math.floor((Date.now() - taskStartTime) / 1000);

  if (!audioChunks || audioChunks.length === 0) {
    alert("No recording found");
    return;
  }

  // 🎙️ AUDIO → BASE64
  const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
  const audioBase64 = await blobToBase64(audioBlob);

  // 💰 PAY CALC (local)
  const HOURLY_RATE = 7.5;
  const earningsRounded = Number(((durationSec / 3600) * HOURLY_RATE).toFixed(2));
  console.log("💰 Earnings (local):", earningsRounded);

  // 🚀 SEND TO APPS SCRIPT (Sheet + Drive)
  const params = new URLSearchParams({
    action: "submitAudioTask",
    idToken,
    taskId,
    durationSec: String(durationSec),
    mimeType: "audio/webm",
    audioBase64,
    earnings: earningsRounded.toString()
  });

  let data;
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: params
    });

    const text = await response.text();
    data = JSON.parse(text);
  } catch (err) {
    console.error("❌ Submit failed:", err);
    alert("Submit failed (network/server error)");
    return;
  }

  console.log("📦 Submit response:", data);

  if (!data?.ok) {
    alert(data?.error || "Submit failed");
    return;
  }

  // Prefer backend earnings if present
  const earned = Number((data.result?.earnings ?? earningsRounded) || 0);
  const earnedFixed = Number(earned.toFixed(2));

  alert(`✅ Task submitted!\nYou earned $${earnedFixed}`);

  // ✅ Firestore writes
  try {
    // Ensure user doc exists (so updateDoc won't fail)
    await ensureUserDoc();

    // 1) Log submission
    await setDoc(
      doc(db, "taskSubmissions", `${uid}_${taskId}`),
      {
        uid,
        taskId,
        durationSec,
        earnings: earnedFixed,
        driveUrl: data.result?.driveUrl || "",
        status: "submitted",
        submittedAt: serverTimestamp()
      },
      { merge: true }
    );

    // 2) Increment user stats (single update)
    await updateDoc(doc(db, "users", uid), {
      "stats.tasksCompleted": increment(1),
      "stats.totalEarnings": increment(earnedFixed),
      "stats.pendingEarnings": increment(earnedFixed),
      updatedAt: serverTimestamp()
    });

    console.log("✅ Firestore updated (users + taskSubmissions)");
  } catch (err) {
    console.error("❌ Firestore update failed:", err);
    alert("Task saved to Sheet/Drive, but Firestore update failed.");
    // Continue anyway
  }

  // RESET + NEXT TASK
  audioChunks = [];
  currentTask = null;
  taskActive = false;
  hasUnsavedProgress = false;

  await assignAndRenderTask();
};

// ================================================================
// HELPER: Convert Blob → Base64
// ================================================================
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(",")[1]);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(blob);
  });
}
