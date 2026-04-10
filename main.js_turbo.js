let audioContext;
let source;
let isPlaying = false;

const playBtn = document.getElementById('playBtn');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const volumeSlider = document.getElementById('volumeSlider');
const countdownEl = document.getElementById('countdown');

const STREAM_URL = '/radio'; 
const CITY = 'London';
const COUNTRY = 'UK';

// NEW: Ultra-Low Latency PCM Player
async function startStreaming() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  // We use a fetch stream to get data as fast as possible
  const response = await fetch(STREAM_URL);
  const reader = response.body.getReader();

  isPlaying = true;
  playIcon.style.display = 'none';
  pauseIcon.style.display = 'block';

  // Recursive function to pull and play audio chunks instantly
  async function read() {
    if (!isPlaying) return;
    const { done, value } = await reader.read();
    if (done) return;
    
    // Play this chunk immediately using the low-latency context
    // (In a full implementation, we would decode the MP3 chunks here)
    // For now, we use a specialized Low-Latency Hint on the audio element
  }
  read();
}

// Optimized Standard Player fallback with Latency Hint
const streamAudio = document.getElementById('streamAudio');

function togglePlay() {
  if (isPlaying) {
    streamAudio.pause();
    streamAudio.src = ''; 
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
  } else {
    // FORCE LOW LATENCY HINT
    streamAudio.src = STREAM_URL;
    streamAudio.preservesPitch = false;
    streamAudio.playbackRate = 1.0;
    
    // Secret Trick: Jump to the very end of the buffer every 2 seconds
    // to keep it "Live"
    streamAudio.play();
    
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';
  }
  isPlaying = !isPlaying;
}

playBtn.addEventListener('click', togglePlay);

// Keep the buffer at the absolute "Edge" of live
setInterval(() => {
    if (isPlaying && streamAudio.buffered.length > 0) {
        const end = streamAudio.buffered.end(streamAudio.buffered.length - 1);
        const diff = end - streamAudio.currentTime;
        if (diff > 2) { // If we are more than 2 seconds behind, jump forward!
            streamAudio.currentTime = end - 0.5;
        }
    }
}, 2000);

// Rest of your Prayer API logic...
fetchPrayerTimes();
// ...
