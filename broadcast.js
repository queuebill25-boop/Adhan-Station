const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusEl = document.getElementById('statusText');
const mosqueSelector = document.getElementById('mosqueSelector');

let audioContext;
let recorder;
let stream;
let socket;

startBtn.addEventListener('click', async () => {
    try {
        const mosqueId = mosqueSelector.value;
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        statusEl.innerText = 'CONNECTING...';
        
        setupVisualizer(stream);

        // Connect to bridge with the selected Mosque ID
        socket = new WebSocket(`wss://${window.location.host}/bridge?mosque=${mosqueId}`);
        
        socket.onopen = () => {
            statusEl.innerText = 'ON AIR';
            statusEl.style.color = '#f87171';
            startBtn.style.display = 'none';
            stopBtn.style.display = 'inline-block';
            mosqueSelector.disabled = true;

            recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0 && socket.readyState === WebSocket.OPEN) {
                    socket.send(e.data);
                }
            };
            recorder.start(200); // 200ms chunks for stability
        };

        socket.onclose = () => {
            location.reload();
        };

    } catch (err) {
        console.error('Mic Error:', err);
        statusEl.innerText = 'Mic Error';
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
        const barWidth = (canvas.width / dataArray.length) * 2.5;
        let x = 0;
        dataArray.forEach(val => {
            const h = val / 2.5;
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(x, canvas.height - h, barWidth, h);
            x += barWidth + 2;
        });
    }
    draw();
}
