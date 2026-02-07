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
            document.getElementById('join-form').style.display = 'none';
            document.getElementById('lobby').style.display = '';
            renderLobbyPlayers(response.players);
        }
    });
}

socket.on('players-updated', (players) => {
    if (joined) renderLobbyPlayers(players);
});

function renderLobbyPlayers(players) {
    const ul = document.getElementById('lobby-players');
    ul.innerHTML = '';
    players.forEach((p) => {
        const li = document.createElement('li');
        li.textContent = p;
        li.style.cssText = 'padding:6px 10px;border:1px solid rgba(36,158,160,0.35);border-radius:4px;background:rgba(22,27,34,0.8);font-size:0.9rem;';
        ul.appendChild(li);
    });
}