// ================================================================
// tasks.js (SHEET-ONLY SOURCE OF TRUTH) ✅
// - Stats/Earnings/Payouts: ONLY from Apps Script (secure via idToken)
// - Firestore: only optional profile doc users/{uid}
// ================================================================

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxWohvXhaVcCHACcEXAMgOcG0Kus85DgXbIRD5VTVUygEWa8TnUhfAKARNFB_qnBhIn/exec";

// -------------------- State --------------------
let currentTask = null;
let mediaRecorder = null;
let audioChunks = [];
let taskStartTime = null;
let taskTimerInterval = null;
let micStream = null;

// ✅ New: Recording Timer State
let recordingInterval = null;
let recordingSeconds = 0;

// ✅ Overlay hard-fix
(function ensureWorkspaceOnBody() {
  const ws = document.getElementById("task-workspace-view");
  if (!ws) return;
  if (ws.parentElement !== document.body) document.body.appendChild(ws);
  ws.style.position = "fixed";
  ws.style.inset = "0";
  ws.style.zIndex = "2147483647";
})();

// ================================================================
// Small helpers
// ================================================================
function $(id) { return document.getElementById(id); }

function setAllById(id, text) {
  document.querySelectorAll(`#${CSS.escape(id)}`).forEach(el => (el.textContent = text));
}

function hideAllViews() {
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
}
function showSidebar() { $("sidebar")?.classList.remove("hidden"); }
function hideSidebar() { $("sidebar")?.classList.add("hidden"); }

function showWorkspace() {
  const ws = $("task-workspace-view");
  if (!ws) return;
  hideAllViews();
  hideSidebar();
  ws.classList.remove("hidden");
  ws.style.display = "block";
  document.body.classList.add("overflow-hidden");
}

function hideWorkspace() {
  const ws = $("task-workspace-view");
  if (!ws) return;
  ws.classList.add("hidden");
  ws.style.display = "none";
  document.body.classList.remove("overflow-hidden");
}

function forceShowDashboard() {
  hideAllViews();
  $("dashboard-view")?.classList.remove("hidden");
  showSidebar();
  hideWorkspace();
}

// ================================================================
// API: call Apps Script securely (POST-only) ✅
// ================================================================
async function callApi(action, extra = {}) {
  const user = window.firebaseAuth?.currentUser;
  if (!user) throw new Error("Not signed in");

  const idToken = await user.getIdToken();

  const body = new URLSearchParams({ action, idToken, ...extra });
  const res = await fetch(APPS_SCRIPT_URL, { method: "POST", body });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Apps Script returned non-JSON (deployment/access issue). First 200 chars:\n" + text.slice(0, 200));
  }

  if (!json.ok) throw new Error(json.error || "Request failed");
  return json;
}

// ================================================================
// Firestore profile doc (optional / safe)
// ================================================================
async function ensureUserDoc(user) {
  if (!user || !window.db) return;

  const userRef = doc(window.db, "users", user.uid);
  const snap = await getDoc(userRef);

  const displayName = user.displayName || (user.email ? user.email.split("@")[0] : "User");

  if (!snap.exists()) {
    await setDoc(userRef, {
      displayName,
      email: user.email || "",
      photoURL: user.photoURL || "",
      role: "cb",
      stats: { tasksCompleted: 0, totalEarnings: 0, pendingEarnings: 0, paidEarnings: 0 },
      activity: { lastLogin: serverTimestamp() },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } else {
    await setDoc(userRef, {
      displayName,
      email: user.email || "",
      photoURL: user.photoURL || "",
      activity: { lastLogin: serverTimestamp() },
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
}

// ================================================================
// Dashboard (Sheet-only stats) ✅
// ================================================================
async function refreshDashboardFromSheet() {
  try {
    const data = await callApi("getUserDashboardData"); // ✅ POST with idToken
    const stats = data.stats || {};

    const tasksEl = document.querySelector('[data-metric="tasks"]');
    const totalEl = document.querySelector('[data-metric="total-earnings"]');
    const pendingEl = document.querySelector('[data-metric="pending-earnings"]');

    if (tasksEl) tasksEl.textContent = stats.tasksCompleted || 0;
    if (totalEl) totalEl.textContent = `$${Number(stats.totalEarnings || 0).toFixed(2)}`;
    if (pendingEl) pendingEl.textContent = `$${Number(stats.pendingEarnings || 0).toFixed(2)}`;
  } catch (e) {
    console.warn("Dashboard fetch failed:", e);
  }
}


// ================================================================
// Earnings page (Sheet rows) ✅
// ================================================================
window.openEarningsPage = async function () {
  const user = window.firebaseAuth?.currentUser;
  if (!user) return;

  const rowsEl = $("earnings-rows");
  const emptyEl = $("earnings-empty");
  if (!rowsEl) return;

  rowsEl.innerHTML = "";
  emptyEl?.classList.add("hidden");

  try {
    const data = await callApi("getUserEarnings", { limit: "50" });
    const rows = data.rows || [];

    if (!rows.length) {
      emptyEl?.classList.remove("hidden");
      return;
    }

    for (const r of rows) {
      const when = r.timestamp ? new Date(r.timestamp).toLocaleString() : "-";
      const tr = document.createElement("tr");
      tr.className = "border-b border-white/10";
      tr.innerHTML = `
        <td class="py-2 px-2 text-white/70 text-xs">${user.uid}</td>
        <td class="py-2 px-2 text-white text-sm font-medium">${r.taskId || "-"}</td>
        <td class="py-2 px-2 text-white/70 text-xs">${when}</td>
        <td class="py-2 px-2 text-white font-semibold">$${Number(r.earnings || 0).toFixed(2)}</td>
      `;
      rowsEl.appendChild(tr);
    }
  } catch (e) {
    console.error("Earnings fetch failed:", e);
    emptyEl?.classList.remove("hidden");
  }
};

// ================================================================
// Payout History (optional, Sheet rows)
// ================================================================

window.openPayoutHistoryPage = async function () {
  const user = window.firebaseAuth?.currentUser;
  if (!user) return;

  const rowsEl = $("payout-rows");
  const emptyEl = $("payout-empty");
  if (!rowsEl) return;

  rowsEl.innerHTML = "";
  emptyEl?.classList.add("hidden");

  try {
    const data = await callApi("getUserPayouts", { limit: "50" });
    const rows = data.rows || [];

    if (!rows.length) {
      emptyEl?.classList.remove("hidden");
      return;
    }

    for (const r of rows) {
      const paidAt =
        r.paidAtISO ? new Date(r.paidAtISO).toLocaleString() :
        (r.paidAtDisplay || "-");

      const tr = document.createElement("tr");
      tr.className = "border-b border-white/10";
      tr.innerHTML = `
        <td class="py-2 px-2 text-white/70 text-xs">${user.uid}</td>
        <td class="py-2 px-2 text-white text-sm font-medium">${r.weekKey || "-"}</td>
        <td class="py-2 px-2 text-white/70 text-xs">${paidAt}</td>
        <td class="py-2 px-2 text-white font-semibold">$${Number(r.amountPaid || 0).toFixed(2)}</td>
        <td class="py-2 px-2 text-white/60 text-xs">${r.paidBy || "-"}</td>
      `;
      rowsEl.appendChild(tr);
    }
  } catch (e) {
    console.error("Payouts fetch failed:", e);
    emptyEl?.classList.remove("hidden");
  }
};

// ================================================================
// TASK FLOW
// ================================================================
window.handleStartNextTask = async function () {
  const user = window.firebaseAuth?.currentUser;
  if (!user) return alert("Not logged in");
  await assignAndRenderTask();
};

async function assignAndRenderTask() {
  try {
    const json = await callApi("assignAudioTask");
    currentTask = json.task;
    if (!currentTask) throw new Error("No task returned");

    showWorkspace();
    renderTaskWorkspace(currentTask);
  } catch (e) {
    console.error("Assign task error:", e);
    alert(e.message || "No task available");
    forceShowDashboard();
  }
}

// ================================================================
// WORKSPACE RENDER
// ================================================================
function renderTaskWorkspace(task) {
  const instructionEl = $("task-instruction");
  const audioEl = $("task-audio");
  if (!instructionEl || !audioEl) return;

  setAllById("workspace-task-id", `Task ID: ${task.taskId}`);
  setAllById("task-timer", "Time: 00:00");

  instructionEl.textContent = task.instruction || "";

  audioEl.pause();
  audioEl.src = task.audioUrl || "";
  audioEl.load();

  audioChunks = [];
  taskStartTime = Date.now();
  startTaskTimer();
}

// ================================================================
// TIMER
// ================================================================
function startTaskTimer() {
  if (taskTimerInterval) clearInterval(taskTimerInterval);
  taskTimerInterval = setInterval(() => {
    if (!taskStartTime) return;
    const elapsed = Math.floor((Date.now() - taskStartTime) / 1000);
    const min = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const sec = String(elapsed % 60).padStart(2, "0");
    setAllById("task-timer", `Time: ${min}:${sec}`);
  }, 1000);
}
function stopTaskTimer() {
  if (taskTimerInterval) clearInterval(taskTimerInterval);
  taskTimerInterval = null;
}

// ================================================================
// RECORDING LOGIC (WITH INTEGRATED UI TIMER) ✅
// ================================================================
window.startRecording = async function () {
  try {
    audioChunks = [];
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    mediaRecorder = new MediaRecorder(micStream, { mimeType: "audio/webm" });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      micStream?.getTracks()?.forEach(t => t.stop());
      micStream = null;
    };

    mediaRecorder.start();

    // ✅ Start Live Countdown Timer UI
    recordingSeconds = 0;
    $("recording-status")?.classList.remove("hidden");
    setAllById("recording-timer", "00:00");
    
    recordingInterval = setInterval(() => {
      recordingSeconds++;
      const min = String(Math.floor(recordingSeconds / 60)).padStart(2, "0");
      const sec = String(recordingSeconds % 60).padStart(2, "0");
      setAllById("recording-timer", `${min}:${sec}`);
    }, 1000);

    $("start-recording-btn")?.classList.add("hidden");
    $("stop-recording-btn")?.classList.remove("hidden");
  } catch (e) {
    console.error(e);
    alert("Mic permission denied or not available.");
  }
};

window.stopRecording = function () {
  if (!mediaRecorder) return;
  if (mediaRecorder.state !== "inactive") mediaRecorder.stop();

  // ✅ Stop Live Timer UI
  clearInterval(recordingInterval);
  $("recording-status")?.classList.add("hidden");

  $("stop-recording-btn")?.classList.add("hidden");
  $("start-recording-btn")?.classList.remove("hidden");
};

// ================================================================
// EXIT WORKSPACE
// ================================================================
window.safeExitTaskWorkspace = function () {
  try {
    if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
  } catch {}

  micStream?.getTracks()?.forEach(t => t.stop());
  micStream = null;

  stopTaskTimer();
  clearInterval(recordingInterval);

  currentTask = null;
  audioChunks = [];
  taskStartTime = null;

  forceShowDashboard();
  refreshDashboardFromSheet();
};

// ================================================================
// SUBMIT + NEXT ✅
// ================================================================
window.submitAndLoadNextTask = async function () {
  if (!currentTask) return alert("No active task");

  const taskId = currentTask.taskId;
  const durationSec = Math.floor((Date.now() - taskStartTime) / 1000);

  if (!audioChunks || audioChunks.length === 0) {
    return alert("No recording found. Please record before submitting.");
  }

  const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
  const audioBase64 = await blobToBase64(audioBlob);

  try {
    const json = await callApi("submitAudioTask", {
      taskId,
      durationSec: String(durationSec),
      mimeType: "audio/webm",
      audioBase64
    });

    const earned = Number(json.result?.earnings || 0).toFixed(2);
    alert(`✅ Submitted!\nEarned: $${earned}`);

    stopTaskTimer();
    audioChunks = [];
    currentTask = null;
    taskStartTime = null;

    await refreshDashboardFromSheet();
    await assignAndRenderTask();
  } catch (e) {
    console.error("Submit error:", e);
    alert(e.message || "Submit failed");
  }
};

// ================================================================
// Helpers
// ================================================================
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ================================================================
// AUTH BOOTSTRAP
// ================================================================
(function initAuth() {
  const wait = setInterval(() => {
    if (!window.firebaseAuth) return;

    clearInterval(wait);

    onAuthStateChanged(window.firebaseAuth, async (user) => {
      if (!user) return;

      if (window.db) {
        try { await ensureUserDoc(user); } catch (e) { console.warn("ensureUserDoc failed:", e); }
      }

      await refreshDashboardFromSheet(); 
    });
  }, 50);
})();
