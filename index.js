const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*' }
});

var games = {};

function generatePin() {
    return Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join', (data, callback) => {
    const { pin, name } = data;
    
    if (!pin || !name) {
      callback({ error: 'Missing pin or name' });
      return;
    }
    
    // Find or create game room
    socket.join(`game-${pin}`);
    
    callback({
      success: true,
      players: [name] // Replace with actual player list
    });
  });
});

server.listen(3000, () => console.log('Server running on :3000'));