const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusEl = document.getElementById('statusText');
const mosqueSelector = document.getElementById('mosqueSelector');

// Source Selection Elements
const sourceRadios = document.getElementsByName('audioSource');
const fileSelectorContainer = document.getElementById('fileSelectorContainer');
const audioFileInput = document.getElementById('audioFileInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const micInfo = document.getElementById('micInfo');

let pc, stream;
let fileAudio = null;
let fileAudioCtx = null;
let selectedFile = null;

// Handle Toggle
sourceRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'file') {
            fileSelectorContainer.style.display = 'block';
            micInfo.innerText = 'Select an audio file, then click the broadcast button below.';
        } else {
            fileSelectorContainer.style.display = 'none';
            micInfo.innerText = 'Click the microphone to start live broadcast from your Mac.';
        }
    });
});

// File Selection Trigger
selectFileBtn.addEventListener('click', () => audioFileInput.click());

audioFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        selectedFile = e.target.files[0];
        fileNameDisplay.innerText = `Selected: ${selectedFile.name}`;
    }
});

startBtn.addEventListener('click', async () => {
    try {
        const mosqueId = mosqueSelector.value;
        const isFileSource = Array.from(sourceRadios).find(r => r.checked).value === 'file';

        if (isFileSource) {
            if (!selectedFile) {
                alert("Please select an audio file first!");
                return;
            }
            statusEl.innerText = 'PREPARING FILE...';

            fileAudio = new Audio();
            fileAudio.src = URL.createObjectURL(selectedFile);

            fileAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const sourceNode = fileAudioCtx.createMediaElementSource(fileAudio);
            const destNode = fileAudioCtx.createMediaStreamDestination();

            sourceNode.connect(destNode);
            // Connect to destination so the broadcaster can monitor the audio
            sourceNode.connect(fileAudioCtx.destination);

            stream = destNode.stream;
        } else {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }

        statusEl.innerText = 'CONNECTING...';
        setupVisualizer(stream);

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

        // Play file if it's an audio file broadcast
        if (isFileSource && fileAudio && fileAudioCtx) {
            await fileAudioCtx.resume();
            fileAudio.play();
            // Automatically stop the broadcast when the audio file ends
            fileAudio.onended = () => {
                stopBtn.click();
            };
        }

        statusEl.innerText = 'ON AIR';
        statusEl.style.color = '#f87171';
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        mosqueSelector.disabled = true;

        // Disable toggles during active broadcast
        sourceRadios.forEach(r => r.disabled = true);
        selectFileBtn.disabled = true;

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                location.reload();
            }
        };

    } catch (err) {
        console.error('WebRTC WHIP Error:', err);
        statusEl.innerText = 'Mic/WebRTC Error';
    }
});

stopBtn.addEventListener('click', () => {
    if (fileAudio) {
        fileAudio.pause();
        fileAudio = null;
    }
    if (fileAudioCtx) {
        fileAudioCtx.close();
        fileAudioCtx = null;
    }
    if (pc) pc.close();
    if (stream) stream.getTracks().forEach(track => track.stop());
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
