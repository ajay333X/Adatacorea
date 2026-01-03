// ================================================================
// AUDIO PLUS ENGINE - Fixed Waveform & Preview
// ================================================================

let audioCtx, analyser, dataArray, animationId;
let previewUrl = null;

// 1. UI Injection Logic (बिना HTML बदले फीचर्स जोड़ना)
function injectAudioUI() {
    // वर्कस्पेस के अंदर सही जगह ढूंढना
    const targetArea = document.querySelector('#task-workspace-view .lg\\:col-span-3');
    if (!targetArea || document.getElementById('enhanced-audio-ui')) return;

    const container = document.createElement('div');
    container.id = 'enhanced-audio-ui';
    container.className = 'mt-6 space-y-6';

    container.innerHTML = `
        <div id="rec-ui" class="hidden rounded-2xl border-2 border-red-500 bg-red-500/10 p-6 flex flex-col items-center shadow-[0_0_15px_rgba(239,68,68,0.2)]">
            <div class="flex items-center gap-3 mb-4">
                <span class="w-3 h-3 bg-red-600 rounded-full animate-ping"></span>
                <span id="live-timer-display" class="text-5xl font-mono font-black text-white tracking-tighter">00:00</span>
            </div>
            <canvas id="waveform-canvas" class="w-full h-32 rounded-xl bg-black/40"></canvas>
            <p class="text-red-400 text-[10px] mt-4 font-bold uppercase tracking-widest animate-pulse">Recording Live Voice...</p>
        </div>

        <div id="preview-ui" class="hidden rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 p-6 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <div class="flex items-center justify-between mb-4">
                <span class="text-emerald-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <span class="w-2 h-2 bg-emerald-500 rounded-full"></span> Recording Preview
                </span>
                <span class="text-white/20 text-[10px] italic">सबमिट करने से पहले सुन लें</span>
            </div>
            <audio id="enhanced-preview-audio" controls class="w-full h-12"></audio>
        </div>
    `;
    targetArea.appendChild(container);
}

// 2. Waveform Drawing Logic (Real-time)
function drawWaveform(stream) {
    if (!stream) return;

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    const canvas = document.getElementById('waveform-canvas');
    const ctx = canvas.getContext('2d');

    function render() {
        animationId = requestAnimationFrame(render);
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height;
            
            // सुन्दर लाल ग्रेडिएंट (Gradient)
            const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
            gradient.addColorStop(0, '#ef4444'); // Red 500
            gradient.addColorStop(1, '#f87171'); // Red 400

            ctx.fillStyle = gradient;
            ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
            x += barWidth;
        }
    }
    render();
}

// 3. ओरिजिनल functions को ओवरराइड करना
const originalStart = window.startRecording;
const originalStop = window.stopRecording;

window.startRecording = async function() {
    injectAudioUI(); // पक्का करें कि UI बना हुआ है
    document.getElementById('rec-ui').classList.remove('hidden');
    document.getElementById('preview-ui').classList.add('hidden');
    
    await originalStart(); // tasks.js का ओरिजिनल काम चालू करें

    // टाइमर सिंक करना (tasks.js के टाइमर से डेटा लेना)
    const syncInterval = setInterval(() => {
        const timeText = document.getElementById('task-timer')?.textContent || "00:00";
        const display = document.getElementById('live-timer-display');
        if (display) display.textContent = timeText.replace('Time: ', '');
        
        // अगर रिकॉर्डिंग रुक गई तो इंटरवल बंद करें
        if (document.getElementById('rec-ui').classList.contains('hidden')) clearInterval(syncInterval);
    }, 100);

    // Waveform शुरू करें (ग्लोबल micStream का उपयोग)
    if (window.micStream) drawWaveform(window.micStream);
};

window.stopRecording = function() {
    originalStop(); // tasks.js का ओरिजinal काम बंद करें
    
    document.getElementById('rec-ui').classList.add('hidden');
    cancelAnimationFrame(animationId);
    if (audioCtx) audioCtx.close();

    // प्रीव्यू प्लेयर सेट करना
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
    }, 300);
};

// पेज लोड होने पर UI इन्जेक्शन की तैयारी
document.addEventListener('click', (e) => {
    if (e.target.innerText && e.target.innerText.includes('Start Next Task')) {
        setTimeout(injectAudioUI, 600);
    }
}, true);
