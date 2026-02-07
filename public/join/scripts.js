let socket;

function joinBattle() {
    const name = document.getElementById('joinname').value;
    const code = document.getElementById('joincode').value;

    if (!name || !code || name.trim() === '' || code.trim() === '') {
        document.getElementById('join-status').textContent = 'Please enter both your name and the game code.';
        return;
    }

    socket = io(window.location.hostname + ':3000');
    socket.emit("join", {pin: code, name: name}, (response) => {
        if (response.error) {
            document.getElementById('join-status').textContent = response.error;
        } else {
            document.getElementById('join-status').textContent = 'Successfully joined the game!';
            document.getElementById('join-game').style.display = 'none';
            document.getElementById('game').style.display = 'block';
        }
    
});
}