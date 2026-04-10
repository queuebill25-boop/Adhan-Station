const streamAudio = document.getElementById('streamAudio');
const playBtn = document.getElementById('playBtn');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const volumeSlider = document.getElementById('volumeSlider');
const countdownEl = document.getElementById('countdown');

// Audio Context for Volume Boost
let audioCtx;
let source;
let gainNode;

// Config
const STREAM_URL = '/radio'; 
const CITY = 'London'; // Change this as needed
const COUNTRY = 'UK';

let isPlaying = false;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    source = audioCtx.createMediaElementSource(streamAudio);
    gainNode = audioCtx.createGain();
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
  }
}

function togglePlay() {
  initAudio();
  if (isPlaying) {
    streamAudio.pause();
    streamAudio.src = ''; 
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
  } else {
    streamAudio.src = STREAM_URL;
    streamAudio.load();
    streamAudio.play().catch(err => console.error(err));
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }
  isPlaying = !isPlaying;
}

playBtn.addEventListener('click', togglePlay);

volumeSlider.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  if (gainNode) gainNode.gain.value = val; // Allows boosting up to 2.0 (200%)
});

// Stats & Prayer
async function updateStats() {
  try {
    const res = await fetch('/status-json.xsl');
    const data = await res.json();
    const stats = data.icestats.source;
    
    // Live Status
    const isLive = stats ? true : false;
    const badge = document.getElementById('liveBadge');
    badge.textContent = isLive ? '● ON AIR' : '○ OFFLINE';
    badge.style.color = isLive ? '#f87171' : '#94a3b8';

    // Listener Count
    const count = stats ? (stats.listeners || 0) : 0;
    document.getElementById('listenerCount').textContent = `${count} Listeners`;
  } catch (e) {
    console.warn("Stats fetch failed");
  }
}

async function fetchPrayerTimes() {
  try {
    const res = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${CITY}&country=${COUNTRY}&method=2`);
    const data = await res.json();
    const timings = data.data.timings;
    setupCountdown(timings);
  } catch (err) { /* fallback */ }
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
    }) || prayerList[0];

    const [h, m] = next.time.split(':');
    const nextDate = new Date();
    nextDate.setHours(h, m, 0);
    if (nextDate <= now) nextDate.setDate(nextDate.getDate() + 1);

    const diff = nextDate - now;
    const hh = Math.floor(diff / 3600000).toString().padStart(2, '0');
    const mm = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
    const ss = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');

    const nextP = document.getElementById('nextPrayerName');
    if (nextP) nextP.innerText = next.name;
    countdownEl.textContent = `${hh}:${mm}:${ss}`;
  }, 1000);
}

// Tick
fetchPrayerTimes();
setInterval(updateStats, 5000);
updateStats();

console.log("Premium Adhan Player Initialized with Volume Boost [v2.0]");
