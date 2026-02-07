import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index', 'index.html'));
});

app.get('/host', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/host', 'index.html'));
});

app.get('/join', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/join', 'index.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

const games = {};

function generatePin() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('host', (data, callback) => {
    const pin = generatePin();
    games[pin] = {
      pin,
      host: socket.id,
      players: [],
      started: false
    };
    socket.join(`game-${pin}`);
    callback({ pin });
    console.log('Game created:', pin);
  });

  socket.on('join', (data, callback) => {
    const { pin, name } = data;
    const game = games[pin];
    
    if (!game) {
      callback({ error: 'Game not found' });
      return;
    }
    
    game.players.push(name);
    socket.join(`game-${pin}`);
    
    io.to(`game-${pin}`).emit('players-updated', game.players);
    callback({ success: true, players: game.players });
  });
});

server.listen(3000, () => console.log('Server running on :3000'));