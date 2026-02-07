// Frontend Usage Guide:
// 
// 1. Connect to server:
//    const socket = io('http://localhost:3000');
//
// 2. Host creates a game:
//    socket.emit('host', ({ pin }) => {
//      console.log('Game PIN:', pin);
//    });
//
// 3. Player joins a game:
//    socket.emit('join', { pin: 'ABC123', name: 'PlayerName' }, (response) => {
//      if (response.error) console.error(response.error);
//      else console.log('Joined! Players:', response.players);
//    });
//
// 4. Listen for player updates:
//    socket.on('players-updated', (playerList) => {
//      console.log('Current players:', playerList);
//    });
//
// 5. Host starts the game:
//    socket.emit('start-game', (response) => {
//      if (response.success) console.log('Game started!');
//    });
//
// 6. Listen for game start:
//    socket.on('game-started', (gameState) => {
//      console.log('Game is starting!', gameState);
//    });
//
// 7. Send game actions:
//    socket.emit('game-action', { type: 'move', data: { x: 10, y: 20 } });
//
// 8. Listen for game updates:
//    socket.on('game-update', (gameState) => {
//      console.log('Game state updated:', gameState);
//    });
//
// 9. Listen for game end:
//    socket.on('game-ended', ({ reason }) => {
//      console.log('Game ended:', reason);
//    });

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.json());

// Store active games: { pin: { host: socketId, players: Map(socketId -> playerData), gameState: {} } }
const games = new Map();

function generatePin() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Host creates a game
  socket.on('host', (callback) => {
    const pin = generatePin();
    games.set(pin, {
      host: socket.id,
      players: new Map([[socket.id, { id: socket.id, name: 'Host', isHost: true }]]),
      gameState: { started: false }
    });
    socket.join(pin);
    callback({ pin });
  });

  // Player joins a game by PIN
  socket.on('join', ({ pin, name }, callback) => {
    const game = games.get(pin);
    if (!game) {
      return callback({ error: 'Game not found' });
    }
    
    game.players.set(socket.id, { id: socket.id, name, isHost: false });
    socket.join(pin);
    
    // Send updated player list to everyone in the game
    const playerList = Array.from(game.players.values());
    io.to(pin).emit('players-updated', playerList);
    
    callback({ success: true, players: playerList });
  });

  // Host starts the game
  socket.on('start-game', (callback) => {
    const game = findGameBySocket(socket.id);
    if (!game || game.host !== socket.id) {
      return callback({ error: 'Not authorized' });
    }
    
    game.gameState.started = true;
    io.to(game.pin).emit('game-started', game.gameState);
    callback({ success: true });
  });

  // Handle game actions (customize based on your game)
  socket.on('game-action', (data) => {
    const game = findGameBySocket(socket.id);
    if (!game) return;
    
    // Update game state
    // Broadcast to all players
    io.to(game.pin).emit('game-update', game.gameState);
  });

  socket.on('disconnect', () => {
    const game = findGameBySocket(socket.id);
    if (game) {
      game.players.delete(socket.id);
      
      // If host leaves, end the game
      if (game.host === socket.id) {
        io.to(game.pin).emit('game-ended', { reason: 'Host left' });
        games.delete(game.pin);
      } else {
        // Update remaining players
        const playerList = Array.from(game.players.values());
        io.to(game.pin).emit('players-updated', playerList);
      }
    }
  });
});

function findGameBySocket(socketId) {
  for (const [pin, game] of games.entries()) {
    if (game.players.has(socketId)) {
      return { ...game, pin };
    }
  }
  return null;
}

app.get('/', (req, res) => {
  res.send('OK');
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});