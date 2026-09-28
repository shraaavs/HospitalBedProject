import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      console.log('⚡ Connected to Hospital Real-Time Socket Server');
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from Real-Time Socket Server');
    });
  }
  return socket;
};

export default getSocket;
