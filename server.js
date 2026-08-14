const express    = require('express');
const { createServer } = require('http');
const { Server }  = require('socket.io');
const path        = require('path');

const app    = express();
const http   = createServer(app);
const io     = new Server(http);
const PORT   = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// ── Minecraft world state ──────────────────────────────────────────────────
const blockChanges = {}; // "x,y,z" -> type (0 = air/removed)
const players      = {}; // socketId -> { id, name, color, x, y, z, ry }
const COLORS       = ['#ff4444','#44aaff','#44ff88','#ffaa44','#ff44ff','#ffff44','#ff8844','#44ffff'];
let colorIdx = 0;

function sanitizeName(name) {
  return String(name || 'Player').replace(/[<>]/g, '').replace(/[\x00-\x1f]/g, '').trim().slice(0, 16) || 'Player';
}

io.on('connection', socket => {
  const myColor = COLORS[colorIdx++ % COLORS.length];

  // Send world state + existing players + assigned color
  socket.emit('init', { blockChanges, players, color: myColor });

  socket.on('join', ({ name }) => {
    players[socket.id] = { id: socket.id, name: sanitizeName(name), color: myColor,
                           x: 0, y: 10, z: 0, ry: 0 };
    socket.broadcast.emit('playerJoin', players[socket.id]);
  });

  socket.on('move', data => {
    const p = players[socket.id];
    if (p && Number.isFinite(data?.x) && Number.isFinite(data?.y) && Number.isFinite(data?.z) && Number.isFinite(data?.ry)) {
      p.x = data.x; p.y = data.y; p.z = data.z; p.ry = data.ry;
      socket.broadcast.emit('playerMove', { id: socket.id, x: p.x, y: p.y, z: p.z, ry: p.ry });
    }
  });

  socket.on('blockChange', data => {
    const { x, y, z, type } = data || {};
    const MAX_COORD = 100000;
    if (![x, y, z, type].every(Number.isInteger) || Math.abs(x) > MAX_COORD || Math.abs(y) > MAX_COORD || Math.abs(z) > MAX_COORD) return;
    blockChanges[`${x},${y},${z}`] = type;
    socket.broadcast.emit('blockChange', { x, y, z, type });
  });

  socket.on('chat', ({ msg }) => {
    const name = players[socket.id]?.name || 'Player';
    const safeMsg = String(msg ?? '').slice(0, 200);
    if (!safeMsg.trim()) return;
    io.emit('chat', { name, msg: safeMsg, color: myColor });
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerLeave', socket.id);
  });
});

http.listen(PORT, () => console.log(`Server on port ${PORT}`));
