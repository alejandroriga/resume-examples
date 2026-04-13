#!/usr/bin/env node
/**
 * Sync seoGoals from homepage-data.json into the SQLite database.
 */
const db = require('./db');
const fs = require('fs');
const path = require('path');

(async () => {
  await db.initDB();

  const jsonPath = path.join(__dirname, 'homepage-data.json');
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  const doc = db.getDocument('homepage');
  if (!doc) { console.error('Homepage document not found in DB'); process.exit(1); }

  const existing = doc.data.seoGoals || [];
  const incoming = jsonData.seoGoals || [];

  console.log(`DB currently has ${existing.length} seoGoals`);
  console.log(`JSON file has ${incoming.length} seoGoals`);

  doc.data.seoGoals = incoming;
  db.saveDocument('homepage', doc.data, 'system');

  console.log(`Updated DB with ${incoming.length} seoGoals`);
})();
