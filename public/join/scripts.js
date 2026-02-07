const socket = io();
let joined = false;

document.getElementById('btn-join').addEventListener('click', joinBattle);

function joinBattle() {
    if (joined) return;

    const name = document.getElementById('joinname').value.trim();
    const code = document.getElementById('joincode').value.trim();

    if (!name || !code) {
        document.getElementById('join-status').textContent = 'Please enter both your name and the game code.';
        return;
    }

    document.getElementById('btn-join').disabled = true;

    socket.emit('join', { pin: code, name: name }, (response) => {
        if (response.error) {
            document.getElementById('join-status').textContent = response.error;
            document.getElementById('btn-join').disabled = false;
        } else {
            joined = true;
            showView('lobby');
            renderLobbyPlayers(response.players);
        }
    });
}

socket.on('players-updated', (players) => {
    if (joined) renderLobbyPlayers(players);
});

// Host started the game — load benchmark
socket.on('game-start', (data) => {
    showView('game');
    const titleEl = document.getElementById('game-title');
    if (titleEl) {
        titleEl.textContent = data.benchmark.name;
    }
    document.getElementById('game-frame').src = data.benchmark.url;
});

// Round results
socket.on('round-results', (data) => {
    showView('results');
    document.getElementById('result-title').textContent = data.benchmark + ' — Round ' + data.round;
    const ul = document.getElementById('results-list');
    ul.innerHTML = '';
    data.scoreboard.forEach((entry, i) => {
        const li = document.createElement('li');
        li.textContent = '#' + (i + 1) + '  ' + entry.name + '  —  ' + (entry.score !== null ? entry.score : 'DNF');
        ul.appendChild(li);
    });
});

// Host disconnected
socket.on('game-ended', (data) => {
    alert(data.reason || 'Game ended');
    location.reload();
});

// Listen for benchmark results from iframe via postMessage
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'BENCHMARK_COMPLETE') {
        socket.emit('submit-score', { score: event.data.value });
    }
});

function showView(view) {
    document.getElementById('join-form').style.display   = view === 'join'    ? '' : 'none';
    document.getElementById('lobby').style.display       = view === 'lobby'   ? '' : 'none';
    document.getElementById('game-view').style.display   = view === 'game'    ? '' : 'none';
    document.getElementById('results-view').style.display = view === 'results' ? '' : 'none';
}

function renderLobbyPlayers(players) {
    const ul = document.getElementById('lobby-players');
    ul.innerHTML = '';
    players.forEach((p) => {
        const li = document.createElement('li');
        li.textContent = p;
        ul.appendChild(li);
    });
}