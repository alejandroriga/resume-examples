/**
 * db.js — SQLite database module for the multi-user CMS
 *
 * Uses sql.js (pure-JS SQLite) so no native compilation is needed.
 * The database file is persisted to disk on every write operation.
 *
 * Exports: initDB(), and all CRUD / auth / history / snapshot helpers.
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// ─── Config ──────────────────────────────────────────────────────
const DB_DIR  = process.env.DB_DIR || __dirname;
const DB_PATH = path.join(DB_DIR, 'cms.sqlite');

let db = null; // sql.js Database instance

// ─── Initialisation ─────────────────────────────────────────────

async function initDB() {
  const SQL = await initSqlJs();

  // Load existing DB file or create new one
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
    console.log('  Loaded existing database from', DB_PATH);
  } else {
    db = new SQL.Database();
    console.log('  Created new database');
  }

  // Enable WAL-like behavior (not available in sql.js but we set journal mode)
  db.run('PRAGMA journal_mode = MEMORY');
  db.run('PRAGMA foreign_keys = ON');

  // ─── Create tables ──────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id         TEXT PRIMARY KEY,
      data       TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      updated_by TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      username   TEXT PRIMARY KEY,
      password   TEXT NOT NULL,
      display    TEXT NOT NULL,
      role       TEXT DEFAULT 'editor'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      username   TEXT NOT NULL,
      expires_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS change_log (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_id     TEXT NOT NULL,
      field_path TEXT NOT NULL,
      old_value  TEXT,
      new_value  TEXT,
      username   TEXT NOT NULL,
      changed_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS approvals (
      doc_id      TEXT NOT NULL,
      field_path  TEXT NOT NULL,
      approved    INTEGER DEFAULT 0,
      approved_by TEXT,
      approved_at TEXT,
      PRIMARY KEY (doc_id, field_path)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      data       TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS seo_scores (
      doc_id         TEXT NOT NULL,
      field_path     TEXT NOT NULL,
      general_score  INTEGER DEFAULT 0,
      keyword_score  INTEGER DEFAULT 0,
      ai_probability INTEGER DEFAULT 0,
      recommendations TEXT,
      content_hash   TEXT,
      checked_at     TEXT DEFAULT (datetime('now')),
      checked_by     TEXT,
      PRIMARY KEY (doc_id, field_path)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_id     TEXT NOT NULL,
      field_path TEXT NOT NULL,
      username   TEXT NOT NULL,
      comment    TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      hidden     INTEGER DEFAULT 0,
      done       INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reviewers (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name   TEXT NOT NULL,
      email       TEXT NOT NULL UNIQUE,
      linkedin    TEXT DEFAULT '',
      bio         TEXT DEFAULT '',
      token       TEXT NOT NULL UNIQUE,
      created_by  TEXT NOT NULL,
      created_at  TEXT DEFAULT (datetime('now')),
      active      INTEGER DEFAULT 1
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS expert_reviews (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_id      TEXT NOT NULL,
      field_path  TEXT NOT NULL,
      reviewer_id INTEGER NOT NULL,
      review      TEXT NOT NULL,
      sources     TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS approval_ledger (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_id         TEXT NOT NULL,
      field_path     TEXT NOT NULL,
      page_label     TEXT NOT NULL,
      section_label  TEXT NOT NULL,
      html_element   TEXT DEFAULT '',
      content        TEXT NOT NULL,
      approved_by    TEXT NOT NULL,
      approved_at    TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Migration: make linkedin and bio optional in reviewers (was NOT NULL)
  try {
    const info = db.exec("PRAGMA table_info(reviewers)");
    if (info.length) {
      const cols = info[0].values;
      const linkedinCol = cols.find(c => c[1] === 'linkedin');
      if (linkedinCol && linkedinCol[3] === 1) { // notnull=1 means NOT NULL
        db.run(`CREATE TABLE reviewers_new AS SELECT * FROM reviewers`);
        db.run(`DROP TABLE reviewers`);
        db.run(`
          CREATE TABLE reviewers (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name   TEXT NOT NULL,
            email       TEXT NOT NULL UNIQUE,
            linkedin    TEXT DEFAULT '',
            bio         TEXT DEFAULT '',
            token       TEXT NOT NULL UNIQUE,
            created_by  TEXT NOT NULL,
            created_at  TEXT DEFAULT (datetime('now')),
            active      INTEGER DEFAULT 1
          )
        `);
        db.run(`INSERT INTO reviewers (id, full_name, email, linkedin, bio, token, created_by, created_at, active)
                SELECT id, full_name, email, linkedin, bio, token, created_by, created_at, active FROM reviewers_new`);
        db.run(`DROP TABLE reviewers_new`);
        console.log('  Migrated reviewers: linkedin and bio now optional');
      }
    }
  } catch(e) { /* table may not exist yet, that's fine */ }

  // Migration: add 'hidden' column to comments if missing (soft delete support)
  try {
    const cInfo = db.exec("PRAGMA table_info(comments)");
    if (cInfo.length) {
      const cCols = cInfo[0].values;
      if (!cCols.find(c => c[1] === 'hidden')) {
        db.run("ALTER TABLE comments ADD COLUMN hidden INTEGER DEFAULT 0");
        console.log('  Migrated comments: added hidden column for soft delete');
      }
      if (!cCols.find(c => c[1] === 'done')) {
        db.run("ALTER TABLE comments ADD COLUMN done INTEGER DEFAULT 0");
        console.log('  Migrated comments: added done column');
      }
    }
  } catch(e) { /* table may not exist yet */ }

  // Create indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_changelog_doc ON change_log(doc_id, field_path)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_seoscores_doc ON seo_scores(doc_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_comments_doc ON comments(doc_id, field_path)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_reviewers_token ON reviewers(token)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_expert_reviews_doc ON expert_reviews(doc_id, field_path)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_expert_reviews_reviewer ON expert_reviews(reviewer_id)`);

  // ─── Surveys ──────────────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS surveys (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      description TEXT,
      questions   TEXT NOT NULL,
      active      INTEGER DEFAULT 1,
      created_by  TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS survey_responses (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      survey_id          TEXT NOT NULL,
      respondent_name    TEXT,
      respondent_email   TEXT,
      respondent_position TEXT,
      answers            TEXT NOT NULL,
      submitted_at       TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_survey_responses_survey ON survey_responses(survey_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_survey_responses_email ON survey_responses(survey_id, respondent_email)`);

  save();
  console.log('  Database schema ready');
  return db;
}

/** Persist database to disk */
function save() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

/** Reload database from disk (used after external migration) */
async function reloadDB() {
  if (fs.existsSync(DB_PATH)) {
    const SQL = await initSqlJs();
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
    console.log('  Reloaded database from', DB_PATH);
  }
}


// ═══════════════════════════════════════════════════════════════
// DOCUMENTS
// ═══════════════════════════════════════════════════════════════

/** Get all documents as { id: data } map */
function getAllDocuments() {
  const rows = db.exec('SELECT id, data, updated_at, updated_by FROM documents');
  if (!rows.length) return {};
  const result = {};
  for (const row of rows[0].values) {
    result[row[0]] = {
      data: JSON.parse(row[1]),
      updated_at: row[2],
      updated_by: row[3]
    };
  }
  return result;
}

/** Get a single document by id */
function getDocument(id) {
  const rows = db.exec('SELECT data, updated_at, updated_by FROM documents WHERE id = ?', [id]);
  if (!rows.length || !rows[0].values.length) return null;
  const row = rows[0].values[0];
  return {
    data: JSON.parse(row[0]),
    updated_at: row[1],
    updated_by: row[2]
  };
}

/**
 * Save a document, recording field-level changes in change_log.
 * @param {string} id - Document ID ('homepage', 'subpage:ats', etc.)
 * @param {object} newData - The full JSON data
 * @param {string} username - Who made the change
 */
function saveDocument(id, newData, username) {
  // Get old data for diffing
  const existing = getDocument(id);
  const oldData = existing ? existing.data : null;

  // Upsert document
  const stmt = db.prepare(`
    INSERT INTO documents (id, data, updated_at, updated_by)
    VALUES (?, ?, datetime('now'), ?)
    ON CONFLICT(id) DO UPDATE SET
      data = excluded.data,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by
  `);
  stmt.run([id, JSON.stringify(newData), username]);
  stmt.free();

  // Record field-level changes
  if (oldData) {
    const changes = deepDiff(oldData, newData, '');
    for (const change of changes) {
      const ins = db.prepare(`
        INSERT INTO change_log (doc_id, field_path, old_value, new_value, username)
        VALUES (?, ?, ?, ?, ?)
      `);
      ins.run([id, change.path, change.oldVal !== undefined ? JSON.stringify(change.oldVal) : null, change.newVal !== undefined ? JSON.stringify(change.newVal) : null, username]);
      ins.free();
    }
  }

  save();
}


// ═══════════════════════════════════════════════════════════════
// DEEP DIFF — field-level change tracking
// ═══════════════════════════════════════════════════════════════

/**
 * Compare two objects and return an array of { path, oldVal, newVal }
 * Only tracks leaf-level changes (strings, numbers, booleans, null).
 */
function deepDiff(oldObj, newObj, prefix) {
  const changes = [];
  const allKeys = new Set([
    ...Object.keys(oldObj || {}),
    ...Object.keys(newObj || {})
  ]);

  for (const key of allKeys) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    const oldVal = oldObj ? oldObj[key] : undefined;
    const newVal = newObj ? newObj[key] : undefined;

    // Both are objects/arrays — recurse
    if (
      oldVal && newVal &&
      typeof oldVal === 'object' && typeof newVal === 'object' &&
      !Array.isArray(oldVal) && !Array.isArray(newVal)
    ) {
      changes.push(...deepDiff(oldVal, newVal, fullPath));
      continue;
    }

    // Both are arrays — compare element by element
    if (Array.isArray(oldVal) && Array.isArray(newVal)) {
      const maxLen = Math.max(oldVal.length, newVal.length);
      for (let i = 0; i < maxLen; i++) {
        const elemPath = `${fullPath}.${i}`;
        const ov = oldVal[i];
        const nv = newVal[i];
        if (ov && nv && typeof ov === 'object' && typeof nv === 'object') {
          changes.push(...deepDiff(ov, nv, elemPath));
        } else if (JSON.stringify(ov) !== JSON.stringify(nv)) {
          changes.push({ path: elemPath, oldVal: ov, newVal: nv });
        }
      }
      continue;
    }

    // Leaf comparison
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ path: fullPath, oldVal, newVal });
    }
  }

  return changes;
}


// ═══════════════════════════════════════════════════════════════
// AUTH — Users & Sessions
// ═══════════════════════════════════════════════════════════════

/** Create a user (for migration / setup) */
function createUser(username, plainPassword, display, role = 'editor') {
  const hash = bcrypt.hashSync(plainPassword, 10);
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO users (username, password, display, role)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run([username, hash, display, role]);
  stmt.free();
  save();
}

function deleteUser(username) {
  const stmt = db.prepare('DELETE FROM users WHERE username = ?');
  stmt.run([username]);
  stmt.free();
  // Also remove their sessions
  const s2 = db.prepare('DELETE FROM sessions WHERE username = ?');
  s2.run([username]);
  s2.free();
  save();
}

/** Authenticate user, return { username, display, role } or null */
function authenticate(username, plainPassword) {
  const rows = db.exec('SELECT password, display, role FROM users WHERE username = ?', [username]);
  if (!rows.length || !rows[0].values.length) return null;
  const [hash, display, role] = rows[0].values[0];
  if (!bcrypt.compareSync(plainPassword, hash)) return null;
  return { username, display, role };
}

/** Create session token, return token string */
function createSession(username) {
  // Clean expired sessions
  db.run("DELETE FROM sessions WHERE expires_at < datetime('now')");

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
  const stmt = db.prepare('INSERT INTO sessions (token, username, expires_at) VALUES (?, ?, ?)');
  stmt.run([token, username, expires]);
  stmt.free();
  save();
  return token;
}

/** Validate session token, return { username, display, role } or null */
function validateSession(token) {
  if (!token) return null;
  const rows = db.exec(
    "SELECT s.username, u.display, u.role FROM sessions s JOIN users u ON s.username = u.username WHERE s.token = ? AND s.expires_at > datetime('now')",
    [token]
  );
  if (!rows.length || !rows[0].values.length) return null;
  const [username, display, role] = rows[0].values[0];
  return { username, display, role };
}

/** Destroy a session */
function destroySession(token) {
  db.run('DELETE FROM sessions WHERE token = ?', [token]);
  save();
}


// ═══════════════════════════════════════════════════════════════
// CHANGE LOG — History
// ═══════════════════════════════════════════════════════════════

/** Get change history for a document (optionally filtered by field) */
function getHistory(docId, fieldPath, limit = 50) {
  let sql, params;
  if (fieldPath) {
    sql = 'SELECT field_path, old_value, new_value, username, changed_at FROM change_log WHERE doc_id = ? AND field_path = ? ORDER BY changed_at DESC LIMIT ?';
    params = [docId, fieldPath, limit];
  } else {
    sql = 'SELECT field_path, old_value, new_value, username, changed_at FROM change_log WHERE doc_id = ? ORDER BY changed_at DESC LIMIT ?';
    params = [docId, limit];
  }
  const rows = db.exec(sql, params);
  if (!rows.length) return [];
  return rows[0].values.map(r => ({
    field_path: r[0],
    old_value: r[1] ? JSON.parse(r[1]) : null,
    new_value: r[2] ? JSON.parse(r[2]) : null,
    username: r[3],
    changed_at: r[4]
  }));
}


// ═══════════════════════════════════════════════════════════════
// APPROVALS
// ═══════════════════════════════════════════════════════════════

/** Get all approvals for a document */
function getApprovals(docId) {
  const rows = db.exec(
    'SELECT field_path, approved, approved_by, approved_at FROM approvals WHERE doc_id = ?',
    [docId]
  );
  if (!rows.length) return {};
  const result = {};
  for (const r of rows[0].values) {
    result[r[0]] = {
      approved: !!r[1],
      approved_by: r[2],
      approved_at: r[3]
    };
  }
  return result;
}

/** Toggle approval for a specific field (supervisor only) */
function setApproval(docId, fieldPath, approved, username) {
  const stmt = db.prepare(`
    INSERT INTO approvals (doc_id, field_path, approved, approved_by, approved_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(doc_id, field_path) DO UPDATE SET
      approved = excluded.approved,
      approved_by = excluded.approved_by,
      approved_at = excluded.approved_at
  `);
  stmt.run([docId, fieldPath, approved ? 1 : 0, username]);
  stmt.free();
  save();
}


// ═══════════════════════════════════════════════════════════════
// APPROVAL LEDGER (immutable audit log)
// ═══════════════════════════════════════════════════════════════

function addLedgerEntry({ docId, fieldPath, pageLabel, sectionLabel, htmlElement, content, approvedBy }) {
  const stmt = db.prepare(`
    INSERT INTO approval_ledger (doc_id, field_path, page_label, section_label, html_element, content, approved_by, approved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  stmt.run([docId, fieldPath, pageLabel, sectionLabel, htmlElement || '', content, approvedBy]);
  stmt.free();
  save();
}

function getLedger(limit = 200, offset = 0) {
  const rows = db.exec(
    `SELECT id, doc_id, field_path, page_label, section_label, html_element, content, approved_by, approved_at
     FROM approval_ledger ORDER BY approved_at DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  if (!rows.length) return [];
  return rows[0].values.map(r => ({
    id: r[0], doc_id: r[1], field_path: r[2], page_label: r[3], section_label: r[4],
    html_element: r[5], content: r[6], approved_by: r[7], approved_at: r[8]
  }));
}

// ═══════════════════════════════════════════════════════════════
// SNAPSHOTS
// ═══════════════════════════════════════════════════════════════

/** Create a snapshot of all documents + approvals */
function createSnapshot(name, username) {
  const documents = getAllDocuments();
  // Also snapshot approvals
  const appRows = db.exec('SELECT doc_id, field_path, approved, approved_by, approved_at FROM approvals');
  const approvals = [];
  if (appRows.length) {
    for (const r of appRows[0].values) {
      approvals.push({
        doc_id: r[0], field_path: r[1], approved: r[2],
        approved_by: r[3], approved_at: r[4]
      });
    }
  }

  const snapshotData = JSON.stringify({ documents, approvals });
  const stmt = db.prepare("INSERT INTO snapshots (name, data, created_by) VALUES (?, ?, ?)");
  stmt.run([name, snapshotData, username]);
  stmt.free();

  // Prune auto-snapshots (keep last 20)
  db.run(`
    DELETE FROM snapshots WHERE id IN (
      SELECT id FROM snapshots
      WHERE name LIKE 'Auto:%'
      ORDER BY created_at DESC
      LIMIT -1 OFFSET 20
    )
  `);

  save();
}

/** List all snapshots (metadata only, no data blob) */
function listSnapshots() {
  const rows = db.exec('SELECT id, name, created_by, created_at FROM snapshots ORDER BY created_at DESC');
  if (!rows.length) return [];
  return rows[0].values.map(r => ({
    id: r[0], name: r[1], created_by: r[2], created_at: r[3]
  }));
}

/** Restore a snapshot — overwrites all documents and approvals */
function restoreSnapshot(snapshotId) {
  const rows = db.exec('SELECT data FROM snapshots WHERE id = ?', [snapshotId]);
  if (!rows.length || !rows[0].values.length) return false;

  const { documents, approvals } = JSON.parse(rows[0].values[0][0]);

  // Clear current data
  db.run('DELETE FROM documents');
  db.run('DELETE FROM approvals');

  // Restore documents
  for (const [id, doc] of Object.entries(documents)) {
    const stmt = db.prepare('INSERT INTO documents (id, data, updated_at, updated_by) VALUES (?, ?, ?, ?)');
    stmt.run([id, JSON.stringify(doc.data), doc.updated_at, doc.updated_by]);
    stmt.free();
  }

  // Restore approvals
  if (approvals && approvals.length) {
    for (const a of approvals) {
      const stmt = db.prepare('INSERT INTO approvals (doc_id, field_path, approved, approved_by, approved_at) VALUES (?, ?, ?, ?, ?)');
      stmt.run([a.doc_id, a.field_path, a.approved, a.approved_by, a.approved_at]);
      stmt.free();
    }
  }

  save();
  return true;
}


// ═══════════════════════════════════════════════════════════════
// SEO SCORES
// ═══════════════════════════════════════════════════════════════

/** Get all SEO scores for a document */
function getSeoScores(docId) {
  const rows = db.exec(
    'SELECT field_path, general_score, keyword_score, ai_probability, recommendations, content_hash, checked_at, checked_by FROM seo_scores WHERE doc_id = ?',
    [docId]
  );
  if (!rows.length) return {};
  const result = {};
  for (const r of rows[0].values) {
    result[r[0]] = {
      generalScore: r[1],
      keywordScore: r[2],
      aiProbability: r[3],
      recommendations: r[4] ? JSON.parse(r[4]) : { critical: [], nonCritical: [] },
      contentHash: r[5],
      checkedAt: r[6],
      checkedBy: r[7]
    };
  }
  return result;
}

/** Upsert SEO score for a single field */
function setSeoScore(docId, fieldPath, scores, contentHash, username) {
  const stmt = db.prepare(`
    INSERT INTO seo_scores (doc_id, field_path, general_score, keyword_score, ai_probability, recommendations, content_hash, checked_at, checked_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
    ON CONFLICT(doc_id, field_path) DO UPDATE SET
      general_score = excluded.general_score,
      keyword_score = excluded.keyword_score,
      ai_probability = excluded.ai_probability,
      recommendations = excluded.recommendations,
      content_hash = excluded.content_hash,
      checked_at = excluded.checked_at,
      checked_by = excluded.checked_by
  `);
  stmt.run([
    docId, fieldPath,
    scores.generalScore, scores.keywordScore, scores.aiProbability,
    JSON.stringify(scores.recommendations),
    contentHash, username
  ]);
  stmt.free();
  save();
}

/** Get aggregate SEO scores per document (for dashboard) */
function getAllSeoScoresSummary() {
  const rows = db.exec(`
    SELECT doc_id,
      COUNT(*) as field_count,
      ROUND(AVG(general_score)) as avg_general,
      ROUND(AVG(keyword_score)) as avg_keyword,
      ROUND(AVG(ai_probability)) as avg_ai
    FROM seo_scores
    GROUP BY doc_id
  `);
  if (!rows.length) return {};
  const result = {};
  for (const r of rows[0].values) {
    result[r[0]] = {
      fieldCount: r[1],
      avgGeneral: r[2],
      avgKeyword: r[3],
      avgAi: r[4]
    };
  }
  return result;
}


// ═══════════════════════════════════════════════════════════════
// COMMENTS
// ═══════════════════════════════════════════════════════════════

/** Add a comment to a field */
function addComment(docId, fieldPath, username, comment) {
  const stmt = db.prepare(`
    INSERT INTO comments (doc_id, field_path, username, comment)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run([docId, fieldPath, username, comment]);
  stmt.free();
  save();
  const rows = db.exec('SELECT last_insert_rowid()');
  return rows[0].values[0][0];
}

/** Get comments for a specific field */
function getComments(docId, fieldPath) {
  const rows = db.exec(
    'SELECT id, field_path, username, comment, created_at, done FROM comments WHERE doc_id = ? AND field_path = ? AND hidden = 0 ORDER BY created_at DESC',
    [docId, fieldPath]
  );
  if (!rows.length) return [];
  return rows[0].values.map(r => ({
    id: r[0], field_path: r[1], username: r[2], comment: r[3], created_at: r[4], done: r[5] || 0
  }));
}

/** Get ALL comments for a document (for the feed page) */
function getAllComments(docId) {
  const rows = db.exec(
    'SELECT id, field_path, username, comment, created_at FROM comments WHERE doc_id = ? AND hidden = 0 ORDER BY created_at DESC',
    [docId]
  );
  if (!rows.length) return [];
  return rows[0].values.map(r => ({
    id: r[0], field_path: r[1], username: r[2], comment: r[3], created_at: r[4]
  }));
}

/** Get comment counts per field_path for badge display */
function getCommentCounts(docId) {
  const rows = db.exec(
    'SELECT field_path, COUNT(*) as cnt FROM comments WHERE doc_id = ? AND hidden = 0 GROUP BY field_path',
    [docId]
  );
  if (!rows.length) return {};
  const result = {};
  for (const r of rows[0].values) {
    result[r[0]] = r[1];
  }
  return result;
}

/** Get ALL comments across all documents (global feed) */
function getAllCommentsGlobal() {
  const rows = db.exec(
    'SELECT id, doc_id, field_path, username, comment, created_at, done FROM comments WHERE hidden = 0 ORDER BY created_at DESC'
  );
  if (!rows.length) return [];
  return rows[0].values.map(r => ({
    id: r[0], doc_id: r[1], field_path: r[2], username: r[3], comment: r[4], created_at: r[5], done: r[6] || 0
  }));
}

function toggleCommentDone(commentId) {
  db.run('UPDATE comments SET done = CASE WHEN done = 1 THEN 0 ELSE 1 END WHERE id = ?', [commentId]);
  save();
  const rows = db.exec('SELECT done FROM comments WHERE id = ?', [commentId]);
  return { ok: true, done: rows.length && rows[0].values.length ? rows[0].values[0][0] : 0 };
}

/** Delete a comment (supervisors can delete any, editors only their own) */
function deleteComment(commentId, username, role) {
  const rows = db.exec('SELECT username FROM comments WHERE id = ?', [commentId]);
  if (!rows.length || !rows[0].values.length) {
    return { ok: false, error: 'Comment not found' };
  }
  const commentAuthor = rows[0].values[0][0];
  if (role !== 'supervisor' && commentAuthor !== username) {
    return { ok: false, error: 'You can only delete your own comments' };
  }
  const stmt = db.prepare('UPDATE comments SET hidden = 1 WHERE id = ?');
  stmt.run([commentId]);
  stmt.free();
  save();
  return { ok: true };
}


// ═══════════════════════════════════════════════════════════════
// REVIEWERS
// ═══════════════════════════════════════════════════════════════

/** Create a reviewer and return the generated token */
function createReviewer(fullName, email, linkedin, bio, createdBy) {
  const token = crypto.randomBytes(32).toString('hex');
  const stmt = db.prepare(`
    INSERT INTO reviewers (full_name, email, linkedin, bio, token, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run([fullName, email, linkedin, bio, token, createdBy]);
  stmt.free();
  save();
  return token;
}

/** Get all reviewers */
function getAllReviewers() {
  const rows = db.exec(
    'SELECT id, full_name, email, linkedin, bio, token, created_by, created_at, active FROM reviewers ORDER BY created_at DESC'
  );
  if (!rows.length) return [];
  return rows[0].values.map(r => ({
    id: r[0], full_name: r[1], email: r[2], linkedin: r[3], bio: r[4],
    token: r[5], created_by: r[6], created_at: r[7], active: !!r[8]
  }));
}

/** Validate a reviewer token — returns reviewer info or null */
function getReviewerByToken(token) {
  if (!token) return null;
  const rows = db.exec(
    'SELECT id, full_name, email, linkedin, bio FROM reviewers WHERE token = ? AND active = 1',
    [token]
  );
  if (!rows.length || !rows[0].values.length) return null;
  const r = rows[0].values[0];
  return { id: r[0], full_name: r[1], email: r[2], linkedin: r[3], bio: r[4] };
}

/** Update reviewer fields */
function updateReviewer(id, fields) {
  const allowed = ['full_name', 'email', 'linkedin', 'bio'];
  const sets = [];
  const vals = [];
  for (const k of allowed) {
    if (fields[k] !== undefined) {
      sets.push(`${k} = ?`);
      vals.push(fields[k]);
    }
  }
  if (!sets.length) return;
  vals.push(id);
  const stmt = db.prepare(`UPDATE reviewers SET ${sets.join(', ')} WHERE id = ?`);
  stmt.run(vals);
  stmt.free();
  save();
}

/** Deactivate a reviewer (soft delete) */
function deactivateReviewer(id) {
  const stmt = db.prepare('UPDATE reviewers SET active = 0 WHERE id = ?');
  stmt.run([id]);
  stmt.free();
  save();
}

/** Regenerate a reviewer token */
function regenerateReviewerToken(id) {
  const token = crypto.randomBytes(32).toString('hex');
  const stmt = db.prepare('UPDATE reviewers SET token = ? WHERE id = ?');
  stmt.run([token, id]);
  stmt.free();
  save();
  return token;
}


// ═══════════════════════════════════════════════════════════════
// EXPERT REVIEWS
// ═══════════════════════════════════════════════════════════════

/** Add an expert review */
function addExpertReview(docId, fieldPath, reviewerId, review, sources) {
  const stmt = db.prepare(`
    INSERT INTO expert_reviews (doc_id, field_path, reviewer_id, review, sources)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run([docId, fieldPath, reviewerId, review, sources ? JSON.stringify(sources) : null]);
  stmt.free();
  save();
  const rows = db.exec('SELECT last_insert_rowid()');
  return rows[0].values[0][0];
}

/** Get expert reviews for a specific field (with reviewer info) */
function getExpertReviews(docId, fieldPath) {
  const rows = db.exec(
    `SELECT er.id, er.field_path, er.review, er.sources, er.created_at,
            r.id as reviewer_id, r.full_name, r.linkedin, r.bio
     FROM expert_reviews er
     JOIN reviewers r ON er.reviewer_id = r.id
     WHERE er.doc_id = ? AND er.field_path = ?
     ORDER BY er.created_at DESC`,
    [docId, fieldPath]
  );
  if (!rows.length) return [];
  return rows[0].values.map(r => ({
    id: r[0], field_path: r[1], review: r[2],
    sources: r[3] ? JSON.parse(r[3]) : [],
    created_at: r[4],
    reviewer_id: r[5], reviewer_name: r[6], reviewer_linkedin: r[7], reviewer_bio: r[8]
  }));
}

/** Get ALL expert reviews for a document (for the feed) */
function getAllExpertReviews(docId) {
  const rows = db.exec(
    `SELECT er.id, er.field_path, er.review, er.sources, er.created_at,
            r.id as reviewer_id, r.full_name, r.linkedin, r.bio
     FROM expert_reviews er
     JOIN reviewers r ON er.reviewer_id = r.id
     WHERE er.doc_id = ?
     ORDER BY er.created_at DESC`,
    [docId]
  );
  if (!rows.length) return [];
  return rows[0].values.map(r => ({
    id: r[0], field_path: r[1], review: r[2],
    sources: r[3] ? JSON.parse(r[3]) : [],
    created_at: r[4],
    reviewer_id: r[5], reviewer_name: r[6], reviewer_linkedin: r[7], reviewer_bio: r[8]
  }));
}

/** Get expert review counts per field_path */
function getExpertReviewCounts(docId) {
  const rows = db.exec(
    'SELECT field_path, COUNT(*) as cnt FROM expert_reviews WHERE doc_id = ? GROUP BY field_path',
    [docId]
  );
  if (!rows.length) return {};
  const result = {};
  for (const r of rows[0].values) {
    result[r[0]] = r[1];
  }
  return result;
}

/** Get expert reviews by a specific reviewer for a document */
function getExpertReviewsByReviewer(reviewerId, docId) {
  const rows = db.exec(
    'SELECT id, field_path, review, sources, created_at FROM expert_reviews WHERE reviewer_id = ? AND doc_id = ? ORDER BY created_at DESC',
    [reviewerId, docId]
  );
  if (!rows.length) return [];
  return rows[0].values.map(r => ({
    id: r[0], field_path: r[1], review: r[2],
    sources: r[3] ? JSON.parse(r[3]) : [],
    created_at: r[4]
  }));
}

/** Delete an expert review (supervisor only) */
function deleteExpertReview(reviewId) {
  const stmt = db.prepare('DELETE FROM expert_reviews WHERE id = ?');
  stmt.run([reviewId]);
  stmt.free();
  save();
}


// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

// ─── Surveys ──────────────────────────────────────────────────

function createSurvey(id, title, description, questions, createdBy) {
  db.run(
    `INSERT OR REPLACE INTO surveys (id, title, description, questions, active, created_by, created_at)
     VALUES (?, ?, ?, ?, 1, ?, datetime('now'))`,
    [id, title, description, JSON.stringify(questions), createdBy]
  );
  save();
  return { id, title };
}

function getSurvey(id) {
  const rows = db.exec(`SELECT * FROM surveys WHERE id = ?`, [id]);
  if (!rows.length || !rows[0].values.length) return null;
  const cols = rows[0].columns;
  const vals = rows[0].values[0];
  const row = {};
  cols.forEach((c, i) => row[c] = vals[i]);
  row.questions = JSON.parse(row.questions);
  return row;
}

function listSurveys() {
  const rows = db.exec(`SELECT s.id, s.title, s.description, s.questions, s.active, s.created_by, s.created_at, COALESCE(r.cnt, 0) as responseCount FROM surveys s LEFT JOIN (SELECT survey_id, COUNT(*) as cnt FROM survey_responses GROUP BY survey_id) r ON r.survey_id = s.id ORDER BY s.created_at DESC`);
  if (!rows.length) return [];
  return rows[0].values.map(vals => {
    const row = {};
    rows[0].columns.forEach((c, i) => row[c] = vals[i]);
    return row;
  });
}

function updateSurvey(id, fields) {
  const survey = getSurvey(id);
  if (!survey) return null;
  if (fields.active !== undefined) {
    db.run(`UPDATE surveys SET active = ? WHERE id = ?`, [fields.active ? 1 : 0, id]);
  }
  if (fields.title) {
    db.run(`UPDATE surveys SET title = ? WHERE id = ?`, [fields.title, id]);
  }
  save();
  return getSurvey(id);
}

function submitSurveyResponse(surveyId, name, email, position, answers) {
  db.run(
    `INSERT INTO survey_responses (survey_id, respondent_name, respondent_email, respondent_position, answers, submitted_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    [surveyId, name, email, position, JSON.stringify(answers)]
  );
  save();
}

function getSurveyResponses(surveyId) {
  const rows = db.exec(
    `SELECT * FROM survey_responses WHERE survey_id = ? ORDER BY submitted_at DESC`,
    [surveyId]
  );
  if (!rows.length) return [];
  return rows[0].values.map(vals => {
    const row = {};
    rows[0].columns.forEach((c, i) => row[c] = vals[i]);
    row.answers = JSON.parse(row.answers);
    return row;
  });
}

function getSurveyResponseCount(surveyId) {
  const rows = db.exec(`SELECT COUNT(*) as cnt FROM survey_responses WHERE survey_id = ?`, [surveyId]);
  return rows.length && rows[0].values.length ? rows[0].values[0][0] : 0;
}

function checkSurveyEmailExists(surveyId, email) {
  const rows = db.exec(
    `SELECT COUNT(*) FROM survey_responses WHERE survey_id = ? AND respondent_email = ?`,
    [surveyId, email.toLowerCase().trim()]
  );
  return rows.length && rows[0].values.length && rows[0].values[0][0] > 0;
}

module.exports = {
  initDB,
  reloadDB,
  save,
  // Documents
  getAllDocuments,
  getDocument,
  saveDocument,
  // Auth
  createUser,
  deleteUser,
  authenticate,
  createSession,
  validateSession,
  destroySession,
  // History
  getHistory,
  // Approvals
  getApprovals,
  setApproval,
  // Approval Ledger
  addLedgerEntry,
  getLedger,
  // SEO Scores
  getSeoScores,
  setSeoScore,
  getAllSeoScoresSummary,
  // Comments
  addComment,
  getComments,
  getAllComments,
  getCommentCounts,
  getAllCommentsGlobal,
  toggleCommentDone,
  deleteComment,
  // Snapshots
  createSnapshot,
  listSnapshots,
  restoreSnapshot,
  // Reviewers
  createReviewer,
  getAllReviewers,
  getReviewerByToken,
  updateReviewer,
  deactivateReviewer,
  regenerateReviewerToken,
  // Expert Reviews
  addExpertReview,
  getExpertReviews,
  getAllExpertReviews,
  getExpertReviewCounts,
  getExpertReviewsByReviewer,
  deleteExpertReview,
  // Surveys
  createSurvey,
  getSurvey,
  listSurveys,
  updateSurvey,
  submitSurveyResponse,
  getSurveyResponses,
  getSurveyResponseCount,
  checkSurveyEmailExists,
  // Utils
  deepDiff
};
