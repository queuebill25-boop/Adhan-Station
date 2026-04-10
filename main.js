const streamAudio = document.getElementById('streamAudio');
const playBtn = document.getElementById('playBtn');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const volumeSlider = document.getElementById('volumeSlider');
const countdownEl = document.getElementById('countdown');

// Config: Point this to your actual Icecast stream URL
const STREAM_URL = '/radio'; 
const CITY = 'London'; // Change this to your city
const COUNTRY = 'UK';

let isPlaying = false;

function togglePlay() {
  if (isPlaying) {
    streamAudio.pause();
    streamAudio.src = ''; 
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
  } else {
    streamAudio.src = STREAM_URL;
    streamAudio.load();
    streamAudio.play().catch(err => {
      console.error("Playback failed:", err);
    });
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';
  }
  isPlaying = !isPlaying;
}

playBtn.addEventListener('click', togglePlay);

volumeSlider.addEventListener('input', (e) => {
  streamAudio.volume = e.target.value;
});

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

    document.getElementById('nextPrayerName').innerText = next.name; // Needs this ID in HTML
    countdownEl.textContent = `${hh}:${mm}:${ss}`;
  }, 1000);
}

// Live Status Detection
async function checkLiveStatus() {
  try {
    const res = await fetch('/status-json.xsl');
    const data = await res.json();
    const isLive = data.icestats.source ? true : false;
    const badge = document.getElementById('liveBadge');
    if (badge) {
      badge.textContent = isLive ? '● ON AIR' : '○ OFFLINE';
      badge.style.color = isLive ? '#f87171' : '#94a3b8';
    }
  } catch (e) { /* Fallback */ }
}

fetchPrayerTimes();
setInterval(checkLiveStatus, 10000);
checkLiveStatus();

console.log("Adhan Player Initialized with Real Timings");
