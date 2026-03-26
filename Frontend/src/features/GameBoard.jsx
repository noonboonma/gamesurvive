import React, { useState } from 'react';
import HexTile from '../components/HexTile';
import Pawn from '../components/Pawn';
import Monster from '../components/Monster';
import Boat from '../components/Boat';
import { getXY, SVG_W, SVG_H } from '../utils/hexMath';
import Swal from 'sweetalert2';

const GameBoard = ({ gameState, socket, roomId = "TEST_ROOM", currentUser, targetingCard, onCardTargetSelected }) => {
    const [selectedPawn, setSelectedPawn] = useState(null);
    const [selectedPawnValue, setSelectedPawnValue] = useState(null);
    const [selectedMonster, setSelectedMonster] = useState(null);
    const [selectedBoat, setSelectedBoat] = useState(null);

    const myHand = gameState.playerHands ? gameState.playerHands[socket.id] : [];

    const handleTileClick = (c, r) => {
        // หากอยู่ในโหมดใช้การ์ดพิเศษ (เลือกช่อง)
        if (targetingCard && targetingCard.step === 'SELECT_HEX') {
            onCardTargetSelected({ hex: { c, r } });
            return;
        }

        // หากอยู่ในเฟสวาง Pawn 
        if (gameState.phase === 'PLACE_PAWNS') {
            if (!selectedPawnValue) {
                Swal.fire({
                    title: 'แจ้งเตือน',
                    text: 'กรุณาเลือกนักสำรวจแต้มที่จะวางก่อนครับ!',
                    icon: 'warning',
                    confirmButtonText: 'ตกลง'
                });
                return;
            }
            socket.emit('place-pawn', {
                roomId,
                hex: { c, r },
                playerName: currentUser,
                pawnValue: selectedPawnValue
            });
            setSelectedPawnValue(null);
            return;
        }

        // หากอยู่ในเฟสวางเรือ
        if (gameState.phase === 'PLACE_BOATS') {
            socket.emit('place-boat', { roomId, hex: { c, r } });
            return;
        }

        // หากอยู่ในเฟสขยับสัตว์ร้าย
        if (gameState.phase === 'MOVE_CREATURE' && selectedMonster) {
            socket.emit('move-creature', {
                roomId,
                monsterId: selectedMonster.id,
                toHex: { c, r }
            });
            setSelectedMonster(null);
            return;
        }

        // ถ้าอยู่ใน Phase เดิน และเลือกตัวละครไว้แล้ว -> ส่งคำสั่งเดิน
        if (gameState.phase === 'MOVE_PAWNS' && selectedPawn) {
            socket.emit('move-pawn', {
                roomId,
                pawnId: selectedPawn.id,
                fromHex: { c: selectedPawn.c, r: selectedPawn.r },
                toHex: { c, r }
            });
            setSelectedPawn(null);
            return;
        }

        // หากอยู่ในเฟสขยับเรือ
        if (gameState.phase === 'MOVE_PAWNS' && selectedBoat) {
            socket.emit('move-boat', {
                roomId,
                boatId: selectedBoat.id,
                toHex: { c, r }
            });
            setSelectedBoat(null);
            return;
        }
    };

    const handleBoatClick = (boat) => {
        if (gameState.phase !== 'MOVE_PAWNS') return;
        
        if (selectedPawn) {
            // ปีนขึ้นเรือ (ปล่อยให้หลังบ้านเช็คระยะทางว่าไม่เกิน 1 ช่อง ไม่ว่าจะว่ายน้ำ บนบก หรือโดดจากเรืออีกลำ)
            socket.emit('board-boat', { roomId, pawnId: selectedPawn.id, boatId: boat.id });
            setSelectedPawn(null);
        } else {
            // เลือกเรือเพื่อเดิน
            setSelectedBoat(boat);
            setSelectedPawn(null);
            setSelectedMonster(null);
        }
    };

    const handlePawnClick = (pawn) => {
        setSelectedPawn(pawn);
        setSelectedBoat(null);
        setSelectedMonster(null);
    };

    const handleMonsterClick = (monster) => {
        // หากอยู่ในโหมดใช้การ์ดพิเศษ (เลือกมอนสเตอร์)
        if (targetingCard && targetingCard.step === 'SELECT_MONSTER') {
            onCardTargetSelected({ monsterId: monster.id });
            return;
        }

        if (gameState.phase !== 'MOVE_CREATURE') return;
        if (monster.type !== gameState.lastRoll) {
            const thNames = { 'SHARK': 'ฉลาม', 'GODZILLA': 'ก๊อดซิล่า', 'SEA_DRAGON': 'มังกรทะเล' };
            Swal.fire({
                title: 'ผิดเงื่อนไข',
                text: `ตานี้คุณสามารถขยับได้แค่ ${thNames[gameState.lastRoll]} เท่านั้นครับ!`,
                icon: 'warning',
                confirmButtonText: 'โอเค'
            });
            return;
        }
        setSelectedMonster(monster);
        setSelectedPawn(null);
        setSelectedBoat(null);
    };

    const handleSink = (c, r) => {
        socket.emit('sink-tile', { roomId, c, r });
    };

    return (
        <div className="board-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* UI สำหรับเลือกนักสำรวจก่อนวาง */}
            {gameState.phase === 'PLACE_PAWNS' && myHand && myHand.length > 0 && (
                <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'center', background: '#34495e', padding: '10px 20px', borderRadius: '8px' }}>
                    <h3 style={{ margin: 0, color: 'white' }}>เลือกนักสำรวจที่จะวาง:</h3>
                    {myHand.map(val => (
                        <button 
                            key={val} 
                            onClick={() => setSelectedPawnValue(val)}
                            style={{ 
                                padding: '10px 15px', 
                                border: selectedPawnValue === val ? '3px solid #e74c3c' : '2px solid transparent',
                                borderRadius: '50%',
                                background: '#ecf0f1',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '16px'
                            }}
                        >
                            {val}
                        </button>
                    ))}
                </div>
            )}


            <svg width="100%" height="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`}>
                {/* วาดพื้นกระดาน (Tiles) */}
                {gameState.board.map((tile) => {
                    const { px, py } = getXY(tile.c, tile.r);
                    return (
                        <HexTile
                            key={`${tile.c}-${tile.r}`}
                            {...tile}
                            x={px}
                            y={py}
                            currentPhase={gameState.phase}
                            onSink={() => handleSink(tile.c, tile.r)}
                            onClick={() => handleTileClick(tile.c, tile.r)}
                        />
                    );
                })}

                {/* วาดเรือ (Boats) */}
                {gameState.boats && gameState.boats.map((boat) => {
                    const pawnsInBoat = gameState.pawns.filter(p => p.boatId === boat.id);
                    return (
                        <Boat
                            key={boat.id}
                            {...boat}
                            phase={gameState.phase}
                            pawnsCount={pawnsInBoat.length}
                            isSelected={selectedBoat?.id === boat.id}
                            onClick={() => handleBoatClick(boat)}
                        />
                    );
                })}

                {/* วาดตัวละคร (Pawns) */}
                {gameState.pawns.map((pawn) => {
                    let offsetIndex, totalInHex;
                    if (pawn.boatId) {
                        // จัดตำแหน่งภายในเรือ
                        const inSameBoat = gameState.pawns.filter(p => p.boatId === pawn.boatId);
                        offsetIndex = inSameBoat.findIndex(p => p.id === pawn.id);
                        totalInHex = inSameBoat.length;
                    } else {
                        const inSameHex = gameState.pawns.filter(p => !p.boatId && p.c === pawn.c && p.r === pawn.r);
                        offsetIndex = inSameHex.findIndex(p => p.id === pawn.id);
                        totalInHex = inSameHex.length;
                    }

                    return (
                        <Pawn
                            key={pawn.id}
                            {...pawn}
                            phase={gameState.phase}
                            offsetIndex={offsetIndex}
                            totalInHex={totalInHex}
                            socket={socket}
                            isSelected={selectedPawn?.id === pawn.id}
                            onClick={() => handlePawnClick(pawn)}
                        />
                    );
                })}

                {/* วาดสัตว์ประหลาด (Monsters) */}
                {gameState.monsters && gameState.monsters.map((monster) => (
                    <Monster
                        key={monster.id}
                        {...monster}
                        isSelected={selectedMonster?.id === monster.id}
                        onClick={() => handleMonsterClick(monster)}
                    />
                ))}
            </svg>
        </div>
    );
};

export default GameBoard;