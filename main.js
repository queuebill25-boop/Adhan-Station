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

function startStream() {
    liveBadge.textContent = 'CONNECTING...';
    playBtn.classList.add('loading');
    
    streamAudio.src = `/radio/${CURRENT_STATION}?t=${Date.now()}`;
    streamAudio.load();
    streamAudio.play().then(() => {
        setUIState(true);
        playBtn.classList.remove('loading');
    }).catch(err => {
        playBtn.classList.remove('loading');
    });
}

function stopStream() {
    streamAudio.pause();
    streamAudio.src = ''; 
    setUIState(false);
}

function setUIState(playing) {
    playIcon.style.display = playing ? 'none' : 'block';
    pauseIcon.style.display = playing ? 'block' : 'none';
}

// ROBUST LIVE DETECTION
async function checkAllStations() {
    try {
        const res = await fetch('/status-json.xsl');
        const data = await res.json();
        
        let liveMounts = [];
        const stats = data.icestats;

        if (stats.source) {
            // Case 1: Multiple sources (Array)
            if (Array.isArray(stats.source)) {
                liveMounts = stats.source.map(s => s.mount.replace('/', ''));
            } 
            // Case 2: Single source (Object)
            else {
                liveMounts = [stats.source.mount.replace('/', '')];
            }
        }

        const currentIsLive = liveMounts.includes(CURRENT_STATION);
        liveBadge.textContent = currentIsLive ? '● ON AIR' : '○ OFFLINE';
        liveBadge.className = `status-badge ${currentIsLive ? 'on-air' : ''}`;
        
    } catch (e) {
        console.error("Status check failed:", e);
    }
}

setInterval(checkAllStations, 3000); // Faster check (3s)

streamAudio.addEventListener('ended', () => setTimeout(startStream, 3000));
streamAudio.addEventListener('error', () => {});

playBtn.addEventListener('click', () => {
    streamAudio.paused ? startStream() : stopStream();
});

volumeSlider.addEventListener('input', (e) => {
  streamAudio.volume = e.target.value;
});

init();
