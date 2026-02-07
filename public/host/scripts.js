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
const resultsList  = document.getElementById('results-list');
const resultTitle  = document.getElementById('result-title');
const btnNext      = document.getElementById('btn-next');
const gameModeEl   = document.getElementById('game-mode');
const gamePickEl   = document.getElementById('game-pick');
const gamePickRow  = document.getElementById('game-pick-row');
const gameRoundsEl = document.getElementById('game-rounds');

let currentPin = null;
let totalRounds = 3;
let currentRound = 0;

const socket = io();

// Toggle game picker visibility
gameModeEl.addEventListener('change', () => {
    gamePickRow.style.display = gameModeEl.value === 'single' ? '' : 'none';
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

// Round results — show scoreboard
socket.on('round-results', (data) => {
    showView('results');
    currentRound = data.round;
    resultTitle.textContent = data.benchmark + ' — Round ' + data.round + '/' + data.totalRounds;
    resultsList.innerHTML = '';
    data.scoreboard.forEach((entry, i) => {
        const li = document.createElement('li');
        li.textContent = '#' + (i + 1) + '  ' + entry.name + '  —  ' + (entry.score !== null ? entry.score : 'DNF');
        resultsList.appendChild(li);
    });

    // Auto-continue if more rounds remain
    if (data.round < data.totalRounds) {
        btnNext.textContent = 'Next Round';
    } else {
        btnNext.textContent = 'Back to Lobby';
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
    totalRounds = parseInt(gameRoundsEl.value, 10);
    currentRound = 0;

    const settings = {
        mode: gameModeEl.value,
        game: gameModeEl.value === 'single' ? gamePickEl.value : null,
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
        // Start next round
        statusText.textContent = 'Starting next round...';
        socket.emit('start-game', null, (response) => {
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