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

io.on('connection', socket => {
  const myColor = COLORS[colorIdx++ % COLORS.length];

  // Send world state + existing players + assigned color
  socket.emit('init', { blockChanges, players, color: myColor });

  socket.on('join', ({ name }) => {
    players[socket.id] = { id: socket.id, name: name || 'Player', color: myColor,
                           x: 0, y: 10, z: 0, ry: 0 };
    socket.broadcast.emit('playerJoin', players[socket.id]);
  });

  socket.on('move', data => {
    if (players[socket.id]) {
      Object.assign(players[socket.id], data);
      socket.broadcast.emit('playerMove', { id: socket.id, ...data });
    }
  });

  socket.on('blockChange', data => {
    blockChanges[`${data.x},${data.y},${data.z}`] = data.type;
    socket.broadcast.emit('blockChange', data);
  });

  socket.on('chat', ({ msg }) => {
    const name = players[socket.id]?.name || 'Player';
    io.emit('chat', { name, msg, color: myColor });
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerLeave', socket.id);
  });
});

http.listen(PORT, () => console.log(`Server on port ${PORT}`));
