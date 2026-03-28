require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { Pool } = require('pg');
// นำเข้าฟังก์ชันจาก gameLogic ให้ครบถ้วน (รวม nextPhase เข้ามาด้วย)
const { initializeGame, validateMove, placePawn, sinkTile, nextPhase, moveMonster, boardBoat, unboardBoat, moveBoat, placeBoatSetup, countPawnsAt, shuffleArray, isCoastal, applyMonsterEffectsAt, useCard } = require('./gameLogic');
const { runMigrations } = require('./migration/init');

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Database Connection ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
});

pool.connect(async (err, client, release) => {
    if (err) {
        return console.error('❌ Database Connection Error:', err.stack);
    }
    console.log('✅ PostgreSQL Connected Successfully!');
    release();

    // รัน migration อัตโนมัติ — สร้างตารางถ้ายังไม่มี
    await runMigrations(pool);
});

const server = http.createServer(app);
const io = require("socket.io")(server, {
    cors: {
        origin: "*", // หรือใส่ URL ของ Frontend ของคุณเพื่อความปลอดภัย
        methods: ["GET", "POST"]
    }
});

const rooms = {};

// --- API สำหรับระบบสมาชิก ---

app.post('/api/register', async (req, res) => {
    const { id, password, name } = req.body;
    if (!id || !password || !name) {
        return res.status(400).json({ success: false, message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }
    try {
        const checkUser = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (checkUser.rows.length > 0) {
            return res.status(400).json({ success: false, message: "ID นี้มีผู้ใช้งานแล้ว" });
        }
        await pool.query(
            'INSERT INTO users (id, password, name) VALUES ($1, $2, $3)',
            [id, password, name]
        );
        res.json({ success: true, message: "ลงทะเบียนสำเร็จ" });
    } catch (err) {
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดที่ฐานข้อมูล" });
    }
});

app.post('/api/login', async (req, res) => {
    const { id, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT name FROM users WHERE id = $1 AND password = $2',
            [id, password]
        );
        if (result.rows.length > 0) {
            res.json({ success: true, name: result.rows[0].name });
        } else {
            res.status(401).json({ success: false, message: "ID หรือ Password ไม่ถูกต้อง" });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดที่ฐานข้อมูล" });
    }
});

// --- ระบบ Game Socket.io ---

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // 1. เข้าร่วมห้อง
    socket.on('join-room', ({ roomId, playerName }) => {
        socket.join(roomId);
        if (!rooms[roomId]) {
            rooms[roomId] = {
                ...initializeGame(),
                id: roomId,
                host: socket.id,
                lobbyPlayers: [], // สร้าง array แยกเพื่อเก็บ {id, name, isReady}
                isStarted: false
            };
        }

        const room = rooms[roomId];
        const isExist = room.lobbyPlayers.find(p => p.id === socket.id);
        if (!isExist) {
            room.lobbyPlayers.push({
                id: socket.id,
                name: playerName || `Player ${room.lobbyPlayers.length + 1}`,
                isReady: false
            });
        }

        io.to(roomId).emit('lobby-update', {
            players: room.lobbyPlayers,
            host: room.host,
            isStarted: room.isStarted
        });

        if (room.isStarted) {
            socket.emit('init-state', room);
        }
        console.log(`User ${socket.id} (${playerName}) joined room: ${roomId}`);
    });

    // 2. ระบบกด Ready (สำหรับ Guest)
    socket.on('player-ready', ({ roomId }) => {
        const room = rooms[roomId];
        if (!room) return;

        const player = room.lobbyPlayers.find(p => p.id === socket.id);
        if (player) {
            player.isReady = !player.isReady;
            io.to(roomId).emit('lobby-update', {
                players: room.lobbyPlayers,
                host: room.host,
                isStarted: room.isStarted
            });
        }
    });

    // 3. ระบบกด Start Game (สำหรับ Host เท่านั้น)
    socket.on('start-game', ({ roomId }) => {
        const room = rooms[roomId];
        if (!room || room.host !== socket.id) return;

        // เช็คว่าทุกคน Ready หรือยัง (หรือเอาแค่ให้เริ่มได้ถ้ามีคน)
        if (room.lobbyPlayers.length >= 1) { // อนุโลม 1 คนสำหรับการทดสอบ
            room.isStarted = true;
            // โยน array ของ id ล้วนให้ gameLogic ใช้
            room.players = room.lobbyPlayers.map(p => p.id);

            room.playerHands = {};
            room.playerCards = {};
            room.players.forEach(pid => {
                room.playerHands[pid] = shuffleArray([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
                room.playerCards[pid] = [];
            });

            io.to(roomId).emit('lobby-update', {
                players: room.lobbyPlayers,
                host: room.host,
                isStarted: room.isStarted
            });
            io.to(roomId).emit('init-state', room);
            io.to(roomId).emit('update-state', room);
            console.log(`[Game] Room ${roomId} started by Host!`);
        } else {
            socket.emit('error-msg', "ต้องมีผู้เล่นเพื่อเริ่มเกมครับ");
        }
    });

    // 2. วางตัวละคร (ช่วงเริ่มเกม)
    socket.on('place-pawn', ({ roomId, hex, playerName, pawnValue }) => {
        const game = rooms[roomId];
        if (!game) return;

        const result = placePawn(game, socket.id, hex, playerName, pawnValue);

        if (result.success) {
            io.to(roomId).emit('update-state', game);
            console.log(`[Game] ${playerName} placed a pawn value ${pawnValue} at (${hex.c}, ${hex.r}) phase: ${game.phase}`);
        } else {
            socket.emit('error-msg', result.message);
        }
    });

    // 2.5 วางเรือ (หลังวางคน)
    socket.on('place-boat', ({ roomId, hex }) => {
        const game = rooms[roomId];
        if (!game || game.phase !== 'PLACE_BOATS') return;

        const result = placeBoatSetup(game, socket.id, hex);

        if (result.success) {
            io.to(roomId).emit('update-state', game);
            console.log(`[Game] ${socket.id} placed a boat at (${hex.c}, ${hex.r}) phase: ${game.phase}`);
        } else {
            socket.emit('error-msg', result.message);
        }
    });

    // 3. ขยับตัวละคร
    socket.on('move-pawn', ({ roomId, pawnId, fromHex, toHex }) => {
        const game = rooms[roomId];
        // ตรวจสอบความถูกต้อง: ต้องอยู่ในเฟสเดิน
        if (!game || game.phase !== 'MOVE_PAWNS') return;

        const validPath = validateMove(game, socket.id, fromHex, toHex, pawnId, game.pointsLeft);
        if (validPath && validPath.valid) {
            const pawn = game.pawns.find(p => p.id === pawnId);

            if (pawn.status === 'SWIMMER' && game.swimmersMoved.includes(pawnId)) {
                socket.emit('error-msg', "นักว่ายน้ำเคลื่อนที่ได้แค่ 1 ครั้งต่อรอบ!");
                return;
            }

            const dist = validPath.dist;

            // Subtract points
            if (pawn.status === 'SWIMMER' && game.swimPointsLeft >= dist) {
                game.swimPointsLeft -= dist;
            } else {
                if (game.pointsLeft < dist) {
                    socket.emit('error-msg', `คุณมีแต้มเดินไม่พอ (ต้องการ ${dist} แต่เหลือ ${game.pointsLeft})`);
                    return;
                }
                game.pointsLeft -= dist;
                if (pawn.status === 'SWIMMER') {
                    game.swimmersMoved.push(pawnId);
                }
            }

            pawn.c = toHex.c; pawn.r = toHex.r;

            const targetTile = game.board.find(t => t.c === toHex.c && t.r === toHex.r);
            if (targetTile && targetTile.type === 'SAFE_ISLAND') {
                pawn.status = 'SAVED'; // หนีรอด!
            } else if (!targetTile || targetTile.isRevealed || targetTile.type === 'SEA') {
                pawn.status = 'SWIMMER'; // ตกน้ำ
            } else {
                pawn.status = 'LAND'; // ขึ้นฝั่ง หรือเดินบนบก
            }

            if (pawn.boatId) {
                pawn.boatId = null; // ออกจากเรือแน่ๆ (ถ้าลงน้ำหรือขึ้นฝั่ง)
            }

            // Auto-boarding: ถ้าตกลงในช่องที่มีเรือ และเรือยังมีที่ว่าง (ไม่เกิน 3 คน) ให้โดดขึ้นเรือเลย
            if (pawn.status === 'SWIMMER') {
                const boatsHere = game.boats.filter(b => b.c === toHex.c && b.r === toHex.r);
                for (let b of boatsHere) {
                    const pawnsInBoat = game.pawns.filter(p => p.boatId === b.id);
                    if (pawnsInBoat.length < 3) {
                        pawn.boatId = b.id;
                        pawn.status = 'IN_BOAT';
                        console.log(`[Auto-board] Pawn ${pawn.id} boarded boat ${b.id}`);
                        break;
                    }
                }
            }

            applyMonsterEffectsAt(game, toHex.c, toHex.r);

            if (game.pointsLeft === 0 && game.swimPointsLeft === 0) {
                // เดินเสร็จแล้วแต้มหมด ขยับไปทอยเต๋า หรือ จมไทล์
                nextPhase(game);
            }

            io.to(roomId).emit('update-state', game);
        } else {
            console.log(`[Move Rejected] socket=${socket.id}, pawn=${pawnId}, points=${game.pointsLeft}, validPath=`, validPath);
            let reason = "ไม่ทราบสาเหตุ";
            if (!validPath) {
                reason = "เกิดข้อผิดพลาดในการตรวจสอบเส้นทาง";
            } else if (!validPath.valid) {
                const pawn = game.pawns.find(p => p.id === pawnId);
                const currentPlayerSocketId = game.players[game.currentPlayerIndex];
                if (currentPlayerSocketId !== socket.id) reason = "ไม่ใช่ตาของคุณ (หรือเกิดจาก Refresh หน้าจอ แล้ว Session หลุด)";
                else if (!pawn) reason = "ไม่พบนักสำรวจตัวนี้ในระบบ";
                else reason = validPath.reason || "ไม่สามารถเดินไปช่องนี้ได้ ผิดกติกาหรือไกลเกินไป";
            }
            socket.emit('error-msg', `ไม่สามารถเดินได้: ${reason}`);
        }
    });

    socket.on('end-move-phase', ({ roomId }) => {
        const game = rooms[roomId];
        if (!game || game.phase !== 'MOVE_PAWNS') return;
        const currentPlayerSocketId = game.players[game.currentPlayerIndex];
        if (currentPlayerSocketId !== socket.id) return;

        nextPhase(game);
        io.to(roomId).emit('update-state', game);
    });

    // 4. จมไทล์
    socket.on('sink-tile', ({ roomId, c, r }) => {
        const game = rooms[roomId];
        // ตรวจสอบความถูกต้อง: ต้องอยู่ในเฟสจม และเป็นตาของ socket นี้
        if (!game || game.phase !== 'SINK_TILE') return;
        const currentPlayerSocketId = game.players[game.currentPlayerIndex];
        if (currentPlayerSocketId !== socket.id) return;

        const result = sinkTile(game, c, r);

        if (result.success) {
            // Check for Keepable Cards
            if (result.event && result.event.type === 'KEEP_CARD') {
                if (!game.playerCards) game.playerCards = {};
                if (!game.playerCards[socket.id]) game.playerCards[socket.id] = [];
                game.playerCards[socket.id].push(result.event.value);
            }

            // Check for Events
            if (result.event && result.event.type === 'EVENT') {
                if (result.event.value === 'FREE_BOAT') {
                    const newBoatId = `boat-${Date.now()}-${Math.random()}`;
                    game.boats.push({
                        id: newBoatId,
                        c, r,
                        capacity: 3,
                        owner: socket.id
                    });

                    // Note: Auto-boarding removed. Pawns in this hex become swimmers and must board from adjacent hex manually.
                    game.pawns.forEach(p => {
                        if (p.c === c && p.r === r && p.status !== 'DEAD' && p.status !== 'SAVED') {
                            p.status = 'SWIMMER';
                            p.boatId = null;
                        }
                    });
                } else if (result.event.value === 'WHIRLPOOL') {
                    // Calculate surrounding water hexes
                    const diffs = Math.abs(c) % 2 === 0
                        ? [[0, -1], [1, -1], [1, 0], [0, 1], [-1, 0], [-1, -1]]
                        : [[0, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
                    const waterHexes = [{ c, r }]; // include center
                    diffs.forEach(([dc, dr]) => {
                        const nc = c + dc;
                        const nr = r + dr;
                        const tile = game.board.find(t => t.c === nc && t.r === nr);
                        if (!tile || tile.isRevealed) { // SEA or SUNK
                            waterHexes.push({ c: nc, r: nr });
                        }
                    });

                    waterHexes.forEach(hex => {
                        // Kill pawns
                        game.pawns.forEach(p => {
                            if (p.c === hex.c && p.r === hex.r && p.status !== 'DEAD' && p.status !== 'SAVED') {
                                p.status = 'DEAD';
                                p.boatId = null;
                            }
                        });
                        // Destroy boats
                        game.boats = game.boats.filter(b => b.c !== hex.c || b.r !== hex.r);
                        // Destroy monsters
                        if (game.monsters) {
                            game.monsters = game.monsters.filter(m => m.c !== hex.c || m.r !== hex.r);
                        }
                    });
                }
            } else if (result.event && result.event.type === 'CREATURE') {
                if (!game.monsters) game.monsters = [];
                game.monsters.push({
                    id: `monster-${Date.now()}-${Math.random()}`,
                    type: result.event.value,
                    c, r
                });

                applyMonsterEffectsAt(game, c, r);
            }

            if (result.gameOver) {
                // Calculate leaderboard
                const scores = game.players.map(pid => {
                    const playerObj = game.lobbyPlayers.find(lp => lp.id === pid);
                    const playerName = playerObj ? playerObj.name : "Unknown";
                    
                    const playerScore = game.pawns
                        .filter(p => p.owner === pid && p.status === 'SAVED')
                        .reduce((sum, p) => sum + (p.value || 0), 0);
                    
                    return { id: pid, name: playerName, score: playerScore };
                });

                // Sort by score descending
                scores.sort((a, b) => b.score - a.score);

                io.to(roomId).emit('game-over', { scores, game });
                console.log(`[Game] Volcano found! Game over. Scores:`, scores);
            } else {
                nextPhase(game);
            }

            // ส่ง Event พิเศษบอกว่า "มีการระเบิด/จม" เพื่อให้หน้าจอทำ Antigravity Effect
            io.to(roomId).emit('antigravity-impulse', {
                origin: { c, r },
                updatedPawns: game.pawns // ส่งพิกัดและความเร็วใหม่ของหมากทุกตัว
            });

            io.to(roomId).emit('tile-sunk', { c, r, event: result.event });
            io.to(roomId).emit('update-state', game);
            console.log(`[Game] Tile at (${c}, ${r}) sunk with antigravity effect!`);
        } else {
            socket.emit('error-msg', result.message);
        }
    });

    // 5. ทอยลูกเต๋าสัตว์ร้าย
    socket.on('roll-creature-die', ({ roomId }) => {
        const game = rooms[roomId];
        if (!game || game.phase !== 'ROLL_DIE') return;
        const currentPlayerSocketId = game.players[game.currentPlayerIndex];
        if (currentPlayerSocketId !== socket.id) return;

        const creatures = ['SHARK', 'GODZILLA', 'SEA_DRAGON'];
        const rolled = creatures[Math.floor(Math.random() * creatures.length)];

        game.lastRoll = rolled;

        let points = 3;
        if (rolled === 'SEA_DRAGON') points = 1;
        else if (rolled === 'SHARK') points = 2;

        game.monsterPointsLeft = points;

        // ทอยเสร็จขยับไปเฟส "ขยับสัตว์ร้าย"
        nextPhase(game);

        io.to(roomId).emit('creature-rolled', { rolled });
        io.to(roomId).emit('update-state', game);
    });

    // 6. ขยับสัตว์ร้าย
    socket.on('move-creature', ({ roomId, monsterId, toHex }) => {
        const game = rooms[roomId];
        if (!game || game.phase !== 'MOVE_CREATURE') return;

        const result = moveMonster(game, socket.id, monsterId, toHex, game.monsterPointsLeft);
        if (result.success) {
            game.monsterPointsLeft -= result.dist;
            if (game.monsterPointsLeft <= 0) {
                // จบเทิร์นทั้งหมด กลับไป MOVE_PAWNS ของคนถัดไป
                nextPhase(game);
            }
            io.to(roomId).emit('update-state', game);
        } else {
            socket.emit('error-msg', result.message);
        }
    });

    socket.on('skip-creature', ({ roomId }) => {
        const game = rooms[roomId];
        if (!game || game.phase !== 'MOVE_CREATURE') return;
        const currentPlayerSocketId = game.players[game.currentPlayerIndex];
        if (currentPlayerSocketId !== socket.id) return;

        game.monsterPointsLeft = 0;
        nextPhase(game);
        io.to(roomId).emit('update-state', game);
    });

    // 7. จัดการเรือ
    socket.on('board-boat', ({ roomId, pawnId, boatId }) => {
        const game = rooms[roomId];
        if (!game || game.phase !== 'MOVE_PAWNS') return;

        const result = boardBoat(game, socket.id, pawnId, boatId);
        if (result.success) {
            const pawn = game.pawns.find(p => p.id === pawnId);
            // Subtract point
            if (pawn.status === 'SWIMMER' && game.swimPointsLeft > 0) {
                game.swimPointsLeft--;
            } else {
                game.pointsLeft--;
            }

            if (game.pointsLeft === 0 && game.swimPointsLeft === 0) {
                nextPhase(game);
            }
            io.to(roomId).emit('update-state', game);
        } else {
            socket.emit('error-msg', result.message);
        }
    });

    // unboard-boat is now handled via move-pawn to adjacent tiles to avoid same-hex bug
    socket.on('unboard-boat', ({ roomId, pawnId }) => {
        // Redundant but keeping empty or removing
    });

    socket.on('move-boat', ({ roomId, boatId, toHex }) => {
        const game = rooms[roomId];
        if (!game || game.phase !== 'MOVE_PAWNS') return;

        const result = moveBoat(game, socket.id, boatId, toHex, game.pointsLeft);
        if (result.success) {
            game.pointsLeft -= result.dist;

            const targetTile = game.board.find(t => t.c === toHex.c && t.r === toHex.r);
            if (targetTile && targetTile.type === 'SAFE_ISLAND') {
                // คนรอดหมด
                const pawnsInBoat = game.pawns.filter(p => p.boatId === boatId);
                pawnsInBoat.forEach(p => p.status = 'SAVED');
                // เอาเรือออกด้วย
                game.boats = game.boats.filter(b => b.id !== boatId);
            } else {
                applyMonsterEffectsAt(game, toHex.c, toHex.r);

                // Auto-Boarding: Pick up any swimmer in THIS hex if boat has space
                const boatObj = game.boats.find(b => b.id === boatId);
                const swimmersHere = game.pawns.filter(p => p.c === toHex.c && p.r === toHex.r && p.status === 'SWIMMER');
                for (const s of swimmersHere) {
                    const currentCount = game.pawns.filter(px => px.boatId === boatId).length;
                    if (currentCount < 3) {
                        s.boatId = boatId;
                        s.status = 'IN_BOAT';
                    }
                }
            }

            if (game.pointsLeft === 0 && game.swimPointsLeft === 0) {
                nextPhase(game); // หมดแต้มก็เปลี่ยนเทิร์น
            }
            io.to(roomId).emit('update-state', game);
        } else {
            socket.emit('error-msg', result.message);
        }
    });

    socket.on('use-card', ({ roomId, cardType, targetData }) => {
        const game = rooms[roomId];
        if (!game) return;

        const result = useCard(game, socket.id, cardType, targetData);
        if (result.success) {
            if (result.message) {
                if (!game.actionLogs) game.actionLogs = [];
                game.actionLogs.push(result.message);
            }
            io.to(roomId).emit('update-state', game);
            socket.emit('success-msg', result.message);
        } else {
            socket.emit('error-msg', result.message);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);

        for (const roomId in rooms) {
            const room = rooms[roomId];

            // หาว่าคนที่หลุดอยู่ในห้องนี้ไหม
            if (room && room.lobbyPlayers) {
                const index = room.lobbyPlayers.findIndex(p => p.id === socket.id);
                if (index !== -1) {
                    room.lobbyPlayers.splice(index, 1); // เอาชื่อออกจากลิสต์

                    if (room.lobbyPlayers.length === 0) {
                        delete rooms[roomId]; // ลบห้องทิ้งถ้ายกเลิกกันหมด
                        console.log(`[Game] Room ${roomId} was deleted.`);
                    } else {
                        // โอนสิทธิ์ Host ให้คนถัดไป
                        if (room.host === socket.id) {
                            room.host = room.lobbyPlayers[0].id;
                        }

                        // อัปเดต Lobby ให้คนอื่นๆ เน็ตไม่หลุด
                        io.to(roomId).emit('lobby-update', {
                            players: room.lobbyPlayers,
                            host: room.host,
                            isStarted: room.isStarted
                        });
                    }
                }
            }
        }
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================`);
    console.log(`🚀 Survive Backend is ONLINE!`);
    console.log(`📡 Listening on Port: ${PORT}`);
    console.log(`====================================`);
});