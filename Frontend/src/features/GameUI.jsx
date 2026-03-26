import React from 'react';
import Swal from 'sweetalert2';

const GameUI = ({ gameState, lobbyData, currentUser, onRollDie, onEndMovePhase, onSkipCreature, onUseCard, socketId, displayType = 'all' }) => {
    if (!gameState || !lobbyData) return null;

    const currentPlayerId = gameState.players[gameState.currentPlayerIndex];
    const currentPlayerObj = lobbyData.players.find(p => p.id === currentPlayerId);
    const currentPlayerName = currentPlayerObj ? currentPlayerObj.name : "Unknown";
    const isMyTurn = currentUser === currentPlayerName;

    const phaseLabels = {
        'PLACE_PAWNS': 'วางนักสำรวจ (Place Pawns)',
        'PLACE_BOATS': 'วางเรือรอดชีวิต (Place Boats)',
        'MOVE_PAWNS': `เดินหนี (${gameState.pointsLeft}${gameState.swimPointsLeft > 0 ? ` + ว่ายนํ้า ${gameState.swimPointsLeft}` : ''} แต้มเหลือ)`,
        'SINK_TILE': 'จมเกาะ (Sink a Tile)',
        'ROLL_DIE': 'ทอยเต๋าอสูรกาย (Roll Die)',
        'MOVE_CREATURE': 'บังคับอสูรกาย (Move Creature)',
        'GAME_OVER': 'เกมจบแล้ว! (Game Over)'
    };

    const cardNames = {
        'DRIVE_BOAT': { name: 'ขับเรือ (+3)', icon: '🚤', desc: 'ขับเรือฟรี 3 ช่อง' },
        'DOLPHIN': { name: 'โลมา (+3)', icon: '🐬', desc: 'ว่ายน้ำฟรี 3 ช่อง' },
        'SHARK_REPELLENT': { name: 'ห้ามฉลามกิน', icon: '🛡️', desc: 'ป้องกันฉลามอัตโนมัติ (Passive)' },
        'DELETE_GODZILLA': { name: 'ลบก็อตซิล่า', icon: '✨', desc: 'ลบก็อตซิล่า 1 ตัว' },
        'MOVE_SHARK': { name: 'ย้ายตำแหน่งฉลาม', icon: '🦈', desc: 'ย้ายฉลามลงน้ำช่องไหนก็ได้' },
        'MOVE_GODZILLA': { name: 'ย้ายตำแหน่งก็อตซิล่า', icon: '🦖', desc: 'ย้ายก็อตซิล่าลงน้ำช่องไหนก็ได้' },
        'MOVE_SEA_DRAGON': { name: 'ย้ายมังกรทะเล', icon: '🐉', desc: 'ย้ายมังกรทะเลลงน้ำช่องไหนก็ได้' }
    };

    const myCards = gameState.playerCards ? (gameState.playerCards[socketId] || []) : [];

    if (displayType === 'cards') {
        if (myCards.length === 0) return null;
        return (
            <div style={{ 
                position: 'fixed', 
                top: '50%', 
                left: '20px', 
                transform: 'translateY(-50%)', 
                padding: '12px 10px', 
                backgroundColor: 'rgba(44, 62, 80, 0.95)', 
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(8px)',
                zIndex: 1000,
                maxHeight: '90vh',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px'
            }}>
                <div style={{ fontSize: '1.1em', fontWeight: 'bold', color: '#ecf0f1', textAlign: 'center' }}>การ์ดในมือคุณ:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {myCards.map((cardType, idx) => {
                        const info = cardNames[cardType] || { name: cardType, icon: '🃏', desc: '' };
                        return (
                            <div 
                                key={`${cardType}-${idx}`} 
                                style={{ 
                                    padding: '6px 10px', 
                                    backgroundColor: '#2c3e50', 
                                    borderRadius: '8px', 
                                    border: '1px solid #7f8c8d',
                                    textAlign: 'center',
                                    width: '100px'
                                }}
                            >
                                <div style={{ fontSize: '20px' }}>{info.icon}</div>
                                <div style={{ fontSize: '0.8em', margin: '3px 0' }}>{info.name}</div>
                                {cardType !== 'SHARK_REPELLENT' && (
                                    <button 
                                        onClick={() => onUseCard(cardType)}
                                        style={{ 
                                            marginTop: '3px', 
                                            padding: '4px 6px', 
                                            backgroundColor: '#2ecc71', 
                                            border: 'none', 
                                            borderRadius: '4px', 
                                            color: 'white', 
                                            cursor: 'pointer',
                                            fontSize: '0.75em',
                                            width: '100%'
                                        }}
                                    >
                                        {cardType === 'DOLPHIN' ? 'ใช้งาน (ว่ายนํ้า)' : 'ใช้งาน'}
                                    </button>
                                )}
                                {cardType === 'SHARK_REPELLENT' && (
                                    <div style={{ fontSize: '0.65em', color: '#bdc3c7' }}>ใช้งานอัตโนมัติ</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div style={{ marginBottom: '10px', padding: '10px 15px', backgroundColor: '#34495e', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ textAlign: 'left' }}>
                    <h3 style={{ margin: '0 0 5px 0', color: isMyTurn ? '#2ecc71' : '#f1c40f', fontSize: '1.2rem' }}>
                        {isMyTurn ? "ตาของคุณ!" : `รอตาของ ${currentPlayerName} เล่น...`}
                    </h3>
                    <span style={{ fontSize: '0.95em' }}>สถานะ: <b style={{ color: '#ecf0f1' }}>{phaseLabels[gameState.phase] || gameState.phase}</b></span>
                    <span style={{ marginLeft: '15px', fontSize: '0.95em' }}>รอบที่: <b>{gameState.turn || 0}</b></span>
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                    {isMyTurn && gameState.phase === 'MOVE_PAWNS' && (
                        <button 
                            onClick={() => {
                                Swal.fire({
                                    title: 'ข้ามเทิร์น?',
                                    text: 'คุณแน่ใจหรือไม่ว่าต้องการข้ามเทิร์นโดยไม่เดิน?',
                                    icon: 'question',
                                    showCancelButton: true,
                                    confirmButtonText: 'ใช่, ข้ามเลย',
                                    cancelButtonText: 'ยกเลิก',
                                }).then((result) => {
                                    if (result.isConfirmed) {
                                        onEndMovePhase();
                                    }
                                });
                            }} 
                            style={{ padding: '10px 20px', backgroundColor: '#e67e22', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            ⏭️ ข้ามเทิร์นเพื่อไม่เดิน
                        </button>
                    )}

                    {isMyTurn && gameState.phase === 'ROLL_DIE' && (
                        <button onClick={onRollDie} style={{ padding: '10px 20px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                            🎲 ทอยเต๋าสัตว์ร้าย
                        </button>
                    )}

                    {isMyTurn && gameState.phase === 'MOVE_CREATURE' && (
                        <button onClick={onSkipCreature} style={{ padding: '10px 20px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                            ⏭️ ข้ามการขยับสัตว์ (กรณีไม่มีตัวขยับ)
                        </button>
                    )}
                </div>
            </div>
            
            {gameState.lastRoll && (
                <div style={{ marginTop: '10px', color: '#bdc3c7' }}>
                    ผลทอยเต๋าล่าสุด: <b style={{ color: '#fff', fontSize: '1.1em' }}>{gameState.lastRoll === 'SHARK' ? 'ฉลาม 🦈' : gameState.lastRoll === 'GODZILLA' ? 'ก๊อดซิล่า 🦖' : 'มังกรทะเล 🐉'}</b>
                </div>
            )}

            {/* ส่วนแสดงการ์ดถูกย้ายไป render ผ่าน displayType='cards' แล้ว */}
        </div>
    );
};

export default GameUI;
