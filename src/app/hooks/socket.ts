import { io } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const socket = io(`${WS_URL}/video`, {
  transports: ['websocket'], // ensures it uses WebRTC-friendly transport
});

export { socket };
