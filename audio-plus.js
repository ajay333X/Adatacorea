// ================================================================
// AUDIO PLUS ENGINE - Bulletproof Injection ✅
// ================================================================

let audioCtx, analyser, dataArray, animationId, previewUrl;

function setupEnhancedUI() {
    // 1. पुराने placeholder को ढूंढें (जहाँ Waveform Preview लिखा है)
    const placeholders = document.querySelectorAll('.lg\\:col-span-3 div');
    let target = null;
    placeholders.forEach(el => { if(el.innerText && el.innerText.includes('Waveform Preview')) target = el; });

    if (!target || document.getElementById('enhanced-container')) return;

    // 2. नया कंटेनर बनाएं
    const container = document.createElement('div');
    container.id = 'enhanced-container';
    container.className = 'mt-6 space-y-4';
    container.innerHTML = `
        <div id="rec-box" class="hidden rounded-2xl border-2 border-red-500 bg-red-500/10 p-6 flex flex-col items-center">
            <div class="flex items-center gap-4 mb-4">
                <div class="w-4 h-4 bg-red-600 rounded-full animate-pulse shadow-[0_0_15px_red]"></div>
                <span id="big-timer" class="text-6xl font-mono font-black text-white tracking-tighter">00:00</span>
            </div>
            <canvas id="live-waveform" class="w-full h-32 bg-black/40 rounded-xl"></canvas>
        </div>
        <div id="preview-box" class="hidden rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/10 p-6">
            <p class="text-emerald-400 text-xs font-bold uppercase mb-3">Recording Ready - Listen Below</p>
            <audio id="player-preview" controls class="w-full h-12"></audio>
        </div>
    `;
    
    // पुराने placeholder की जगह इसे डालें
    target.replaceWith(container);
}

function startWave(stream) {
    if (!stream) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    const canvas = document.getElementById('live-waveform');
    const ctx = canvas.getContext('2d');

    function loop() {
        animationId = requestAnimationFrame(loop);
        analyser.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / dataArray.length) * 2.5;
        let x = 0;
        for(let i = 0; i < dataArray.length; i++) {
            const h = (dataArray[i] / 255) * canvas.height;
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(x, canvas.height - h, barWidth - 1, h);
            x += barWidth;
        }
    }
    loop();
}

// Override logic
const originalStart = window.startRecording;
const originalStop = window.stopRecording;

window.startRecording = async function() {
    setupEnhancedUI();
    document.getElementById('rec-box').classList.remove('hidden');
    document.getElementById('preview-box').classList.add('hidden');
    await originalStart();
    
    // Sync Timer
    const tInterval = setInterval(() => {
        const source = document.getElementById('task-timer')?.innerText || "00:00";
        document.getElementById('big-timer').innerText = source.replace('Time: ', '');
        if(document.getElementById('rec-box').classList.contains('hidden')) clearInterval(tInterval);
    }, 100);

    if (window.micStream) startWave(window.micStream);
};

window.stopRecording = function() {
    originalStop();
    document.getElementById('rec-box').classList.add('hidden');
    cancelAnimationFrame(animationId);
    if(audioCtx) audioCtx.close();
    
    setTimeout(() => {
        if (window.audioChunks && window.audioChunks.length > 0) {
            const blob = new Blob(window.audioChunks, { type: 'audio/webm' });
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            previewUrl = URL.createObjectURL(blob);
            document.getElementById('player-preview').src = previewUrl;
            document.getElementById('preview-box').classList.remove('hidden');
        }
    }, 400);
};

// Auto-inject when workspace opens
setInterval(setupEnhancedUI, 1000);
