import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';

const wss = new WebSocketServer({ port: 3001 });

wss.on('connection', (ws) => {
    console.log('Broadcaster connected via WebSocket');

    // Create a ffmpeg process with LOW LATENCY flags
    const ffmpeg = spawn('ffmpeg', [
        '-loglevel', 'quiet',
        '-probesize', '32',
        '-analyzeduration', '0',
        '-i', 'pipe:0',
        '-f', 'mp3',
        '-acodec', 'libmp3lame',
        '-ab', '128k',
        '-buffsize', '64k',
        '-maxrate', '128k',
        '-payload_type', '1',
        'icecast://source:dataq123@icecast:8000/adhan_live'
    ]);


    ws.on('message', (data) => {
        ffmpeg.stdin.write(data);
    });

    ws.on('close', () => {
        ffmpeg.stdin.end();
        console.log('Broadcaster disconnected');
    });

    ffmpeg.stderr.on('data', (data) => {
        console.log(`FFmpeg: ${data}`);
    });
});

console.log('Bridge Server running on port 3001');
