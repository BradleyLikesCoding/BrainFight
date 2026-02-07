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

app.get('/single', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/single', 'index.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

const games = {};

const BENCHMARKS = [
  { id: 'reaction-speed', name: 'Reaction Speed', url: '/benchmarks/reaction-speed/index.html', lowerIsBetter: true },
  { id: 'typing-test',    name: 'Typing Test',    url: '/benchmarks/typing-test/index.html',    lowerIsBetter: false },
  { id: 'number-memory',  name: 'Number Memory',  url: '/benchmarks/number-memory/index.html',  lowerIsBetter: false },
  { id: 'verbal-memory',  name: 'Verbal Memory',  url: '/benchmarks/verbal-memory/index.html',  lowerIsBetter: false },
];

function buildLobbyPayload(game) {
  return {
    hostName: game.hostName || 'Host',
    players: game.players
      .filter(p => !p.isHost)
      .map(p => p.name),
  };
}

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
      hostName: 'Host',
      players: [{ name: 'Host', socketId: socket.id, isHost: true }],
      started: false,
      currentBenchmark: null,
      scores: {},
      round: 0,
      cumulativeScores: {},
    };
    socket.join(`game-${pin}`);
    socket._hostedGame = pin;
    socket._joinedGame = pin;
    socket._playerName = games[pin].hostName;
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

    const payload = buildLobbyPayload(game);
    io.to(`game-${pin}`).emit('players-updated', payload);
    callback({ success: true, players: payload.players, hostName: payload.hostName });
  });

  // Host starts the game
  socket.on('start-game', (data, callback) => {
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

    // First round: apply full settings and reset cumulative scores
    if (data && data.totalRounds !== undefined) {
      game.settings = {
        mode: data.mode || 'random',
        totalRounds: parseInt(data.totalRounds, 10) || 3,
      };
      game.round = 0;
      game.cumulativeScores = {};
    }

    const s = game.settings || { mode: 'random', totalRounds: 3 };

    // Pick benchmark based on mode
    let benchmark;
    if (s.mode === 'choose' && data && data.game) {
      benchmark = BENCHMARKS.find(b => b.id === data.game) || pickBenchmark();
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

    const participants = game.players.some(p => p.socketId === game.host)
      ? game.players
      : [{ name: game.hostName || 'Host', socketId: game.host, isHost: true }, ...game.players];

    game.scores[socket.id] = {
      name: name,
      score: data.score,
    };

    // Check if all players submitted (host doesn't count as a player)
    const expectedCount = participants.length;
    const playerScores = participants.filter(p => game.scores[p.socketId]).length;

    console.log(`Score from ${name}: ${data.score} (${playerScores}/${expectedCount})`);

    if (playerScores >= expectedCount) {
      // Build round scoreboard sorted by benchmark type
      const sorted = participants.map(p => {
        const s = game.scores[p.socketId];
        return { name: p.name, socketId: p.socketId, score: s ? s.score : null };
      });

      if (game.currentBenchmark && game.currentBenchmark.lowerIsBetter) {
        sorted.sort((a, b) => {
          if (a.score === null) return 1;
          if (b.score === null) return -1;
          return a.score - b.score;
        });
      } else {
        sorted.sort((a, b) => {
          if (a.score === null) return 1;
          if (b.score === null) return -1;
          return b.score - a.score;
        });
      }

      // Award placement points (1st gets N pts, 2nd N-1, etc.)
      const n = sorted.length;
      sorted.forEach((entry, i) => {
        const points = entry.score !== null ? (n - i) : 0;
        if (!game.cumulativeScores[entry.socketId]) {
          game.cumulativeScores[entry.socketId] = { name: entry.name, points: 0 };
        }
        game.cumulativeScores[entry.socketId].points += points;
      });

      // Build cumulative leaderboard
      const leaderboard = Object.values(game.cumulativeScores)
        .sort((a, b) => b.points - a.points)
        .map((entry, i) => ({ rank: i + 1, name: entry.name, points: entry.points }));

      const roundScoreboard = sorted.map((entry, i) => ({
        rank: i + 1,
        name: entry.name,
        score: entry.score,
      }));

      io.to(`game-${pin}`).emit('round-results', {
        benchmark: game.currentBenchmark.name,
        round: game.round,
        totalRounds: (game.settings || {}).totalRounds || 3,
        roundScoreboard,
        leaderboard,
        mode: (game.settings || {}).mode || 'random',
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
        const payload = buildLobbyPayload(game);
        io.to(`game-${socket._joinedGame}`).emit('players-updated', payload);
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