const promptEl = document.getElementById("prompt");
const inputEl = document.getElementById("input");
const statusEl = document.getElementById("status");
const wpmEl = document.getElementById("wpm");
const accuracyEl = document.getElementById("accuracy");
const timeEl = document.getElementById("time");
const restartButton = document.getElementById("restart");

const prompts = [
  "the quick brown fox jumps over the lazy dog. a storm rolled in from the sea. the lights in the city flickered twice.",
  "i packed my bag and left before dawn. the train was late, but the platform was quiet. the day felt new and sharp.",
  "a small cafe opened on the corner last week. the smell of coffee drifted down the street. we stayed longer than planned.",
  "she wrote a note and taped it to the door. the wind tried to pull it away. the message stayed, clear and simple.",
  "the camera clicked as the sun sank low. the sky turned orange and deep. the moment passed, but the memory stayed."
];

const state = {
  promptIndex: 0,
  promptText: "",
  promptChars: [],
  started: false,
  finished: false,
  startTime: 0,
  timerId: null,
  startAt: null,
  reported: false
};

const choosePrompt = (index = null) => {
  const nextIndex = index ?? Math.floor(Math.random() * prompts.length);
  state.promptIndex = nextIndex;
  state.promptText = prompts[nextIndex];
  state.promptChars = Array.from(state.promptText);
  renderPrompt();
};

const renderPrompt = () => {
  promptEl.textContent = "";
  state.promptChars.forEach((char, index) => {
    const span = document.createElement("span");
    span.className = "char";
    span.dataset.index = String(index);
    span.textContent = char;
    if (char === " ") {
      span.classList.add("space");
    }
    promptEl.appendChild(span);
  });
};

const resetStats = () => {
  wpmEl.textContent = "0";
  accuracyEl.textContent = "100%";
  timeEl.textContent = "0.0s";
};

const updateStats = () => {
  if (!state.started) {
    return;
  }

  const elapsedMs = Date.now() - state.startTime;
  const minutes = elapsedMs / 60000;
  const typed = inputEl.value.length;
  const wpm = minutes > 0 ? Math.round((typed / 5) / minutes) : 0;
  const correct = countCorrectChars();
  const accuracy = typed === 0 ? 100 : Math.round((correct / typed) * 100);

  wpmEl.textContent = Number.isFinite(wpm) ? wpm : 0;
  accuracyEl.textContent = `${accuracy}%`;
  timeEl.textContent = `${(elapsedMs / 1000).toFixed(1)}s`;
};

const startTimer = () => {
  if (state.timerId) {
    window.clearInterval(state.timerId);
  }

  state.timerId = window.setInterval(updateStats, 100);
};

const stopTimer = () => {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
};

const countCorrectChars = () => {
  const typed = inputEl.value;
  const target = state.promptText;
  const limit = Math.min(typed.length, target.length);
  let correct = 0;

  for (let i = 0; i < limit; i += 1) {
    if (typed[i] === target[i]) {
      correct += 1;
    }
  }

  return correct;
};

const startRun = () => {
  state.started = true;
  state.finished = false;
  state.startTime = Date.now();
  statusEl.textContent = "Typing...";
  inputEl.disabled = false;
  inputEl.focus();
  startTimer();
};

const finishRun = () => {
  state.finished = true;
  state.started = false;
  stopTimer();
  updateStats();
  statusEl.textContent = "Complete";
  inputEl.disabled = true;

  if (!state.reported) {
    const elapsedMs = Date.now() - state.startTime;
    const minutes = elapsedMs / 60000;
    const typed = inputEl.value.length;
    const wpm = minutes > 0 ? Math.round((typed / 5) / minutes) : 0;
    state.reported = true;
    try {
      window.parent.postMessage({ type: 'BENCHMARK_COMPLETE', value: wpm }, '*');
    } catch (e) {}

    if (new URLSearchParams(window.location.search).get('single') === '1') {
      window.setTimeout(() => {
        window.location.href = '/single';
      }, 1200);
    }
  }
};

const normalizeInput = () => {
  inputEl.value = inputEl.value.toLowerCase();

  if (inputEl.value.length > state.promptText.length) {
    inputEl.value = inputEl.value.slice(0, state.promptText.length);
  }
};

const updateCharHighlights = () => {
  const typed = inputEl.value;
  const charNodes = promptEl.querySelectorAll(".char");
  const limit = Math.min(typed.length, state.promptChars.length);

  charNodes.forEach((node, index) => {
    node.classList.remove("correct", "wrong", "current");

    if (index < limit) {
      if (typed[index] === state.promptChars[index]) {
        node.classList.add("correct");
      } else {
        node.classList.add("wrong");
      }
      return;
    }

    if (!state.finished && index === typed.length) {
      node.classList.add("current");
    }
  });
};

const handleInput = () => {
  if (state.finished) {
    return;
  }

  if (state.startAt && Date.now() < state.startAt) {
    inputEl.value = "";
    return;
  }

  if (!state.started) {
    startRun();
  }

  normalizeInput();
  updateStats();
  updateCharHighlights();

  if (inputEl.value.length >= state.promptText.length) {
    finishRun();
  }
};

const resetRun = (promptIndex = null) => {
  state.started = false;
  state.finished = false;
  state.startAt = null;
  state.reported = false;
  stopTimer();
  choosePrompt(promptIndex);
  inputEl.value = "";
  inputEl.disabled = false;
  statusEl.textContent = "Start typing to begin";
  resetStats();
  updateCharHighlights();
};

restartButton.addEventListener("click", () => resetRun());
inputEl.addEventListener("input", handleInput);

window.typingTestSync = {
  start: (promptIndex = 0, startAtMs = null) => {
    resetRun(promptIndex);
    if (startAtMs) {
      state.startAt = startAtMs;
      statusEl.textContent = "Waiting to start";
    }
  }
};

resetRun();
