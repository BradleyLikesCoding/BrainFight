const trialCount = 5;
const minDelayMs = 2000;
const maxDelayMs = 5000;

const stage = document.getElementById("stage");
const stageTitle = document.getElementById("stage-title");
const stageInstruction = document.getElementById("stage-instruction");
const stageSubtitle = document.getElementById("stage-subtitle");
const trialCounter = document.getElementById("trial-counter");
const lastTime = document.getElementById("last-time");
const averageTime = document.getElementById("average-time");

const state = {
  mode: "idle",
  trial: 0,
  times: [],
  timeoutId: null,
  syncEndTimeoutId: null,
  startTime: 0,
  pendingReaction: null,
  sync: {
    active: false,
    goAt: null,
    endAt: null,
  },
};

const modes = ["idle", "waiting", "go", "false", "result", "summary"];

const setMode = (mode) => {
  if (!modes.includes(mode)) {
    return;
  }

  document.body.classList.remove(...modes.map((item) => `state-${item}`));
  document.body.classList.add(`state-${mode}`);
  state.mode = mode;
};

const setStageText = (title, instruction, subtitle = "") => {
  stageTitle.textContent = title;
  stageInstruction.textContent = instruction;
  stageSubtitle.textContent = subtitle;
};

const updateStats = () => {
  trialCounter.textContent = `${state.trial} / ${trialCount}`;
  lastTime.textContent =
    state.times.length === 0 ? "-- ms" : `${state.times[state.times.length - 1]} ms`;

  if (state.times.length === 0) {
    averageTime.textContent = "-- ms";
    return;
  }

  const sum = state.times.reduce((total, value) => total + value, 0);
  const avg = Math.round(sum / state.times.length);
  averageTime.textContent = `${avg} ms`;
};

const resetRun = () => {
  state.trial = 0;
  state.times = [];
  state.pendingReaction = null;
  updateStats();
};

const randomDelay = () => {
  return Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs;
};

const nowMs = () => (state.sync.active ? Date.now() : performance.now());

const scheduleGo = () => {
  const delay = randomDelay();
  state.timeoutId = window.setTimeout(() => {
    state.startTime = nowMs();
    setMode("go");
    setStageText("GO!", "Click or press Space", "React as fast as you can");
  }, delay);
};

const scheduleSyncedGo = (goAtMs, endAtMs) => {
  const delay = Math.max(goAtMs - Date.now(), 0);
  state.timeoutId = window.setTimeout(() => {
    state.startTime = goAtMs;
    setMode("go");
    setStageText("GO!", "Click or press Space", "React as fast as you can");

    if (typeof endAtMs === "number") {
      const endDelay = Math.max(endAtMs - Date.now(), 0);
      state.syncEndTimeoutId = window.setTimeout(() => {
        finishSyncedTrial();
      }, endDelay);
    }
  }, delay);
};

const startTrial = () => {
  setMode("waiting");
  setStageText("Wait...", "Hold your reaction", "Green means go");
  if (state.sync.active && typeof state.sync.goAt === "number") {
    scheduleSyncedGo(state.sync.goAt, state.sync.endAt);
  } else {
    scheduleGo();
  }
};

const startRun = () => {
  resetRun();
  startTrial();
};

const startSyncedRun = (goAtMs, endAtMs = null) => {
  state.sync.active = true;
  state.sync.goAt = goAtMs;
  state.sync.endAt = endAtMs;
  startRun();
};

const falseStart = () => {
  if (state.timeoutId) {
    window.clearTimeout(state.timeoutId);
    state.timeoutId = null;
  }

  if (state.syncEndTimeoutId) {
    window.clearTimeout(state.syncEndTimeoutId);
    state.syncEndTimeoutId = null;
  }

  setMode("false");
  setStageText("Too soon!", "Click or press Space to try again", "False start");
};

const recordReaction = () => {
  const reaction = Math.round(nowMs() - state.startTime);

  if (state.sync.active && typeof state.sync.endAt === "number") {
    state.pendingReaction = reaction;
    setMode("result");
    setStageText("Waiting...", "Syncing results", "Both players finish together");
    return;
  }

  finalizeReaction(reaction);
};

const finalizeReaction = (reaction) => {
  state.times.push(reaction);
  state.trial += 1;
  updateStats();

  if (state.trial >= trialCount) {
    const sum = state.times.reduce((total, value) => total + value, 0);
    const avg = Math.round(sum / state.times.length);
    const best = Math.min(...state.times);
    const worst = Math.max(...state.times);

    setMode("summary");
    setStageText(
      "Run complete",
      "Click or press Space to play again",
      `Average ${avg} ms · Best ${best} ms · Slowest ${worst} ms`
    );
    return;
  }

  setMode("result");
  setStageText(
    `${reaction} ms`,
    "Click or press Space for next trial",
    `Trial ${state.trial} of ${trialCount}`
  );
};

const finishSyncedTrial = () => {
  state.syncEndTimeoutId = null;
  if (state.pendingReaction === null) {
    setMode("false");
    setStageText("Too slow", "Click or press Space to try again", "No response");
    return;
  }

  const reaction = state.pendingReaction;
  state.pendingReaction = null;
  finalizeReaction(reaction);
};

const handleAction = () => {
  if (state.sync.active && state.pendingReaction !== null) {
    return;
  }

  switch (state.mode) {
    case "idle":
      startRun();
      break;
    case "waiting":
      falseStart();
      break;
    case "go":
      recordReaction();
      break;
    case "false":
      startTrial();
      break;
    case "result":
      startTrial();
      break;
    case "summary":
      startRun();
      break;
    default:
      break;
  }
};

const handleKeydown = (event) => {
  if (event.code !== "Space") {
    return;
  }

  event.preventDefault();
  handleAction();
};

stage.addEventListener("click", handleAction);
document.addEventListener("keydown", handleKeydown);

setMode("idle");
setStageText("Ready?", "Click or press Space to start");
updateStats();

window.reactionSync = {
  startRun: (goAtMs, endAtMs = null) => {
    startSyncedRun(goAtMs, endAtMs);
  },
  clear: () => {
    state.sync.active = false;
    state.sync.goAt = null;
    state.sync.endAt = null;
  },
};
