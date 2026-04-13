/**
 * migrate-data.js — One-time migration from JSON/JS files → SQLite
 *
 * Reads existing data files and populates the database:
 *   - homepage-data.json → documents['homepage']
 *   - page-data.js → documents['examples'] + documents['subpage:slug'] for each page
 *   - seo-briefs-all.json → documents['seo:slug'] for each page + documents['seo:homepage']
 *
 * Also creates initial user accounts.
 *
 * Usage:  node migrate-data.js
 */

const fs   = require('fs');
const path = require('path');
const db   = require('./db');

const DIR = __dirname;

async function migrate() {
  console.log('\n═══════════════════════════════════════════════');
  console.log('  CMS Data Migration: Files → SQLite');
  console.log('═══════════════════════════════════════════════\n');

  await db.initDB();

  let docCount = 0;

  // ─── 1. Homepage ────────────────────────────────────────────
  console.log('📄 Migrating homepage-data.json...');
  const homepagePath = path.join(DIR, 'homepage-data.json');
  if (fs.existsSync(homepagePath)) {
    const homepage = JSON.parse(fs.readFileSync(homepagePath, 'utf-8'));
    db.saveDocument('homepage', homepage, 'migration');
    docCount++;
    console.log('  ✓ homepage');
  } else {
    console.log('  ⚠ homepage-data.json not found — skipping');
  }

  // ─── 2. Page data (subpages + examples) ────────────────────
  console.log('\n📄 Migrating page-data.js...');
  const pageDataPath = path.join(DIR, 'page-data.js');
  if (fs.existsSync(pageDataPath)) {
    // page-data.js uses module.exports, so we can require it
    const pages = require(pageDataPath);

    // Extract examples array (unique examples across all pages)
    const allExamples = [];
    const seenExampleNames = new Set();

    for (const page of pages) {
      // Save each page as a subpage document
      db.saveDocument(`subpage:${page.slug}`, page, 'migration');
      docCount++;
      console.log(`  ✓ subpage:${page.slug}`);

      // Collect unique examples
      if (page.examples) {
        for (const ex of page.examples) {
          if (!seenExampleNames.has(ex.name)) {
            seenExampleNames.add(ex.name);
            allExamples.push({
              ...ex,
              id: ex.name.toLowerCase().replace(/\s+/g, '-'),
              assignedPages: [page.slug]
            });
          } else {
            // Example already exists, add this page to assignedPages
            const existing = allExamples.find(t => t.name === ex.name);
            if (existing && !existing.assignedPages.includes(page.slug)) {
              existing.assignedPages.push(page.slug);
            }
          }
        }
      }
    }

    // Save examples
    db.saveDocument('examples', allExamples, 'migration');
    docCount++;
    console.log(`  ✓ examples (${allExamples.length} unique examples)`);
  } else {
    console.log('  ⚠ page-data.js not found — skipping');
  }

  // ─── 3. SEO briefs ─────────────────────────────────────────
  console.log('\n📄 Migrating seo-briefs-all.json...');
  const seoPath = path.join(DIR, 'seo-briefs-all.json');
  if (fs.existsSync(seoPath)) {
    const seoBriefs = JSON.parse(fs.readFileSync(seoPath, 'utf-8'));
    for (const [slug, brief] of Object.entries(seoBriefs)) {
      db.saveDocument(`seo:${slug}`, brief, 'migration');
      docCount++;
      console.log(`  ✓ seo:${slug}`);
    }
  } else {
    console.log('  ⚠ seo-briefs-all.json not found — skipping');
  }

  // ─── 4. Create users ───────────────────────────────────────
  console.log('\n👥 Creating user accounts...');

  // Supervisor accounts
  db.createUser('sasha', 'toptal2024', 'Sasha', 'supervisor');
  console.log('  ✓ sasha (role: supervisor, password: toptal2024)');

  db.createUser('alejandro', 'toptal2024', 'Alejandro', 'supervisor');
  console.log('  ✓ alejandro (role: supervisor, password: toptal2024)');

  db.createUser('john', 'toptal2024', 'John', 'supervisor');
  console.log('  ✓ john (role: supervisor, password: toptal2024)');

  db.createUser('andy', 'toptal2024', 'Andy', 'supervisor');
  console.log('  ✓ andy (role: supervisor, password: toptal2024)');

  // Editor accounts
  db.createUser('inge', 'editor2024', 'Inge', 'editor');
  console.log('  ✓ inge (role: editor, password: editor2024)');

  db.createUser('boris', 'editor2024', 'Boris', 'editor');
  console.log('  ✓ boris (role: editor, password: editor2024)');

  // ─── 5. Create initial snapshot ────────────────────────────
  console.log('\n📸 Creating initial snapshot...');
  db.createSnapshot('Initial migration snapshot', 'migration');
  console.log('  ✓ Snapshot created');

  // ─── Done ──────────────────────────────────────────────────
  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`  Migration complete — ${docCount} documents imported`);
  console.log(`  Database: cms.sqlite`);
  console.log(`  Users: supervisor, editor1, editor2`);
  console.log(`═══════════════════════════════════════════════\n`);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
