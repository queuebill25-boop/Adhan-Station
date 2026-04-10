const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusEl = document.getElementById('statusText');

let audioContext;
let recorder;
let stream;

startBtn.addEventListener('click', async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        statusEl.innerText = 'Go Live: CONNECTING...';
        
        // Start visualizer
        setupVisualizer(stream);

        // We use a simple WebSocket to send audio blobs to the bridge
        const socket = new WebSocket(`wss://${window.location.host}/bridge`);
        
        socket.onopen = () => {
            statusEl.innerText = 'ON AIR';
            statusEl.style.color = '#f87171';
            startBtn.style.display = 'none';
            stopBtn.style.display = 'inline-block';

            // High-quality Opus/WebM encoding for the bridge
            recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) socket.send(e.data);
            };
            recorder.start(100); // Send chunks every 100ms
        };

        socket.onerror = (err) => {
            console.error('Socket error:', err);
            statusEl.innerText = 'Connection Error';
        };

    } catch (err) {
        console.error('Mic Error:', err);
        statusEl.innerText = 'Mic Access Denied';
    }
});

stopBtn.addEventListener('click', () => {
    location.reload();
});

function setupVisualizer(stream) {
    const canvas = document.getElementById('visualizer');
    const ctx = canvas.getContext('2d');
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    function draw() {
        requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / dataArray.length) * 2;
        let x = 0;
        dataArray.forEach(val => {
            const h = val / 2;
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(x, canvas.height - h, barWidth, h);
            x += barWidth + 1;
        });
    }
    draw();
}
