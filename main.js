const streamAudio = document.getElementById('streamAudio');
const playBtn = document.getElementById('playBtn');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const volumeSlider = document.getElementById('volumeSlider');
const splash = document.getElementById('splash-screen');
const enterBtn = document.getElementById('enter-btn');
const mainSelector = document.getElementById('main-mosque-selector');
const splashSelector = document.getElementById('splash-mosque-selector');
const liveBadge = document.getElementById('liveBadge');

let CURRENT_STATION = 'zeenath_baksh'; 

const stations = [
    { id: 'zeenath_baksh', name: 'Zeenath Baksh Masjid' },
    { id: 'kudroli_masjid', name: 'Kudroli Jumma Masjid' },
    { id: 'ullal_dargah', name: 'Ullal Sayyid Madani' },
    { id: 'idgah_hill', name: 'Idgah Maidan Masjid' },
    { id: 'kankanady_masjid', name: 'Kankanady Masjid' }
];

function init() {
    [splashSelector, mainSelector].forEach(populateDropdown);
    syncSelectors();
    checkAllStations();
}

function populateDropdown(selector) {
    if (!selector) return;
    selector.innerHTML = '';
    stations.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        selector.appendChild(opt);
    });
}

function syncSelectors() {
    if (splashSelector) splashSelector.value = CURRENT_STATION;
    if (mainSelector) mainSelector.value = CURRENT_STATION;
}

enterBtn.addEventListener('click', () => {
    CURRENT_STATION = splashSelector.value;
    splash.style.opacity = '0';
    setTimeout(() => splash.style.display = 'none', 800);
    syncSelectors();
    startStream();
});

mainSelector.addEventListener('change', (e) => {
    CURRENT_STATION = e.target.value;
    if (splashSelector) splashSelector.value = CURRENT_STATION;
    startStream();
});

let pc = null;

async function startStream() {
    liveBadge.textContent = 'CONNECTING...';
    playBtn.classList.add('loading');
    
    if (pc) {
        pc.close();
        pc = null;
    }
    streamAudio.srcObject = null;

    try {
        pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        pc.ontrack = (event) => {
            streamAudio.srcObject = event.streams[0];
            streamAudio.play().then(() => {
                setUIState(true);
                playBtn.classList.remove('loading');
            }).catch(err => {
                console.error("Audio playback error:", err);
                playBtn.classList.remove('loading');
            });
        };

        pc.onconnectionstatechange = () => {
            if (pc && (pc.connectionState === 'failed' || pc.connectionState === 'closed')) {
                stopStream();
            }
        };

        // Add audio transceiver for listening
        pc.addTransceiver('audio', { direction: 'recvonly' });

        // Create the offer SDP
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

        // POST the offer to the WHEP endpoint
        const response = await fetch(`/${CURRENT_STATION}/whep`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/sdp'
            },
            body: pc.localDescription.sdp
        });

        if (!response.ok) {
            throw new Error(`WHEP server returned status ${response.status}`);
        }

        const answerSdp = await response.text();
        await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

    } catch (err) {
        console.error('WebRTC WHEP Error:', err);
        playBtn.classList.remove('loading');
        stopStream();
    }
}

function stopStream() {
    if (pc) {
        pc.close();
        pc = null;
    }
    streamAudio.srcObject = null;
    setUIState(false);
}

function setUIState(playing) {
    playIcon.style.display = playing ? 'none' : 'block';
    pauseIcon.style.display = playing ? 'block' : 'none';
}

// SMARTER LIVE DETECTION
async function checkAllStations() {
    try {
        const res = await fetch('/api/paths');
        const data = await res.json();
        
        let liveMounts = [];
        if (data.items) {
            for (const key in data.items) {
                if (data.items[key].sourceReady) {
                    liveMounts.push(key);
                }
            }
        }

        const currentIsLive = liveMounts.includes(CURRENT_STATION);
        liveBadge.textContent = currentIsLive ? '● ON AIR' : '○ OFFLINE';
        liveBadge.className = `status-badge ${currentIsLive ? 'on-air' : ''}`;
        
    } catch (e) {
        // Silently fail to avoid UI jitter
    }
}

setInterval(checkAllStations, 3000);

playBtn.addEventListener('click', () => {
    streamAudio.srcObject ? stopStream() : startStream();
});

volumeSlider.addEventListener('input', (e) => {
    streamAudio.volume = e.target.value;
});

init();
