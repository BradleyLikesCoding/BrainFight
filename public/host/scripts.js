const hostCodeEl   = document.getElementById('host-code');
const statusText   = document.getElementById('status-text');
const playersList  = document.getElementById('players-list');
const playersEmpty = document.getElementById('players-empty');
const playerCount  = document.getElementById('player-count');
const btnStart     = document.getElementById('btn-start');
const btnCopy      = document.getElementById('btn-copy');

let currentPin = null;

const socket = io();

socket.on('connect', () => {
    statusText.textContent = 'Connected! Creating room...';

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
    statusText.textContent = 'Cannot reach server. Is the server running?';
});

socket.on('players-updated', (players) => {
    renderPlayers(players);
});

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
        setTimeout(() => { btnCopy.textContent = 'Copy Code'; }, 1500);
    });
});

btnStart.addEventListener('click', () => {
    statusText.textContent = 'Starting battle...';
    btnStart.disabled = true;
});