// ================================================================
// tasks.js (SYNCED TIMER WITH RECORDING) ✅
// ================================================================

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxWohvXhaVcCHACcEXAMgOcG0Kus85DgXbIRD5VTVUygEWa8TnUhfAKARNFB_qnBhIn/exec";

// 🌍 GLOBAL VARIABLES
window.currentTask = null;
window.mediaRecorder = null;
window.audioChunks = [];
window.taskStartTime = null;
window.micStream = null;
window.recordedDuration = 0; // रिकॉर्ड की गई सटीक सेकंड्स
let taskTimerInterval = null;

(function ensureWorkspaceOnBody() {
  const ws = document.getElementById("task-workspace-view");
  if (!ws) return;
  if (ws.parentElement !== document.body) document.body.appendChild(ws);
  ws.style.position = "fixed"; ws.style.inset = "0"; ws.style.zIndex = "2147483647";
})();

function $(id) { return document.getElementById(id); }
function setAllById(id, text) { document.querySelectorAll(`#${CSS.escape(id)}`).forEach(el => (el.textContent = text)); }
function hideAllViews() { document.querySelectorAll(".view").forEach(v => v.classList.add("hidden")); }
function showSidebar() { $("sidebar")?.classList.remove("hidden"); }
function hideSidebar() { $("sidebar")?.classList.add("hidden"); }

function showWorkspace() {
  const ws = $("task-workspace-view");
  if (!ws) return;
  hideAllViews(); hideSidebar();
  ws.classList.remove("hidden"); ws.style.display = "block";
  document.body.classList.add("overflow-hidden");
}

function forceShowDashboard() {
  hideAllViews(); $("dashboard-view")?.classList.remove("hidden");
  showSidebar();
  const ws = $("task-workspace-view");
  if (ws) { ws.classList.add("hidden"); ws.style.display = "none"; }
  document.body.classList.remove("overflow-hidden");
}

async function callApi(action, extra = {}) {
  const user = window.firebaseAuth?.currentUser;
  if (!user) throw new Error("Not signed in");
  const idToken = await user.getIdToken();
  const body = new URLSearchParams({ action, idToken, ...extra });
  const res = await fetch(APPS_SCRIPT_URL, { method: "POST", body });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Request failed");
  return json;
}

async function refreshDashboardFromSheet() {
  try {
    const data = await callApi("getUserDashboardData");
    const stats = data.stats || {};
    if ($('[data-metric="tasks"]')) $('[data-metric="tasks"]').textContent = stats.tasksCompleted || 0;
    if ($('[data-metric="total-earnings"]')) $('[data-metric="total-earnings"]').textContent = `$${Number(stats.totalEarnings || 0).toFixed(2)}`;
    if ($('[data-metric="pending-earnings"]')) $('[data-metric="pending-earnings"]').textContent = `$${Number(stats.pendingEarnings || 0).toFixed(2)}`;
  } catch (e) { console.warn(e); }
}

// ================================================================
// RECORDING START (TIMER STARTS HERE)
// ================================================================
window.startRecording = async function () {
  try {
    window.audioChunks = [];
    window.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    window.mediaRecorder = new MediaRecorder(window.micStream, { mimeType: "audio/webm" });
    
    window.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) window.audioChunks.push(e.data); };
    window.mediaRecorder.onstop = () => {
      window.micStream?.getTracks()?.forEach(t => t.stop());
    };

    window.mediaRecorder.start();

    // ✅ टाइमर अब यहाँ से शुरू होगा
    window.taskStartTime = Date.now();
    startTaskTimer();

    $("start-recording-btn")?.classList.add("hidden");
    $("stop-recording-btn")?.classList.remove("hidden");
  } catch (e) { alert("Mic error: " + e.message); }
};

// ================================================================
// RECORDING STOP (TIMER STOPS HERE)
// ================================================================
window.stopRecording = function () {
  if (window.mediaRecorder && window.mediaRecorder.state !== "inactive") {
      window.mediaRecorder.stop();
  }

  // ✅ टाइमर को इसी पल रोक दें
  if (taskTimerInterval) {
      clearInterval(taskTimerInterval);
      // फाइनल ड्यूरेशन सेव करें
      window.recordedDuration = Math.floor((Date.now() - window.taskStartTime) / 1000);
  }

  $("stop-recording-btn")?.classList.add("hidden");
  $("start-recording-btn")?.classList.remove("hidden");
};

window.handleStartNextTask = async function () {
  try {
    const json = await callApi("assignAudioTask");
    window.currentTask = json.task;
    showWorkspace();
    renderTaskWorkspace(window.currentTask);
  } catch (e) { alert(e.message); forceShowDashboard(); }
};

function renderTaskWorkspace(task) {
  setAllById("workspace-task-id", `Task ID: ${task.taskId}`);
  setAllById("task-timer", "Time: 00:00"); // सिर्फ रीसेट करें, स्टार्ट नहीं
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

function startTaskTimer() {
  taskTimerInterval = setInterval(() => {
    if (!window.taskStartTime) return;
    const elapsed = Math.floor((Date.now() - window.taskStartTime) / 1000);
    const min = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const sec = String(elapsed % 60).padStart(2, "0");
    setAllById("task-timer", `Time: ${min}:${sec}`);
  }, 1000);
}

window.safeExitTaskWorkspace = function () {
  window.stopRecording();
  if (taskTimerInterval) clearInterval(taskTimerInterval);
  forceShowDashboard();
  refreshDashboardFromSheet();
};

window.submitAndLoadNextTask = async function () {
  if (window.audioChunks.length === 0) return alert("Please record first");
  
  const audioBlob = new Blob(window.audioChunks, { type: "audio/webm" });
  const reader = new FileReader();
  reader.readAsDataURL(audioBlob);
  reader.onloadend = async () => {
    try {
      // ✅ पेमेंट के लिए सिर्फ रिकॉर्ड किया गया समय भेजें
      const audioBase64 = reader.result.split(",")[1];
      
      const json = await callApi("submitAudioTask", {
        taskId: window.currentTask.taskId,
        durationSec: String(window.recordedDuration),
        audioBase64: audioBase64
      });
      
      alert(`✅ Submitted! Duration: ${window.recordedDuration}s | Earned: $${Number(json.result?.earnings || 0).toFixed(2)}`);
      
      await refreshDashboardFromSheet();
      window.handleStartNextTask(); 

    } catch (e) { alert("Submit Error: " + e.message); }
  };
};

onAuthStateChanged(window.firebaseAuth, async (user) => {
  if (user) await refreshDashboardFromSheet();
});
