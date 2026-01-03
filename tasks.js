// ================================================================
// tasks.js (SHEET-ONLY SOURCE OF TRUTH) ✅
// ================================================================

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxWohvXhaVcCHACcEXAMgOcG0Kus85DgXbIRD5VTVUygEWa8TnUhfAKARNFB_qnBhIn/exec";

// -------------------- State --------------------
let currentTask = null;
let mediaRecorder = null;
let audioChunks = [];
let taskStartTime = null;
let taskTimerInterval = null;
let micStream = null;

// ✅ Recording Timer State
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
// API: call Apps Script securely
// ================================================================
async function callApi(action, extra = {}) {
  const user = window.firebaseAuth?.currentUser;
  if (!user) throw new Error("Not signed in");
  const idToken = await user.getIdToken();
  const body = new URLSearchParams({ action, idToken, ...extra });
  const res = await fetch(APPS_SCRIPT_URL, { method: "POST", body });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch {
    throw new Error("Apps Script returned non-JSON.");
  }
  if (!json.ok) throw new Error(json.error || "Request failed");
  return json;
}

// ================================================================
// Dashboard Stats
// ================================================================
async function refreshDashboardFromSheet() {
  try {
    const data = await callApi("getUserDashboardData");
    const stats = data.stats || {};
    if ($('[data-metric="tasks"]')) $('[data-metric="tasks"]').textContent = stats.tasksCompleted || 0;
    if ($('[data-metric="total-earnings"]')) $('[data-metric="total-earnings"]').textContent = `$${Number(stats.totalEarnings || 0).toFixed(2)}`;
    if ($('[data-metric="pending-earnings"]')) $('[data-metric="pending-earnings"]').textContent = `$${Number(stats.pendingEarnings || 0).toFixed(2)}`;
  } catch (e) { console.warn("Dashboard fetch failed:", e); }
}

// ================================================================
// RECORDING LOGIC (WITH TIMER) ✅
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

    // ✅ Start Live Recording Timer
    recordingSeconds = 0;
    setAllById("recording-timer", "00:00");
    $("recording-status")?.classList.remove("hidden");
    
    recordingInterval = setInterval(() => {
      recordingSeconds++;
      const min = String(Math.floor(recordingSeconds / 60)).padStart(2, "0");
      const sec = String(recordingSeconds % 60).padStart(2, "0");
      setAllById("recording-timer", `${min}:${sec}`);
    }, 1000);

    $("start-recording-btn")?.classList.add("hidden");
    $("stop-recording-btn")?.classList.remove("hidden");
  } catch (e) {
    alert("Mic permission denied.");
  }
};

window.stopRecording = function () {
  if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();

  // ✅ Stop Live Timer
  clearInterval(recordingInterval);
  $("recording-status")?.classList.add("hidden");

  $("stop-recording-btn")?.classList.add("hidden");
  $("start-recording-btn")?.classList.remove("hidden");
};

// ================================================================
// TASK & SUBMIT
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
    if (!currentTask) throw new Error("No task available");
    showWorkspace();
    renderTaskWorkspace(currentTask);
  } catch (e) {
    alert(e.message);
    forceShowDashboard();
  }
}

function renderTaskWorkspace(task) {
  setAllById("workspace-task-id", `Task ID: ${task.taskId}`);
  setAllById("task-timer", "Time: 00:00");
  if ($("task-instruction")) $("task-instruction").textContent = task.instruction || "";
  if ($("task-audio")) $("task-audio").src = task.audioUrl || "";

  audioChunks = [];
  taskStartTime = Date.now();
  startTaskTimer();
}

function startTaskTimer() {
  if (taskTimerInterval) clearInterval(taskTimerInterval);
  taskTimerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - taskStartTime) / 1000);
    const min = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const sec = String(elapsed % 60).padStart(2, "0");
    setAllById("task-timer", `Time: ${min}:${sec}`);
  }, 1000);
}

window.safeExitTaskWorkspace = function () {
  stopRecording();
  clearInterval(taskTimerInterval);
  forceShowDashboard();
  refreshDashboardFromSheet();
};

window.submitAndLoadNextTask = async function () {
  if (!currentTask || audioChunks.length === 0) return alert("Please record audio first");

  const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
  const reader = new FileReader();
  reader.readAsDataURL(audioBlob);
  reader.onloadend = async () => {
    const audioBase64 = reader.result.split(",")[1];
    try {
      const json = await callApi("submitAudioTask", {
        taskId: currentTask.taskId,
        durationSec: String(Math.floor((Date.now() - taskStartTime) / 1000)),
        audioBase64
      });
      alert(`✅ Earned: $${Number(json.result?.earnings || 0).toFixed(2)}`);
      await refreshDashboardFromSheet();
      await assignAndRenderTask();
    } catch (e) { alert("Submit failed: " + e.message); }
  };
};

// Init
onAuthStateChanged(window.firebaseAuth, async (user) => {
  if (user) await refreshDashboardFromSheet();
});
