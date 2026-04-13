#!/usr/bin/env node
/**
 * import-seo-keywords.js
 * Parse keywords from SEO report markdown (§4 table) and merge into homepage-data.json seoGoals.
 * Usage: node import-seo-keywords.js path/to/seo-report.md
 */

const fs = require('fs');
const path = require('path');

const reportPath = process.argv[2];
if (!reportPath) {
  console.error('Usage: node import-seo-keywords.js <path-to-seo-report.md>');
  process.exit(1);
}

const reportText = fs.readFileSync(path.resolve(reportPath), 'utf-8');

// Find §4 Keyword Priority Matrix table
const lines = reportText.split('\n');
let inTable = false;
let headerFound = false;
const parsed = [];

for (const line of lines) {
  // Detect table start: header row with | # | Keyword | Volume | ...
  if (!inTable && /^\|\s*#\s*\|\s*Keyword\s*\|/.test(line)) {
    inTable = true;
    continue;
  }
  // Skip separator row |---|---|...|
  if (inTable && !headerFound && /^\|[\s\-|]+\|$/.test(line.trim())) {
    headerFound = true;
    continue;
  }
  // Parse data rows
  if (inTable && headerFound) {
    // End of table: empty line or next section
    if (!line.trim() || (line.startsWith('#') && !line.startsWith('|'))) {
      // Check if it's truly end of table or just a blank line between entries
      if (!line.trim()) continue; // skip blank lines within table
      break;
    }
    if (!line.startsWith('|')) break;

    const cells = line.split('|').map(c => c.trim()).filter(c => c !== '');
    // Columns: #, Keyword, Volume, M1 Best, M2 Avg, M3 CTR, Pos, Best Competitor
    if (cells.length >= 8) {
      const keyword = cells[1].trim();
      const volume = parseInt(cells[2].replace(/,/g, ''), 10) || 0;
      const targetPosition = parseFloat(cells[6]) || 0;
      const bestCompetitor = cells[7].trim();

      if (keyword && keyword !== 'Keyword') {
        parsed.push({ keyword, volume, targetPosition, bestCompetitor });
      }
    }
  }
}

console.log(`Parsed ${parsed.length} keywords from report.`);

// Load homepage-data.json
const dataPath = path.join(__dirname, 'homepage-data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
const existing = data.seoGoals || [];
console.log(`Existing seoGoals: ${existing.length} keywords.`);

// Deduplicate: existing entries take priority
const seen = new Map();
for (const goal of existing) {
  seen.set(goal.keyword.toLowerCase().trim(), goal);
}
let added = 0;
for (const newGoal of parsed) {
  const key = newGoal.keyword.toLowerCase().trim();
  if (!seen.has(key)) {
    seen.set(key, newGoal);
    added++;
  }
}

data.seoGoals = Array.from(seen.values());
// Sort by volume descending
data.seoGoals.sort((a, b) => (b.volume || 0) - (a.volume || 0));

console.log(`Added ${added} new keywords. Total after dedup: ${data.seoGoals.length}`);

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
console.log('Written to homepage-data.json.');
