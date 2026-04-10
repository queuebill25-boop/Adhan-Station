import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';

const wss = new WebSocketServer({ port: 3001 });

wss.on('connection', (ws) => {
    console.log('Low-Latency Broadcaster Connected');

    // Optimization: Added -tune zerolatency and -preset ultrafast
    const ffmpeg = spawn('ffmpeg', [
        '-i', 'pipe:0',
        '-f', 'mp3',
        '-acodec', 'libmp3lame',
        '-ab', '128k',
        '-tune', 'zerolatency',
        '-preset', 'ultrafast',
        '-flush_packets', '1',
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
        if (data.includes('Error')) console.log(`FFmpeg: ${data}`);
    });
});
