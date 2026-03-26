import React from 'react';
import { motion } from 'framer-motion';
import { getXY } from '../utils/hexMath';

const Monster = ({ id, type, c, r, isSelected, onClick }) => {
    const { px, py } = getXY(c, r);

    let emoji = '🐉';
    let label = 'Sea Dragon';
    if (type === 'SHARK') { 
        emoji = '🦈'; 
        label = 'Shark'; 
    }
    if (type === 'GODZILLA') { 
        emoji = '🦖'; 
        label = 'Godzilla'; 
    }

    return (
        <motion.g
            initial={false}
            animate={{ x: px, y: py }}
            transition={{
                type: "spring",
                stiffness: 60,
                damping: 12
            }}
            onClick={onClick}
            style={{ cursor: 'pointer' }}
        >
            <circle
                r="18"
                fill={isSelected ? "#e74c3c" : "rgba(44, 62, 80, 0.8)"}
                stroke={isSelected ? "white" : "none"}
                strokeWidth="3"
            />
            <text textAnchor="middle" dy=".3em" fontSize="22">{emoji}</text>
        </motion.g>
    );
};

export default Monster;
