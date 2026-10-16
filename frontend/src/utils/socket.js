import { io } from 'socket.io-client';
import { BACKEND_URL } from './config';

// Global singleton socket instance for consistent connection state
export const socket = io(BACKEND_URL, {
  autoConnect: true,
  reconnectionDelayMax: 10000,
  transports: ['websocket', 'polling'],
});
