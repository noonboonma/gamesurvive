import React from 'react';
import { hexPoints, HEX_SIZE } from '../utils/hexMath';
import Swal from 'sweetalert2';

const HexTile = ({ c, r, x, y, type, isRevealed, currentPhase, onSink, onClick }) => {
    // กำหนดสีตามประเภทไทล์
    const getTileColor = () => {
        if (isRevealed) {
            if (type !== 'DRAGON_LAIR') return "#3498db"; // กลายเป็นน้ำทะเล
        }
        switch (type) {
            case 'SAND': return "#f1c40f";
            case 'GRASS': 
            case 'FOREST': return "#27ae60"; // เขียวป่าไม้
            case 'MOUNTAIN': return "#7f8c8d";
            case 'DRAGON_LAIR': return "#c0392b"; // ทีมรังมังกรสีแดง
            case 'SEA': return "#2980b9"; // ทะเลสีน้ำเงินเข้ม
            case 'SAFE_ISLAND': return "#2ecc71"; // เกาะปลอดภัยสีเขียวสว่าง
            default: return "#ecf0f1";
        }
    };

    const isSinkingPhase = currentPhase === 'SINK_TILE';
    const points = hexPoints(0, 0, HEX_SIZE);

    const handleClick = () => {
        if (isSinkingPhase && !isRevealed && type !== 'SEA' && type !== 'DRAGON_LAIR') {
            Swal.fire({
                title: 'ยืนยันการจมไทล์',
                text: 'คุณต้องการจมไทล์นี้ใช่หรือไม่?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: 'จมเลย!',
                cancelButtonText: 'ยกเลิก'
            }).then((result) => {
                if (result.isConfirmed) {
                    onSink();
                }
            });
        } else {
            onClick(); // ส่ง event การคลิกพื้นธรรมดา (เช่น เพื่อเดินมาช่องนี้)
        }
    };

    return (
        <g 
            transform={`translate(${x}, ${y})`}
            onClick={handleClick}
            style={{ 
                cursor: isSinkingPhase && !isRevealed ? 'crosshair' : 'pointer' 
            }}
        >
            <polygon 
                points={points}
                fill={getTileColor()}
                stroke="#34495e"
                strokeWidth="2"
                style={{
                    transition: "fill 0.5s ease" // แอนิเมชันจมน้ำเปลี่ยนสี
                }}
            />
            {/* วาดตัวหนังสือประเภทไทล์ (ซ่อนถ้าน้ำท่วมแล้ว หรือเป็นเกาะปลอดภัย) */}
            {!isRevealed && type !== 'SEA' && type !== 'SAFE_ISLAND' && (
                <text 
                    x="0" 
                    y="0" 
                    textAnchor="middle" 
                    fill="white" 
                    fontSize="10" 
                    dy=".3em"
                >
                    {type.substring(0, 3)}
                </text>
            )}

            {/* ข้อความเกาะปลอดภัย */}
            {type === 'SAFE_ISLAND' && (
                <text x="0" y="0" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" dy=".3em">SAFE!</text>
            )}
            
            {/* ไอคอนมังกรสำหรับรังมังกร */}
            {isRevealed && type === 'DRAGON_LAIR' && (
                <text x="0" y="0" textAnchor="middle" fill="white" fontSize="18" dy=".3em">🐉</text>
            )}
        </g>
    );
};

export default HexTile;