import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to the backend
    const URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    const newSocket = io(URL, {
        reconnectionDelayMax: 10000,
    });
    
    setSocket(newSocket);
    
    newSocket.on('connect', () => {
      setIsConnected(true);
    });
    
    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};
