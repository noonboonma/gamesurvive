// src/App.jsx
import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import Login from './components/Login';
import GameBoard from './features/GameBoard';
import GameUI from './features/GameUI';
import Lobby from './features/Lobby'; // นำเข้าหน้า Lobby
import Swal from 'sweetalert2';

// ดึง URL จากไฟล์ .env ที่เราตั้งค่าไว้ (VITE_API_URL)
// ถ้าไม่มีค่าใน env จะถอยกลับไปใช้ localhost:8080 (สำหรับการรันเทสในเครื่อง)
const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const socket = io(SOCKET_URL, {
    transports: ["websocket"], // แนะนำให้ระบุ transport เป็น websocket เพื่อความเสถียรบน Cloud Run
    secure: true               // บังคับใช้ HTTPS
});

function App() {
    const [user, setUser] = useState(null); // เก็บชื่อผู้เล่น
    const [gameState, setGameState] = useState(null);
    const [lobbyData, setLobbyData] = useState(null);
    const [targetingCard, setTargetingCard] = useState(null); // { type, step: 'SELECT_MONSTER' | 'SELECT_HEX', monsterId?: string }
    const roomId = "TEST_ROOM";

    useEffect(() => {
        if (!user) return; // เข้าห้องต่อเมื่อล็อกอินแล้ว

        const joinRoom = () => {
            // ส่งชื่อผู้เล่นเข้าไปบอก Backend ด้วย
            socket.emit('join-room', { roomId, playerName: user });
        };

        // ถ้าเชื่อมต่ออยู่แล้ว ให้ส่ง join-room ทันที
        if (socket.connected) {
            joinRoom();
        }

        // กรณี Server รีสตาร์ทแล้ว socket เชื่อมต่อใหม่ ให้ส่ง join-room อีกรอบ
        socket.on('connect', joinRoom);
        
        socket.on('lobby-update', (data) => setLobbyData(data));
        socket.on('init-state', (state) => setGameState(state));
        socket.on('update-state', (state) => setGameState(state));
        socket.on('game-over', (data) => {
            const { scores } = data;
            
            // Format score list for SweetAlert
            const scoreListHtml = scores.map((s, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤';
                return `<div style="display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #34495e; font-size: 1.1em; color: #2c3e50;">
                    <span>${medal} ${s.name}</span>
                    <span style="font-weight: bold; color: #27ae60;">${s.score} แต้ม</span>
                </div>`;
            }).join('');

            Swal.fire({
                title: '🌋 ภูเขาไฟระเบิด! เกมจบแล้ว',
                html: `
                    <div style="margin-top: 15px; border: 2px solid #e74c3c; border-radius: 12px; overflow: hidden; background: #fff; color: #333;">
                        <h3 style="background: #e74c3c; color: white; margin: 0; padding: 10px;">สรุปคะแนนนักสำรวจ</h3>
                        <div style="padding: 5px 0;">
                            ${scoreListHtml}
                        </div>
                    </div>
                `,
                icon: 'info',
                confirmButtonText: 'รับทราบ (เริ่มใหม่)',
                allowOutsideClick: false,
                background: '#2c3e50',
                color: '#fff'
            }).then(() => {
                window.location.reload(); 
            });
        });

        socket.on('error-msg', (msg) => {
            Swal.fire({
                title: 'ระบบแจ้งค้าน:',
                text: msg,
                icon: 'warning',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        });

        return () => {
            socket.off('connect', joinRoom);
            socket.off('lobby-update');
            socket.off('init-state');
            socket.off('update-state');
            socket.off('error-msg');
        };
    }, [user]);

    if (!user) {
        return <Login onLoginSuccess={(name) => setUser(name)} />;
    }

    if (!lobbyData) {
        return (
            <div style={{ color: 'white', textAlign: 'center', marginTop: '50px' }}>
                <h2>กำลังเชื่อมต่อกับ Backend...</h2>
                <p>ตรวจสอบว่ารัน node server.js อยู่ที่พอร์ต 3000 นะครับ</p>
            </div>
        );
    }

    // ถ้ายังไม่เริ่มเกม ให้โชว์หน้า Lobby
    if (!lobbyData.isStarted) {
        return <Lobby lobbyData={lobbyData} roomId={roomId} socket={socket} />;
    }

    // ถ้าเริ่มแล้วแต่ Game State ยังไม่มาถึง (ป้องกัน Error ระหว่างโหลด)
    if (!gameState) {
        return <div style={{ color: 'white', textAlign: 'center', marginTop: '50px' }}><h3>Loading Game...</h3></div>;
    }

    const gameUIProps = {
        gameState,
        lobbyData,
        currentUser: user,
        socketId: socket.id,
        onRollDie: () => socket.emit('roll-creature-die', { roomId }),
        onSkipCreature: () => socket.emit('skip-creature', { roomId }),
        onEndMovePhase: () => socket.emit('end-move-phase', { roomId }),
        onUseCard: (type) => {
            const needsTarget = ['DELETE_GODZILLA', 'MOVE_SHARK', 'MOVE_GODZILLA', 'MOVE_SEA_DRAGON'].includes(type);
            if (needsTarget) {
                setTargetingCard({ type, step: 'SELECT_MONSTER' });
                Swal.fire({
                    title: 'เลือกเป้าหมาย',
                    text: `กรุณาเลือกสัตว์ประหลาดที่จะกระทำด้วยการ์ด ${type} ครับ`,
                    icon: 'info',
                    confirmButtonText: 'รับทราบ'
                });
            } else {
                socket.emit('use-card', { roomId, cardType: type, targetData: {} });
            }
        }
    };

    return (
        <div className="app-container" style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#2c3e50', minHeight: '100vh', padding: '10px 20px', color: 'white' }}>
            {/* Header Area */}
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <h2 style={{ margin: '0 0 5px 0', fontSize: '1.5rem' }}>Survive: Escape from Atlantis</h2>
                <span style={{ fontSize: '0.9rem', color: '#bdc3c7' }}>สวัสดีคุณ <b style={{ color: 'white' }}>{user}</b></span>
            </div>
            
            {/* Main Overlay for special card usage */}
            {targetingCard && (
                <div style={{ position: 'fixed', top: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(231, 76, 60, 0.95)', padding: '10px 20px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', display: 'flex', gap: '15px', alignItems: 'center', color: 'white' }}>
                    <div>
                        <b>โหมดยิงการ์ดพิเศษ: {targetingCard.type}</b>
                        <p style={{ margin: '5px 0 0 0', fontSize: '0.9em' }}>{targetingCard.step === 'SELECT_MONSTER' ? "กรุณาคลิกเลือก สัตว์ประหลาด บนกระดาน" : "กรุณาคลิกเลือก ช่องน้ำ ปลายทาง"}</p>
                    </div>
                    <button onClick={() => setTargetingCard(null)} style={{ padding: '8px 15px', background: '#fff', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>ยกเลิก</button>
                </div>
            )}

            {/* Main Content Area */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '15px', overflow: 'hidden' }}>
                
                {/* Top/Center: Status + Map */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div style={{ flexShrink: 0 }}>
                        <GameUI displayType="status" {...gameUIProps} />
                    </div>
                    
                    <div style={{ flex: 1, borderRadius: '8px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <GameBoard 
                            gameState={gameState} 
                            socket={socket} 
                            currentUser={user}
                            targetingCard={targetingCard}
                            onCardTargetSelected={(data) => {
                                if (targetingCard.type === 'DELETE_GODZILLA') {
                                    socket.emit('use-card', { roomId, cardType: targetingCard.type, targetData: { monsterId: data.monsterId } });
                                    setTargetingCard(null);
                                } else {
                                    if (targetingCard.step === 'SELECT_MONSTER') {
                                        setTargetingCard({ ...targetingCard, step: 'SELECT_HEX', monsterId: data.monsterId });
                                        Swal.fire({
                                            title: 'ขั้นตอนต่อไป',
                                            text: 'เลือกสัตว์แล้ว! จากนั้นคลิกช่องน้ำที่ต้องการย้ายไปลงครับ',
                                            icon: 'info',
                                            toast: true,
                                            position: 'bottom',
                                            showConfirmButton: false,
                                            timer: 3000
                                        });
                                    } else {
                                        socket.emit('use-card', { roomId, cardType: targetingCard.type, targetData: { monsterId: targetingCard.monsterId, toHex: data.hex } });
                                        setTargetingCard(null);
                                    }
                                }
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Bottom Floating Area: Cards */}
            <GameUI displayType="cards" {...gameUIProps} />
        </div>
    );
}

export default App;