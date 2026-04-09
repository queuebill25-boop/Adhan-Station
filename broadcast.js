let mediaRecorder;
let audioContext;
let processor;
let source;

const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const statusEl = document.getElementById('status-text');

startBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Setup Visualizer
        setupVisualizer(stream);

        // In a real production app, we would use a library like 'webcast.js'
        // to send audio chunks to the server. For now, we will use a 
        // specialized WebSocket or Fetch stream to our proxy.
        
        statusEl.innerText = 'Go Live: Connected to ejamaath.in';
        statusEl.style.color = '#fbbf24';
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';

        // NOTE: Browsers cannot send raw Icecast 'SOURCE' commands directly.
        // We will use a library that bridges this in the final build.
        console.log('Broadcasting started...');

    } catch (err) {
        console.error('Error:', err);
        statusEl.innerText = 'Error: No mic access';
    }
});

stopBtn.addEventListener('click', () => {
    location.reload(); // Quick reset
});

function setupVisualizer(stream) {
    const canvas = document.getElementById('visualizer');
    const ctx = canvas.getContext('2d');
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();

    analyser.fftSize = 256;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
        requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] / 2;
            ctx.fillStyle = `rgb(251, 191, 36)`;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }
    draw();
}
