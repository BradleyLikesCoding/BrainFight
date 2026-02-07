const statusEl = document.getElementById('status');
const gameGrid = document.getElementById('game-grid');

const gameUrl = (id) => `/benchmarks/${id}/index.html?single=1`;

const setStatus = (message) => {
  statusEl.textContent = message;
};

gameGrid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-game]');
  if (!button) {
    return;
  }

  const gameId = button.dataset.game;
  if (!gameId) {
    setStatus('Pick a game first.');
    return;
  }

  setStatus('Launching ' + button.textContent.trim() + '...');
  window.location.href = gameUrl(gameId);
});
