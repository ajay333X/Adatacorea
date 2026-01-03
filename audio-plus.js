// ================================================================
// AUDIO PLUS ENGINE - Dynamic Injection Logic
// ================================================================

let audioCtx, analyser, dataArray, animationId;
let previewUrl = null;

// UI को वर्कस्पेस में इंजेक्ट करना (बिना HTML बदले)
function injectAudioUI() {
    const targetArea = document.querySelector('#task-workspace-view .lg\\:col-span-3');
    if (!targetArea || document.getElementById('enhanced-audio-ui')) return;

    const container = document.createElement('div');
    container.id = 'enhanced-audio-ui';
    container.className = 'mt-6 space-y-6';

    container.innerHTML = `
        <div id="rec-ui" class="hidden rounded-2xl border-2 border-red-500 bg-red-500/5 p-6 flex flex-col items-center">
            <div class="flex items-center gap-3 mb-4">
                <span class="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_12px_red]"></span>
                <span id="live-timer-display" class="text-4xl font-mono font-black text-white">00:00</span>
            </div>
            <canvas id="waveform" class="w-full h-24 bg-black/20 rounded-lg"></canvas>
        </div>

        <div id="preview-ui" class="hidden rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
            <p class="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3 text-center">Review Your Quality</p>
            <audio id="enhanced-preview-audio" controls class="w-full h-10"></audio>
            <p class="text-white/40 text-[10px] mt-2 italic text-center">सुन लें कि आपकी आवाज़ साफ़ है या नहीं।</p>
        </div>
    `;
    targetArea.appendChild(container);
}

// Waveform बनाने का लॉजिक
function startWaveform(stream) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    const canvas = document.getElementById('waveform');
    const canvasCtx = canvas.getContext('2d');

    function draw() {
        animationId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;
        for(let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] / 2;
            canvasCtx.fillStyle = `rgb(239, 68, 68)`; 
            canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }
    draw();
}

// ओरिजिनल functions को पकड़ना
const originalStart = window.startRecording;
const originalStop = window.stopRecording;

window.startRecording = async function() {
    injectAudioUI(); 
    document.getElementById('rec-ui').classList.remove('hidden');
    document.getElementById('preview-ui').classList.add('hidden');
    
    await originalStart(); // tasks.js का काम शुरू करें

    // टाइमर को सिंक करना
    const timerInterval = setInterval(() => {
        const t = document.getElementById('task-timer')?.textContent || "00:00";
        const cleanTime = t.replace('Time: ', '');
        const display = document.getElementById('live-timer-display');
        if (display) display.textContent = cleanTime;
        if (document.getElementById('rec-ui').classList.contains('hidden')) clearInterval(timerInterval);
    }, 100);

    if (window.micStream) startWaveform(window.micStream);
};

window.stopRecording = function() {
    originalStop(); 
    document.getElementById('rec-ui').classList.add('hidden');
    cancelAnimationFrame(animationId);
    if(audioCtx) audioCtx.close();

    // प्रीव्यू दिखाना
    setTimeout(() => {
        if (window.audioChunks && window.audioChunks.length > 0) {
            const blob = new Blob(window.audioChunks, { type: 'audio/webm' });
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            previewUrl = URL.createObjectURL(blob);
            const player = document.getElementById('enhanced-preview-audio');
            if (player) {
                player.src = previewUrl;
                document.getElementById('preview-ui').classList.remove('hidden');
            }
        }
    }, 200);
};
