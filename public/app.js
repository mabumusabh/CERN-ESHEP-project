// public/app.js

const API_BASE = ""; // empty so frontend uses same origin; change if backend different
let questions = [];
let gameState = {
  started: false,
  startTs: null,
  timerInterval: null,
  unlocked: Array(9).fill(false),
  tilesUnlocked: 0
};

const gridEl = document.getElementById("grid");
const startBtn = document.getElementById("startBtn");
const usernameEl = document.getElementById("username");
const timerEl = document.getElementById("timer");
const tilesCountEl = document.getElementById("tilesCount");
const modal = document.getElementById("modal");
const qTitle = document.getElementById("qTitle");
const choicesEl = document.getElementById("choices");
const qFeedback = document.getElementById("qFeedback");
const closeModalBtn = document.getElementById("closeModal");
const resultPanel = document.getElementById("resultPanel");
const finalTimeEl = document.getElementById("finalTime");
const viewLeaderboardBtn = document.getElementById("viewLeaderboard");
const leaderboardPanel = document.getElementById("leaderboardPanel");
const leaderboardList = document.getElementById("leaderboardList");
const closeLbBtn = document.getElementById("closeLb");

async function loadQuestions() {
  const res = await fetch(API_BASE + "/questions");
  questions = await res.json();
}

function formatTime(ms) {
  const total = ms;
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const millis = total % 1000;
  return `${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}.${String(millis).padStart(3,"0")}`;
}

function startTimer() {
  gameState.startTs = Date.now();
  gameState.timerInterval = setInterval(() => {
    const now = Date.now();
    timerEl.textContent = formatTime(now - gameState.startTs);
  }, 50);
}

function stopTimer() {
  clearInterval(gameState.timerInterval);
  gameState.timerInterval = null;
}

function buildGrid() {
  gridEl.innerHTML = "";
  for (let i = 0; i < 9; i++) {
    const t = document.createElement("div");
    t.className = "tile";
    t.dataset.index = i;
    t.textContent = gameState.unlocked[i] ? `#${i+1}` : "🔲";
    if (gameState.unlocked[i]) t.classList.add("revealed");
    t.addEventListener("click", () => onTileClick(i));
    gridEl.appendChild(t);
  }
}

function updateStatus() {
  tilesCountEl.textContent = gameState.tilesUnlocked;
}

function showModalFor(tileIndex) {
  const q = questions.find((x) => x.id === tileIndex);
  if (!q) {
    alert("Question not found.");
    return;
  }
  qTitle.textContent = `Q: ${q.title}`;
  choicesEl.innerHTML = "";
  qFeedback.textContent = "";
  q.choices.forEach((choice, idx) => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.textContent = choice;
    btn.addEventListener("click", async () => {
      const correct = idx === q.correctIndex;
      if (correct) {
        qFeedback.textContent = "Correct! Tile unlocked.";
        // reveal tile
        gameState.unlocked[tileIndex] = true;
        gameState.tilesUnlocked++;
        updateStatus();
        buildGrid();
        // disable buttons
        Array.from(choicesEl.querySelectorAll("button")).forEach(b => b.disabled = true);

        // If finished:
        if (gameState.tilesUnlocked >= 9) {
          // stop timer, show final panel and send score
          stopTimer();
          const elapsed = Date.now() - gameState.startTs;
          finalTimeEl.textContent = formatTime(elapsed);
          resultPanel.classList.remove("hidden");

          // submit score (only if username present)
          const username = (usernameEl.value || "").trim();
          if (username) {
            try {
              await fetch(API_BASE + "/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, time_ms: elapsed, tiles_unlocked: 9 })
              });
            } catch (e) {
              console.warn("Leaderboard submit failed:", e);
            }
          }
        }
      } else {
        qFeedback.textContent = "Incorrect — try again later!";
        btn.disabled = true;
      }
    });
    choicesEl.appendChild(btn);
  });

  modal.classList.remove("hidden");
}

function onTileClick(i) {
  if (!gameState.started) {
    alert("Press Start Game first.");
    return;
  }
  if (gameState.unlocked[i]) return; // already revealed
  showModalFor(i);
}

startBtn.addEventListener("click", async () => {
  if (!usernameEl.value.trim()) {
    if (!confirm("No username entered. Continue as anonymous? (You won't appear on leaderboard)")) {
      return;
    }
  }
  // reset state
  gameState.started = true;
  gameState.unlocked = Array(9).fill(false);
  gameState.tilesUnlocked = 0;
  updateStatus();
  buildGrid();
  resultPanel.classList.add("hidden");
  leaderboardPanel.classList.add("hidden");
  startTimer();
});

closeModalBtn.addEventListener("click", () => {
  modal.classList.add("hidden");
});

viewLeaderboardBtn.addEventListener("click", async () => {
  await loadLeaderboard();
  leaderboardPanel.classList.remove("hidden");
});

closeLbBtn.addEventListener("click", () => {
  leaderboardPanel.classList.add("hidden");
});

// Fetch top leaderboard
async function loadLeaderboard() {
  leaderboardList.innerHTML = "<li>Loading...</li>";
  try {
    const res = await fetch(API_BASE + "/leaderboard?limit=10");
    const data = await res.json();
    leaderboardList.innerHTML = "";
    if (!data || data.length === 0) {
      leaderboardList.innerHTML = "<li>No entries yet (be the first!)</li>";
      return;
    }
    data.forEach((row) => {
      const li = document.createElement("li");
      li.textContent = `${row.username} — ${formatTime(row.time_ms)}`;
      leaderboardList.appendChild(li);
    });
  } catch (e) {
    leaderboardList.innerHTML = "<li>Could not load leaderboard.</li>";
  }
}

(async function init() {
  await loadQuestions();
  buildGrid();
})();
