// ================================================================
// AUDIO PLUS ENGINE - Integrated with Global tasks.js (RESETS ON NEXT)
// ================================================================

let audioCtx, analyser, dataArray, animationId;
let previewUrl = null;

function setupEnhancedUI() {
    const placeholders = document.querySelectorAll('.lg\\:col-span-3 div, .lg\\:col-span-3 span');
    let target = null;
    placeholders.forEach(el => {
        if(el.innerText && el.innerText.includes('Waveform Preview')) {
            target = el.closest('.rounded-xl') || el.parentElement;
        }
    });

    if (!target || document.getElementById('enhanced-container')) return;

    const container = document.createElement('div');
    container.id = 'enhanced-container';
    container.className = 'space-y-4 w-full';
    container.innerHTML = `
        <div id="rec-box" class="hidden rounded-2xl border-2 border-red-500 bg-red-500/10 p-6 flex flex-col items-center shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <div class="flex items-center gap-4 mb-4">
                <div class="w-4 h-4 bg-red-600 rounded-full animate-ping shadow-[0_0_10px_red]"></div>
                <span id="big-timer-display" class="text-6xl font-mono font-black text-white tracking-tighter">00:00</span>
            </div>
            <canvas id="live-waveform-canvas" class="w-full h-32 bg-black/40 rounded-xl border border-white/5"></canvas>
            <p class="text-red-400 text-[10px] mt-4 font-bold uppercase tracking-widest">Mic Active - Capturing Voice</p>
        </div>

        <div id="preview-box" class="hidden rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/10 p-6 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            <div class="flex items-center justify-between mb-4">
                <span class="text-emerald-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <span class="w-2 h-2 bg-emerald-500 rounded-full"></span> Final Recording Preview
                </span>
                <span class="text-white/20 text-[10px] italic">Check Clarity</span>
            </div>
            <audio id="enhanced-player-preview" controls class="w-full h-12"></audio>
        </div>
    `;
    target.innerHTML = '';
    target.appendChild(container);
}

function startWaveformDrawing(stream) {
    if (!stream) return;
    if (audioCtx) audioCtx.close();
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    const canvas = document.getElementById('live-waveform-canvas');
    const ctx = canvas.getContext('2d');

    function animate() {
        animationId = requestAnimationFrame(animate);
        analyser.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / dataArray.length) * 2.5;
        let x = 0;
        for(let i = 0; i < dataArray.length; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height;
            const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
            gradient.addColorStop(0, '#ef4444');
            gradient.addColorStop(1, '#f87171');
            ctx.fillStyle = gradient;
            ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
            x += barWidth;
        }
    }
    animate();
}

const originalStart = window.startRecording;
const originalStop = window.stopRecording;

window.startRecording = async function() {
    setupEnhancedUI();
    const recBox = document.getElementById('rec-box');
    const previewBox = document.getElementById('preview-box');
    if(recBox) recBox.classList.remove('hidden');
    if(previewBox) previewBox.classList.add('hidden'); // नया शुरू होते ही पिछला प्रीव्यू छुपाएं
    
    await originalStart();

    const tSync = setInterval(() => {
        const sourceTime = document.getElementById('task-timer')?.textContent || "00:00";
        const display = document.getElementById('big-timer-display');
        if (display) display.textContent = sourceTime.replace('Time: ', '');
        if (!recBox || recBox.classList.contains('hidden')) clearInterval(tSync);
    }, 100);

    if (window.micStream) startWaveformDrawing(window.micStream);
};

window.stopRecording = function() {
    originalStop();
    const recBox = document.getElementById('rec-box');
    if(recBox) recBox.classList.add('hidden');
    cancelAnimationFrame(animationId);

    setTimeout(() => {
        if (window.audioChunks && window.audioChunks.length > 0) {
            const blob = new Blob(window.audioChunks, { type: 'audio/webm' });
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            previewUrl = URL.createObjectURL(blob);
            const player = document.getElementById('enhanced-player-preview');
            const previewBox = document.getElementById('preview-box');
            if (player && previewBox) {
                player.src = previewUrl;
                previewBox.classList.remove('hidden');
            }
        }
    }, 400);
};

// ✅ WATCH FOR NEW TASKS: जब Task ID बदले, UI रीसेट कर दें
const observer = new MutationObserver(() => {
    const previewBox = document.getElementById('preview-box');
    if (previewBox) previewBox.classList.add('hidden');
});

const targetId = document.getElementById('workspace-task-id');
if (targetId) observer.observe(targetId, { childList: true, characterData: true, subtree: true });

setInterval(setupEnhancedUI, 1000);
