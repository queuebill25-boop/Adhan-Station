const streamAudio = document.getElementById('streamAudio');
const playBtn = document.getElementById('playBtn');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const volumeSlider = document.getElementById('volumeSlider');
const countdownEl = document.getElementById('countdown');

const STREAM_URL = '/radio'; 
const CITY = 'London';
const COUNTRY = 'UK';

let isPlaying = false;
let autoRetryInterval;

// Autoplay Attempt on Load
window.addEventListener('load', () => {
    attemptAutoplay();
});

function attemptAutoplay() {
    streamAudio.src = STREAM_URL;
    streamAudio.play().then(() => {
        setUIState(true);
    }).catch(() => {
        console.log("Autoplay blocked by browser. Waiting for user interaction.");
        setUIState(false);
    });
}

function setUIState(playing) {
    isPlaying = playing;
    playIcon.style.display = playing ? 'none' : 'block';
    pauseIcon.style.display = playing ? 'block' : 'none';
}

function togglePlay() {
    if (isPlaying) {
        stopStream();
    } else {
        startStream();
    }
}

function startStream() {
    streamAudio.src = STREAM_URL;
    streamAudio.load();
    streamAudio.play().then(() => {
        setUIState(true);
    }).catch(err => {
        console.error("Manual playback failed:", err);
    });
}

function stopStream() {
    streamAudio.pause();
    streamAudio.src = ''; 
    setUIState(false);
}

// THE RESURRECTION LOOP: Auto-Reconnect if stream dies
streamAudio.addEventListener('ended', handleStreamEnd);
streamAudio.addEventListener('error', handleStreamEnd);

function handleStreamEnd() {
    if (!isPlaying) return; // Don't retry if user manually paused
    
    console.log("Stream lost. Entering resurrection loop...");
    setUIState(false);
    document.getElementById('liveBadge').textContent = 'RECONNECTING...';

    if (autoRetryInterval) clearInterval(autoRetryInterval);
    
    autoRetryInterval = setInterval(async () => {
        try {
            const res = await fetch(STREAM_URL, { method: 'HEAD' });
            if (res.ok) {
                console.log("Stream is back! Resuming...");
                clearInterval(autoRetryInterval);
                startStream();
            }
        } catch (e) {
            console.log("Stream still offline...");
        }
    }, 5000); // Check every 5 seconds
}

playBtn.addEventListener('click', togglePlay);

// ... rest of your Prayer / Live Status logic ...
