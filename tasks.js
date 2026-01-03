// ================================================================
// tasks.js (ALL-IN-ONE FINAL VERSION) ✅
// Merged: Original Logic + Today's Pro Features
// ================================================================

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxWohvXhaVcCHACcEXAMgOcG0Kus85DgXbIRD5VTVUygEWa8TnUhfAKARNFB_qnBhIn/exec";

// 🌍 GLOBAL STATE (Accessible by audio-plus.js)
window.currentTask = null;
window.mediaRecorder = null;
window.audioChunks = [];
window.taskStartTime = null;
window.micStream = null;
window.recordedDuration = 0; // सटीक सेकंड्स पेमेंट के लिए

let taskTimerInterval = null;

// ✅ Overlay hard-fix (Ensure workspace stays on top)
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
// API: call Apps Script securely ✅
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
    throw new Error("Apps Script returned non-JSON. Deployment issue.");
  }

  if (!json.ok) throw new Error(json.error || "Request failed");
  return json;
}

// ================================================================
// Dashboard & Stats (Sheet-only stats) ✅
// ================================================================
async function refreshDashboardFromSheet() {
  try {
    const data = await callApi("getUserDashboardData");
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
// Earnings & Payout Logic ✅
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
    if (!rows.length) { emptyEl?.classList.remove("hidden"); return; }

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
  } catch (e) { console.error(e); }
};

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
    if (!rows.length) { emptyEl?.classList.remove("hidden"); return; }

    for (const r of rows) {
      const paidAt = r.paidAtISO ? new Date(r.paidAtISO).toLocaleString() : (r.paidAtDisplay || "-");
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
  } catch (e) { console.error(e); }
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
    window.currentTask = json.task;
    if (!window.currentTask) throw new Error("No task returned");

    showWorkspace();
    renderTaskWorkspace(window.currentTask);
  } catch (e) {
    alert(e.message || "No task available");
    forceShowDashboard();
  }
}

function renderTaskWorkspace(task) {
  setAllById("workspace-task-id", `Task ID: ${task.taskId}`);
  setAllById("task-timer", "Time: 00:00");
  
  if ($("task-instruction")) $("task-instruction").textContent = task.instruction || "";
  if ($("task-audio")) {
      $("task-audio").pause();
      $("task-audio").src = task.audioUrl || "";
      $("task-audio").load();
  }

  window.audioChunks = [];
  window.recordedDuration = 0;
  if (taskTimerInterval) clearInterval(taskTimerInterval);
}

// ================================================================
// RECORDING & TIMER (PAYMENT SYNCED) ✅
// ================================================================
window.startRecording = async function () {
  try {
    window.audioChunks = [];
    window.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    window.mediaRecorder = new MediaRecorder(window.micStream, { mimeType: "audio/webm" });

    window.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) window.audioChunks.push(e.data);
    };

    window.mediaRecorder.onstop = () => {
      window.micStream?.getTracks()?.forEach(t => t.stop());
    };

    window.mediaRecorder.start();

    // ✅ टाइमर यहाँ से शुरू होता है (सटीक पेमेंट के लिए)
    window.taskStartTime = Date.now();
    startTaskTimer();

    $("start-recording-btn")?.classList.add("hidden");
    $("stop-recording-btn")?.classList.remove("hidden");
  } catch (e) {
    alert("Mic permission denied.");
  }
};

window.stopRecording = function () {
  if (window.mediaRecorder && window.mediaRecorder.state !== "inactive") {
      window.mediaRecorder.stop();
  }

  // ✅ टाइमर को यहाँ रोकें और रिकॉर्डेड टाइम सेव करें
  if (taskTimerInterval) {
      clearInterval(taskTimerInterval);
      window.recordedDuration = Math.floor((Date.now() - window.taskStartTime) / 1000);
  }

  $("stop-recording-btn")?.classList.add("hidden");
  $("start-recording-btn")?.classList.remove("hidden");
};

function startTaskTimer() {
  taskTimerInterval = setInterval(() => {
    if (!window.taskStartTime) return;
    const elapsed = Math.floor((Date.now() - window.taskStartTime) / 1000);
    const min = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const sec = String(elapsed % 60).padStart(2, "0");
    setAllById("task-timer", `Time: ${min}:${sec}`);
  }, 1000);
}

// ================================================================
// EXIT & SUBMIT
// ================================================================
window.safeExitTaskWorkspace = function () {
  window.stopRecording();
  if (taskTimerInterval) clearInterval(taskTimerInterval);
  forceShowDashboard();
  refreshDashboardFromSheet();
};

window.submitAndLoadNextTask = async function () {
  if (!window.currentTask) return alert("No active task");
  if (window.audioChunks.length === 0) return alert("Please record before submitting.");

  const audioBlob = new Blob(window.audioChunks, { type: "audio/webm" });
  const reader = new FileReader();
  reader.readAsDataURL(audioBlob);
  reader.onloadend = async () => {
    try {
      const audioBase64 = reader.result.split(",")[1];
      const json = await callApi("submitAudioTask", {
        taskId: window.currentTask.taskId,
        durationSec: String(window.recordedDuration), // ✅ सटीक रिकॉर्डेड टाइम भेजें
        audioBase64: audioBase64
      });

      alert(`✅ Submitted! Duration: ${window.recordedDuration}s | Earned: $${Number(json.result?.earnings || 0).toFixed(2)}`);
      
      await refreshDashboardFromSheet();
      window.handleStartNextTask(); // लोड नेक्स्ट टास्क

    } catch (e) { alert("Submit Error: " + e.message); }
  };
};

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(",")[1] || "");
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
      await refreshDashboardFromSheet();
    });
  }, 50);
})();
