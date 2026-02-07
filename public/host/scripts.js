const hostCodeEl   = document.getElementById('host-code');
const statusText   = document.getElementById('status-text');
const playersList  = document.getElementById('players-list');
const playersEmpty = document.getElementById('players-empty');
const playerCount  = document.getElementById('player-count');
const btnStart     = document.getElementById('btn-start');
const btnCopy      = document.getElementById('btn-copy');
const lobbyView    = document.getElementById('lobby-view');
const gameView     = document.getElementById('game-view');
const gameFrame    = document.getElementById('game-frame');
const resultsView  = document.getElementById('results-view');
const resultsBody  = document.getElementById('results-body');
const resultTitle  = document.getElementById('result-title');
const roundBadge   = document.getElementById('round-badge');
const btnNext      = document.getElementById('btn-next');
const gameModeEl   = document.getElementById('game-mode');
const gamePickEl   = document.getElementById('game-pick');
const gamePickRow  = document.getElementById('game-pick-row');
const gameRoundsEl = document.getElementById('game-rounds');
const nextGameRow  = document.getElementById('next-game-row');
const nextGamePick = document.getElementById('next-game-pick');

let currentPin = null;
let totalRounds = 3;
let currentRound = 0;
let currentMode = 'random';

const socket = io();

// Toggle game picker visibility
gameModeEl.addEventListener('change', () => {
    gamePickRow.style.display = gameModeEl.value === 'choose' ? '' : 'none';
});

socket.on('connect', () => {
    statusText.textContent = 'Creating room...';

    socket.emit('host', (response) => {
        if (response && response.pin) {
            currentPin = response.pin;
            hostCodeEl.textContent = currentPin;
            statusText.textContent = '';
            renderPlayers([]);
        } else {
            hostCodeEl.textContent = 'Error';
            statusText.textContent = 'Failed to create a room. Try refreshing.';
        }
    });
});

socket.on('connect_error', () => {
    statusText.textContent = 'Cannot reach server.';
});

socket.on('players-updated', (players) => {
    renderPlayers(players);
});

// Game started — show the benchmark
socket.on('game-start', (data) => {
    showView('game');
    gameFrame.src = data.benchmark.url;
});

// Round results — show leaderboard
socket.on('round-results', (data) => {
    showView('results');
    currentRound = data.round;
    totalRounds = data.totalRounds;
    currentMode = data.mode || 'random';
    roundBadge.textContent = 'Round ' + data.round + '/' + data.totalRounds;
    resultTitle.textContent = data.benchmark;

    // Render leaderboard table
    resultsBody.innerHTML = '';
    data.leaderboard.forEach((entry, i) => {
        const roundEntry = data.roundScoreboard.find(r => r.name === entry.name);
        const roundScore = roundEntry ? (roundEntry.score !== null ? roundEntry.score : 'DNF') : '—';
        const tr = document.createElement('tr');
        if (i < 3) tr.classList.add('rank-' + (i + 1));
        tr.innerHTML =
            '<td class="rank">' + (i + 1) + '</td>' +
            '<td class="player-name">' + entry.name + '</td>' +
            '<td class="score">' + entry.points + '</td>' +
            '<td class="score">' + roundScore + '</td>';
        resultsBody.appendChild(tr);
    });

    // Show/hide game picker and next button
    if (data.round < data.totalRounds) {
        btnNext.textContent = 'Next Round';
        nextGameRow.style.display = currentMode === 'choose' ? 'flex' : 'none';
    } else {
        btnNext.textContent = 'Back to Lobby';
        nextGameRow.style.display = 'none';
    }
});

function showView(view) {
    lobbyView.style.display = view === 'lobby' ? '' : 'none';
    gameView.style.display  = view === 'game'  ? '' : 'none';
    resultsView.style.display = view === 'results' ? '' : 'none';
}

function renderPlayers(players) {
    playersList.innerHTML = '';

    if (!players || players.length === 0) {
        playersEmpty.style.display = 'block';
        playerCount.textContent = '0';
        btnStart.disabled = true;
        return;
    }

    playersEmpty.style.display = 'none';
    playerCount.textContent = players.length;
    btnStart.disabled = false;

    players.forEach((name) => {
        const li = document.createElement('li');
        li.textContent = name;
        playersList.appendChild(li);
    });
}

btnCopy.addEventListener('click', () => {
    if (!currentPin) return;
    navigator.clipboard.writeText(currentPin).then(() => {
        btnCopy.textContent = 'Copied!';
        setTimeout(() => { btnCopy.textContent = 'Copy'; }, 1500);
    });
});

btnStart.addEventListener('click', () => {
    statusText.textContent = 'Starting...';
    btnStart.disabled = true;
    currentMode = gameModeEl.value;
    totalRounds = parseInt(gameRoundsEl.value, 10) || 3;
    currentRound = 0;

    const settings = {
        mode: currentMode,
        game: currentMode === 'choose' ? gamePickEl.value : null,
        totalRounds: totalRounds,
    };

    socket.emit('start-game', settings, (response) => {
        if (response.error) {
            statusText.textContent = response.error;
            btnStart.disabled = false;
        }
    });
});

btnNext.addEventListener('click', () => {
    if (currentRound < totalRounds) {
        // Start next round — send game choice if in choose mode
        const nextData = {};
        if (currentMode === 'choose') {
            nextData.game = nextGamePick.value;
        }
        socket.emit('start-game', nextData, (response) => {
            if (response.error) {
                showView('lobby');
                statusText.textContent = response.error;
                btnStart.disabled = false;
            }
        });
    } else {
        showView('lobby');
        btnStart.disabled = false;
        statusText.textContent = '';
    }
});

// Listen for benchmark results from iframe via postMessage
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'BENCHMARK_COMPLETE') {
        socket.emit('submit-score', { score: event.data.value });
    }
});

// Host disconnected / game ended
socket.on('game-ended', (data) => {
    alert(data.reason || 'Game ended');
    location.reload();
});