import express from "express";
import crypto from "crypto";
import morgan from "morgan";
import Database from "better-sqlite3";

// Initialize
const app = express();
const db = new Database("data.db");
const PORT = process.env.PORT || 4000;

// Middleware
app.use(morgan("dev"));
app.use(express.json());

// Initialize DB
db.exec(`
CREATE TABLE IF NOT EXISTS strings (
  id TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  properties TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`);

// Helper: compute properties
function computeProperties(value) {
  if (typeof value !== "string") throw new TypeError("value must be a string");

  const length = value.length;
  const lower = value.toLowerCase();
  const is_palindrome = lower === lower.split("").reverse().join("");
  const unique_characters = new Set([...value]).size;
  const word_count = value.trim() === "" ? 0 : value.trim().split(/\s+/).length;
  const sha256_hash = crypto.createHash("sha256").update(value).digest("hex");

  const character_frequency_map = {};
  for (const ch of value) {
    character_frequency_map[ch] = (character_frequency_map[ch] || 0) + 1;
  }

  return {
    length,
    is_palindrome,
    unique_characters,
    word_count,
    sha256_hash,
    character_frequency_map,
  };
}

// POST /strings
app.post("/strings", (req, res) => {
  const { value } = req.body ?? {};
  if (value === undefined)
    return res.status(400).json({ error: '"value" field is required' });
  if (typeof value !== "string")
    return res.status(422).json({ error: '"value" must be a string' });

  const props = computeProperties(value);
  const id = props.sha256_hash;
  const now = new Date().toISOString();

  const exists = db.prepare("SELECT 1 FROM strings WHERE id = ?").get(id);
  if (exists)
    return res.status(409).json({ error: "String already exists in the system" });

  db.prepare(
    "INSERT INTO strings (id, value, properties, created_at) VALUES (?, ?, ?, ?)"
  ).run(id, value, JSON.stringify(props), now);

  return res.status(201).json({
    id,
    value,
    properties: props,
    created_at: now,
  });
});

// GET /strings/:string_value
app.get("/strings/:string_value", (req, res) => {
  const raw = req.params.string_value;
  if (!raw) return res.status(400).json({ error: "missing string value param" });
  const value = decodeURIComponent(raw);
  const hash = crypto.createHash("sha256").update(value).digest("hex");
  const row = db.prepare("SELECT * FROM strings WHERE id = ?").get(hash);
  if (!row) return res.status(404).json({ error: "String not found" });

  return res.json({
    id: row.id,
    value: row.value,
    properties: JSON.parse(row.properties),
    created_at: row.created_at,
  });
});

// Filter helper
function applyFilters(rows, filters) {
  return rows.filter((r) => {
    const p = JSON.parse(r.properties);
    if (filters.is_palindrome !== undefined) {
      if (String(p.is_palindrome) !== String(filters.is_palindrome)) return false;
    }
    if (filters.min_length !== undefined) {
      if (p.length < Number(filters.min_length)) return false;
    }
    if (filters.max_length !== undefined) {
      if (p.length > Number(filters.max_length)) return false;
    }
    if (filters.word_count !== undefined) {
      if (p.word_count !== Number(filters.word_count)) return false;
    }
    if (filters.contains_character !== undefined) {
      const ch = filters.contains_character;
      if (typeof ch !== "string" || ch.length === 0) return false;
      if (!r.value.includes(ch)) return false;
    }
    return true;
  });
}

// GET /strings (with filters)
app.get("/strings", (req, res) => {
  const { is_palindrome, min_length, max_length, word_count, contains_character } =
    req.query;

  const allRows = db.prepare("SELECT * FROM strings ORDER BY created_at DESC").all();
  const filtered = applyFilters(allRows, {
    is_palindrome:
      is_palindrome === undefined ? undefined : is_palindrome === "true",
    min_length,
    max_length,
    word_count,
    contains_character,
  });

  return res.json({
    data: filtered.map((r) => ({
      id: r.id,
      value: r.value,
      properties: JSON.parse(r.properties),
      created_at: r.created_at,
    })),
    count: filtered.length,
  });
});

// DELETE /strings/:string_value
app.delete("/strings/:string_value", (req, res) => {
  const value = decodeURIComponent(req.params.string_value);
  const id = crypto.createHash("sha256").update(value).digest("hex");
  const exists = db.prepare("SELECT 1 FROM strings WHERE id = ?").get(id);
  if (!exists)
    return res.status(404).json({ error: "String does not exist in the system" });
  db.prepare("DELETE FROM strings WHERE id = ?").run(id);
  return res.status(204).send();
});

// GET /strings/filter-by-natural-language
app.get("/strings/filter-by-natural-language", (req, res) => {
  const { query } = req.query;
  if (!query)
    return res.status(400).json({ error: "Missing 'query' parameter" });

  const lower = query.toLowerCase();
  const filters = {};

  // Basic natural language parsing
  if (lower.includes("palindromic")) filters.is_palindrome = true;
  if (lower.includes("longer than")) {
    const num = parseInt(lower.match(/longer than (\d+)/)?.[1]);
    if (!isNaN(num)) filters.min_length = num + 1;
  }
  if (lower.includes("single word")) filters.word_count = 1;
  if (lower.includes("containing the letter")) {
    const ch = lower.match(/containing the letter (\w)/)?.[1];
    if (ch) filters.contains_character = ch;
  } else if (lower.includes("containing the letter")) {
    const ch = lower.slice(lower.indexOf("containing the letter") + 22, lower.indexOf("containing the letter") + 23);
    if (ch) filters.contains_character = ch;
  }
  if (lower.includes("containing the first vowel")) {
    filters.contains_character = "a";
  }

  // Apply filters
  const allRows = db.prepare("SELECT * FROM strings ORDER BY created_at DESC").all();
  const filtered = applyFilters(allRows, filters);

  if (Object.keys(filters).length === 0)
    return res.status(400).json({ error: "Unable to parse natural language query" });

  return res.json({
    data: filtered.map((r) => ({
      id: r.id,
      value: r.value,
      properties: JSON.parse(r.properties),
      created_at: r.created_at,
    })),
    count: filtered.length,
    interpreted_query: {
      original: query,
      parsed_filters: filters,
    },
  });
});

// Health route
app.get("/", (req, res) => res.json({ status: "ok" }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "internal_server_error" });
});

// Start server
app.listen(PORT, () => console.log(`String Analyzer listening on ${PORT}`));
