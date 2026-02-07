function joinBattle() {
    const name = document.getElementById('joinname').value;
    const code = document.getElementById('joincode').value;

    if (!name || !code || name.trim() === '' || code.trim() === '') {
        document.getElementById('join-status').textContent = 'Please enter both your name and the game code.';
        return;
    }
}

