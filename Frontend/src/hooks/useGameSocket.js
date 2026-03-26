import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = "https://your-backend-on-render.com"; // URL ของ Render

export const useGameSocket = (roomId) => {
    const [socket, setSocket] = useState(null);
    const [gameState, setGameState] = useState(null);

    useEffect(() => {
        const newSocket = io(SOCKET_URL);
        setSocket(newSocket);

        newSocket.emit('join-room', roomId);

        // ฟังคำสั่งอัปเดตจาก Server
        newSocket.on('update-state', (state) => {
            setGameState(state);
        });

        return () => newSocket.close();
    }, [roomId]);

    return { socket, gameState };
};