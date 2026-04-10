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

const splash = document.getElementById('splash-screen');
const enterBtn = document.getElementById('enter-btn');

// Global Activation on Splash Click
enterBtn.addEventListener('click', () => {
    splash.classList.add('hidden');
    startStream(); // Start the audio for the rest of the session!
});

function attemptAutoplay() {
    // We now rely on the 'Enter' button click to activate the audio context
}


function setUIState(playing) {
    isPlaying = playing;
    playIcon.style.display = playing ? 'none' : 'block';
    pauseIcon.style.display = playing ? 'block' : 'none';
    
    const badge = document.getElementById('liveBadge');
    if (!playing && badge.textContent !== 'RECONNECTING...') {
        badge.textContent = '○ OFFLINE';
    }
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
    if (!isPlaying) return;
    
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
    }, 5000);
}

// Low-Latency Buffer Jumper
setInterval(() => {
    if (isPlaying && streamAudio.buffered.length > 0) {
        const end = streamAudio.buffered.end(streamAudio.buffered.length - 1);
        const diff = end - streamAudio.currentTime;
        if (diff > 2) {
            streamAudio.currentTime = end - 0.5;
        }
    }
}, 2000);

playBtn.addEventListener('click', togglePlay);

// Real Prayer Times Integration
async function fetchPrayerTimes() {
  try {
    const res = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${CITY}&country=${COUNTRY}&method=2`);
    const data = await res.json();
    const timings = data.data.timings;
    setupCountdown(timings);
  } catch (err) {
    console.error('Prayer API Error:', err);
  }
}

function setupCountdown(timings) {
  const prayerList = [
    { name: 'Fajr', time: timings.Fajr },
    { name: 'Dhuhr', time: timings.Dhuhr },
    { name: 'Asr', time: timings.Asr },
    { name: 'Maghrib', time: timings.Maghrib },
    { name: 'Isha', time: timings.Isha }
  ];

  setInterval(() => {
    const now = new Date();
    let next = prayerList.find(p => {
      const [h, m] = p.time.split(':');
      const pDate = new Date();
      pDate.setHours(h, m, 0);
      return pDate > now;
    });

    if (!next) next = prayerList[0];

    const [h, m] = next.time.split(':');
    const nextDate = new Date();
    nextDate.setHours(h, m, 0);
    if (nextDate <= now) nextDate.setDate(nextDate.getDate() + 1);

    const diff = nextDate - now;
    const hh = Math.floor(diff / 3600000).toString().padStart(2, '0');
    const mm = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
    const ss = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');

    document.getElementById('nextPrayerName').innerText = next.name; 
    countdownEl.textContent = `${hh}:${mm}:${ss}`;
  }, 1000);
}

volumeSlider.addEventListener('input', (e) => {
  streamAudio.volume = e.target.value;
});

// Live Status Detection
async function checkLiveStatus() {
  try {
    const res = await fetch('/status-json.xsl');
    const data = await res.json();
    const isLive = data.icestats.source ? true : false;
    const badge = document.getElementById('liveBadge');
    if (badge && !badge.textContent.includes('RECONNECTING')) {
      badge.textContent = isLive ? '● ON AIR' : '○ OFFLINE';
      badge.style.color = isLive ? '#f87171' : '#94a3b8';
    }
  } catch (e) { /* Fallback */ }
}

setInterval(checkLiveStatus, 5000);
checkLiveStatus();

fetchPrayerTimes();
console.log("Adhan Player Final v4 Initialized");

