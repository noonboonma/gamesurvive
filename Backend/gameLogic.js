// 1. Utilities and Map Math
const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

// Map Constants based on User Request
const COL_HEIGHTS = [7, 12, 11, 10, 11, 12, 11, 12, 11, 10, 11, 12, 7];
const NUM_COLS = COL_HEIGHTS.length; // 13
const OBSTACLE_SET = new Set(["1,-5", "11,-5", "6,-1", "1,4", "9,4"]);
const SAFE_ISLANDS_SET = new Set(["1,-6", "1,5", "11,-6", "11,5"]);
const HEX_SIZE = 28;
const SVG_W = 640;
const SVG_H = 600;

const CELLS = (() => {
  const cells = [];
  for (let c = 0; c < NUM_COLS; c++) {
    const n = COL_HEIGHTS[c];
    const rStart = -Math.floor(n / 2);
    for (let i = 0; i < n; i++) {
        const r = rStart + i;
        cells.push({ c, r, key: `${c},${r}` });
    }
  }
  return cells;
})();

const allPX = CELLS.map(({ c }) => c * 1.5 * HEX_SIZE);
const allPY = CELLS.map(({ c, r }) => (r + (c % 2 === 1 ? 0.5 : 0)) * Math.sqrt(3) * HEX_SIZE);
const OX = (SVG_W - (Math.max(...allPX) - Math.min(...allPX))) / 2 - Math.min(...allPX);
const OY = (SVG_H - (Math.max(...allPY) - Math.min(...allPY))) / 2 - Math.min(...allPY);

function getXY(c, r) {
  return {
    px: OX + c * 1.5 * HEX_SIZE,
    py: OY + (r + (c % 2 === 1 ? 0.5 : 0)) * Math.sqrt(3) * HEX_SIZE,
  };
}

function toCube(c, r) {
  const x = c;
  const z = r - Math.floor(c / 2);
  const y = -x - z;
  return { x, y, z };
}

function hexDist(c1, r1, c2, r2) {
  const a = toCube(c1, r1);
  const b = toCube(c2, r2);
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
}

const getHexDistance = (a, b) => {
    return hexDist(a.c, a.r, b.c, b.r);
};

// 2. Map Generation Logic
function generateHexGrid() {
    const ISLAND_POSITIONS_SET = new Set([
        "3,-2", "3,-1", "3,0", "3,1",
        "4,-2", "4,-1", "4,0", "4,1", "4,2",
        "5,-4", "5,-3", "5,-2", "5,-1", "5,0", "5,1", "5,2", "5,3",
        "6,-3", "6,-2", "6,-1", "6,1", "6,2", "6,3",
        "7,-4", "7,-3", "7,-2", "7,-1", "7,0", "7,1", "7,2", "7,3",
        "8,-2", "8,-1", "8,0", "8,1", "8,2",
        "9,-2", "9,-1", "9,0", "9,1"
    ]);

    const sandCount = 16;
    const forestCount = 16;
    const mountainCount = 8;
    
    let tilePool = [
        ...Array(sandCount).fill('SAND'),
        ...Array(forestCount).fill('FOREST'),
        ...Array(mountainCount).fill('MOUNTAIN')
    ];
    tilePool = shuffleArray(tilePool);

    let sandEvents = [
        { type: 'EVENT', value: 'FREE_BOAT' },
        ...Array(3).fill({ type: 'CREATURE', value: 'SHARK' }),
        ...Array(3).fill({ type: 'CREATURE', value: 'GODZILLA' }),
        { type: 'KEEP_CARD', value: 'SHARK_REPELLENT' },
        { type: 'KEEP_CARD', value: 'MOVE_SHARK' },
        { type: 'KEEP_CARD', value: 'MOVE_GODZILLA' },
        { type: 'KEEP_CARD', value: 'MOVE_SEA_DRAGON' },
        ...Array(2).fill({ type: 'KEEP_CARD', value: 'DRIVE_BOAT' }),
        ...Array(3).fill({ type: 'KEEP_CARD', value: 'DOLPHIN' }),
    ];

    let forestEvents = [
        ...Array(3).fill({ type: 'EVENT', value: 'FREE_BOAT' }),
        ...Array(2).fill({ type: 'CREATURE', value: 'SHARK' }),
        ...Array(2).fill({ type: 'CREATURE', value: 'GODZILLA' }),
        { type: 'KEEP_CARD', value: 'SHARK_REPELLENT' },
        ...Array(2).fill({ type: 'KEEP_CARD', value: 'DELETE_GODZILLA' }),
        { type: 'KEEP_CARD', value: 'MOVE_SHARK' },
        { type: 'KEEP_CARD', value: 'MOVE_GODZILLA' },
        { type: 'KEEP_CARD', value: 'MOVE_SEA_DRAGON' },
        { type: 'KEEP_CARD', value: 'DOLPHIN' },
        ...Array(2).fill({ type: 'EVENT', value: 'WHIRLPOOL' })
    ];

    let mountainEvents = [
        { type: 'CREATURE', value: 'SHARK' },
        { type: 'KEEP_CARD', value: 'DELETE_GODZILLA' },
        { type: 'KEEP_CARD', value: 'SHARK_REPELLENT' },
        ...Array(2).fill({ type: 'EVENT', value: 'WHIRLPOOL' }),
        { type: 'END_GAME', value: 'VOLCANO' },
        { type: 'KEEP_CARD', value: 'DRIVE_BOAT' },
        { type: 'KEEP_CARD', value: 'DOLPHIN' }
    ];

    sandEvents = shuffleArray(sandEvents);
    forestEvents = shuffleArray(forestEvents);
    mountainEvents = shuffleArray(mountainEvents);

    const tiles = [];
    CELLS.forEach(({ c, r, key }) => {
        const isSafe = SAFE_ISLANDS_SET.has(key);
        const isIsland = ISLAND_POSITIONS_SET.has(key);

        let tileType = 'SEA';
        let isRevealed = true;
        let underlyingEvent = null;

        if (isSafe) {
            tileType = 'SAFE_ISLAND';
            isRevealed = false;
        } else if (isIsland) {
            tileType = tilePool.pop() || 'SAND'; // fallback just in case
            isRevealed = false;
            
            if (tileType === 'SAND') underlyingEvent = sandEvents.pop() || null;
            else if (tileType === 'FOREST') underlyingEvent = forestEvents.pop() || null;
            else if (tileType === 'MOUNTAIN') underlyingEvent = mountainEvents.pop() || null;
        }
        
        tiles.push({
            c, r,
            type: tileType,
            isRevealed,
            underlyingEvent
        });
    });

    return tiles;
}

// 3. Gameplay Functions
function getPlayerColor(index) {
    const colors = ['#FF4136', '#0074D9', '#2ECC40', '#FFDC00'];
    return colors[index % colors.length] || '#AAAAAA';
}

function countPawnsAt(game, c, r) {
    if (!game.pawns) return 0;
    return game.pawns.filter(p => p.c === c && p.r === r && p.status !== 'DEAD' && p.status !== 'SAVED').length;
}

function placePawn(game, socketId, hex, playerName, pawnValue) {
    if (game.phase !== 'PLACE_PAWNS') return { success: false, message: "ไม่ใช่ช่วงวางหมาก" };

    const expectedPlayer = game.players[game.currentPlayerIndex];
    if (socketId !== expectedPlayer) return { success: false, message: "ยังไม่ถึงตาคุณวางหมาก" };

    // Validate value
    if (!game.playerHands || !game.playerHands[socketId] || !game.playerHands[socketId].includes(pawnValue)) {
        return { success: false, message: "ไม่มีนักสำรวจแต้มเท่านี้เหลือให้วางหรือคุณไม่ได้เลือกแต้ม" };
    }

    const tile = game.board.find(t => t.c === hex.c && t.r === hex.r);
    if (!tile) return { success: false, message: "ไม่อยู่ในกระดานนะ!" };
    if (tile.isRevealed || tile.type === 'SEA' || tile.type === 'SAFE_ISLAND') {
        return { success: false, message: "ต้องวางคนบนเกาะที่ยังไม่จมเท่านั้น" };
    }

    // จำกัดไม่เกิน 3 คนต่อช่องตอนวางตัวละครเริ่มเกม
    if (countPawnsAt(game, hex.c, hex.r) >= 3) {
        return { success: false, message: "ช่องนี้มีคนเต็ม 3 คนแล้วครับ" };
    }

    const playerPawns = game.pawns.filter(p => p.owner === socketId);
    if (playerPawns.length >= 10) {
        return { success: false, message: "วางครบ 10 ตัวแล้วครับ" };
    }

    // Remove the value from hand
    game.playerHands[socketId] = game.playerHands[socketId].filter(v => v !== pawnValue);

    const newPawn = {
        id: `pawn-${socketId}-${Date.now()}`,
        owner: socketId,
        ownerName: playerName,
        value: pawnValue,
        c: hex.c,
        r: hex.r,
        // Antigravity / Physics properties
        velocity: { x: 0, y: 0 }, 
        status: 'LAND',
        color: getPlayerColor(game.players.indexOf(socketId))
    };

    game.pawns.push(newPawn);

    // หลังจากวาง 1 ตัว ให้เปลี่ยนคนทันที
    nextPhase(game);

    return { success: true, pawn: newPawn };
}

// ฟังก์ชันคำนวณแรงผลัก (Explosion/Antigravity Force)
function applyAntigravityBlast(game, c, r) {
    // User requested to remove the Antigravity bounce wave because it was confusing and looked like a revive/reset.
}

function isCoastal(game, c, r) {
    const diffs = Math.abs(c) % 2 === 0 
        ? [[0, -1], [1, -1], [1, 0], [0, 1], [-1, 0], [-1, -1]]
        : [[0, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
        
    for (const [dc, dr] of diffs) {
        const nc = c + dc;
        const nr = r + dr;
        const neighbor = game.board.find(t => t.c === nc && t.r === nr);
        
        if (!neighbor) return true;
        if (neighbor.isRevealed || neighbor.type === 'SEA' || neighbor.type === 'SAFE_ISLAND') {
            return true;
        }
    }
    return false;
}

function sinkTile(game, c, r) {
    const tileIndex = game.board.findIndex(t => t.c === c && t.r === r);
    if (tileIndex === -1) return { success: false, message: "ไม่พบไทล์นี้" };

    const tile = game.board[tileIndex];
    if (tile.isRevealed) return { success: false, message: "ไทล์นี้จมไปแล้ว" };
    if (tile.type === 'SAFE_ISLAND') return { success: false, message: "เกาะปลอดภัยจมไม่ได้!" };

    // ไม่บังคับต้องเป็นริมน้ำแล้ว
    const unrevealed = game.board.filter(t => !t.isRevealed);

    if (tile.type === 'FOREST') {
        const hasSand = unrevealed.some(t => t.type === 'SAND');
        if (hasSand) {
            return { success: false, message: "ต้องจมเกาะทรายให้หมดก่อน!" };
        }
    }
    if (tile.type === 'MOUNTAIN') {
        const hasSand = unrevealed.some(t => t.type === 'SAND');
        const hasForest = unrevealed.some(t => t.type === 'FOREST');
        if (hasSand || hasForest) {
            return { success: false, message: "ต้องจมเกาะทรายหรือป่าให้หมดก่อน!" };
        }
    }

    tile.isRevealed = true;

    // เปลี่ยนคนที่อยู่บนนั้นให้ร่วง
    game.pawns.forEach(pawn => {
        if (pawn.c === c && pawn.r === r && pawn.status !== 'DEAD' && pawn.status !== 'SAVED') {
            if (pawn.status !== 'IN_BOAT') {
                pawn.status = 'SWIMMER';
            }
        }
    });

    applyAntigravityBlast(game, c, r);

    if (tile.underlyingEvent && tile.underlyingEvent.value === 'VOLCANO') {
        game.phase = 'GAME_OVER';
        return { success: true, event: tile.underlyingEvent, gameOver: true };
    }

    return { success: true, event: tile.underlyingEvent };
}

function countPawnsAt(game, c, r) {
    if (!game.pawns) return 0;
    return game.pawns.filter(p => p.c === c && p.r === r && p.status !== 'DEAD' && p.status !== 'SAVED').length;
}

const validatePath = (game, startHex, endHex, maxMove, capacityNeeded, isWaterOnly, isShark = false, isBoat = false) => {
    const queue = [{ c: startHex.c, r: startHex.r, dist: 0 }];
    const visited = new Set();
    visited.add(`${startHex.c},${startHex.r}`);

    const getNeighbors = (c, r) => {
        const diffs = Math.abs(c) % 2 === 0 
            ? [[0, -1], [1, -1], [1, 0], [0, 1], [-1, 0], [-1, -1]]
            : [[0, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
        return diffs.map(([dc, dr]) => ({ c: c + dc, r: r + dr }));
    };

    while (queue.length > 0) {
        const current = queue.shift();

        if (current.c === endHex.c && current.r === endHex.r) {
            // Also need to check if target is valid terrain
            const targetTile = game.board.find(t => t.c === endHex.c && t.r === endHex.r);
            if (!targetTile) return { valid: false, reason: "ไม่พบพื้นที่เป้าหมายบนกระดาน" };
            
            return { valid: true, dist: current.dist };
        }

        if (current.dist < maxMove) {
            // Cannot traverse *from* water if you started on land (unless you are a boat)
            const currentTile = game.board.find(t => t.c === current.c && t.r === current.r);
            if (!isWaterOnly && current.dist > 0 && currentTile && (currentTile.isRevealed || currentTile.type === 'SAFE_ISLAND')) {
                // Dead end for land traversals, valid as stop but not as intermediate step
                continue;
            }

            for (const n of getNeighbors(current.c, current.r)) {
                const key = `${n.c},${n.r}`;
                if (visited.has(key)) continue;

                const tile = game.board.find(t => t.c === n.c && t.r === n.r);
                if (!tile) continue;

                // Swimmers (isWaterOnly) can technically enter Safe Island and now Unrevealed land.
                // We no longer block them from moving ONTO unrevealed tiles here.

                // ถ้าเป็นเรือ ให้เช็คว่าบรรทุกเต็มหรือไม่
                if (isBoat && capacityNeeded >= 3) {
                    // เรือเต็ม (3 คน) ห้ามเดินทับคนในน้ำ (Swimmers)
                    const swimmerHere = game.pawns.find(p => p.c === n.c && p.r === n.r && p.status === 'SWIMMER');
                    if (swimmerHere) continue; // ทางตัน เพราะมีคนขวาง
                }

                if (isShark) {
                    const boatHere = game.boats.find(b => b.c === n.c && b.r === n.r);
                    if (boatHere) continue; // ฉลามผ่านเรือหรือเข้าช่องที่มีเรือไม่ได้
                }

                if (isBoat) {
                    const sharkHere = game.monsters?.find(m => m.c === n.c && m.r === n.r && m.type === 'SHARK');
                    if (sharkHere) continue; // เรือผ่านฉลามหรือเข้าช่องที่มีฉลามไม่ได้
                }

                visited.add(key);
                queue.push({ c: n.c, r: n.r, dist: current.dist + 1 });
            }
        }
    }
    return { valid: false, reason: "เส้นทางถูกบล็อค หรือคุณพยายามเดินไกลเกินกว่าแต้มที่เหลืออยู่" };
};

const validateMove = (game, socketId, fromHex, toHex, pawnId, pointsLeft) => {
    const pawn = game.pawns.find(p => p.id === pawnId);
    if (!pawn) return { valid: false, reason: "ไม่พบผู้เล่น" };
    if (pawn.owner !== socketId) return { valid: false, reason: "ไม่ใช่ตัวละครของคุณ" };

    const currentPlayerSocketId = game.players[game.currentPlayerIndex];
    if (currentPlayerSocketId !== socketId) return { valid: false, reason: "ไม่ใช่ตาของคุณ" };

    if (getHexDistance(fromHex, toHex) > 1) {
        return { valid: false, reason: "กรุณาเดินทีละ 1 ช่อง (ไม่สามารถข้ามช่องได้)" };
    }

    if (pawn.status === 'IN_BOAT') {
        // ลงจากเรือ: ใช้ 1 แต้ม ก้าวลงช่องติดกัน
        const dist = getHexDistance(fromHex, toHex);
        if (dist !== 1) return { valid: false, reason: "การลงจากเรือต้องเลือกช่องที่อยู่ติดกัน" };
        if (game.pointsLeft < 1) return { valid: false, reason: "แต้มเดินไม่พอสำหรับลงเรือ" };
        
        const targetTile = game.board.find(t => t.c === toHex.c && t.r === toHex.r);
        if (!targetTile) return { valid: false, reason: "ไม่พบเป้าหมาย" };
        
        return { valid: true, dist: 1 };
    }

    const isWaterOnly = (pawn.status === 'SWIMMER');
    
    // Check points usage
    let maxMove = 0;
    if (isWaterOnly) {
        // Swimmers use swimPointsLeft first, then pointsLeft (but limited to 1 per turn if only using pointsLeft)
        // Actually, user wants Dolphin card to be separate.
        // "จะไม่นับแต้มเดิมที่ให้มา... จะไม่เพิ่มในส่วนเดินบนเกราะ"
        if (game.swimPointsLeft > 0) {
            maxMove = game.swimPointsLeft;
        } else {
            maxMove = (game.swimmersMoved.includes(pawnId)) ? 0 : 1; 
            // If already moved this turn using generic points, 0. Otherwise 1.
            if (maxMove > game.pointsLeft) maxMove = 0;
        }
    } else {
        maxMove = Math.min(3, game.pointsLeft);
    }

    if (maxMove <= 0) return { valid: false, reason: "แต้มเดินไม่เพียงพอ หรือนักว่ายน้ำขยับไปแล้วในรอบนี้" };

    return validatePath(game, fromHex, toHex, maxMove, 0, isWaterOnly);
};

const initializeGame = () => {
    return {
        board: generateHexGrid(),
        pawns: [],
        monsters: [
            "2,-5", "11,-5", "6,0", "1,4", "10,5"
        ].map((key, i) => {
            const [c, r] = key.split(',').map(Number);
            return {
                id: `monster-sea-dragon-${i}`,
                type: 'SEA_DRAGON',
                c, r
            };
        }),
        boats: [], // For storing boats: { id, c, r }
        players: [],
        playerHands: {}, // Holds unplaced pawns values mapping { socketId: [1,2,3,4,5] }
        playerCards: {}, // Holds cards obtained from sinking tiles
        currentPlayerIndex: 0,
        pointsLeft: 3,
        swimPointsLeft: 0,
        swimmersMoved: [],
        phase: 'PLACE_PAWNS',
        turn: 0
    };
};

function nextPhase(game) {
    if (game.phase === 'PLACE_PAWNS') {
        const anyPawnLeft = Object.values(game.playerHands).some(h => h.length > 0);
        if (anyPawnLeft) {
            // สลับคนวางทีละ 1 ตัว
            game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
            // เช็คว่าคนนี้ยังมีหมากเหลือให้วางไหม ถ้าไม่มีข้ามไปคนถัดไป? 
            // จริงๆ กติกาสลับกันวาง 1-5 จนครบ ทุกคนควรมีเท่ากัน ดังนั้นวนไปเรื่อยๆ ได้เลย
            const nextP = game.players[game.currentPlayerIndex];
            if (game.playerHands[nextP].length === 0) {
                // ถ้าคนนี้หมดแล้ว (กรณีแต้มไม่เท่ากันในอนาคต) ให้เช็คคนอื่น
                let found = false;
                for (let i = 0; i < game.players.length; i++) {
                    game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
                    if (game.playerHands[game.players[game.currentPlayerIndex]].length > 0) {
                        found = true;
                        break;
                    }
                }
                if (!found) game.phase = 'PLACE_BOATS';
            }
        } else {
            game.phase = 'PLACE_BOATS';
            game.currentPlayerIndex = 0; // เริ่มจากคนแรกใหม่
        }
    } else if (game.phase === 'PLACE_BOATS') {
        const totalBoats = game.boats.length;
        const requiredBoats = game.players.length * 2;
        if (totalBoats < requiredBoats) {
            // สลับคนวางเรือทีละ 1 ลำ
            game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
        } else {
            game.phase = 'MOVE_PAWNS';
            game.currentPlayerIndex = 0;
            game.pointsLeft = 3;
            game.swimPointsLeft = 0;
            game.turn = 1;
        }
    } else { // Original phases logic
        const phases = ['MOVE_PAWNS', 'SINK_TILE', 'ROLL_DIE', 'MOVE_CREATURE'];
        const currentIndex = phases.indexOf(game.phase);

        if (currentIndex === phases.length - 1) {
            game.phase = phases[0]; 
            game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
            game.turn += 1;
        } else {
            game.phase = phases[currentIndex + 1];
        }

        if (game.phase === 'MOVE_PAWNS') {
            game.pointsLeft = 3;
            game.swimPointsLeft = 0;
            game.swimmersMoved = [];
        }
    }

    return game;
}

function applyMonsterEffectsAt(game, c, r) {
    if (!game.monsters) return;
    const monstersHere = game.monsters.filter(m => m.c === c && m.r === r);
    if (monstersHere.length === 0) return;

    const hasSeaDragon = monstersHere.some(m => m.type === 'SEA_DRAGON');
    const hasShark = monstersHere.some(m => m.type === 'SHARK');
    const hasGodzilla = monstersHere.some(m => m.type === 'GODZILLA');

    const boatsHere = game.boats.filter(b => b.c === c && b.r === r);
    const boatIds = boatsHere.map(b => b.id);

    // 1. ฆ่าคนตามประเภทของอสูรกายก่อน (ตัดปัญหาหนีรอดจากเรือพัง)
    if (hasSeaDragon) {
        // มังกรทะเลกินรวบทุกคน ไม่ว่าจะอยู่บนดินหรือในน้ำ หรือในเรือ (แต่มันอยู่ได้แค่ในน้ำ) ยกเว้นคนรอดชีวิต
        game.pawns.forEach(pawn => {
            if (pawn.c === c && pawn.r === r && pawn.status !== 'SAVED' && pawn.status !== 'DEAD') {
                pawn.status = 'DEAD';
                pawn.boatId = null;
            }
        });
    } else if (hasShark) {
        // ฉลามกินแค่นักว่ายน้ำ
        const swimmersHere = game.pawns.filter(p => p.c === c && p.r === r && p.status === 'SWIMMER');
        if (swimmersHere.length > 0) {
            let sharkDefeated = false;
            // First check if anyone has the card
            for (const pawn of swimmersHere) {
                const ownerId = pawn.owner;
                if (game.playerCards && game.playerCards[ownerId] && game.playerCards[ownerId].includes('SHARK_REPELLENT')) {
                    const cardIndex = game.playerCards[ownerId].indexOf('SHARK_REPELLENT');
                    game.playerCards[ownerId].splice(cardIndex, 1);
                    if (game.monsters) {
                        game.monsters = game.monsters.filter(m => !(m.c === c && m.r === r && m.type === 'SHARK'));
                    }
                    sharkDefeated = true;
                    if (!game.actionLogs) game.actionLogs = [];
                    game.actionLogs.push(`ผู้เล่นใช้การ์ด ห้ามฉลามกิน ทำลายฉลามที่รอดชีวิต!`);
                    break;
                }
            }
            // If not defeated, everyone dies
            if (!sharkDefeated) {
                swimmersHere.forEach(pawn => pawn.status = 'DEAD');
            }
        }
    }

    // 2. ทำลายเรือ (มังกรทะเล และ ก๊อตซิล่า)
    if (hasSeaDragon || hasGodzilla) {
        if (boatIds.length > 0) {
            game.boats = game.boats.filter(b => !boatIds.includes(b.id));
            
            // คนที่นั่งเรือจะกลายเป็นนักว่ายน้ำ (ก๊อดซิล่าชน) ส่วนมังกรทำคนตายไปแล้วในข้อ 1
            game.pawns.forEach(pawn => {
                if (pawn.boatId && boatIds.includes(pawn.boatId)) {
                    pawn.status = 'SWIMMER';
                    pawn.boatId = null;
                }
            });
        }
    }
}

function moveMonster(game, socketId, monsterId, toHex, pointsLeft) {
    const monster = game.monsters.find(m => m.id === monsterId);
    if (!monster) return { success: false, message: "ไม่พบสัตว์ประหลาด" };

    const currentPlayerSocketId = game.players[game.currentPlayerIndex];
    if (currentPlayerSocketId !== socketId) return { success: false, message: "ไม่ใช่ตาของคุณ" };

    if (getHexDistance({ c: monster.c, r: monster.r }, toHex) > 1) {
        return { success: false, message: "กรุณาบังคับสัตว์ประหลาดเดินทีละ 1 ช่อง (ห้ามข้ามช่อง)" };
    }

    const targetTile = game.board.find(t => t.c === toHex.c && t.r === toHex.r);
    if (targetTile && targetTile.type === 'SAFE_ISLAND') {
        return { success: false, message: "สัตว์ประหลาดเข้าเกาะปลอดภัยไม่ได้" };
    }

    let maxMove = pointsLeft;
    const isShark = (monster.type === 'SHARK');

    // ใช้ validatePath เพื่อบังคับว่าผ่านได้แต่ช่องน้ำ (isWaterOnly = true)
    const pathResult = validatePath(game, { c: monster.c, r: monster.r }, toHex, maxMove, 0, true, isShark, false);
    if (!pathResult.valid) {
        let msg = `เดินทางไม่ถูกต้อง หรือระยะไกลเกิน ${maxMove} ช่อง`;
        if (isShark) msg += " (ฉลามไม่สามารถว่ายทับช่องที่มีเรือได้)";
        return { success: false, message: msg };
    }

    monster.c = toHex.c;
    monster.r = toHex.r;

    applyMonsterEffectsAt(game, toHex.c, toHex.r);

    return { success: true, dist: pathResult.dist };
}

// Removed duplicate placePawn

function placeBoatSetup(game, socketId, hex) {
    if (game.phase !== 'PLACE_BOATS') return { success: false, message: "ไม่ใช่ช่วงวางเรือ" };
    
    // ตรวจสอบว่าตานี้เป็นของใคร
    const expectedPlayer = game.players[game.currentPlayerIndex];
    if (socketId !== expectedPlayer) return { success: false, message: "ยังไม่ถึงตาคุณวางเรือ" };

    // ตรวจสอบจำนวนเรือ (คนละ 2 ลำ)
    const myBoats = game.boats.filter(b => b.owner === socketId);
    if (myBoats.length >= 2) return { success: false, message: "คุณวางเรือครบ 2 ลำแล้ว รอคนอื่นวางครับ" };

    const tile = game.board.find(t => t.c === hex.c && t.r === hex.r);
    if (!tile || tile.type !== 'SEA') return { success: false, message: "ต้องวางเรือในน้ำเท่านั้น" };

    const boat = {
        id: `boat-${socketId}-${Date.now()}`,
        owner: socketId,
        c: hex.c,
        r: hex.r,
        capacity: 3
    };
    game.boats.push(boat);

    // หลังจากวาง 1 ลำ ให้เปลี่ยนคน
    nextPhase(game);
    return { success: true };
}

function boardBoat(game, socketId, pawnId, boatId) {
    const pawn = game.pawns.find(p => p.id === pawnId);
    if (!pawn) return { success: false, message: "ไม่พบผู้เล่น" };
    if (pawn.owner !== socketId) return { success: false, message: "ไม่ใช่ตัวละครของคุณ" };

    const boat = game.boats.find(b => b.id === boatId);
    if (!boat) return { success: false, message: "ไม่พบเรือ" };

    const dist = getHexDistance({ c: pawn.c, r: pawn.r }, { c: boat.c, r: boat.r });
    if (dist !== 1) {
        return { success: false, message: "ตัวละครต้องอยู่ช่องติดกับเรือเพื่อขึ้นเรือ (ห้ามขึ้นเรือถ้าอยู่ในช่องเดียวกัน หรืออยู่ไกลเกินไป)" };
    }

    if (dist === 1 && game.pointsLeft < 1) {
        return { success: false, message: "แต้มเดินไม่พอ (การเดินขึ้นเรือจากช่องติดกันใช้ 1 แต้ม)" };
    }

    const pawnsInBoat = game.pawns.filter(p => p.boatId === boatId);
    if (pawnsInBoat.length >= 3) {
        return { success: false, message: "เรือจุเต็ม 3 คนแล้ว" };
    }

    pawn.c = boat.c;
    pawn.r = boat.r;
    pawn.boatId = boatId;
    pawn.status = 'IN_BOAT';
    
    return { success: true, cost: dist }; // ถ้า dist = 1 คือเสีย 1 แต้ม
}

function unboardBoat(game, socketId, pawnId) {
    const pawn = game.pawns.find(p => p.id === pawnId);
    if (!pawn) return { success: false, message: "ไม่พบผู้เล่น" };
    if (pawn.owner !== socketId) return { success: false, message: "ไม่ใช่ตัวละครของคุณ" };
    if (!pawn.boatId) return { success: false, message: "ผู้เล่นไม่ได้อยู่บนเรือ" };

    pawn.boatId = null;
    pawn.status = 'SWIMMER'; // ลงน้ำ
    return { success: true };
}

function moveBoat(game, socketId, boatId, toHex, pointsLeft) {
    const boat = game.boats.find(b => b.id === boatId);
    if (!boat) return { success: false, message: "ไม่พบเรือ" };

    const currentPlayerSocketId = game.players[game.currentPlayerIndex];
    if (currentPlayerSocketId !== socketId) return { success: false, message: "ไม่ใช่ตาของคุณ" };

    if (getHexDistance({ c: boat.c, r: boat.r }, toHex) > 1) {
        return { success: false, message: "กรุณาขับเรือทีละ 1 ช่อง (ห้ามข้ามช่อง)" };
    }

    const pawnsInBoat = game.pawns.filter(p => p.boatId === boatId);
    if (pawnsInBoat.length > 0) {
        const counts = {};
        pawnsInBoat.forEach(p => {
            counts[p.owner] = (counts[p.owner] || 0) + 1;
        });

        const myCount = counts[socketId] || 0;
        const maxCount = Math.max(...Object.values(counts));

        if (myCount < maxCount) {
            return { success: false, message: "คุณไม่มีสิทธิ์ขับเรือนี้ (มีคนอื่นบนเรือมากกว่า)" };
        }
    }

    const capacityNeeded = pawnsInBoat.length;
    const maxMove = Math.min(3, pointsLeft);
    const result = validatePath(game, {c: boat.c, r: boat.r}, toHex, maxMove, capacityNeeded, true, false, true);
    
    if (!result.valid) {
        return { success: false, message: "เส้นทางไม่ถูกต้อง ระยะไกลเกิน คนเต็ม หรือพายเรือทับฉลามไม่ได้" };
    }

    // Move the boat
    boat.c = toHex.c;
    boat.r = toHex.r;
    
    // Move all inside pawns synchronously
    pawnsInBoat.forEach(p => {
        p.c = toHex.c;
        p.r = toHex.r;
    });

    return { success: true, dist: result.dist };
}

function useCard(game, socketId, cardType, targetData) {
    if (game.phase !== 'MOVE_PAWNS') {
        return { success: false, message: "ต้องใช้งานการ์ดในช่วงเดินหมาก (MOVE_PAWNS) เท่านั้น" };
    }

    if (game.pointsLeft <= 0) {
        return { success: false, message: "ไม่สามารถใช้งานการ์ดได้เนื่องจากแต้มเดินหมดแล้ว (แต้มเป็น 0)" };
    }

    if (!game.playerCards[socketId] || !game.playerCards[socketId].includes(cardType)) {
        return { success: false, message: "คุณไม่มีการ์ดใบนี้" };
    }

    const cardIndex = game.playerCards[socketId].indexOf(cardType);
    
    // 1. DRIVE_BOAT and DOLPHIN: Grant points
    if (cardType === 'DRIVE_BOAT') {
        game.pointsLeft += 3;
        game.playerCards[socketId].splice(cardIndex, 1);
        return { success: true, message: "ใช้การ์ดขับเรือ! ได้แต้มเดินเพิ่ม 3 แต้ม" };
    }

    if (cardType === 'DOLPHIN') {
        game.swimPointsLeft += 3;
        game.playerCards[socketId].splice(cardIndex, 1);
        return { success: true, message: "ใช้การ์ดโลมา! นักว่ายน้ำจะสามารถว่ายน้ำได้เพิ่ม 3 ช่อง" };
    }

    // 2. DELETE_GODZILLA: Needs a target monsterId
    if (cardType === 'DELETE_GODZILLA') {
        const monster = game.monsters.find(m => m.id === targetData.monsterId && m.type === 'GODZILLA');
        if (!monster) return { success: false, message: "ไม่พบเป้าหมายก็อตซิล่า" };
        
        game.monsters = game.monsters.filter(m => m.id !== targetData.monsterId);
        game.playerCards[socketId].splice(cardIndex, 1);
        return { success: true, message: "ลบก็อตซิล่าออกสำเร็จ!" };
    }

    // 3. MOVE_SHARK, MOVE_GODZILLA, MOVE_SEA_DRAGON: Needs monsterId and toHex
    if (['MOVE_SHARK', 'MOVE_GODZILLA', 'MOVE_SEA_DRAGON'].includes(cardType)) {
        const monster = game.monsters.find(m => m.id === targetData.monsterId);
        if (!monster) return { success: false, message: "ไม่พบสัตว์ประหลาดเป้าหมาย" };
        
        // Validate card matches monster type
        const typeMap = { 'MOVE_SHARK': 'SHARK', 'MOVE_GODZILLA': 'GODZILLA', 'MOVE_SEA_DRAGON': 'SEA_DRAGON' };
        if (monster.type !== typeMap[cardType]) return { success: false, message: "ประเภทการ์ดไม่ตรงกับสัตว์ประหลาด" };

        const targetTile = game.board.find(t => t.c === targetData.toHex.c && t.r === targetData.toHex.r);
        if (!targetTile || !targetTile.isRevealed) return { success: false, message: "ต้องย้ายไปในน้ำเท่านั้น" };

        monster.c = targetData.toHex.c;
        monster.r = targetData.toHex.r;
        
        applyMonsterEffectsAt(game, monster.c, monster.r);
        
        game.playerCards[socketId].splice(cardIndex, 1);
        return { success: true, message: `ย้าย ${monster.type} สำเร็จ!` };
    }

    return { success: false, message: "การ์ดรังนี้ยังไม่รองรับ" };
}

module.exports = {
    initializeGame,
    validateMove,
    placePawn,
    placeBoatSetup,
    sinkTile,
    getHexDistance,
    nextPhase,
    moveMonster,
    boardBoat,
    unboardBoat,
    moveBoat,
    countPawnsAt,
    shuffleArray,
    isCoastal,
    applyMonsterEffectsAt,
    useCard
};