// server.js
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "leaderboard.sqlite");

// Create DB if not exists
const db = new sqlite3.Database(DB_FILE);
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      time_ms INTEGER NOT NULL,
      tiles_unlocked INTEGER NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
});

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));


app.use("/assests", express.static(path.join(__dirname, "assests")));

// Questions endpoint - serves questions.json
app.get("/questions", (req, res) => {
  const file = path.join(__dirname, "questions.json");
  fs.readFile(file, "utf8", (err, data) => {
    if (err) return res.status(500).json({ error: "Could not load questions." });
    res.setHeader("Content-Type", "application/json");
    res.send(data);
  });
});

// Submit result
app.post("/submit", (req, res) => {
  const { username, time_ms, tiles_unlocked } = req.body;
  if (!username || typeof time_ms !== "number" || typeof tiles_unlocked !== "number") {
    return res.status(400).json({ error: "Invalid payload." });
  }
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO scores (username, time_ms, tiles_unlocked, created_at) VALUES (?, ?, ?, ?)`,
    [username, time_ms, tiles_unlocked, now],
    function (err) {
      if (err) return res.status(500).json({ error: "DB insert failed." });
      res.json({ ok: true, id: this.lastID });
    }
  );
});

// Leaderboard - top by fastest time but only full-completes (tiles_unlocked === 9)
// you can change or expand criteria as desired
app.get("/leaderboard", (req, res) => {
    db.all(
      `SELECT username, time_ms, tiles_unlocked, created_at 
       FROM scores 
       WHERE tiles_unlocked = 9 
       ORDER BY time_ms ASC, created_at ASC`,
      (err, rows) => {
        if (err) return res.status(500).json({ error: "DB read failed." });
        res.json(rows);
      }
    );
  });
  
// Fallback - serve frontend index for SPA route
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Puzzle game server running on port ${PORT}`);
});
