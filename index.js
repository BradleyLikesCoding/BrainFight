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

const BENCHMARKS = [
  { id: 'reaction-speed', name: 'Reaction Speed', url: '/benchmarks/reaction-speed/index.html' },
  { id: 'typing-test',    name: 'Typing Test',    url: '/benchmarks/typing-test/index.html' },
  { id: 'number-memory',  name: 'Number Memory',  url: '/benchmarks/number-memory/index.html' },
  { id: 'verbal-memory',  name: 'Verbal Memory',  url: '/benchmarks/verbal-memory/index.html' },
];

function generatePin() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function pickBenchmark() {
  return BENCHMARKS[Math.floor(Math.random() * BENCHMARKS.length)];
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('host', (callback) => {
    const pin = generatePin();
    games[pin] = {
      pin,
      host: socket.id,
      players: [],        // [{name, socketId}]
      started: false,
      currentBenchmark: null,
      scores: {},          // { socketId: { name, score } }
      round: 0,
    };
    socket.join(`game-${pin}`);
    socket._hostedGame = pin;
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

    if (socket._joinedGame) {
      callback({ error: 'You have already joined a game' });
      return;
    }

    const nameTaken = game.players.some(p => p.name === name);
    if (nameTaken) {
      callback({ error: 'That name is already taken' });
      return;
    }

    game.players.push({ name, socketId: socket.id });
    socket.join(`game-${pin}`);
    socket._joinedGame = pin;
    socket._playerName = name;

    const playerNames = game.players.map(p => p.name);
    io.to(`game-${pin}`).emit('players-updated', playerNames);
    callback({ success: true, players: playerNames });
  });

  // Host starts the game
  socket.on('start-game', (settings, callback) => {
    const pin = socket._hostedGame;
    if (!pin || !games[pin]) {
      callback({ error: 'No game found' });
      return;
    }

    const game = games[pin];
    if (game.host !== socket.id) {
      callback({ error: 'Only the host can start' });
      return;
    }

    if (game.players.length === 0) {
      callback({ error: 'Need at least 1 player' });
      return;
    }

    // Apply settings on first round, reuse on subsequent rounds
    if (settings) {
      game.settings = {
        mode: settings.mode || 'random',
        game: settings.game || null,
        totalRounds: settings.totalRounds || 3,
      };
      game.round = 0;
    }

    const s = game.settings || { mode: 'random', game: null, totalRounds: 3 };

    // Pick benchmark based on mode
    let benchmark;
    if (s.mode === 'single' && s.game) {
      benchmark = BENCHMARKS.find(b => b.id === s.game) || pickBenchmark();
    } else {
      benchmark = pickBenchmark();
    }

    game.currentBenchmark = benchmark;
    game.scores = {};
    game.round += 1;
    game.started = true;

    console.log(`Game ${pin} round ${game.round}/${s.totalRounds}: ${benchmark.name}`);

    io.to(`game-${pin}`).emit('game-start', {
      benchmark: benchmark,
      round: game.round,
      totalRounds: s.totalRounds,
    });

    callback({ success: true, benchmark });
  });

  // Player or host submits a score
  socket.on('submit-score', (data) => {
    const pin = socket._joinedGame || socket._hostedGame;
    if (!pin || !games[pin]) return;

    const game = games[pin];
    const name = socket._playerName || 'Host';

    game.scores[socket.id] = {
      name: name,
      score: data.score,
    };

    // Check if all players submitted (host doesn't count as a player)
    const expectedCount = game.players.length;
    const playerScores = game.players.filter(p => game.scores[p.socketId]).length;

    console.log(`Score from ${name}: ${data.score} (${playerScores}/${expectedCount})`);

    if (playerScores >= expectedCount) {
      // All players done, build scoreboard
      const scoreboard = game.players.map(p => {
        const s = game.scores[p.socketId];
        return { name: p.name, score: s ? s.score : null };
      }).sort((a, b) => {
        if (a.score === null) return 1;
        if (b.score === null) return -1;
        return a.score - b.score; // lower is better for most benchmarks
      });

      io.to(`game-${pin}`).emit('round-results', {
        benchmark: game.currentBenchmark.name,
        round: game.round,
        totalRounds: (game.settings || {}).totalRounds || 3,
        scoreboard,
      });

      game.started = false;
      game.currentBenchmark = null;
      game.scores = {};
    }
  });

  // Remove player on disconnect
  socket.on('disconnect', () => {
    if (socket._joinedGame) {
      const game = games[socket._joinedGame];
      if (game) {
        game.players = game.players.filter(p => p.socketId !== socket.id);
        const playerNames = game.players.map(p => p.name);
        io.to(`game-${socket._joinedGame}`).emit('players-updated', playerNames);
      }
    }
    // Clean up hosted game if host disconnects
    if (socket._hostedGame) {
      const game = games[socket._hostedGame];
      if (game) {
        io.to(`game-${socket._hostedGame}`).emit('game-ended', { reason: 'Host disconnected' });
        delete games[socket._hostedGame];
      }
    }
  });
});

server.listen(3000, () => console.log('Server running on :3000'));