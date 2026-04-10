import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';
import url from 'url';

const wss = new WebSocketServer({ port: 3001 });

// Store active ffmpeg processes for different channels
const activeChannels = new Map();

wss.on('connection', (ws, req) => {
    // Determine which "Room" or "Mosque" is connecting
    const parameters = url.parse(req.url, true).query;
    const mosqueId = parameters.mosque || 'default';
    
    console.log(`Broadcaster connecting to Room: ${mosqueId}`);

    // Create a unique mount point for this specific mosque
    const ffmpeg = spawn('ffmpeg', [
        '-i', 'pipe:0',
        '-f', 'mp3',
        '-acodec', 'libmp3lame',
        '-ab', '128k',
        '-tune', 'zerolatency',
        '-preset', 'ultrafast',
        `icecast://source:dataq123@icecast:8000/${mosqueId}`
    ]);

    activeChannels.set(mosqueId, ffmpeg);

    ws.on('message', (data) => {
        ffmpeg.stdin.write(data);
    });

    ws.on('close', () => {
        ffmpeg.stdin.end();
        activeChannels.delete(mosqueId);
        console.log(`Room ${mosqueId} is now offline`);
    });

    ffmpeg.stderr.on('data', (data) => {
        // Silently log errors
    });
});

console.log('Multi-Channel Adhan Bridge running on port 3001');
