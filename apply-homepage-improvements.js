/**
 * Apply improvements to index.html:
 * 1. Shorten title tag
 * 2. Add Performance Score to hero
 * 3. Add "No Account Required" chip to hero CTA
 * 4. Add Trustpilot to hero
 * 5. Add "Backed by Toptal" expertise section before CTA
 * 6. Add CSS for new components
 */
const fs = require('fs');
const path = require('path');

const files = ['index.html'];

// ─── NEW CSS ───────────────────────────────────────────
const newCSS = `
    /* ══════════════════════════════════════════════════════
       PERFORMANCE SCORE — HERO
       ══════════════════════════════════════════════════════ */
    .perf-score-hero { margin: 14px 0 8px; }
    .perf-score-badge {
      display: inline-flex; align-items: center; gap: 14px;
      background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);
      border-radius: 12px; padding: 12px 20px 12px 14px;
    }
    .perf-score-ring { position: relative; width: 48px; height: 48px; flex-shrink: 0; }
    .perf-score-value {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: 800; color: var(--green); letter-spacing: -0.5px;
    }
    .perf-score-text { display: flex; flex-direction: column; gap: 2px; }
    .perf-score-text strong { color: var(--white); font-size: 13px; font-weight: 700; }
    .perf-score-text span { color: rgba(255,255,255,0.5); font-size: 11px; line-height: 1.4; }
    .perf-score-note {
      display: flex; align-items: center; gap: 6px; margin-top: 6px;
      font-size: 11px; color: rgba(255,255,255,0.35);
    }

    /* ══════════════════════════════════════════════════════
       NO ACCOUNT REQUIRED CHIP
       ══════════════════════════════════════════════════════ */
    .no-account-chip {
      display: inline-flex; align-items: center; gap: 5px;
      background: rgba(0,204,131,0.12); border: 1px solid rgba(0,204,131,0.25);
      color: #34D399; font-size: 11px; font-weight: 600; letter-spacing: 0.3px;
      padding: 5px 12px; border-radius: 100px; white-space: nowrap;
    }

    /* ══════════════════════════════════════════════════════
       TRUSTPILOT — HERO
       ══════════════════════════════════════════════════════ */
    .trustpilot-hero {
      display: flex; align-items: center; gap: 8px; margin-top: 16px;
      padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.08);
    }
    .tp-stars { display: flex; gap: 2px; }
    .tp-rating { color: rgba(255,255,255,0.8); font-size: 13px; margin-left: 4px; }
    .tp-rating strong { color: var(--white); font-weight: 700; }
    .tp-meta { color: rgba(255,255,255,0.4); font-size: 12px; }

    /* ══════════════════════════════════════════════════════
       BACKED BY TOPTAL SECTION
       ══════════════════════════════════════════════════════ */
    .expertise-section {
      padding: 80px 0;
      background: var(--white);
      border-top: 1px solid var(--border);
    }
    .expertise-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center;
    }
    .expertise-content h2 {
      font-size: 36px; font-weight: 800; color: var(--near-black);
      line-height: 1.15; margin-bottom: 16px; letter-spacing: -0.5px;
    }
    .expertise-content h2 em { font-style: normal; color: var(--blue); }
    .expertise-content > p {
      font-size: 16px; line-height: 1.7; color: var(--body-text); margin-bottom: 32px;
    }
    .expertise-content > p .tm { font-size: 10px; vertical-align: super; }
    .expertise-stats {
      display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
    }
    .expertise-stat { padding: 20px 0; border-top: 2px solid var(--border); }
    .expertise-stat-value {
      font-size: 32px; font-weight: 800; color: var(--near-black); letter-spacing: -1px; margin-bottom: 4px;
    }
    .expertise-stat-label { font-size: 14px; color: var(--muted); font-weight: 500; }
    .expertise-visual {
      display: flex; align-items: center; justify-content: center;
      background: var(--blue); border-radius: 12px; padding: 48px;
      min-height: 380px; position: relative; overflow: hidden;
    }
    .expertise-visual::before {
      content: ''; position: absolute; inset: 0;
      background: radial-gradient(circle at 30% 40%, rgba(255,255,255,0.08) 0%, transparent 60%);
    }
    .expertise-logo-mark { width: 200px; height: 200px; position: relative; z-index: 1; }
    .expertise-logo-mark svg { width: 100%; height: 100%; }`;

// ─── RESPONSIVE CSS ADDITIONS ──────────────────────────
const responsiveAdditions768 = `
      .expertise-grid { grid-template-columns: 1fr; gap: 32px; }
      .expertise-visual { min-height: 240px; }
      .expertise-content h2 { font-size: 28px; }
      .trustpilot-hero { flex-wrap: wrap; }
      .perf-score-badge { flex-direction: column; text-align: center; }`;

// ─── HERO ADDITIONS ────────────────────────────────────
const perfScoreHTML = `
          <!-- Toptal Performance Score — hero centerpiece -->
          <div class="perf-score-hero">
            <div class="perf-score-badge">
              <div class="perf-score-ring">
                <svg width="48" height="48" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="3"/>
                  <circle cx="24" cy="24" r="20" fill="none" stroke="#00CC83" stroke-width="3" stroke-dasharray="117" stroke-dashoffset="12" stroke-linecap="round" transform="rotate(-90 24 24)"/>
                </svg>
                <span class="perf-score-value">94</span>
              </div>
              <div class="perf-score-text">
                <strong>Toptal Performance Score&trade;</strong>
                <span>Recruiter-graded across ATS parsing, readability &amp; visual impact</span>
              </div>
            </div>
            <div class="perf-score-note">
              <i data-lucide="info" style="width:12px;height:12px;"></i>
              Based on analysis of 2.7M+ resumes by Toptal hiring managers
            </div>
          </div>
`;

const noAccountChipHTML = `<span class="no-account-chip"><i data-lucide="user-x" style="width:12px;height:12px;"></i> No Account Required</span>`;

const trustpilotHTML = `
          <!-- Trustpilot -->
          <div class="trustpilot-hero">
            <div class="tp-stars">
              <svg width="16" height="16" viewBox="0 0 16 16"><polygon points="8,0 10.5,5.1 16,5.9 12,9.8 12.9,15.3 8,12.7 3.1,15.3 4,9.8 0,5.9 5.5,5.1" fill="#00B67A"/></svg>
              <svg width="16" height="16" viewBox="0 0 16 16"><polygon points="8,0 10.5,5.1 16,5.9 12,9.8 12.9,15.3 8,12.7 3.1,15.3 4,9.8 0,5.9 5.5,5.1" fill="#00B67A"/></svg>
              <svg width="16" height="16" viewBox="0 0 16 16"><polygon points="8,0 10.5,5.1 16,5.9 12,9.8 12.9,15.3 8,12.7 3.1,15.3 4,9.8 0,5.9 5.5,5.1" fill="#00B67A"/></svg>
              <svg width="16" height="16" viewBox="0 0 16 16"><polygon points="8,0 10.5,5.1 16,5.9 12,9.8 12.9,15.3 8,12.7 3.1,15.3 4,9.8 0,5.9 5.5,5.1" fill="#00B67A"/></svg>
              <svg width="16" height="16" viewBox="0 0 16 16">
                <defs><clipPath id="hp-half-star"><rect x="0" y="0" width="10" height="16"/></clipPath></defs>
                <polygon points="8,0 10.5,5.1 16,5.9 12,9.8 12.9,15.3 8,12.7 3.1,15.3 4,9.8 0,5.9 5.5,5.1" fill="rgba(255,255,255,0.2)"/>
                <polygon points="8,0 10.5,5.1 16,5.9 12,9.8 12.9,15.3 8,12.7 3.1,15.3 4,9.8 0,5.9 5.5,5.1" fill="#00B67A" clip-path="url(#hp-half-star)"/>
              </svg>
            </div>
            <span class="tp-rating"><strong>4.7</strong> / 5</span>
            <span class="tp-meta">on <img src="https://cdn.trustpilot.net/brand-assets/4.1.0/logo-white.svg" alt="Trustpilot" style="height:14px;vertical-align:middle;opacity:0.7;display:inline;filter:brightness(1.3);"> &middot; 3,200+ reviews</span>
          </div>`;

// ─── "BACKED BY TOPTAL" SECTION ────────────────────────
const expertiseSectionHTML = `
  <!-- ═══════════════════════════════════════════════════════
       BACKED BY TOPTAL'S HIRING EXPERTISE
       ═══════════════════════════════════════════════════════ -->
  <section class="expertise-section">
    <div class="container">
      <div class="expertise-grid">
        <div class="expertise-content">
          <h2>Backed by Toptal's <em>Unrivaled</em> Hiring Expertise</h2>
          <p>Toptal Resume<span class="tm">&trade;</span> is the only resume service run by people who actually hire employees. We use our real hiring experience to help top talent like you stand out.</p>
          <div class="expertise-stats">
            <div class="expertise-stat">
              <div class="expertise-stat-value">2.7 Million+</div>
              <div class="expertise-stat-label">Resumes Analyzed</div>
            </div>
            <div class="expertise-stat">
              <div class="expertise-stat-value">120,000+</div>
              <div class="expertise-stat-label">Interviews Led</div>
            </div>
            <div class="expertise-stat">
              <div class="expertise-stat-value">25,000+</div>
              <div class="expertise-stat-label">Companies Served</div>
            </div>
            <div class="expertise-stat">
              <div class="expertise-stat-value">72,800+</div>
              <div class="expertise-stat-label">Successful Job Placements</div>
            </div>
          </div>
        </div>
        <div class="expertise-visual">
          <div class="expertise-logo-mark">
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M100 18L148.5 66.5L131.3 83.7L100 52.4L68.7 83.7L51.5 66.5L100 18Z" fill="white"/>
              <path d="M100 182L51.5 133.5L68.7 116.3L100 147.6L131.3 116.3L148.5 133.5L100 182Z" fill="white"/>
              <path d="M100 52.4L131.3 83.7L100 115L68.7 83.7L100 52.4Z" fill="rgba(255,255,255,0.5)"/>
              <path d="M100 115L131.3 116.3L100 147.6L68.7 116.3L100 115Z" fill="rgba(255,255,255,0.5)"/>
              <text x="170" y="135" font-size="24" fill="rgba(255,255,255,0.6)" font-family="Inter, sans-serif">&reg;</text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  </section>

`;

// ─── PROCESS EACH FILE ─────────────────────────────────
files.forEach(filename => {
  const filePath = path.join(__dirname, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP: ${filename} not found`);
    return;
  }
  let html = fs.readFileSync(filePath, 'utf-8');
  const originalLength = html.length;
  let changes = [];

  // 1. TITLE TAG — shorten to ~60 chars
  const oldTitles = [
    'Free Resume Templates 2026 — Download DOCX Instantly, No Account Required | Toptal',
    'Resume Templates 2026 — Free ATS-Friendly Download | Toptal' // already changed from first run
  ];
  const newTitle = 'Resume Templates 2026 — Free ATS-Friendly Download | Toptal';
  for (const oldT of oldTitles) {
    if (html.includes(oldT) && oldT !== newTitle) {
      html = html.split(oldT).join(newTitle);
      changes.push('title');
      break;
    }
  }
  if (!changes.includes('title')) changes.push('title (already set)');

  // 2. ADD CSS — insert before first @media
  if (!html.includes('.perf-score-hero')) {
    const mediaIdx = html.indexOf('@media (max-width: 1024px)');
    if (mediaIdx > -1) {
      html = html.substring(0, mediaIdx) + newCSS + '\n\n    ' + html.substring(mediaIdx);
      changes.push('css');
    }
  }

  // 3. ADD RESPONSIVE CSS — insert into the 768px media query
  if (!html.includes('.expertise-grid { grid-template-columns: 1fr;')) {
    const media768 = html.indexOf('@media (max-width: 768px)');
    if (media768 > -1) {
      // Find the closing brace of this media query
      const blockStart = html.indexOf('{', media768);
      const nextRule = html.indexOf('}', blockStart);
      // Find the last rule before the closing } of the media block
      // Instead, find the end of the media query block by looking for the next @media or end
      const endOfBlock768 = html.indexOf('@media (max-width: 480px)');
      if (endOfBlock768 > -1) {
        // Insert before the 480px media query, inside the 768px block
        const insertBefore = html.lastIndexOf('}', endOfBlock768);
        html = html.substring(0, insertBefore) + responsiveAdditions768 + '\n    ' + html.substring(insertBefore);
        changes.push('responsive-css');
      }
    }
  }

  // Find <body> to avoid matching CSS class names
  const bodyIdx = html.indexOf('<body');

  // 4. PERFORMANCE SCORE IN HERO — insert before hero-data-line
  if (!html.includes('class="perf-score-hero"')) {
    const dataLineIdx = html.indexOf('<div class="hero-data-line">', bodyIdx);
    if (dataLineIdx > -1) {
      const lineStart = html.lastIndexOf('\n', dataLineIdx);
      html = html.substring(0, lineStart) + '\n' + perfScoreHTML + html.substring(lineStart);
      changes.push('perf-score');
    }
  }

  // 5. NO ACCOUNT CHIP — add next to "Build My Resume" in the hero-ctas
  if (!html.includes('class="no-account-chip"')) {
    const heroCtas = html.indexOf('<div class="hero-ctas">', bodyIdx);
    if (heroCtas > -1) {
      const buildBtn = html.indexOf('Build My Resume</button>', heroCtas);
      if (buildBtn > -1) {
        const btnEnd = html.indexOf('</button>', buildBtn) + '</button>'.length;
        html = html.substring(0, btnEnd) + '\n            ' + noAccountChipHTML + html.substring(btnEnd);
        changes.push('no-account-chip');
      }
    }
  }

  // 6. TRUSTPILOT — add after hero-ctas closing div
  if (!html.includes('class="trustpilot-hero"')) {
    const heroCtas = html.indexOf('<div class="hero-ctas">', bodyIdx);
    if (heroCtas > -1) {
      const ctasClose = html.indexOf('</div>', heroCtas + 20);
      if (ctasClose > -1) {
        const insertAfter = ctasClose + '</div>'.length;
        html = html.substring(0, insertAfter) + '\n' + trustpilotHTML + html.substring(insertAfter);
        changes.push('trustpilot');
      }
    }
  }

  // 7. "BACKED BY TOPTAL" SECTION — insert before FINAL CTA
  if (!html.includes('class="expertise-section"')) {
    const ctaSection = html.indexOf('<section class="cta-section">', bodyIdx);
    if (ctaSection > -1) {
      const commentStart = html.lastIndexOf('<!--', ctaSection);
      if (commentStart > bodyIdx) {
        let lineStart = commentStart;
        while (lineStart > 0 && html[lineStart - 1] === ' ') lineStart--;
        html = html.substring(0, lineStart) + expertiseSectionHTML + html.substring(lineStart);
        changes.push('expertise-section');
      }
    }
  }

  // WRITE
  fs.writeFileSync(filePath, html, 'utf-8');
  const newLines = html.split('\n').length;
  console.log(`\n✓ ${filename}:`);
  console.log(`  Size: ${(html.length / 1024).toFixed(1)} KB (${html.length - originalLength > 0 ? '+' : ''}${((html.length - originalLength) / 1024).toFixed(1)} KB), ${newLines} lines`);
  console.log(`  Changes: ${changes.join(', ') || 'none'}`);
});

console.log('\nDone!');
