const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusEl = document.getElementById('statusText');

// Mic Selection Elements
const micSelectorContainer = document.getElementById('micSelectorContainer');
const micDeviceSelector = document.getElementById('micDeviceSelector');

let pc, stream;
let audioCtx = null;
let analyser = null;
let drawVisual = null;

// Populate Microphones list
async function populateMics() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter(d => d.kind === 'audioinput');
        
        micDeviceSelector.innerHTML = '';
        mics.forEach(mic => {
            const opt = document.createElement('option');
            opt.value = mic.deviceId;
            opt.textContent = mic.label || `Microphone ${micDeviceSelector.options.length + 1}`;
            micDeviceSelector.appendChild(opt);
        });

        if (mics.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'No microphones found';
            micDeviceSelector.appendChild(opt);
        }
    } catch (err) {
        console.error("Error enumerating devices:", err);
    }
}

// Request permission to unlock labels, then populate and autostart
async function requestPermissionsAndPopulateMics() {
    try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach(t => t.stop());
        await populateMics();
        
        // Autostart broadcasting
        startBtn.click();
    } catch (err) {
        console.warn("Permission denied or error getting devices:", err);
    }
}

startBtn.addEventListener('click', async () => {
    try {
        const mosqueId = 'kudroli_masjid';

        // Initialize a single shared AudioContext
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        await audioCtx.resume();

        // Live Microphone Mode: get selected input device and disable voice filtering
        const selectedMicId = micDeviceSelector.value;
        const micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                deviceId: selectedMicId ? { exact: selectedMicId } : undefined,
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        });
        stream = micStream;
        const sourceNode = audioCtx.createMediaStreamSource(stream);

        statusEl.innerText = 'CONNECTING...';
        setupVisualizer(sourceNode);

        // Initialize WebRTC PeerConnection
        pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        // Add the audio track to the peer connection
        stream.getTracks().forEach(track => {
            pc.addTransceiver(track, { direction: 'sendonly' });
        });

        // Create the WebRTC offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Wait for ICE candidate gathering to complete (Non-Trickle ICE)
        await new Promise((resolve) => {
            if (pc.iceGatheringState === 'complete') {
                resolve();
            } else {
                function checkState() {
                    if (pc.iceGatheringState === 'complete') {
                        pc.removeEventListener('icegatheringstatechange', checkState);
                        resolve();
                    }
                }
                pc.addEventListener('icegatheringstatechange', checkState);
            }
        });

        // Send the offer to the MediaMTX WHIP endpoint
        const response = await fetch(`/${mosqueId}/whip`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/sdp'
            },
            body: pc.localDescription.sdp
        });

        if (!response.ok) {
            throw new Error(`Server returned status ${response.status}`);
        }

        // Apply the server's WebRTC answer
        const answerSdp = await response.text();
        await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

        statusEl.innerText = 'ON AIR';
        statusEl.style.color = '#f87171';
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        micDeviceSelector.disabled = true;

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                location.reload();
            }
        };

    } catch (err) {
        console.error('WebRTC WHIP Error:', err);
        statusEl.innerText = 'Mic/WebRTC Error';
        stopBtn.click();
    }
});

stopBtn.addEventListener('click', () => {
    if (audioCtx) {
        audioCtx.close();
        audioCtx = null;
    }
    if (drawVisual) {
        cancelAnimationFrame(drawVisual);
        drawVisual = null;
    }
    analyser = null;
    if (pc) pc.close();
    if (stream) stream.getTracks().forEach(track => track.stop());
    location.reload();
});

function setupVisualizer(sourceNode) {
    const canvas = document.getElementById('visualizer');
    const ctx = canvas.getContext('2d');
    
    if (!analyser) {
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
    }
    sourceNode.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    function draw() {
        drawVisual = requestAnimationFrame(draw);
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

// Initial Mic list population
requestPermissionsAndPopulateMics();
