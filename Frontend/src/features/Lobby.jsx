import React from 'react';
import { motion } from 'framer-motion';

const Lobby = ({ lobbyData, roomId, socket }) => {
    const isHost = lobbyData.host === socket.id;

    const toggleReady = () => {
        socket.emit('player-ready', { roomId });
    };

    const startGame = () => {
        socket.emit('start-game', { roomId });
    };

    return (
        <div style={{ textAlign: 'center', padding: '50px', color: 'white', backgroundColor: '#2c3e50', minHeight: '100vh' }}>
            <h2>ห้องพักผู้เล่น (Room: {roomId})</h2>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', margin: '40px 0', flexWrap: 'wrap' }}>
                {lobbyData.players.map(player => (
                    <motion.div 
                        key={player.id}
                        // Floating Avatar Effect (Antigravity Vibe)
                        animate={{ y: [0, -15, 0] }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                        style={{
                            padding: '20px',
                            backgroundColor: '#34495e',
                            borderRadius: '10px',
                            minWidth: '150px',
                            boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
                            border: player.id === lobbyData.host ? '2px solid #f1c40f' : '2px solid transparent'
                        }}
                    >
                        <div style={{ fontSize: '48px', marginBottom: '10px' }}>🧍</div>
                        <h3 style={{ margin: '5px 0' }}>{player.name}</h3>
                        {player.id === lobbyData.host && (
                            <div style={{ color: '#f1c40f', fontSize: '12px', fontWeight: 'bold' }}>👑 HOST</div>
                        )}
                        <p style={{ fontSize: '24px', margin: '10px 0' }}>
                            {player.isReady ? "✅ Ready" : "⏳ Waiting"}
                        </p>
                    </motion.div>
                ))}
            </div>

            <div style={{ marginTop: '50px' }}>
                {!isHost ? (
                    <button 
                        onClick={toggleReady}
                        style={{
                            padding: '15px 30px', fontSize: '18px', fontWeight: 'bold',
                            backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '8px',
                            cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
                        }}
                    >
                        Toggle Ready
                    </button>
                ) : (
                    <button 
                        onClick={startGame}
                        style={{
                            padding: '15px 30px', fontSize: '18px', fontWeight: 'bold',
                            backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '8px',
                            cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
                        }}
                    >
                        Start Game 🚀
                    </button>
                )}
            </div>
        </div>
    );
};

export default Lobby;
