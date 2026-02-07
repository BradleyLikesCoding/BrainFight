const wordList = [
  "apple",
  "river",
  "stone",
  "cloud",
  "mirror",
  "paper",
  "candle",
  "forest",
  "window",
  "thunder",
  "ladder",
  "garden",
  "planet",
  "pencil",
  "helmet",
  "pocket",
  "melody",
  "lantern",
  "coffee",
  "rocket",
  "glacier",
  "diamond",
  "blanket",
  "hammer",
  "silver",
  "basket",
  "bridge",
  "castle",
  "dragon",
  "engine",
  "feather",
  "guitar",
  "harbor",
  "island",
  "jacket",
  "kettle",
  "legend",
  "magnet",
  "nugget",
  "oyster",
  "pillow",
  "quartz",
  "rabbit",
  "saddle",
  "teapot",
  "umbrella",
  "velvet",
  "wallet",
  "yellow",
  "zipper",
  "anchor",
  "beacon",
  "cedar",
  "donut",
  "ember",
  "fossil",
  "granite",
  "horizon",
  "ivy",
  "jungle",
  "kernel",
  "lemon",
  "marble",
  "nectar",
  "orbit",
  "parcel",
  "quiver",
  "radar",
  "summit",
  "temple",
  "unicorn",
  "valley",
  "willow",
  "xenon",
  "yard",
  "zenith",
  "atlas",
  "breeze",
  "canyon",
  "desert",
  "echo",
  "falcon",
  "galaxy",
  "harvest",
  "igloo",
  "jigsaw",
  "koala",
  "lagoon",
  "meadow",
  "nebula",
  "orchard",
  "pebble",
  "quest",
  "ripple",
  "signal",
  "timber",
  "underpass",
  "vessel",
  "whisper",
  "xylophone",
  "yonder",
  "zephyr",
  "artist",
  "binary",
  "circuit",
  "dawn",
  "eclipse",
  "fabric",
  "gadget",
  "habitat",
  "ink",
  "jupiter",
  "kingdom",
  "library",
  "motion",
  "number",
  "opal",
  "prism",
  "quarry",
  "rhythm",
  "solar",
  "tunnel",
  "unity",
  "vector",
  "waterfall",
  "xray",
  "yacht",
  "zone",
  "acorn",
  "blaze",
  "comet",
  "drift",
  "figment",
  "grove",
  "hollow",
  "inkwell",
  "jewel",
  "knoll",
  "lotus",
  "meteor",
  "notice",
  "outpost",
  "pioneer",
  "quiet",
  "ridge",
  "shelter",
  "thicket",
  "upland",
  "voyage",
  "winter",
  "xylem",
  "yearling",
  "zeppelin",
  "axis",
  "bolt",
  "crest",
  "dusk",
  "flare",
  "glade",
  "harp",
  "inlet",
  "juniper",
  "kiln",
  "locket",
  "matrix",
  "napkin",
  "ocean",
  "paradox",
  "quill",
  "relic",
  "sail",
  "talon",
  "unit",
  "violet",
  "weld",
  "xenial",
  "yarn",
  "zesty",
  "alpine",
  "branch",
  "coral",
  "dune"
];

const statusEl = document.getElementById("status");
const wordEl = document.getElementById("word");
const helperEl = document.getElementById("helper");
const scoreEl = document.getElementById("score");
const timeLeftEl = document.getElementById("time-left");
const livesEl = document.getElementById("lives");
const seenCountEl = document.getElementById("seen-count");
const startButton = document.getElementById("start-button");
const seenButton = document.getElementById("seen-button");
const newButton = document.getElementById("new-button");
const restartButton = document.getElementById("restart-button");

const state = {
  score: 0,
  lives: 3,
  seen: new Set(),
  currentWord: "",
  active: false,
  reported: false,
  roundTimerId: null,
  roundTickId: null,
  endAt: null
};

const roundDurationMs = 30000;

const updateStats = () => {
  scoreEl.textContent = state.score;
  livesEl.textContent = state.lives;
  seenCountEl.textContent = state.seen.size;
};

const updateCountdown = (remainingMs = null) => {
  const remaining = remainingMs !== null
    ? Math.max(0, remainingMs)
    : Math.max(0, (state.endAt || Date.now()) - Date.now());
  timeLeftEl.textContent = `${(remaining / 1000).toFixed(1)}s`;
};

const setButtons = (isActive) => {
  seenButton.disabled = !isActive;
  newButton.disabled = !isActive;
};

const pickWord = () => {
  const index = Math.floor(Math.random() * wordList.length);
  return wordList[index];
};

const nextWord = () => {
  state.currentWord = pickWord();
  wordEl.textContent = state.currentWord;
  statusEl.textContent = "Decide";
  helperEl.textContent = "Seen it before or new?";
};

const startGame = () => {
  state.score = 0;
  state.lives = 3;
  state.seen = new Set();
  state.active = true;
  state.reported = false;
  if (state.roundTimerId) {
    window.clearTimeout(state.roundTimerId);
    state.roundTimerId = null;
  }
  if (state.roundTickId) {
    window.clearInterval(state.roundTickId);
    state.roundTickId = null;
  }
  restartButton.classList.add("hidden");
  startButton.classList.add("hidden");
  helperEl.textContent = "Seen it before or new?";
  setButtons(true);
  updateStats();
  nextWord();

  state.endAt = Date.now() + roundDurationMs;
  updateCountdown(roundDurationMs);
  state.roundTickId = window.setInterval(updateCountdown, 200);

  state.roundTimerId = window.setTimeout(() => {
    endGame("Time is up");
  }, roundDurationMs);
};

const endGame = (reason = "Game over") => {
  if (state.roundTimerId) {
    window.clearTimeout(state.roundTimerId);
    state.roundTimerId = null;
  }
  if (state.roundTickId) {
    window.clearInterval(state.roundTickId);
    state.roundTickId = null;
  }
  state.endAt = null;
  updateCountdown(0);
  state.active = false;
  setButtons(false);
  statusEl.textContent = reason;
  helperEl.textContent = "Click Restart to play again";
  restartButton.classList.remove("hidden");
  if (!state.reported) {
    state.reported = true;
    try {
      window.parent.postMessage(
        { type: 'BENCHMARK_COMPLETE', value: state.score },
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

const handleChoice = (choice) => {
  if (!state.active) {
    return;
  }

  const alreadySeen = state.seen.has(state.currentWord);
  const correct = (choice === "seen" && alreadySeen) ||
    (choice === "new" && !alreadySeen);

  if (correct) {
    state.score += 1;
  } else {
    state.lives -= 1;
  }

  state.seen.add(state.currentWord);
  updateStats();

  if (state.lives <= 0) {
    endGame();
    return;
  }

  nextWord();
};

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);
seenButton.addEventListener("click", () => handleChoice("seen"));
newButton.addEventListener("click", () => handleChoice("new"));

updateStats();
updateCountdown(roundDurationMs);
