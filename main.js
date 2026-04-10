const streamAudio = document.getElementById('streamAudio');
const playBtn = document.getElementById('playBtn');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const volumeSlider = document.getElementById('volumeSlider');
const countdownEl = document.getElementById('countdown');
const splash = document.getElementById('splash-screen');
const enterBtn = document.getElementById('enter-btn');
const stationsList = document.getElementById('stations-list');

let CURRENT_STATION = 'adhan_live'; 
const CITY = 'London';
const COUNTRY = 'UK';

let isPlaying = false;
let autoRetryInterval;

const stations = [
    { id: 'adhan_live', name: 'Central Mosque', location: 'London' },
    { id: 'west_mosque', name: 'West End Masjid', location: 'London' },
    { id: 'east_mosque', name: 'East London Hub', location: 'London' }
];

// Global Activation on Splash Click
enterBtn.addEventListener('click', () => {
    splash.classList.add('hidden');
    renderStations();
    startStream();
});

function renderStations() {
    stationsList.innerHTML = '';
    stations.forEach(s => {
        const card = document.createElement('div');
        card.className = `station-card ${s.id === CURRENT_STATION ? 'active' : ''}`;
        card.id = `card-${s.id}`;
        card.innerHTML = `
            <div class="station-name">${s.name}</div>
            <div class="station-status" id="status-${s.id}">CHECKING...</div>
        `;
        card.onclick = () => switchStation(s.id);
        stationsList.appendChild(card);
    });
}

function switchStation(id) {
    if (id === CURRENT_STATION) return;
    CURRENT_STATION = id;
    renderStations();
    startStream();
}

function startStream() {
    streamAudio.src = `/radio/${CURRENT_STATION}`;
    streamAudio.load();
    streamAudio.play().then(() => {
        setUIState(true);
    }).catch(err => {
        console.error("Playback failed:", err);
    });
}

function stopStream() {
    streamAudio.pause();
    streamAudio.src = ''; 
    setUIState(false);
}

function setUIState(playing) {
    isPlaying = playing;
    playIcon.style.display = playing ? 'none' : 'block';
    pauseIcon.style.display = playing ? 'block' : 'none';
}

// THE RESURRECTION LOOP: Auto-Reconnect if stream dies
streamAudio.addEventListener('ended', handleStreamEnd);
streamAudio.addEventListener('error', handleStreamEnd);

function handleStreamEnd() {
    if (!isPlaying) return;
    setUIState(false);
    document.getElementById('liveBadge').textContent = 'RECONNECTING...';

    if (autoRetryInterval) clearInterval(autoRetryInterval);
    autoRetryInterval = setInterval(async () => {
        try {
            const res = await fetch(`/radio/${CURRENT_STATION}`, { method: 'HEAD' });
            if (res.ok) {
                clearInterval(autoRetryInterval);
                startStream();
            }
        } catch (e) {}
    }, 5000);
}

// Multi-Channel Live Status Detection
async function checkAllStations() {
    try {
        const res = await fetch('/status-json.xsl');
        const data = await res.json();
        const sources = data.icestats.source || [];
        const liveMounts = Array.isArray(sources) ? sources.map(s => s.mount.replace('/', '')) : [sources.mount?.replace('/', '')];

        stations.forEach(s => {
            const statusEl = document.getElementById(`status-${s.id}`);
            const isLive = liveMounts.includes(s.id);
            if (statusEl) {
                statusEl.textContent = isLive ? '● ON AIR' : '○ OFFLINE';
                statusEl.className = `station-status ${isLive ? 'on-air' : ''}`;
            }
            if (s.id === CURRENT_STATION) {
                document.getElementById('liveBadge').textContent = isLive ? '● ON AIR' : '○ OFFLINE';
                document.getElementById('liveBadge').className = isLive ? 'on-air' : '';
            }
        });
    } catch (e) {}
}

setInterval(checkAllStations, 5000);
checkAllStations();

// Low-Latency Buffer Jumper
setInterval(() => {
    if (isPlaying && streamAudio.buffered.length > 0) {
        const end = streamAudio.buffered.end(streamAudio.buffered.length - 1);
        const diff = end - streamAudio.currentTime;
        if (diff > 2) streamAudio.currentTime = end - 0.5;
    }
}, 2000);

playBtn.addEventListener('click', togglePlay);

function togglePlay() {
    isPlaying ? stopStream() : startStream();
}

// Prayer Times Logic (Hardcoded for London for demo)
async function fetchPrayerTimes() {
  try {
    const res = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${CITY}&country=${COUNTRY}&method=2`);
    const data = await res.json();
    setupCountdown(data.data.timings);
  } catch (err) {}
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

fetchPrayerTimes();
renderStations();
