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

// Round results — show leaderboard
socket.on('round-results', (data) => {
    showView('results');
    document.getElementById('round-badge').textContent = 'Round ' + data.round + '/' + data.totalRounds;
    document.getElementById('result-title').textContent = data.benchmark;
    const tbody = document.getElementById('results-body');
    tbody.innerHTML = '';
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
        tbody.appendChild(tr);
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