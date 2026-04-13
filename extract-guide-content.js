#!/usr/bin/env node
/**
 * One-time script to extract guide content from index.html
 * into homepage-data.json (body HTML, tables, tips/callouts, header fields).
 */
const fs = require('fs');
const path = require('path');

const INDEX_PATH = path.join(__dirname, 'index.html');
const DATA_PATH  = path.join(__dirname, 'homepage-data.json');

const html = fs.readFileSync(INDEX_PATH, 'utf8');
const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

/** Decode HTML entities to plain text (for headings, table cells, tip text) */
function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&trade;/g, '™')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&nbsp;/g, ' ');
}

/** Strip HTML tags and decode entities (for plain-text fields like tip body) */
function stripTags(s) {
  return decodeEntities(s.replace(/<[^>]+>/g, ''));
}

/* ── 1. Extract guide header ── */
// Match the full header region up to the TOC
const headerRegion = html.match(/<div class="guide-header">([\s\S]*?)<!-- Table of Contents -->/);
if (!headerRegion) throw new Error('Could not find guide-header');
const headerBlock = headerRegion[1];

// Eyebrow text (after the <i> tag inside section-eyebrow)
const eyebrowMatch = headerBlock.match(/<div class="section-eyebrow"[^>]*>[\s\S]*?<\/i>\s*([\s\S]*?)<\/div>/);
const eyebrow = eyebrowMatch ? eyebrowMatch[1].trim() : '';

// H2 title
const h2Match = headerBlock.match(/<h2>([\s\S]*?)<\/h2>/);
const title = h2Match ? h2Match[1].trim() : '';

// Subtitle paragraph (first <p> after the h2)
const pMatch = headerBlock.match(/<h2>[\s\S]*?<\/h2>\s*<p>([\s\S]*?)<\/p>/);
const subtitle = pMatch ? pMatch[1].trim() : '';

console.log('Guide header:');
console.log('  eyebrow:', JSON.stringify(eyebrow));
console.log('  title:', JSON.stringify(title.substring(0, 70)) + '...');
console.log('  subtitle:', JSON.stringify(subtitle.substring(0, 70)) + '...');

/* ── 2. Extract each chapter ── */
// Split by chapter divs using lookahead
const chapterRegex = /<div class="guide-chapter" id="guide-(\d+)">([\s\S]*?)(?=<div class="guide-chapter" id="guide-|<\/div><!-- end guide-chapters -->)/g;
const chapters = [];
let cm;

while ((cm = chapterRegex.exec(html)) !== null) {
  const chId = parseInt(cm[1], 10);
  const block = cm[2];
  chapters.push({ id: chId, block });
}

console.log(`\nFound ${chapters.length} chapters`);

const result = [];

for (const ch of chapters) {
  const { id, block } = ch;
  const existing = data.guide.chapters[id - 1] || {};

  // ── Heading (decode entities → plain text for he() encoding in generator) ──
  const headingMatch = block.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/);
  const heading = headingMatch ? decodeEntities(headingMatch[1].trim()) : existing.heading || '';

  // ── Callout / Tip ──
  // Match callout: <div class="guide-callout...">...<p>...</p>\n          </div>
  // The callout always ends with </p> then whitespace then </div>
  let tip = null;
  const calloutMatch = block.match(/<div class="guide-callout([^"]*)">([\s\S]*?)<\/p>\s*<\/div>/);
  if (calloutMatch) {
    const colorClass = calloutMatch[1].trim(); // '', 'green', 'amber'
    const calloutContent = calloutMatch[2] + '</p>'; // re-add the </p> consumed by the match

    // Extract title (after the <i> icon) — decode entities
    const titleMatch = calloutContent.match(/<div class="guide-callout-title">[\s\S]*?<\/i>\s*([\s\S]*?)<\/div>/);
    const tipTitle = titleMatch ? decodeEntities(titleMatch[1].trim()) : '';

    // Extract body paragraph (inside the callout, after the title div) — strip tags for plain text
    const tipBodyMatch = calloutContent.match(/<\/div>\s*<p>([\s\S]*?)<\/p>/);
    const tipBody = tipBodyMatch ? stripTags(tipBodyMatch[1].trim()) : '';

    // Extract icon name from data-lucide attribute
    const iconMatch = calloutContent.match(/data-lucide="([^"]+)"/);
    const icon = iconMatch ? iconMatch[1] : 'info';

    // Color mapping
    let color = 'blue'; // default (no extra class)
    if (colorClass.includes('green')) color = 'green';
    else if (colorClass.includes('amber')) color = 'amber';

    tip = { title: tipTitle, body: tipBody, color, icon };
  }

  // ── Body: collect <p>, <ul>, <ol> elements NOT inside callout or table ──
  let bodyBlock = block;

  // Remove callout blocks (using the fixed pattern)
  bodyBlock = bodyBlock.replace(/<div class="guide-callout[^"]*">[\s\S]*?<\/p>\s*<\/div>/g, '');
  // Remove table-wrap blocks
  bodyBlock = bodyBlock.replace(/<div class="guide-table-wrap">[\s\S]*?<\/table>\s*<\/div>/g, '');
  // Remove chapter-num div
  bodyBlock = bodyBlock.replace(/<div class="guide-chapter-num"[^>]*>[\s\S]*?<\/div>/g, '');
  // Remove heading
  bodyBlock = bodyBlock.replace(/<h[23][^>]*>[\s\S]*?<\/h[23]>/g, '');

  // Collect body elements: <p>, <ul>, <ol> (top-level)
  const bodyParts = [];
  const bodyTagRegex = /<(p|ul|ol)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g;
  let bm;
  while ((bm = bodyTagRegex.exec(bodyBlock)) !== null) {
    bodyParts.push(bm[0].trim());
  }
  const body = bodyParts.join('\n');

  // ── Table ──
  let table = null;
  const tableMatch = block.match(/<table class="guide-table">([\s\S]*?)<\/table>/);
  if (tableMatch) {
    const tableHtml = tableMatch[1];
    const rows = [];

    // Header row
    const theadMatch = tableHtml.match(/<thead>([\s\S]*?)<\/thead>/);
    if (theadMatch) {
      const headerCells = [];
      const thRegex = /<th>([\s\S]*?)<\/th>/g;
      let thm;
      while ((thm = thRegex.exec(theadMatch[1])) !== null) {
        headerCells.push(decodeEntities(thm[1].trim()));
      }
      rows.push(headerCells);
    }

    // Body rows
    const tbodyMatch = tableHtml.match(/<tbody>([\s\S]*?)<\/tbody>/);
    if (tbodyMatch) {
      const trRegex = /<tr>([\s\S]*?)<\/tr>/g;
      let trm;
      while ((trm = trRegex.exec(tbodyMatch[1])) !== null) {
        const cells = [];
        const tdRegex = /<td>([\s\S]*?)<\/td>/g;
        let tdm;
        while ((tdm = tdRegex.exec(trm[1])) !== null) {
          cells.push(decodeEntities(tdm[1].trim()));
        }
        rows.push(cells);
      }
    }

    table = rows;
  }

  // Log chapter info
  console.log(`\n  Chapter ${id}: ${heading.substring(0, 50)}...`);
  console.log(`    Body: ${body.length} chars, ${bodyParts.length} elements`);
  console.log(`    Table: ${table ? table.length + ' rows, ' + table[0].length + ' cols' : 'none'}`);
  console.log(`    Tip: ${tip ? tip.title + ' (' + tip.color + ', ' + tip.icon + ')' : 'none'}`);

  result.push({
    heading,
    body,
    table,
    tip
  });
}

/* ── 3. Write back to homepage-data.json ── */
data.guide = {
  eyebrow,
  title,
  subtitle,
  chapters: result
};

fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
console.log(`\n✓ Wrote ${result.length} chapters to homepage-data.json`);
console.log('  Guide header fields: eyebrow, title, subtitle');
console.log('  Per chapter: heading, body, table, tip');
