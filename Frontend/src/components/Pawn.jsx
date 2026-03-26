import React from 'react';
import { motion } from 'framer-motion';
import { getXY } from '../utils/hexMath';

const Pawn = ({ id, c, r, color, isSelected, onClick, velocity, status, value, phase, offsetIndex = 0, totalInHex = 1 }) => {
    // หาจุดศูนย์กลางของ Hex
    const { px: baseX, py: baseY } = getXY(c, r);
    
    let ox = 0; let oy = 0;
    if (totalInHex > 1) {
        if (totalInHex === 2) {
            ox = offsetIndex === 0 ? -12 : 12;
        } else if (totalInHex >= 3) {
            if (offsetIndex === 0) { ox = 0; oy = -12; }
            if (offsetIndex === 1) { ox = -12; oy = 10; }
            if (offsetIndex === 2) { ox = 12; oy = 10; }
        }
    }

    const tpx = baseX + ox;
    const tpy = baseY + oy;

    // ตรวจสอบว่าโดนระเบิด Antigravity อยู่หรือไม่ (ตรวจสอบความแรงของแรงผลัก)
    const isBlasted = velocity && (Math.abs(velocity.x) > 0 || Math.abs(velocity.y) > 0);

    if (status === 'DEAD' || status === 'SAVED') return null;

    return (
        <motion.g
            initial={false}
            animate={{
                // เกาะจม (Sinking): กระเด็นออกไปตามความแรงระเบิด แล้วตกลงมาที่จุดศูนย์กลางน้ำ [tpx, tpx+vx, tpx]
                x: isBlasted ? [tpx, tpx + velocity.x, tpx] : tpx,
                y: isBlasted ? [tpy, tpy + velocity.y, tpy] : tpy,
            }}
            transition={{
                x: isBlasted ? { duration: 1.2, times: [0, 0.3, 1], ease: "easeInOut" } : { type: "spring", stiffness: 50, damping: 10 },
                y: isBlasted ? { duration: 1.2, times: [0, 0.3, 1], ease: "easeInOut" } : { type: "spring", stiffness: 50, damping: 10 }
            }}
            onClick={onClick}
            style={{ cursor: 'pointer' }}
        >
            <motion.g
                initial={false}
                animate={{
                    // เกาะจม (Sinking): ขยายตัว (Scale Up) แล้วพอหล่นลงน้ำกลายเป็น Swimmer ค่อยเล็กลง
                    // บนบก (Land): Scale 1 ปกติ
                    // ว่ายน้ำ (Swimmer): Scale 0.8 เล็กลง
                    // ในเรือ (IN_BOAT): Scale 0.6 เล็กลงไปอีกให้อยู่ในเรือได้พอดี
                    scale: isBlasted ? [1, 1.4, 0.8] : (status === 'IN_BOAT' ? 0.6 : (status === 'SWIMMER' ? 0.8 : 1)),
                    
                    // เอฟเฟกต์หมุนเคว้งตอนปลิวกลางอากาศนิดหน่อย
                    rotate: isBlasted ? [(velocity.x * 5), 0] : 0,
                    
                    // ว่ายน้ำลอยเอื่อยๆ (Drifting): ขยับขึ้นลงเบาๆ ตลอดเวลา
                    y: status === 'SWIMMER' ? [-3, 3, -3] : 0
                }}
                transition={{
                    // ถ้าโดนผลักให้ scale ตุ่ยขึ้นแล้วลงน้ำใน 0.6 วิ
                    scale: { duration: 0.6, times: [0, 0.3, 1] },
                    rotate: { type: "spring", damping: 5 },
                    // ถ้าว่ายน้ำอยู่ให้ทำคลื่นเด้งขึ้นลง Loop แบบไม่มีที่สิ้นสุด (Infinity)
                    y: status === 'SWIMMER' ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : { duration: 0.2 }
                }}
            >
                {/* 1. บนบก (Land): มีเงาใต้เท้าไม่ขยับ */}
                {status !== 'SWIMMER' && (
                    <ellipse 
                        cx="0" cy="18" rx="10" ry="4" 
                        fill="rgba(0,0,0,0.4)" 
                    />
                )}

                {/* 2. ว่ายน้ำ (Swimmer): เอฟเฟกต์คลื่นน้ำ (เงาสีน้ำเงินใต้ตัวแทนเงาดำ) */}
                {status === 'SWIMMER' && (
                    <ellipse 
                        cx="0" cy="12" rx="14" ry="6" 
                        fill="rgba(52, 152, 219, 0.6)" 
                    />
                )}

                <circle
                    r="15"
                    fill={color}
                    stroke={isSelected ? "white" : "none"}
                    strokeWidth="3"
                />
                <text textAnchor="middle" dy=".3em" fontSize="16" fill="white">
                    {phase === 'GAME_OVER' ? value : '👤'}
                </text>
            </motion.g>
        </motion.g>
    );
};

export default Pawn;