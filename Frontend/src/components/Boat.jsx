import React from 'react';
import { motion } from 'framer-motion';
import { getXY } from '../utils/hexMath';

const Boat = ({ id, c, r, isSelected, onClick, pawnsCount = 0, phase }) => {
    const { px, py } = getXY(c, r);

    return (
        <motion.g
            initial={false}
            animate={{ x: px, y: py }}
            transition={{ type: "spring", stiffness: 60, damping: 12 }}
            onClick={onClick}
            style={{ cursor: 'pointer' }}
        >
            {/* วาดตัวเรือให้ใหญ่พอจะคลิกได้แม้มีคนซ้อนทับ */}
            <path 
                d="M -25 -10 L 25 -10 L 15 15 L -15 15 Z" 
                fill="#8e44ad" 
                stroke={isSelected ? "white" : "#2c3e50"} 
                strokeWidth={isSelected ? "3" : "2"} 
            />
            <text x="0" y="5" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
                {pawnsCount}/3
            </text>
        </motion.g>
    );
};

export default Boat;
