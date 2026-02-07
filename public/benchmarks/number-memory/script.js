const numberEl = document.getElementById("number");
const statusEl = document.getElementById("status");
const answerEl = document.getElementById("answer");
const submitButton = document.getElementById("submit-button");
const stageStartButton = document.getElementById("stage-start");
const restartButton = document.getElementById("restart-button");
const roundEl = document.getElementById("round");
const digitsEl = document.getElementById("digits");
const livesEl = document.getElementById("lives");
const stage = document.getElementById("stage");

const memorizationMs = 10000;
const startingDigits = 3;
const maxLives = 1;

const state = {
  round: 0,
  digits: startingDigits,
  lives: maxLives,
  current: "",
  phase: "idle",
  timeoutId: null,
  synced: false,
  showAt: null,
  ready: false,
  advanceTimeoutId: null,
  reported: false
};

const setPhase = (phase) => {
  state.phase = phase;
};

const updateStats = () => {
  roundEl.textContent = state.round;
  digitsEl.textContent = state.digits;
  livesEl.textContent = state.lives;
};

const setReadyState = (isReady) => {
  state.ready = isReady;

  if (isReady) {
    // Hide the number when player is ready to type
    numberEl.textContent = "";
    statusEl.textContent = "Type the number";
    answerEl.disabled = false;
    submitButton.disabled = false;
    answerEl.focus();
    setPhase("input");

    // Cancel the auto-reveal timer since player started early
    if (state.timeoutId) {
      window.clearTimeout(state.timeoutId);
      state.timeoutId = null;
    }
  } else {
    answerEl.disabled = true;
    submitButton.disabled = true;
  }

  document.dispatchEvent(
    new CustomEvent("numberMemoryReady", { detail: { ready: isReady } })
  );
};

const nextDigitLength = (current) => current + 1;

const generateNumber = (digits) => {
  let result = "";
  for (let i = 0; i < digits; i += 1) {
    const min = i === 0 ? 1 : 0;
    const max = 9;
    result += Math.floor(Math.random() * (max - min + 1)) + min;
  }
  return result;
};

const showNumber = (forcedNumber = null) => {
  state.current = forcedNumber ?? generateNumber(state.digits);
  numberEl.textContent = state.current;
  statusEl.textContent = "Memorize then press Space";
  answerEl.value = "";
  answerEl.disabled = true;
  submitButton.disabled = true;
  setPhase("ready");

  if (state.timeoutId) {
    window.clearTimeout(state.timeoutId);
  }

  state.timeoutId = window.setTimeout(() => {
    if (!state.ready) {
      setReadyState(true);
    }
  }, memorizationMs);
};

const startRound = () => {
  state.round += 1;
  updateStats();
  state.ready = false;
  showNumber();
};

const startRoundWithNumber = (number, showAtMs = null) => {
  state.round += 1;
  updateStats();
  state.ready = false;

  if (showAtMs) {
    const delay = Math.max(showAtMs - Date.now(), 0);
    if (state.timeoutId) {
      window.clearTimeout(state.timeoutId);
    }
    state.timeoutId = window.setTimeout(() => {
      showNumber(number);
    }, delay);
    return;
  }

  showNumber(number);
};

const startGame = (autoRound = true) => {
  state.round = 0;
  state.digits = startingDigits;
  state.lives = maxLives;
  state.reported = false;
  updateStats();
  stageStartButton.classList.add("hidden");
  restartButton.classList.add("hidden");
  setReadyState(false);
  if (autoRound) {
    startRound();
  }
};

const endGame = () => {
  setPhase("end");
  const finalRound = state.round;
  statusEl.textContent = `Game over — survived ${finalRound} rounds`;
  numberEl.textContent = `Answer was ${state.current}`;
  setReadyState(false);
  restartButton.classList.remove("hidden");
  stageStartButton.classList.add("hidden");

  // Report score to parent (for multiplayer)
  if (!state.reported) {
    state.reported = true;
    try {
      window.parent.postMessage(
        { type: 'BENCHMARK_COMPLETE', value: finalRound },
        '*'
      );
    } catch (e) {}

    if (new URLSearchParams(window.location.search).get('single') === '1') {
      window.setTimeout(() => {
        window.location.href = '/single';
      }, 1200);
    }
  }
};

const showResult = (isCorrect) => {
  if (isCorrect) {
    statusEl.textContent = "Correct";
    numberEl.textContent = state.current;
    state.digits = nextDigitLength(state.digits);
    answerEl.disabled = true;
    submitButton.disabled = true;
    scheduleNextRound();
  } else {
    state.lives -= 1;
    statusEl.textContent = "Wrong";
    numberEl.textContent = `Answer was ${state.current}`;
    if (state.lives <= 0) {
      endGame();
      return;
    }
    scheduleNextRound();
  }

  updateStats();
};

const scheduleNextRound = () => {
  if (state.advanceTimeoutId) {
    window.clearTimeout(state.advanceTimeoutId);
  }

  state.advanceTimeoutId = window.setTimeout(() => {
    state.advanceTimeoutId = null;
    if (state.phase !== "end") {
      startRound();
    }
  }, 1200);
};

const submitAnswer = () => {
  if (state.phase !== "input") {
    return;
  }

  const cleaned = answerEl.value.replace(/\s+/g, "");
  const isCorrect = cleaned === state.current;
  showResult(isCorrect);
};

stageStartButton.addEventListener("click", startGame);
stage.addEventListener("click", () => {
  if (state.phase === "idle") {
    startGame();
  }
});
restartButton.addEventListener("click", startGame);
submitButton.addEventListener("click", submitAnswer);
answerEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    submitAnswer();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.code !== "Space") {
    return;
  }

  if (state.phase !== "ready") {
    return;
  }

  event.preventDefault();
  setReadyState(true);
});

updateStats();

window.numberMemorySync = {
  startRound: (number, showAtMs = null) => {
    if (state.phase === "idle") {
      startGame(false);
    }
    startRoundWithNumber(number, showAtMs);
  },
  setReady: () => setReadyState(true),
  getReady: () => state.ready
};
