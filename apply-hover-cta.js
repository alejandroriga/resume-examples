/**
 * Simplify hover overlays on ALL template/category cards:
 * - template-card: Replace 2-button overlay → single "Use This Template" CTA
 * - category-card (v2): Add hover overlay with "Start in Builder →"
 * - Update CSS for cleaner, conversion-oriented overlay
 */
const fs = require('fs');
const path = require('path');

const files = ['index.html'];

// New overlay CSS — replaces the old multi-button style
const overlayCSSNew = `
    /* Card overlay — single CTA, conversion-focused */
    .template-card-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(180deg, rgba(3,10,66,0.15) 0%, rgba(3,10,66,0.7) 100%);
      display: flex; align-items: flex-end; justify-content: center;
      padding-bottom: 20%;
      opacity: 0; transition: opacity 0.3s ease;
    }
    .template-card:hover .template-card-overlay { opacity: 1; }
    .template-card-overlay .btn-cta-overlay {
      display: inline-flex; align-items: center; gap: 6px;
      background: var(--green); color: var(--white);
      font-family: inherit; font-size: 13px; font-weight: 600;
      padding: 10px 24px; border-radius: 8px; border: none; cursor: pointer;
      box-shadow: 0 4px 16px rgba(0,204,131,0.4);
      transition: all 0.2s ease; white-space: nowrap;
    }
    .template-card-overlay .btn-cta-overlay:hover {
      background: var(--green-hover); transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0,204,131,0.5);
    }`;

// Category card overlay CSS (for index.html compact grid)
const categoryOverlayCSS = `
    /* Category card hover overlay */
    .category-card { position: relative; }
    .category-card-preview { position: relative; overflow: hidden; }
    .category-card-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(180deg, rgba(3,10,66,0.1) 0%, rgba(3,10,66,0.65) 100%);
      display: flex; align-items: flex-end; justify-content: center;
      padding-bottom: 12%;
      opacity: 0; transition: opacity 0.3s ease; border-radius: 12px 12px 0 0;
    }
    .category-card:hover .category-card-overlay { opacity: 1; }
    .category-card-overlay .btn-cta-overlay {
      display: inline-flex; align-items: center; gap: 6px;
      background: var(--green); color: var(--white);
      font-family: inherit; font-size: 12px; font-weight: 600;
      padding: 8px 18px; border-radius: 6px; border: none; cursor: pointer;
      box-shadow: 0 4px 16px rgba(0,204,131,0.4);
      transition: all 0.2s ease; white-space: nowrap; text-decoration: none;
    }
    .category-card-overlay .btn-cta-overlay:hover {
      background: var(--green-hover); transform: translateY(-2px);
    }`;

// New single-button overlay HTML for template cards
const newOverlayHTML = '<div class="template-card-overlay"><button class="btn-cta-overlay"><i data-lucide="edit-3" style="width:14px;height:14px;"></i> Use This Template</button></div>';

// Category card overlay HTML
const categoryOverlayHTML = '<div class="category-card-overlay"><span class="btn-cta-overlay"><i data-lucide="edit-3" style="width:13px;height:13px;"></i> Start in Builder</span></div>';

files.forEach(filename => {
  const filePath = path.join(__dirname, filename);
  if (!fs.existsSync(filePath)) { console.log(`SKIP: ${filename}`); return; }
  let html = fs.readFileSync(filePath, 'utf-8');
  const origLen = html.length;
  let changes = [];

  // ── 1. REPLACE OLD OVERLAY CSS ──
  // Find the old overlay CSS block and replace it
  const oldCSSPatterns = [
    // Multi-line version
    `    /* Card overlay */
    .template-card-overlay {
      position: absolute;
      inset: 0;
      background: rgba(3,10,66,0.6);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      opacity: 0;
      transition: opacity 0.3s ease;
      backdrop-filter: blur(2px);
    }

    .template-card:hover .template-card-overlay { opacity: 1; }

    .template-card-overlay .btn {
      width: 160px;
      font-size: 13px;
      height: 38px;
    }`,
    // Single-line condensed version (sub-pages)
    `    .template-card-overlay {
      position: absolute; inset: 0; background: rgba(3,10,66,0.6);
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
      opacity: 0; transition: opacity 0.3s ease; backdrop-filter: blur(2px);
    }
    .template-card:hover .template-card-overlay { opacity: 1; }
    .template-card-overlay .btn { width: 160px; font-size: 13px; height: 38px; }`
  ];

  for (const oldCSS of oldCSSPatterns) {
    if (html.includes(oldCSS)) {
      html = html.replace(oldCSS, overlayCSSNew);
      changes.push('overlay-css');
      break;
    }
  }

  // ── 2. ADD CATEGORY OVERLAY CSS (for v2 only) ──
  if (filename === 'index.html' && !html.includes('.category-card-overlay')) {
    // Insert before the RESPONSIVE section
    const responsiveMarker = html.indexOf('RESPONSIVE');
    if (responsiveMarker > -1) {
      const insertPos = html.lastIndexOf('/*', responsiveMarker);
      if (insertPos > -1) {
        // Walk back to find start of line
        let lineStart = insertPos;
        while (lineStart > 0 && html[lineStart - 1] === ' ') lineStart--;
        html = html.substring(0, lineStart) + categoryOverlayCSS + '\n\n    ' + html.substring(lineStart);
        changes.push('category-overlay-css');
      }
    }
  }

  // ── 3. REPLACE ALL TEMPLATE CARD OVERLAYS WITH SINGLE BUTTON ──
  // Pattern 1: Multi-line with various spacing
  const overlayRegex = /<div class="template-card-overlay">[\s\S]*?<\/div>\s*(?=<\/div>\s*<div class="template-card-info">)/g;
  const matches = html.match(overlayRegex);
  if (matches && matches.length > 0) {
    html = html.replace(overlayRegex, newOverlayHTML + '\n');
    changes.push(`overlays-replaced(${matches.length})`);
  }

  // ── 4. ADD OVERLAY TO CATEGORY CARDS (v2 only) ──
  if (filename === 'index.html' && !html.includes('category-card-overlay')) {
    // Find each category-card-preview closing </div> and insert overlay before it
    // Pattern: </div>\n          </div>\n          <div class="category-card-info">
    const cardPreviewClose = /<\/div>\n\s*<\/div>\n\s*<div class="category-card-info">/g;
    let count = 0;
    html = html.replace(cardPreviewClose, (match) => {
      count++;
      return `</div>\n            ${categoryOverlayHTML}\n          </div>\n          <div class="category-card-info">`;
    });
    if (count > 0) changes.push(`category-overlays(${count})`);
  }

  fs.writeFileSync(filePath, html, 'utf-8');
  const newLines = html.split('\n').length;
  console.log(`✓ ${filename}: ${(html.length / 1024).toFixed(1)} KB (${html.length > origLen ? '+' : ''}${((html.length - origLen) / 1024).toFixed(1)} KB), ${newLines} lines`);
  console.log(`  Changes: ${changes.join(', ') || 'none'}`);
});

console.log('\nDone!');
