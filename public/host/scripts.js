const hostCodeEl = document.getElementById("HostCode");
const playersListEl = document.getElementById("players-list");
const playersEmptyEl = document.getElementById("players-empty");

const socket = io(window.location.hostname + ':3000');

const renderPlayers = (players) => {
    playersListEl.innerHTML = "";
    if (!players || players.length === 0) {
        playersEmptyEl.style.display = "block";
        return;
    }
    playersEmptyEl.style.display = "none";
    players.forEach((name) => {
        const item = document.createElement("li");
        item.textContent = name;
        playersListEl.appendChild(item);
    });
};

socket.emit("host", (response) => {
    if (response && response.pin) {
        hostCodeEl.textContent = response.pin;
        renderPlayers([]);
    } else {
        hostCodeEl.textContent = "Error";
    }
});

socket.on("players-updated", (players) => {
    renderPlayers(players);
});