const numberEl = document.getElementById("number");
const statusEl = document.getElementById("status");
const answerEl = document.getElementById("answer");
const submitButton = document.getElementById("submit-button");
const readyButton = document.getElementById("ready-button");
const stageStartButton = document.getElementById("stage-start");
const nextButton = document.getElementById("next-button");
const restartButton = document.getElementById("restart-button");
const roundEl = document.getElementById("round");
const digitsEl = document.getElementById("digits");
const stage = document.getElementById("stage");

const memorizationMs = 30000;
const startingDigits = 3;

const state = {
  round: 0,
  digits: startingDigits,
  current: "",
  phase: "idle",
  timeoutId: null,
  synced: false,
  showAt: null,
  ready: false
};

const setPhase = (phase) => {
  state.phase = phase;
};

const updateStats = () => {
  roundEl.textContent = state.round;
  digitsEl.textContent = state.digits;
};

const setReadyState = (isReady) => {
  state.ready = isReady;

  if (isReady) {
    readyButton.classList.add("hidden");
    answerEl.disabled = false;
    submitButton.disabled = false;
    answerEl.focus();
    setPhase("input");
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
  statusEl.textContent = "Memorize";
  answerEl.value = "";
  answerEl.disabled = true;
  submitButton.disabled = true;
  setPhase("show");

  if (state.timeoutId) {
    window.clearTimeout(state.timeoutId);
  }

  state.timeoutId = window.setTimeout(() => {
    numberEl.textContent = "";
    statusEl.textContent = "Press Ready to type";
    readyButton.classList.remove("hidden");
    setPhase("ready");
    setReadyState(false);
  }, memorizationMs);
};

const startRound = () => {
  state.round += 1;
  updateStats();
  readyButton.classList.add("hidden");
  showNumber();
};

const startRoundWithNumber = (number, showAtMs = null) => {
  state.round += 1;
  updateStats();
  readyButton.classList.add("hidden");

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
  updateStats();
  stageStartButton.classList.add("hidden");
  nextButton.classList.add("hidden");
  restartButton.classList.add("hidden");
  readyButton.classList.add("hidden");
  setReadyState(false);
  if (autoRound) {
    startRound();
  }
};

const endGame = () => {
  setPhase("end");
  statusEl.textContent = "Game over";
  numberEl.textContent = `Answer was ${state.current}`;
  setReadyState(false);
  readyButton.classList.add("hidden");
  nextButton.classList.add("hidden");
  restartButton.classList.remove("hidden");
  stageStartButton.classList.add("hidden");
};

const showResult = (isCorrect) => {
  if (isCorrect) {
    statusEl.textContent = "Correct";
    numberEl.textContent = state.current;
    state.digits = nextDigitLength(state.digits);
    answerEl.disabled = true;
    submitButton.disabled = true;
    nextButton.classList.remove("hidden");
  } else {
    endGame();
  }

  updateStats();
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
readyButton.addEventListener("click", () => setReadyState(true));
nextButton.addEventListener("click", startRound);
restartButton.addEventListener("click", startGame);
submitButton.addEventListener("click", submitAnswer);
answerEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    submitAnswer();
  }
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
