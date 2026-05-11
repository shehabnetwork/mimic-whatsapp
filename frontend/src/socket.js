import { io } from 'socket.io-client';

// Connect to backend WebSocket server
const socket = io(window.location.origin, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});

export default socket;
