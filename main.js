const streamAudio = document.getElementById('streamAudio');
const playBtn = document.getElementById('playBtn');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const volumeSlider = document.getElementById('volumeSlider');
const countdownEl = document.getElementById('countdown');

// Config: Point this to your actual Icecast stream URL
const STREAM_URL = '/radio'; 

let isPlaying = false;

function togglePlay() {
  if (isPlaying) {
    streamAudio.pause();
    streamAudio.src = ''; // Clear source to stop buffering
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
  } else {
    streamAudio.src = STREAM_URL;
    streamAudio.load();
    streamAudio.play().catch(err => {
      console.error("Playback failed:", err);
      alert("Stream is currently offline or unreachable.");
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

// Mock countdown logic
function updateCountdown() {
  let seconds = 3600 + Math.floor(Math.random() * 600); // Random time for demo
  setInterval(() => {
    seconds--;
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    countdownEl.textContent = `${h}:${m}:${s}`;
  }, 1000);
}

updateCountdown();

console.log("Adhan Player Initialized");
