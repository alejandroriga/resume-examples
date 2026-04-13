/**
 * server-v2.js — Multi-user CMS server
 *
 * Features:
 *  - Authentication (session cookies)
 *  - Document CRUD (SQLite-backed)
 *  - Change history & field-level tracking
 *  - Supervisor approvals & per-field comments
 *  - Snapshots (auto + manual)
 *  - Apply pipeline (homepage + sub-pages)
 *  - Static file serving
 *  - SEO scoring & briefs
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');
const cookie = require('cookie');
const db   = require('./db');
const { checkFieldSEO, suggestFieldContent } = require('./openai');
const { analyzeKeywordCoverage, analyzeRubricScore } = require('./seo-audit');

const PORT = process.env.PORT || 3001;
const DIR  = __dirname;
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-in-prod';
const ACCESS_KEY = process.env.ACCESS_KEY || 'examples-preview';

/** Noindex headers to add to all HTML responses */
const NOINDEX_HEADERS = {
  'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet, noimageindex'
};

const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};


// ─── SEO Outline Generator ──────────────────────────────────────

const SECTION_LABELS = {
  'hero': 'Hero',
  'filter-section': 'Example Filters',
  'gallery-section': 'Example Gallery',
  'categories-grid-section': 'Browse by Job Role',
  'featured-examples-section': 'Featured Examples',
  'perf-section': 'Performance Score',
  'features-section': 'Why Choose Toptal',
  'guide-section': 'Complete Resume Guide',
  'faq-section': 'FAQ',
  'expertise-section': 'Hiring Expertise',
  'panel-section': 'Expert Panel',
  'testimonials-section': 'Testimonials',
  'cta-section': 'Call to Action',
  'examples-section': 'Resume Examples by Job Category',
};

// Maps CSS class → section data key (for phase lookup)
const CSS_TO_SECTION_KEY = {
  'hero': 'hero',
  'filter-section': 'galleryExamples',  // filter follows gallery
  'gallery-section': 'galleryExamples',
  'categories-grid-section': 'categoriesGrid',
  'featured-examples-section': 'featuredExamples',
  'perf-section': 'performanceScore',
  'features-section': 'whyToptal',
  'guide-section': 'guide',
  'faq-section': 'faqs',
  'expertise-section': 'expertise',
  'panel-section': 'expertPanel',
  'testimonials-section': 'testimonials',
  'cta-section': 'cta',
  'examples-section': 'examplesSection',
};

function stripTags(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&trade;/g, '™').replace(/&middot;/g, '·').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/\s+/g, ' ').trim();
}

function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function generateOutline(html, phaseData) {
  const phases = (phaseData && phaseData._phases) || {};
  const currentPhase = (phaseData && phaseData._currentPhase) || 1;
  const filterPhase = (phaseData && phaseData._filterPhase) || 0; // 0 = show all

  function getPhase(cssCls) {
    const key = CSS_TO_SECTION_KEY[cssCls];
    return key ? (phases[key] || 1) : 1;
  }

  // Extract all sections
  const sectionRegex = /<section\s+class="([^"]*)"[^>]*>([\s\S]*?)<\/section>/g;
  const sections = [];
  let m;
  while ((m = sectionRegex.exec(html)) !== null) {
    sections.push({ cls: m[1].split(' ')[0], inner: m[2] });
  }

  // Also extract footer
  const footerMatch = html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/);

  let headingCount = 0;
  let paragraphCount = 0;

  // Helper: render a heading
  function renderHeading(level, text) {
    if (!text) return '';
    headingCount++;
    const indent = (level - 1) * 24;
    return `<div class="heading h${level}" style="margin-left:${indent}px;"><span class="tag">H${level}</span> ${esc(text)}</div>\n`;
  }

  // Helper: render a paragraph
  function renderParagraph(txt) {
    if (!txt || txt.length <= 10) return '';
    paragraphCount++;
    return `<div class="paragraph">${esc(txt)}</div>\n`;
  }

  // Helper: extract headings + paragraphs in document order from a chunk of HTML
  function extractInOrder(chunk) {
    let out = '';
    const tokenRe = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>|<p[^>]*>([\s\S]*?)<\/p>/g;
    let tok;
    while ((tok = tokenRe.exec(chunk)) !== null) {
      if (tok[1]) { // heading
        out += renderHeading(parseInt(tok[1]), stripTags(tok[2]));
      } else if (tok[3]) { // paragraph
        out += renderParagraph(stripTags(tok[3]));
      }
    }
    return out;
  }

  // Helper: render a table
  function renderTable(tableHtml) {
    const rows = [];
    const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    let tr;
    while ((tr = trRe.exec(tableHtml)) !== null) {
      const cells = [];
      const cellRe = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g;
      let td;
      while ((td = cellRe.exec(tr[1])) !== null) cells.push(stripTags(td[1]));
      rows.push(cells);
    }
    if (!rows.length) return '';
    let out = '<table class="outline-table"><tbody>';
    rows.forEach((row, ri) => {
      const tag = ri === 0 ? 'th' : 'td';
      out += '<tr>' + row.map(c => `<${tag}>${esc(c)}</${tag}>`).join('') + '</tr>';
    });
    return out + '</tbody></table>\n';
  }

  function extractContent(inner, sectionCls) {
    let out = '';

    // Eyebrow
    const eyebrowMatch = inner.match(/<div class="section-eyebrow"[^>]*>([\s\S]*?)<\/div>/);
    if (eyebrowMatch) {
      const txt = stripTags(eyebrowMatch[1]);
      if (txt) out += `<div class="eyebrow">${esc(txt)}</div>\n`;
    }

    // ── GUIDE SECTION: organized by chapter ──
    if (sectionCls === 'guide-section') {
      // Guide header (H2 + subtitle before chapters)
      const headerMatch = inner.match(/<div class="guide-header">([\s\S]*?)<\/div>\s*<(?:div class="guide-authors|div class="guide-toc|div class="guide-chapters)/);
      if (headerMatch) out += extractInOrder(headerMatch[1]);

      // Authors
      const authorNames = [];
      const authorRe = /<span class="guide-author-name">([^<]+)<\/span>/g;
      let am;
      while ((am = authorRe.exec(inner)) !== null) authorNames.push(stripTags(am[1]));
      if (authorNames.length) {
        out += `<div class="meta-info"><strong>Authors:</strong> ${esc(authorNames.join(', '))}</div>\n`;
      }

      // Each chapter
      const chapterRe = /<div class="guide-chapter"[^>]*>([\s\S]*?)(?=<div class="guide-chapter"|$)/g;
      let ch, chNum = 0;
      while ((ch = chapterRe.exec(inner)) !== null) {
        chNum++;
        const chInner = ch[1];
        out += `<div class="chapter"><div class="chapter-label">Chapter ${chNum}</div>\n`;
        out += extractInOrder(chInner);

        // Tables within this chapter
        const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/g;
        let tm;
        while ((tm = tableRe.exec(chInner)) !== null) {
          out += renderTable(tm[1]);
        }

        // Callouts/tips within this chapter
        const tipRe = /<div class="guide-callout[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;
        let tip;
        while ((tip = tipRe.exec(chInner)) !== null) {
          const txt = stripTags(tip[1]);
          if (txt) out += `<div class="tip">💡 ${esc(txt)}</div>\n`;
        }

        out += '</div>\n';
      }
      return out;
    }

    // ── FAQ SECTION: organized by Q&A ──
    if (sectionCls === 'faq-section') {
      // Header H2 only
      const h2m = inner.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
      if (h2m) out += renderHeading(2, stripTags(h2m[1]));

      // Each FAQ item
      const faqRe = /<div class="faq-item[^"]*">([\s\S]*?)(?=<div class="faq-item|<\/div>\s*<\/div>\s*<\/section>)/g;
      let fi;
      while ((fi = faqRe.exec(inner)) !== null) {
        const qm = fi[1].match(/<h3 class="faq-question"[^>]*>([\s\S]*?)<\/h3>/);
        const am2 = fi[1].match(/<div class="faq-answer-inner">([\s\S]*?)<\/div>/);
        const q = qm ? stripTags(qm[1]) : '';
        const a = am2 ? stripTags(am2[1]) : '';
        if (q) {
          out += `<div class="faq">${renderHeading(3, q)}`;
          if (a) out += `<div class="faq-a">${esc(a)}</div>`;
          out += `</div>\n`;
        }
      }
      return out;
    }

    // ── EXPERT PANEL: organized by group ──
    if (sectionCls === 'panel-section') {
      // Header H2 + subtitle
      const h2m = inner.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
      if (h2m) out += renderHeading(2, stripTags(h2m[1]));
      // Subtitle paragraphs before panel-grid
      const preGrid = inner.match(/<\/h2>([\s\S]*?)<div class="panel-grid">/);
      if (preGrid) {
        const pRe = /<p[^>]*>([\s\S]*?)<\/p>/g;
        let pm2;
        while ((pm2 = pRe.exec(preGrid[1])) !== null) {
          out += renderParagraph(stripTags(pm2[1]));
        }
      }

      // Each group (Senior Recruiters / Resume Writers)
      const groupRe = /<div class="panel-group">([\s\S]*?)(?=<div class="panel-group">|$)/g;
      let gm;
      while ((gm = groupRe.exec(inner)) !== null) {
        const groupInner = gm[1];
        // Group label (now H3)
        const labelM = groupInner.match(/<h3 class="panel-group-label[^"]*"[^>]*>([\s\S]*?)<\/h3>/);
        if (labelM) out += renderHeading(3, stripTags(labelM[1]));

        // Persons in this group
        const personRe = /<div class="panel-person"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;
        let pp;
        while ((pp = personRe.exec(groupInner)) !== null) {
          const nameM = pp[1].match(/<div class="panel-name"[^>]*>([\s\S]*?)<\/div>/);
          const roleM = pp[1].match(/<div class="panel-role"[^>]*>([\s\S]*?)<\/div>/);
          const bioM = pp[1].match(/<div class="panel-bio[^"]*"[^>]*>([\s\S]*?)<\/div>/);
          const name = nameM ? stripTags(nameM[1]) : '';
          const role = roleM ? stripTags(roleM[1]) : '';
          const bio = bioM ? stripTags(bioM[1]) : '';
          out += `<div class="person"><strong>${esc(name)}</strong>`;
          if (role) out += ` — <em>${esc(role)}</em>`;
          if (bio) out += `<div class="person-bio">${esc(bio)}</div>`;
          out += `</div>\n`;
        }
      }
      return out;
    }

    // ── FEATURES: organized by card ──
    if (sectionCls === 'features-section') {
      const h2m = inner.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
      if (h2m) out += renderHeading(2, stripTags(h2m[1]));
      const cardRe = /<div class="feature-card">([\s\S]*?)(?=<div class="feature-card">|$)/g;
      let fc;
      while ((fc = cardRe.exec(inner)) !== null) {
        const titleM = fc[1].match(/<div class="feature-card-title"[^>]*>([\s\S]*?)<\/div>/) || fc[1].match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
        const pm2 = fc[1].match(/<p[^>]*>([\s\S]*?)<\/p>/);
        if (titleM) {
          const title = stripTags(titleM[1]);
          const desc = pm2 ? stripTags(pm2[1]) : '';
          out += `<div class="feature"><strong>${esc(title)}</strong>`;
          if (desc) out += ` — ${esc(desc)}`;
          out += `</div>\n`;
        }
      }
      return out;
    }

    // ── TESTIMONIALS: organized by person ──
    if (sectionCls === 'testimonials-section') {
      const h2m = inner.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
      if (h2m) out += renderHeading(2, stripTags(h2m[1]));
      const cardRe = /<div class="testimonial-card"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
      let tc;
      while ((tc = cardRe.exec(inner)) !== null) {
        const quoteM = tc[1].match(/<div class="testimonial-quote"[^>]*>([\s\S]*?)<\/div>/);
        const nameM = tc[1].match(/<div class="testimonial-name"[^>]*>([\s\S]*?)<\/div>/);
        const roleM = tc[1].match(/<div class="testimonial-role"[^>]*>([\s\S]*?)<\/div>/);
        const quote = quoteM ? stripTags(quoteM[1]) : '';
        const name = nameM ? stripTags(nameM[1]) : '';
        const role = roleM ? stripTags(roleM[1]) : '';
        if (quote) {
          out += `<div class="testimonial"><blockquote>"${esc(quote)}"</blockquote>`;
          out += `<div class="testimonial-attr">— ${esc(name)}${role ? ', ' + esc(role) : ''}</div></div>\n`;
        }
      }
      return out;
    }

    // ── DEFAULT: all other sections — extract in document order ──
    out += extractInOrder(inner);

    // Stats (performance + expertise)
    if (sectionCls === 'perf-section' || sectionCls === 'expertise-section') {
      const statValueRe = /<div class="(?:perf|expertise)-stat-(?:number|value)"[^>]*>([\s\S]*?)<\/div>/g;
      const statLabelRe = /<div class="(?:perf|expertise)-stat-(?:label)"[^>]*>([\s\S]*?)<\/div>/g;
      const values = [], labels = [];
      let sv;
      while ((sv = statValueRe.exec(inner)) !== null) values.push(stripTags(sv[1]));
      while ((sv = statLabelRe.exec(inner)) !== null) labels.push(stripTags(sv[1]));
      if (values.length) {
        out += '<div class="stats">';
        values.forEach((v, i) => {
          out += `<span class="stat"><strong>${esc(v)}</strong> ${esc(labels[i] || '')}</span>`;
        });
        out += '</div>\n';
      }
    }

    // CTA features
    if (sectionCls === 'cta-section') {
      const ctaFeatRe = /<div class="cta-feature"[^>]*>([\s\S]*?)<\/div>/g;
      let cf;
      while ((cf = ctaFeatRe.exec(inner)) !== null) {
        const txt = stripTags(cf[1]);
        if (txt) out += `<div class="list-item">✓ ${esc(txt)}</div>\n`;
      }
    }

    return out;
  }

  // Build the output
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  let body = '';
  const toc = [];

  const phaseColors = { 1: '#22c55e', 2: '#eab308', 3: '#94a3b8' };
  const phaseBg = { 1: 'rgba(34,197,94,.1)', 2: 'rgba(234,179,8,.1)', 3: 'rgba(148,163,184,.1)' };

  // SEO Metadata section (title, description, canonical, og tags) — always shown
  {
    const titleM = html.match(/<title>([^<]*)<\/title>/);
    const descM = html.match(/<meta\s+name="description"\s+content="([^"]*)"/);
    const canonicalM = html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/);
    const ogTitleM = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/);
    const ogDescM = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/);
    const ogImageM = html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/);
    const robotsM = html.match(/<meta\s+name="robots"\s+content="([^"]*)"/);

    toc.push({ id: 'section-meta', label: 'SEO Metadata', num: '✦' });
    body += `<article id="section-meta">`;
    body += `<div class="section-header"><span class="section-num" style="background:#6366f1;">✦</span> SEO Metadata</div>`;
    body += `<div class="meta-field"><span class="meta-label">Title Tag</span><span class="meta-value">${esc(titleM ? titleM[1] : '—')}</span><span class="meta-count">${titleM ? titleM[1].length : 0} chars</span></div>\n`;
    body += `<div class="meta-field"><span class="meta-label">Meta Description</span><span class="meta-value">${esc(descM ? descM[1] : '—')}</span><span class="meta-count">${descM ? descM[1].length : 0} chars</span></div>\n`;
    body += `<div class="meta-field"><span class="meta-label">Canonical URL</span><span class="meta-value">${esc(canonicalM ? canonicalM[1] : '—')}</span></div>\n`;
    body += `<div class="meta-field"><span class="meta-label">OG Title</span><span class="meta-value">${esc(ogTitleM ? ogTitleM[1] : '—')}</span></div>\n`;
    body += `<div class="meta-field"><span class="meta-label">OG Description</span><span class="meta-value">${esc(ogDescM ? ogDescM[1] : '—')}</span></div>\n`;
    body += `</article>\n`;
  }

  sections.forEach((sec, i) => {
    const label = SECTION_LABELS[sec.cls] || sec.cls;
    const ph = getPhase(sec.cls);
    const id = `section-${i + 1}`;

    // Skip if filtering by phase and this section doesn't match
    if (filterPhase > 0 && ph !== filterPhase) return;

    const visible = ph <= currentPhase;
    const phaseBadge = `<span class="phase-badge" style="background:${phaseBg[ph]};color:${phaseColors[ph]};">P${ph}</span>`;
    const statusBadge = visible
      ? '<span class="status-badge visible">Visible</span>'
      : '<span class="status-badge hidden">Hidden</span>';

    toc.push({ id, label, num: i + 1, ph });

    body += `<article id="${id}">`;
    body += `<div class="section-header"><span class="section-num">${i + 1}</span> ${esc(label)} ${phaseBadge} ${statusBadge}</div>`;
    body += extractContent(sec.inner, sec.cls);
    body += `</article>\n`;
  });

  // Footer
  if (footerMatch && filterPhase === 0) {
    const footerContent = extractContent(footerMatch[1], 'footer');
    if (footerContent.trim()) {
      body += `<article id="section-footer"><div class="section-header"><span class="section-num">F</span> Footer</div>${footerContent}</article>\n`;
      toc.push({ id: 'section-footer', label: 'Footer', num: 'F' });
    }
  }

  // Schema & Technical SEO section — always shown
  {
    toc.push({ id: 'section-schema', label: 'Schema & Technical SEO', num: '⚙' });
    body += `<article id="section-schema">`;
    body += `<div class="section-header"><span class="section-num" style="background:#0f172a;">⚙</span> Schema & Technical SEO</div>`;

    // JSON-LD schemas
    const ldRe = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
    let ldm;
    const schemas = [];
    while ((ldm = ldRe.exec(html)) !== null) {
      try { schemas.push(JSON.parse(ldm[1])); } catch(e) {}
    }

    if (schemas.length) {
      body += `<div class="schema-group"><div class="schema-group-title">Structured Data (JSON-LD) — ${schemas.length} block${schemas.length > 1 ? 's' : ''}</div>\n`;
      schemas.forEach((s, i) => {
        const type = s['@type'] || 'Unknown';
        body += `<div class="schema-block">`;
        body += `<div class="schema-type">${esc(type)}</div>`;

        if (type === 'BreadcrumbList' && s.itemListElement) {
          const crumbs = s.itemListElement.map(item => esc(item.name)).join(' → ');
          body += `<div class="schema-detail">Path: ${crumbs}</div>`;
          body += `<div class="schema-detail">Items: ${s.itemListElement.length}</div>`;
        }

        if (type === 'FAQPage' && s.mainEntity) {
          body += `<div class="schema-detail">Questions: ${s.mainEntity.length}</div>`;
          s.mainEntity.forEach((q, qi) => {
            const qText = stripTags(q.name || '');
            const aText = stripTags((q.acceptedAnswer && q.acceptedAnswer.text) || '');
            body += `<div class="schema-faq-item"><strong>Q${qi+1}:</strong> ${esc(qText)}</div>`;
            body += `<div class="schema-faq-answer">${esc(aText.slice(0, 150))}${aText.length > 150 ? '…' : ''}</div>`;
          });
        }

        if (type === 'ItemList') {
          body += `<div class="schema-detail">Name: ${esc(s.name || '')}</div>`;
          body += `<div class="schema-detail">Items: ${s.numberOfItems || (s.itemListElement || []).length}</div>`;
          if (s.itemListElement) {
            s.itemListElement.forEach(item => {
              body += `<div class="schema-list-item">${item.position}. <strong>${esc(item.name || '')}</strong> — <span style="color:#64748b;">${esc(item.url || '')}</span></div>`;
            });
          }
        }

        body += `</div>\n`;
      });
      body += `</div>\n`;
    } else {
      body += `<div class="schema-detail" style="color:#ef4444;">⚠ No JSON-LD structured data found</div>\n`;
    }

    // Additional SEO tags summary
    body += `<div class="schema-group"><div class="schema-group-title">SEO Tags Summary</div>\n`;

    const robotsM = html.match(/<meta\s+name="robots"\s+content="([^"]*)"/);
    const charsetM = html.match(/<meta\s+charset="([^"]*)"/);
    const viewportM = html.match(/<meta\s+name="viewport"\s+content="([^"]*)"/);
    const canonicalM = html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/);
    const hreflangRe = /<link\s+rel="alternate"\s+hreflang="([^"]*)"\s+href="([^"]*)"/g;
    const hreflangs = [];
    let hlm;
    while ((hlm = hreflangRe.exec(html)) !== null) hreflangs.push({ lang: hlm[1], url: hlm[2] });

    const tags = [
      ['Charset', charsetM ? charsetM[1] : '—'],
      ['Viewport', viewportM ? '✓ Present' : '✗ Missing'],
      ['Canonical', canonicalM ? canonicalM[1] : '✗ Missing'],
      ['Hreflang', hreflangs.length ? hreflangs.map(h => h.lang + ' → ' + h.url).join(', ') : '✗ None'],
    ];

    tags.forEach(([label, value]) => {
      const isWarning = value.startsWith('✗');
      body += `<div class="meta-field"><span class="meta-label">${esc(label)}</span><span class="meta-value${isWarning ? ' warning' : ''}">${esc(value)}</span></div>\n`;
    });

    body += `</div>\n`;
    body += `</article>\n`;
  }

  const tocHtml = toc.map(t => {
    const badge = t.ph ? ` <span style="font-size:10px;font-weight:700;color:${phaseColors[t.ph]};">P${t.ph}</span>` : '';
    return `<a href="#${t.id}">${t.num}. ${esc(t.label)}${badge}</a>`;
  }).join('\n      ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>SEO Content Outline — Toptal Resume Examples Home Page</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 920px; margin: 0 auto; padding: 32px 24px; color: #1e293b; line-height: 1.7; background: #f8fafc; }
    header { margin-bottom: 40px; padding-bottom: 24px; border-bottom: 2px solid #e2e8f0; }
    header h1 { font-size: 28px; font-weight: 800; color: #0f172a; margin-bottom: 8px; }
    .meta { font-size: 13px; color: #64748b; }
    .phase-filter { display: flex; align-items: center; gap: 8px; margin-top: 16px; }
    .phase-filter-label { font-size: 13px; font-weight: 600; color: #475569; }
    .phase-btn { display: inline-block; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 8px; text-decoration: none; border: 1px solid #e2e8f0; color: #475569; background: #fff; transition: all .15s; }
    .phase-btn:hover { border-color: #94a3b8; }
    .phase-btn.active { background: #1e293b; color: #fff; border-color: #1e293b; }
    .phase-btn.p1.active { background: #16a34a; border-color: #16a34a; }
    .phase-btn.p2.active { background: #ca8a04; border-color: #ca8a04; }
    .phase-btn.p3.active { background: #64748b; border-color: #64748b; }
    .phase-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 6px; flex-shrink: 0; }
    .status-badge { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 6px; flex-shrink: 0; }
    .status-badge.visible { background: rgba(34,197,94,.1); color: #16a34a; }
    .status-badge.hidden { background: rgba(239,68,68,.1); color: #ef4444; }
    .meta-field { display: flex; align-items: baseline; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; flex-wrap: wrap; }
    .meta-field:last-child { border-bottom: none; }
    .meta-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; min-width: 120px; flex-shrink: 0; }
    .meta-value { font-size: 14px; color: #1e293b; flex: 1; min-width: 0; word-break: break-word; }
    .meta-count { font-size: 11px; font-weight: 600; color: #6366f1; background: rgba(99,102,241,.08); padding: 2px 8px; border-radius: 4px; flex-shrink: 0; }
    .meta-value.warning { color: #ef4444; }
    .schema-group { margin-bottom: 20px; }
    .schema-group-title { font-size: 13px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9; }
    .schema-block { margin-bottom: 16px; padding: 14px 18px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; }
    .schema-type { font-size: 15px; font-weight: 700; color: #6366f1; margin-bottom: 8px; }
    .schema-detail { font-size: 13px; color: #475569; margin: 4px 0; }
    .schema-faq-item { font-size: 13px; color: #1e293b; margin: 6px 0 2px 12px; }
    .schema-faq-answer { font-size: 12px; color: #64748b; margin: 0 0 4px 12px; font-style: italic; }
    .schema-list-item { font-size: 13px; color: #334155; margin: 3px 0 3px 12px; }
    nav { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin-bottom: 40px; }
    nav .nav-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 12px; }
    nav a { display: inline-block; font-size: 13px; color: #3b82f6; text-decoration: none; margin-right: 16px; margin-bottom: 6px; }
    nav a:hover { text-decoration: underline; }
    article { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px 28px; margin-bottom: 20px; }
    .section-header { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 12px; }
    .section-num { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: #1e293b; color: #fff; border-radius: 8px; font-size: 14px; font-weight: 700; flex-shrink: 0; }
    .eyebrow { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6366f1; margin-bottom: 8px; }
    .heading { margin: 10px 0 4px; font-weight: 700; color: #0f172a; }
    .heading.h1 { font-size: 22px; }
    .heading.h2 { font-size: 18px; }
    .heading.h3 { font-size: 15px; }
    .heading.h4 { font-size: 14px; }
    .tag { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-right: 6px; color: #fff; vertical-align: middle; }
    .h1 .tag { background: #dc2626; }
    .h2 .tag { background: #2563eb; }
    .h3 .tag { background: #16a34a; }
    .h4 .tag { background: #9333ea; }
    .h5 .tag, .h6 .tag { background: #64748b; }
    .paragraph { font-size: 14px; color: #475569; margin: 6px 0 6px 48px; line-height: 1.7; }
    .meta-info { font-size: 13px; color: #64748b; margin: 4px 0 12px 48px; }
    .stats { display: flex; flex-wrap: wrap; gap: 16px; margin: 12px 0 8px 48px; }
    .stat { font-size: 14px; padding: 6px 14px; background: #f1f5f9; border-radius: 8px; }
    .feature { font-size: 14px; margin: 6px 0 6px 48px; color: #334155; }
    .faq { margin: 12px 0 12px 48px; padding: 12px 16px; background: #f8fafc; border-radius: 8px; border-left: 3px solid #3b82f6; }
    .faq-q { font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 4px; }
    .faq-a { font-size: 13px; color: #475569; }
    .group-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6366f1; margin: 16px 0 8px 48px; }
    .person { font-size: 14px; margin: 6px 0 6px 48px; }
    .person-bio { font-size: 13px; color: #64748b; margin-top: 2px; font-style: italic; }
    .testimonial { margin: 12px 0 12px 48px; }
    .testimonial blockquote { font-size: 14px; font-style: italic; color: #334155; margin-bottom: 4px; }
    .testimonial-attr { font-size: 13px; color: #64748b; }
    .list-item { font-size: 14px; margin: 4px 0 4px 48px; color: #334155; }
    .tip { font-size: 13px; margin: 8px 0 8px 48px; padding: 10px 14px; background: #fefce8; border-radius: 8px; border-left: 3px solid #eab308; color: #713f12; }
    .chapter { margin: 16px 0; padding: 16px 20px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; }
    .chapter-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #6366f1; margin-bottom: 8px; }
    .outline-table { border-collapse: collapse; margin: 12px 0 12px 48px; font-size: 13px; }
    .outline-table th, .outline-table td { border: 1px solid #e2e8f0; padding: 6px 12px; text-align: left; }
    .outline-table th { background: #f1f5f9; font-weight: 700; }
    @media print {
      body { background: #fff; padding: 12px; font-size: 11px; }
      nav { display: none; }
      article { border: 1px solid #ccc; page-break-inside: avoid; margin-bottom: 12px; padding: 14px; }
      .section-header { font-size: 16px; }
      .heading { font-size: 13px; }
      .paragraph, .feature, .faq, .person, .list-item { font-size: 12px; }
    }
  </style>
</head>
<body>
  <header>
    <h1>📄 Toptal Resume Examples Home Page — SEO Content Outline</h1>
    <p class="meta">Generated from index.html — ${now}</p>
    <p class="meta">${sections.length} sections · ${headingCount} headings · ${paragraphCount} text blocks · Current phase: P${currentPhase}</p>
    <div class="phase-filter">
      <span class="phase-filter-label">Filter by phase:</span>
      <a href="/outline" class="phase-btn${filterPhase === 0 ? ' active' : ''}">All</a>
      <a href="/outline?phase=1" class="phase-btn p1${filterPhase === 1 ? ' active' : ''}">Phase 1</a>
      <a href="/outline?phase=2" class="phase-btn p2${filterPhase === 2 ? ' active' : ''}">Phase 2</a>
      <a href="/outline?phase=3" class="phase-btn p3${filterPhase === 3 ? ' active' : ''}">Phase 3</a>
      <button onclick="window.print()" class="phase-btn" style="margin-left:auto;background:#1e293b;color:#fff;border-color:#1e293b;cursor:pointer;">🖨 Print PDF</button>
    </div>
  </header>
  <nav>
    <div class="nav-title">Table of Contents</div>
    ${tocHtml}
  </nav>
  <main>
    ${body}
  </main>
</body>
</html>`;
}

// ─── Helpers ────────────────────────────────────────────────────

/** Parse request body as JSON */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

/** Parse raw request body as string */
function parseRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

/** Send JSON response */
function json(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(data));
}

/** Get session user from cookie */
function getUser(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  return db.validateSession(cookies.session);
}

/** Require authentication — returns user or sends 401 */
function requireAuth(req, res) {
  const user = getUser(req);
  if (!user) {
    json(res, 401, { ok: false, error: 'Not authenticated' });
    return null;
  }
  return user;
}

/** Simple URL path param extraction: /api/foo/:id */
function matchRoute(pattern, urlPath) {
  const patternParts = pattern.split('/');
  const urlParts = urlPath.split('/');
  if (patternParts.length !== urlParts.length) return null;
  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = decodeURIComponent(urlParts[i]);
    } else if (patternParts[i] !== urlParts[i]) {
      return null;
    }
  }
  return params;
}


// ─── Server ─────────────────────────────────────────────────────

async function start() {
  console.log('\n  Initialising database...');
  await db.initDB();

  // Auto-migrate: if DB has no documents, run migration automatically
  const docs = db.getAllDocuments();
  if (Object.keys(docs).length === 0) {
    console.log('\n  Empty database detected — running auto-migration...');
    try {
      const output = execSync('node migrate-data.js', {
        cwd: DIR,
        encoding: 'utf-8',
        timeout: 30000
      });
      console.log(output);
      // Reload DB from disk after external migration process wrote to it
      await db.reloadDB();
    } catch (e) {
      console.error('  Auto-migration failed:', e.message);
      console.error('  You can run it manually: node migrate-data.js');
    }
  }

  // Auto-seed SEO briefs: only runs once per brief (checks _seeded flag)
  const seoBriefsPath = path.join(DIR, 'seo-briefs-all.json');
  if (fs.existsSync(seoBriefsPath)) {
    try {
      const allBriefs = JSON.parse(fs.readFileSync(seoBriefsPath, 'utf-8'));
      let seeded = 0;
      for (const [slug, seedBrief] of Object.entries(allBriefs)) {
        const docId = `seo:${slug}`;
        const existing = db.getDocument(docId);
        const existingData = existing && existing.data ? existing.data : {};

        // Skip if already seeded previously
        if (existingData._seeded) continue;

        const seedKeys = Object.keys(seedBrief);
        const missingKeys = seedKeys.filter(k => !existingData[k] || (typeof existingData[k] === 'string' && existingData[k].trim().length === 0));

        if (missingKeys.length > 0) {
          const merged = { ...seedBrief, ...existingData };
          for (const k of missingKeys) {
            merged[k] = seedBrief[k];
          }
          merged._seeded = true;
          db.saveDocument(docId, merged, 'auto-seed');
          seeded++;
          console.log(`  Auto-seeded seo:${slug} (${missingKeys.length} missing keys filled)`);
        } else {
          // All keys present — mark as seeded so we skip next time
          existingData._seeded = true;
          db.saveDocument(docId, existingData, 'auto-seed');
        }
      }
      if (seeded > 0) {
        console.log(`  Auto-seeded ${seeded} SEO brief document(s) from seo-briefs-all.json`);
      } else {
        console.log('  All SEO briefs already seeded ✓');
      }
    } catch (e) {
      console.error('  SEO brief auto-seed failed:', e && e.message ? e.message : String(e));
      console.error('  Stack:', e && e.stack ? e.stack : 'no stack');
    }
  }

  // Auto-seed user accounts on startup
  // Uses INSERT OR REPLACE so existing users get updated to match these credentials
  const SEED_USERS = [
    { username: 'sasha',     password: 'toptal2024', display: 'Sasha',     role: 'supervisor' },
    { username: 'alejandro', password: 'toptal2024', display: 'Alejandro', role: 'supervisor' },
    { username: 'john',      password: 'toptal2024', display: 'John',      role: 'supervisor' },
    { username: 'inge',      password: 'editor2024', display: 'Inge',      role: 'editor' },
    { username: 'boris',     password: 'editor2024', display: 'Boris',     role: 'editor' },
  ];
  console.log('  Seeding user accounts...');
  for (const u of SEED_USERS) {
    try {
      db.createUser(u.username, u.password, u.display, u.role);
    } catch(e) { /* ignore if already exists */ }
  }
  console.log(`  ✓ ${SEED_USERS.length} user accounts ready`);

  // Auto-seed guide chapter content from index.html into the CMS database
  // This is a one-time migration: if chapters exist but body is empty, parse index.html
  try {
    const hpDoc = db.getDocument('homepage');
    if (hpDoc && hpDoc.data && hpDoc.data.guide && hpDoc.data.guide.chapters && !hpDoc.data.guide._seeded) {
      const chapters = hpDoc.data.guide.chapters;
      const needsSeed = chapters.some(ch => !ch.body || ch.body.trim() === '' || ch.body === '<p><br></p>');
      if (needsSeed) {
        const indexPath = path.join(DIR, 'index.html');
        const indexHtml = fs.readFileSync(indexPath, 'utf8');
        // Parse guide chapters by splitting the guide-chapters container
        const gcStart = indexHtml.indexOf('<div class="guide-chapters">');
        const gcEnd = indexHtml.indexOf('</div><!-- end guide-chapters -->');
        const gcBlock = gcStart >= 0 && gcEnd >= 0 ? indexHtml.substring(gcStart, gcEnd) : '';
        const gcParts = gcBlock.split(/(?=<div class="guide-chapter" id="guide-)/);
        let seeded = 0;
        for (let p = 1; p < gcParts.length; p++) {
          const idMatch = gcParts[p].match(/id="guide-(\d+)"/);
          if (!idMatch) continue;
          const idx = parseInt(idMatch[1]) - 1;
          if (idx >= chapters.length) continue;
          const ch = chapters[idx];
          if (ch.body && ch.body.trim() !== '' && ch.body !== '<p><br></p>') continue;

          // Extract content after </h3>
          const h3End = gcParts[p].indexOf('</h3>');
          if (h3End < 0) continue;
          // Strip the outer closing </div> of the guide-chapter
          let rawContent = gcParts[p].substring(h3End + 5).replace(/\s*<\/div>\s*$/, '').trim();
          // Separate body text, table, and callout
          let body = rawContent;
          let table = null;
          let tip = null;

          // Extract table
          const tableMatch = rawContent.match(/<div class="guide-table-wrap">([\s\S]*?)<\/div>\s*(?=<div|$)/);
          if (tableMatch) {
            body = body.replace(tableMatch[0], '');
            // Parse table HTML into 2D array
            const rows = [];
            const rowRegex = /<tr>([\s\S]*?)<\/tr>/g;
            let rm;
            while ((rm = rowRegex.exec(tableMatch[1])) !== null) {
              const cells = [];
              const cellRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g;
              let cm;
              while ((cm = cellRegex.exec(rm[1])) !== null) {
                cells.push(cm[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim());
              }
              if (cells.length) rows.push(cells);
            }
            if (rows.length) table = rows;
          }

          // Extract callout/tip
          const calloutMatch = rawContent.match(/<div class="guide-callout([^"]*)">\s*<div class="guide-callout-title">(?:<[^>]*>)*\s*([^<]+)<\/div>\s*<p>([\s\S]*?)<\/p>\s*<\/div>/);
          if (calloutMatch) {
            body = body.replace(calloutMatch[0], '');
            const colorClass = calloutMatch[1].trim();
            const colorMap = { 'green': 'green', 'amber': 'yellow', '': 'blue' };
            tip = {
              title: calloutMatch[2].trim(),
              body: calloutMatch[3].replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim(),
              color: colorMap[colorClass] || 'blue',
              icon: 'info'
            };
          }

          // Clean up body: remove leftover wrapper divs and trim
          body = body.replace(/<div class="guide-table-wrap">[\s\S]*?<\/div>\s*<\/div>/g, '');
          body = body.trim();

          ch.body = body;
          if (table) ch.table = table;
          if (tip) ch.tip = tip;
          seeded++;
        }
        if (seeded > 0) {
          hpDoc.data.guide._seeded = true;
          db.saveDocument('homepage', hpDoc.data, 'auto-seed');
          console.log(`  Auto-seeded ${seeded} guide chapter(s) from index.html`);
        } else {
          // All chapters already have content — mark as seeded to prevent future runs
          hpDoc.data.guide._seeded = true;
          db.saveDocument('homepage', hpDoc.data, 'auto-seed');
        }
      } else {
        // No chapters need seeding — mark as done
        hpDoc.data.guide._seeded = true;
        db.saveDocument('homepage', hpDoc.data, 'auto-seed');
      }
    }
  } catch(e) {
    console.error('  Guide chapter auto-seed failed:', e.message || e);
  }

  // Auto-seed testimonials into homepage document if not present
  try {
    const hpDocT = db.getDocument('homepage');
    if (hpDocT && !hpDocT.data.testimonials) {
      hpDocT.data.testimonials = [
        { stars: 5, quote: 'Toptal Resume transformed my job search. As a JavaScript developer, I needed a resume that highlighted my expertise with React and Node.js. They crafted the perfect resume, and I quickly landed interviews with top tech companies. Highly recommend!', initials: 'AH', avatarColor: '#4F46E5', name: 'Alejandro Hernandez', role: 'JavaScript Developer', hiredAt: '' },
        { stars: 5, quote: 'I needed a resume that showcased my specific expertise as a software engineer. Thanks to Toptal Resume, I was interviewing at top companies within a few weeks. I highly recommend Toptal Resume. The service is professional, tailored, and absolutely gets results.', initials: 'LA', avatarColor: '#059669', name: 'Laureano Martin Arcanio', role: 'Software Engineer', hiredAt: '' },
        { stars: 5, quote: 'I have already started my new job, which I love and which pays roughly 50% more than my last job. During my job search, the resume was so good, and my applications were so deliberate that I was hitting about a 100% conversion rate to round 1 interviews. The resume definitely helped a lot. It\'s pure gold!', initials: 'BT', avatarColor: '#D97706', name: 'Brandon Teer', role: 'Director of IT', hiredAt: '' },
        { stars: 5, quote: 'The resume looks great! I really appreciate how you\'ve streamlined the content, highlighted the right things, and made it feel polished. Everything\'s super helpful, and I feel a lot more confident going into applications now.', initials: 'KI', avatarColor: '#4F46E5', name: 'Karthikeyan Iyer', role: 'Senior Front-end Developer', hiredAt: '' },
        { stars: 5, quote: 'This was my first time trying a resume service, and I\'m so glad I gave it a shot. Not only did the process exceed my expectations, but it also made me more excited and confident about my future job search. I can already tell this resume will open doors for me.', initials: 'CC', avatarColor: '#7C3AED', name: 'Carlos Craig', role: 'React Native Engineer', hiredAt: '' },
        { stars: 5, quote: 'I used the resume provided by you guys for my job search. I only improved the intro a bit. I was able to get more than 10 interviews from 60 applications and get offers from 6 companies. I stopped my pending interviews and accepted an offer from Robinhood a month ago.', initials: 'MY', avatarColor: '#DC2626', name: 'Moges Tesfay Yohannes', role: 'Senior Android Developer', hiredAt: '' }
      ];
      db.saveDocument('homepage', hpDocT.data, 'auto-seed');
      console.log('  Seeded 6 testimonials into homepage document');
    }
  } catch(e) {
    console.error('  Testimonials auto-seed failed:', e.message || e);
  }

  // Auto-seed expert panel into homepage document if not present
  // Also migrate: replace fake recruiters with real ones (one-time, checks _recruitersV2 flag)
  try {
    const hpDocP = db.getDocument('homepage');
    // One-time migration: update recruiters to real data
    if (hpDocP && hpDocP.data.expertPanel && !hpDocP.data.expertPanel._recruitersV2) {
      hpDocP.data.expertPanel._recruitersV2 = true;
      hpDocP.data.expertPanel._recruitersV3 = true;
      hpDocP.data.expertPanel.recruiters = [
        { initials: 'AB', avatarColor: '#204ECF', name: 'Adrian Bora', role: 'Principal Recruiter', location: 'Timișoara, Romania', linkedin: 'https://www.linkedin.com/in/adrian-bora/', bio: 'Adrian Bora is a Principal Recruiter specializing in talent acquisition for Product, Engineering, Marketing, and Sales functions. With a background in electronics and telecommunications from Politehnica University Timișoara, he has hired 200+ engineers and nearly doubled Toptal\'s internal Product team. Known for data-driven sourcing, multi-step nurture campaigns, and a >90% offer acceptance rate, he partners with hiring managers and executives to build high-performing distributed teams.', credential: 'Principal Recruiter', credentialIcon: 'badge-check' },
        { initials: 'JP', avatarColor: '#0F256E', name: 'Jaclyn Price', role: 'Senior Recruiter', location: 'Clearwater, Florida, United States', linkedin: 'https://www.linkedin.com/in/jaclyn-price', bio: 'Jaclyn Price is a Senior Recruiter with 10 years of full-cycle recruiting experience across startups and Fortune 500 companies, including Wayfair and Bliss Point Media. A Yale University graduate with a BA in Political Science, she has led cross-functional recruiting programs, served as an ATS subject matter expert, and developed talent initiatives that significantly reduced time-to-fill and cost per hire. She brings a data-driven, people-first approach to building high-impact teams.', credential: 'Senior Recruiter', credentialIcon: 'badge-check' },
        { initials: 'JW', avatarColor: '#7C3AED', name: 'Jason Woodard', role: 'Principal Recruiter', location: 'Columbia, South Carolina, United States', linkedin: 'https://www.linkedin.com/in/jason-woodard', bio: 'Jason Woodard is a Principal Recruiter with over 14 years of experience in talent acquisition across IT staffing, Fortune 200 logistics, and professional services. He holds a BS in Sport Management from Winthrop University and has built his career at Insight Global, XPO Logistics, and Toptal. Selected for Toptal\'s 2025 High-Potential Leadership Development Program — a distinction held by fewer than 3% of the company — he specializes in Sales, Technology, and Operations recruiting.', credential: 'Principal Recruiter', credentialIcon: 'badge-check' },
        { initials: 'LS', avatarColor: '#1E3A5F', name: 'Lazar Stevic', role: 'Recruiter', location: 'Požarevac, Serbia', linkedin: 'https://www.linkedin.com/in/lazarstevic46b156139/', bio: 'Lazar Stevic is a Recruiter at Toptal, where he has progressively advanced from Recruiting Operations Coordinator to Junior Recruiter and Recruiter over more than six years. He holds a degree in Human Resources Management and Security Studies from the Faculty of Security Studies, University of Belgrade. Prior to recruiting, he developed cross-cultural communication skills through online English teaching roles across multiple international platforms, serving students in China, Ukraine, and Serbia.', credential: 'Recruiter', credentialIcon: 'badge-check' },
        { initials: 'LP', avatarColor: '#6D28D9', name: 'Lyndsey Price', role: 'Executive Recruiting Lead', location: 'Easton, Connecticut, United States', linkedin: 'https://www.linkedin.com/in/lyndseyprice1', bio: 'Lyndsey Price is Toptal\'s Executive Recruiting Lead, specializing in senior and executive-level hiring across Product and Marketing. She holds a BS in Accounting from Sacred Heart University and began her career in financial staffing at Kforce and Atlantic Group before transitioning into tech recruiting at Yext. With over five years at Toptal — progressing from Recruiting Lead to Head of Product & Marketing Recruiting to Executive Recruiting Lead — she brings sharp strategic instincts to high-stakes hiring.', credential: 'Executive Recruiting Lead', credentialIcon: 'badge-check' },
        { initials: 'MB', avatarColor: '#059669', name: 'Malinda Berry', role: 'Senior Recruiter', location: 'Denver, Colorado, United States', linkedin: 'https://www.linkedin.com/in/malindaberry04081992/', bio: 'Malinda Berry is a Senior Recruiter with a dual BA in Psychology and Criminal Justice from the University of Arizona, where she graduated with a 4.0 GPA. She began her career at AppleOne Employment Services before joining Toptal in 2021, where she supports full-cycle recruiting across Marketing, Customer, Product, and Technical functions. Her background in behavioral science and talent mobility informs a consultative, data-informed approach to identifying and engaging top talent.', credential: 'Senior Recruiter', credentialIcon: 'badge-check' },
        { initials: 'MG', avatarColor: '#DC2626', name: 'Marisa Goldberg', role: 'Senior Director of Recruiting', location: 'Scarsdale, New York, United States', linkedin: 'https://www.linkedin.com/in/marisagoldberg123/', bio: 'Marisa Goldberg is Toptal\'s Senior Director of Recruiting, leading the full recruiting function with a team-first philosophy. She holds a BA from Queens College and an MBA from Pace University, and has built her career at Time Warner, JPMorgan Private Bank, BlackRock, and Paxos, where she served as Director of Talent Acquisition. With deep expertise across financial services, fintech, and technology sectors, she brings both strategic leadership and hands-on recruiting excellence to Toptal.', credential: 'Senior Director of Recruiting', credentialIcon: 'badge-check' }
      ];
      db.saveDocument('homepage', hpDocP.data, 'migration-recruiters-v2');
      console.log('  Migrated expert panel recruiters to real data (7 recruiters)');
    }
    // One-time migration: update recruiter bios to detailed versions
    if (hpDocP && hpDocP.data.expertPanel && !hpDocP.data.expertPanel._recruitersV3) {
      hpDocP.data.expertPanel._recruitersV3 = true;
      hpDocP.data.expertPanel.recruiters = [
        { initials: 'AB', avatarColor: '#204ECF', name: 'Adrian Bora', role: 'Principal Recruiter', location: 'Timișoara, Romania', linkedin: 'https://www.linkedin.com/in/adrian-bora/', bio: 'Adrian Bora is a Principal Recruiter specializing in talent acquisition for Product, Engineering, Marketing, and Sales functions. With a background in electronics and telecommunications from Politehnica University Timișoara, he has hired 200+ engineers and nearly doubled Toptal\'s internal Product team. Known for data-driven sourcing, multi-step nurture campaigns, and a >90% offer acceptance rate, he partners with hiring managers and executives to build high-performing distributed teams.', credential: 'Principal Recruiter', credentialIcon: 'badge-check' },
        { initials: 'JP', avatarColor: '#0F256E', name: 'Jaclyn Price', role: 'Senior Recruiter', location: 'Clearwater, Florida, United States', linkedin: 'https://www.linkedin.com/in/jaclyn-price', bio: 'Jaclyn Price is a Senior Recruiter with 10 years of full-cycle recruiting experience across startups and Fortune 500 companies, including Wayfair and Bliss Point Media. A Yale University graduate with a BA in Political Science, she has led cross-functional recruiting programs, served as an ATS subject matter expert, and developed talent initiatives that significantly reduced time-to-fill and cost per hire. She brings a data-driven, people-first approach to building high-impact teams.', credential: 'Senior Recruiter', credentialIcon: 'badge-check' },
        { initials: 'JW', avatarColor: '#7C3AED', name: 'Jason Woodard', role: 'Principal Recruiter', location: 'Columbia, South Carolina, United States', linkedin: 'https://www.linkedin.com/in/jason-woodard', bio: 'Jason Woodard is a Principal Recruiter with over 14 years of experience in talent acquisition across IT staffing, Fortune 200 logistics, and professional services. He holds a BS in Sport Management from Winthrop University and has built his career at Insight Global, XPO Logistics, and Toptal. Selected for Toptal\'s 2025 High-Potential Leadership Development Program — a distinction held by fewer than 3% of the company — he specializes in Sales, Technology, and Operations recruiting.', credential: 'Principal Recruiter', credentialIcon: 'badge-check' },
        { initials: 'LS', avatarColor: '#1E3A5F', name: 'Lazar Stevic', role: 'Recruiter', location: 'Požarevac, Serbia', linkedin: 'https://www.linkedin.com/in/lazarstevic46b156139/', bio: 'Lazar Stevic is a Recruiter at Toptal, where he has progressively advanced from Recruiting Operations Coordinator to Junior Recruiter and Recruiter over more than six years. He holds a degree in Human Resources Management and Security Studies from the Faculty of Security Studies, University of Belgrade. Prior to recruiting, he developed cross-cultural communication skills through online English teaching roles across multiple international platforms, serving students in China, Ukraine, and Serbia.', credential: 'Recruiter', credentialIcon: 'badge-check' },
        { initials: 'LP', avatarColor: '#6D28D9', name: 'Lyndsey Price', role: 'Executive Recruiting Lead', location: 'Easton, Connecticut, United States', linkedin: 'https://www.linkedin.com/in/lyndseyprice1', bio: 'Lyndsey Price is Toptal\'s Executive Recruiting Lead, specializing in senior and executive-level hiring across Product and Marketing. She holds a BS in Accounting from Sacred Heart University and began her career in financial staffing at Kforce and Atlantic Group before transitioning into tech recruiting at Yext. With over five years at Toptal — progressing from Recruiting Lead to Head of Product & Marketing Recruiting to Executive Recruiting Lead — she brings sharp strategic instincts to high-stakes hiring.', credential: 'Executive Recruiting Lead', credentialIcon: 'badge-check' },
        { initials: 'MB', avatarColor: '#059669', name: 'Malinda Berry', role: 'Senior Recruiter', location: 'Denver, Colorado, United States', linkedin: 'https://www.linkedin.com/in/malindaberry04081992/', bio: 'Malinda Berry is a Senior Recruiter with a dual BA in Psychology and Criminal Justice from the University of Arizona, where she graduated with a 4.0 GPA. She began her career at AppleOne Employment Services before joining Toptal in 2021, where she supports full-cycle recruiting across Marketing, Customer, Product, and Technical functions. Her background in behavioral science and talent mobility informs a consultative, data-informed approach to identifying and engaging top talent.', credential: 'Senior Recruiter', credentialIcon: 'badge-check' },
        { initials: 'MG', avatarColor: '#DC2626', name: 'Marisa Goldberg', role: 'Senior Director of Recruiting', location: 'Scarsdale, New York, United States', linkedin: 'https://www.linkedin.com/in/marisagoldberg123/', bio: 'Marisa Goldberg is Toptal\'s Senior Director of Recruiting, leading the full recruiting function with a team-first philosophy. She holds a BA from Queens College and an MBA from Pace University, and has built her career at Time Warner, JPMorgan Private Bank, BlackRock, and Paxos, where she served as Director of Talent Acquisition. With deep expertise across financial services, fintech, and technology sectors, she brings both strategic leadership and hands-on recruiting excellence to Toptal.', credential: 'Senior Director of Recruiting', credentialIcon: 'badge-check' }
      ];
      db.saveDocument('homepage', hpDocP.data, 'migration-recruiters-v3');
      console.log('  Migrated expert panel recruiter bios to detailed versions (v3)');
    }
    // One-time migration: update writers to real data
    if (hpDocP && hpDocP.data.expertPanel && !hpDocP.data.expertPanel._writersV2) {
      hpDocP.data.expertPanel._writersV2 = true;
      hpDocP.data.expertPanel.writers = [
        { initials: 'BD', avatarColor: '#7C3AED', name: 'Branka Divčić', role: 'Profile Content Editor', location: 'Belgrade, Serbia', linkedin: 'https://www.linkedin.com/in/branka-div%C4%8Di%C4%87-65361861/', bio: 'Branka Divcic is a language specialist and Profile Content Editor with over 15 years of experience in English education, translation, and editorial work. She holds an MA in English Language and Literature from the University of Belgrade, where she is also completing her doctoral dissertation in English Literature. She specializes in ESL, Legal English, and education management, and has run her own language center since 2017.', credential: 'Profile Content Editor', credentialIcon: 'badge-check' },
        { initials: 'JL', avatarColor: '#2563EB', name: 'Juan Laudren', role: 'Profile Content Editor', location: 'Buenos Aires, Argentina', linkedin: 'https://ar.linkedin.com/in/juan-pablo-laudren-712a0549', bio: 'Juan Pablo Laudren is a certified English-Spanish translator and Profile Content Editor with over 15 years of experience in linguistic quality control, editing, and copywriting. He has worked at S&P Global and TransPerfect, specializing in financial, legal, and corporate content. He holds a degree from the University of Buenos Aires, where he also teaches translation courses, bringing both academic rigor and industry depth to every profile he crafts.', credential: 'Profile Content Editor', credentialIcon: 'badge-check' },
        { initials: 'KV', avatarColor: '#059669', name: 'KC Vedra', role: 'Profile Content Editor', location: 'Cagayan De Oro City, Philippines', linkedin: 'https://www.linkedin.com/in/kc-vedra/', bio: 'KC Vedra is a licensed educator, expert writer, and Profile Content Editor with a background spanning technical writing, UX writing, copywriting, and content management. A graduate of Xavier University -- Ateneo de Cagayan and a licensed teacher, she has led editorial teams and produced content across diverse industries. At Toptal, she brings precision, editorial discipline, and a growth mindset to crafting profiles that are clear, compelling, and accurate.', credential: 'Profile Content Editor', credentialIcon: 'badge-check' },
        { initials: 'MA', avatarColor: '#DC2626', name: 'Marina Alavanja', role: 'Profile Content Specialist', location: 'Novi Beograd, Serbia', linkedin: 'https://www.linkedin.com/in/marina-alavanja-79b78410/', bio: 'Marina Alavanja is a Profile Content Specialist and adult education professional with a BA in Andragogy from the University of Belgrade. With a background in marketing, editing, and client services, she brings a structured, detail-oriented approach to profile management and content quality. She specializes in coordinating complex activation workflows, ensuring consistency across platforms, and maintaining high editorial standards under dynamic, high-demand conditions.', credential: 'Profile Content Specialist', credentialIcon: 'badge-check' },
        { initials: 'ML', avatarColor: '#D97706', name: 'Midel Linsangan', role: 'Profile Content Specialist', location: 'Quezon City, Philippines', linkedin: 'https://www.linkedin.com/in/midel-linsangan-b9b90473/', bio: 'Midel Linsangan is a Profile Content Specialist and seasoned communication professional with a degree from the University of the Philippines. He brings over a decade of experience in training delivery, language assessment, and content editing, having worked at Concentrix, Cognizant, and Sutherland. His background in evaluating communication skills and screening talent gives him a sharp editorial eye for crafting profiles that are both precise and impactful.', credential: 'Profile Content Specialist', credentialIcon: 'badge-check' },
        { initials: 'MG', avatarColor: '#0F256E', name: 'Milena Gosevski', role: 'Profile Content Team Lead', location: 'Belgrade, Serbia', linkedin: 'https://www.linkedin.com/in/milena-gosevski-8424861a9/', bio: 'Milena Gosevski is the Profile Content Team Lead at Toptal, where she has built over seven years of expertise in editorial quality, content operations, and team leadership. With a foundation in international law and advanced studies in human psychology, she brings an analytical and people-centered approach to profile development. Her deep understanding of how professional narratives are structured makes her a key driver of content excellence across the team.', credential: 'Profile Content Team Lead', credentialIcon: 'badge-check' },
        { initials: 'RD', avatarColor: '#1E3A5F', name: 'Rita Duro', role: 'Profile Content Specialist', location: 'Matosinhos, Portugal', linkedin: 'https://www.linkedin.com/in/rita-duro/', bio: 'Rita Duro is a Profile Content Specialist and digital content creator with a Master\'s degree in Project Management from Politecnico do Porto. She brings experience across hospitality, academic research administration, and digital content creation, developing a cross-industry perspective on how professionals present themselves. Self-driven and multilingual, she has been with Toptal since 2021, specializing in editing and optimizing profiles to clearly communicate expertise and value.', credential: 'Profile Content Specialist', credentialIcon: 'badge-check' },
        { initials: 'SH', avatarColor: '#78716C', name: 'Suzana Hasani Harkin', role: 'Profile Content Editor', location: 'Belgrade, Serbia', linkedin: 'https://www.linkedin.com/in/suzana-hasani-harkin-744a45156/', bio: 'Suzana Hasani Harkin is a Profile Content Editor, English literature teacher, and psychologist holding master\'s degrees from the University of Belgrade and the University of Roehampton. With expertise spanning English language editing, academic writing, and applied psychology, she brings a uniquely analytical lens to how professional profiles communicate. Her dual background in linguistics and human behavior informs her precise, thoughtful approach to crafting clear and credible professional narratives.', credential: 'Profile Content Editor', credentialIcon: 'badge-check' }
      ];
      db.saveDocument('homepage', hpDocP.data, 'migration-writers-v2');
      console.log('  Migrated expert panel writers to real data (8 writers)');
    }
    // One-time migration: set visibility flags on expert panel members
    const VISIBLE_RECRUITERS = ['Marisa Goldberg', 'Jaclyn Price', 'Lyndsey Price'];
    const VISIBLE_WRITERS = ['KC Vedra', 'Branka Divčić', 'Juan Laudren'];
    if (hpDocP && hpDocP.data.expertPanel && !hpDocP.data.expertPanel._visibilityV1) {
      hpDocP.data.expertPanel._visibilityV1 = true;
      (hpDocP.data.expertPanel.recruiters || []).forEach(r => {
        r.visible = VISIBLE_RECRUITERS.includes(r.name);
      });
      (hpDocP.data.expertPanel.writers || []).forEach(w => {
        w.visible = VISIBLE_WRITERS.includes(w.name);
      });
      db.saveDocument('homepage', hpDocP.data, 'migration-visibility-v1');
      console.log('  Set visibility flags on expert panel members');
    }
    if (hpDocP && !hpDocP.data.expertPanel) {
      hpDocP.data.expertPanel = {
        eyebrow: 'Expert Panel',
        title: 'The Recruiters & Resume Writers Behind Our Data',
        subtitle: 'Our insights come from real hiring professionals who work both sides of the table \u2014 recruiters who screen thousands of candidates, and resume writers who know exactly what gets through. Together, they form the expert panel behind every Toptal Resume recommendation.',
        _recruitersV2: true,
        _recruitersV3: true,
        recruiters: [
          { initials: 'AB', avatarColor: '#204ECF', name: 'Adrian Bora', role: 'Principal Recruiter', location: 'Timișoara, Romania', linkedin: 'https://www.linkedin.com/in/adrian-bora/', bio: 'Adrian Bora is a Principal Recruiter specializing in talent acquisition for Product, Engineering, Marketing, and Sales functions. With a background in electronics and telecommunications from Politehnica University Timișoara, he has hired 200+ engineers and nearly doubled Toptal\'s internal Product team. Known for data-driven sourcing, multi-step nurture campaigns, and a >90% offer acceptance rate, he partners with hiring managers and executives to build high-performing distributed teams.', credential: 'Principal Recruiter', credentialIcon: 'badge-check', visible: false },
          { initials: 'JP', avatarColor: '#0F256E', name: 'Jaclyn Price', role: 'Senior Recruiter', location: 'Clearwater, Florida, United States', linkedin: 'https://www.linkedin.com/in/jaclyn-price', bio: 'Jaclyn Price is a Senior Recruiter with 10 years of full-cycle recruiting experience across startups and Fortune 500 companies, including Wayfair and Bliss Point Media. A Yale University graduate with a BA in Political Science, she has led cross-functional recruiting programs, served as an ATS subject matter expert, and developed talent initiatives that significantly reduced time-to-fill and cost per hire. She brings a data-driven, people-first approach to building high-impact teams.', credential: 'Senior Recruiter', credentialIcon: 'badge-check', visible: true },
          { initials: 'JW', avatarColor: '#7C3AED', name: 'Jason Woodard', role: 'Principal Recruiter', location: 'Columbia, South Carolina, United States', linkedin: 'https://www.linkedin.com/in/jason-woodard', bio: 'Jason Woodard is a Principal Recruiter with over 14 years of experience in talent acquisition across IT staffing, Fortune 200 logistics, and professional services. He holds a BS in Sport Management from Winthrop University and has built his career at Insight Global, XPO Logistics, and Toptal. Selected for Toptal\'s 2025 High-Potential Leadership Development Program — a distinction held by fewer than 3% of the company — he specializes in Sales, Technology, and Operations recruiting.', credential: 'Principal Recruiter', credentialIcon: 'badge-check', visible: false },
          { initials: 'LS', avatarColor: '#1E3A5F', name: 'Lazar Stevic', role: 'Recruiter', location: 'Požarevac, Serbia', linkedin: 'https://www.linkedin.com/in/lazarstevic46b156139/', bio: 'Lazar Stevic is a Recruiter at Toptal, where he has progressively advanced from Recruiting Operations Coordinator to Junior Recruiter and Recruiter over more than six years. He holds a degree in Human Resources Management and Security Studies from the Faculty of Security Studies, University of Belgrade. Prior to recruiting, he developed cross-cultural communication skills through online English teaching roles across multiple international platforms, serving students in China, Ukraine, and Serbia.', credential: 'Recruiter', credentialIcon: 'badge-check', visible: false },
          { initials: 'LP', avatarColor: '#6D28D9', name: 'Lyndsey Price', role: 'Executive Recruiting Lead', location: 'Easton, Connecticut, United States', linkedin: 'https://www.linkedin.com/in/lyndseyprice1', bio: 'Lyndsey Price is Toptal\'s Executive Recruiting Lead, specializing in senior and executive-level hiring across Product and Marketing. She holds a BS in Accounting from Sacred Heart University and began her career in financial staffing at Kforce and Atlantic Group before transitioning into tech recruiting at Yext. With over five years at Toptal — progressing from Recruiting Lead to Head of Product & Marketing Recruiting to Executive Recruiting Lead — she brings sharp strategic instincts to high-stakes hiring.', credential: 'Executive Recruiting Lead', credentialIcon: 'badge-check', visible: true },
          { initials: 'MB', avatarColor: '#059669', name: 'Malinda Berry', role: 'Senior Recruiter', location: 'Denver, Colorado, United States', linkedin: 'https://www.linkedin.com/in/malindaberry04081992/', bio: 'Malinda Berry is a Senior Recruiter with a dual BA in Psychology and Criminal Justice from the University of Arizona, where she graduated with a 4.0 GPA. She began her career at AppleOne Employment Services before joining Toptal in 2021, where she supports full-cycle recruiting across Marketing, Customer, Product, and Technical functions. Her background in behavioral science and talent mobility informs a consultative, data-informed approach to identifying and engaging top talent.', credential: 'Senior Recruiter', credentialIcon: 'badge-check', visible: false },
          { initials: 'MG', avatarColor: '#DC2626', name: 'Marisa Goldberg', role: 'Senior Director of Recruiting', location: 'Scarsdale, New York, United States', linkedin: 'https://www.linkedin.com/in/marisagoldberg123/', bio: 'Marisa Goldberg is Toptal\'s Senior Director of Recruiting, leading the full recruiting function with a team-first philosophy. She holds a BA from Queens College and an MBA from Pace University, and has built her career at Time Warner, JPMorgan Private Bank, BlackRock, and Paxos, where she served as Director of Talent Acquisition. With deep expertise across financial services, fintech, and technology sectors, she brings both strategic leadership and hands-on recruiting excellence to Toptal.', credential: 'Senior Director of Recruiting', credentialIcon: 'badge-check', visible: true }
        ],
        _writersV2: true,
        writers: [
          { initials: 'BD', avatarColor: '#7C3AED', name: 'Branka Divčić', role: 'Profile Content Editor', location: 'Belgrade, Serbia', linkedin: 'https://www.linkedin.com/in/branka-div%C4%8Di%C4%87-65361861/', bio: 'Branka Divcic is a language specialist and Profile Content Editor with over 15 years of experience in English education, translation, and editorial work. She holds an MA in English Language and Literature from the University of Belgrade, where she is also completing her doctoral dissertation in English Literature. She specializes in ESL, Legal English, and education management, and has run her own language center since 2017.', credential: 'Profile Content Editor', credentialIcon: 'badge-check', visible: true },
          { initials: 'JL', avatarColor: '#2563EB', name: 'Juan Laudren', role: 'Profile Content Editor', location: 'Buenos Aires, Argentina', linkedin: 'https://ar.linkedin.com/in/juan-pablo-laudren-712a0549', bio: 'Juan Pablo Laudren is a certified English-Spanish translator and Profile Content Editor with over 15 years of experience in linguistic quality control, editing, and copywriting. He has worked at S&P Global and TransPerfect, specializing in financial, legal, and corporate content. He holds a degree from the University of Buenos Aires, where he also teaches translation courses, bringing both academic rigor and industry depth to every profile he crafts.', credential: 'Profile Content Editor', credentialIcon: 'badge-check', visible: true },
          { initials: 'KV', avatarColor: '#059669', name: 'KC Vedra', role: 'Profile Content Editor', location: 'Cagayan De Oro City, Philippines', linkedin: 'https://www.linkedin.com/in/kc-vedra/', bio: 'KC Vedra is a licensed educator, expert writer, and Profile Content Editor with a background spanning technical writing, UX writing, copywriting, and content management. A graduate of Xavier University -- Ateneo de Cagayan and a licensed teacher, she has led editorial teams and produced content across diverse industries. At Toptal, she brings precision, editorial discipline, and a growth mindset to crafting profiles that are clear, compelling, and accurate.', credential: 'Profile Content Editor', credentialIcon: 'badge-check', visible: true },
          { initials: 'MA', avatarColor: '#DC2626', name: 'Marina Alavanja', role: 'Profile Content Specialist', location: 'Novi Beograd, Serbia', linkedin: 'https://www.linkedin.com/in/marina-alavanja-79b78410/', bio: 'Marina Alavanja is a Profile Content Specialist and adult education professional with a BA in Andragogy from the University of Belgrade. With a background in marketing, editing, and client services, she brings a structured, detail-oriented approach to profile management and content quality. She specializes in coordinating complex activation workflows, ensuring consistency across platforms, and maintaining high editorial standards under dynamic, high-demand conditions.', credential: 'Profile Content Specialist', credentialIcon: 'badge-check', visible: false },
          { initials: 'ML', avatarColor: '#D97706', name: 'Midel Linsangan', role: 'Profile Content Specialist', location: 'Quezon City, Philippines', linkedin: 'https://www.linkedin.com/in/midel-linsangan-b9b90473/', bio: 'Midel Linsangan is a Profile Content Specialist and seasoned communication professional with a degree from the University of the Philippines. He brings over a decade of experience in training delivery, language assessment, and content editing, having worked at Concentrix, Cognizant, and Sutherland. His background in evaluating communication skills and screening talent gives him a sharp editorial eye for crafting profiles that are both precise and impactful.', credential: 'Profile Content Specialist', credentialIcon: 'badge-check', visible: false },
          { initials: 'MG', avatarColor: '#0F256E', name: 'Milena Gosevski', role: 'Profile Content Team Lead', location: 'Belgrade, Serbia', linkedin: 'https://www.linkedin.com/in/milena-gosevski-8424861a9/', bio: 'Milena Gosevski is the Profile Content Team Lead at Toptal, where she has built over seven years of expertise in editorial quality, content operations, and team leadership. With a foundation in international law and advanced studies in human psychology, she brings an analytical and people-centered approach to profile development. Her deep understanding of how professional narratives are structured makes her a key driver of content excellence across the team.', credential: 'Profile Content Team Lead', credentialIcon: 'badge-check', visible: false },
          { initials: 'RD', avatarColor: '#1E3A5F', name: 'Rita Duro', role: 'Profile Content Specialist', location: 'Matosinhos, Portugal', linkedin: 'https://www.linkedin.com/in/rita-duro/', bio: 'Rita Duro is a Profile Content Specialist and digital content creator with a Master\'s degree in Project Management from Politecnico do Porto. She brings experience across hospitality, academic research administration, and digital content creation, developing a cross-industry perspective on how professionals present themselves. Self-driven and multilingual, she has been with Toptal since 2021, specializing in editing and optimizing profiles to clearly communicate expertise and value.', credential: 'Profile Content Specialist', credentialIcon: 'badge-check', visible: false },
          { initials: 'SH', avatarColor: '#78716C', name: 'Suzana Hasani Harkin', role: 'Profile Content Editor', location: 'Belgrade, Serbia', linkedin: 'https://www.linkedin.com/in/suzana-hasani-harkin-744a45156/', bio: 'Suzana Hasani Harkin is a Profile Content Editor, English literature teacher, and psychologist holding master\'s degrees from the University of Belgrade and the University of Roehampton. With expertise spanning English language editing, academic writing, and applied psychology, she brings a uniquely analytical lens to how professional profiles communicate. Her dual background in linguistics and human behavior informs her precise, thoughtful approach to crafting clear and credible professional narratives.', credential: 'Profile Content Editor', credentialIcon: 'badge-check', visible: false }
        ]
      };
      db.saveDocument('homepage', hpDocP.data, 'auto-seed');
      console.log('  Seeded expert panel (15 experts) into homepage document');
    }
  } catch(e) {
    console.error('  Expert panel auto-seed failed:', e.message || e);
  }

  // --- Auto-seed Why Toptal features ---
  try {
    const hpDocW = db.getDocument('homepage');
    if (hpDocW && !hpDocW.data.whyToptal) {
      hpDocW.data.whyToptal = {
        eyebrow: 'Why Toptal',
        title: 'Why Choose Toptal Resume Examples',
        subtitle: 'Designed by hiring experts, optimized for ATS systems, and built for the modern job market.',
        features: [
          { icon: 'shield-check', iconColor: 'green', title: 'ATS-Compliant Designs', description: 'Every example is tested against major ATS systems to ensure your resume gets past automated screening.' },
          { icon: 'calendar-check', iconColor: 'blue', title: 'Updated for 2026', description: 'Examples reflect the latest hiring trends, formatting standards, and recruiter preferences for 2026.' },
          { icon: 'wand-2', iconColor: 'purple', title: 'Free & Fully Customizable', description: 'Download and customize any example with your own content. Available in PDF, Word, and Google Docs.' },
          { icon: 'file-stack', iconColor: 'amber', title: 'Multiple Format Options', description: 'Choose from single-column, two-column, chronological, functional, or combination resume formats.' },
          { icon: 'users', iconColor: 'rose', title: 'Industry-Specific Examples', description: "Examples with real sample content for 10+ industries — built with insights from Toptal's expert network." }
        ]
      };
      db.saveDocument('homepage', hpDocW.data, 'auto-seed');
      console.log('  Seeded whyToptal (5 features) into homepage document');
    }
  } catch(e) {
    console.error('  WhyToptal auto-seed failed:', e.message || e);
  }

  const server = http.createServer(async (req, res) => {
    const urlPath = req.url.split('?')[0];
    const method  = req.method;

    try {
      // ─── robots.txt — block all crawlers ─────────────────
      if (urlPath === '/robots.txt') {
        res.writeHead(200, {
          'Content-Type': 'text/plain',
          ...NOINDEX_HEADERS
        });
        res.end('User-agent: *\nDisallow: /\n');
        return;
      }

      // ─── CORS preflight ───────────────────────────────────
      if (method === 'OPTIONS' && urlPath.startsWith('/api/')) {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Credentials': 'true'
        });
        res.end();
        return;
      }


      // ═══════════════════════════════════════════════════════
      // AUTH ROUTES
      // ═══════════════════════════════════════════════════════

      // POST /api/login
      if (urlPath === '/api/login' && method === 'POST') {
        const body = await parseBody(req);
        const user = db.authenticate(body.username, body.password);
        if (!user) return json(res, 401, { ok: false, error: 'Invalid username or password' });

        const token = db.createSession(user.username);
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Set-Cookie': cookie.serialize('session', token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60,
            path: '/',
            sameSite: 'lax'
          })
        });
        res.end(JSON.stringify({ ok: true, user }));
        console.log(`  Login: ${user.username} (${user.role})`);
        return;
      }

      // POST /api/logout
      if (urlPath === '/api/logout' && method === 'POST') {
        const cookies = cookie.parse(req.headers.cookie || '');
        if (cookies.session) db.destroySession(cookies.session);
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Set-Cookie': cookie.serialize('session', '', {
            httpOnly: true,
            maxAge: 0,
            path: '/'
          })
        });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      // GET /api/me
      if (urlPath === '/api/me' && method === 'GET') {
        const user = getUser(req);
        if (!user) return json(res, 401, { ok: false, error: 'Not authenticated' });
        return json(res, 200, { ok: true, user });
      }

      // POST /api/gate — verify access keyword
      if (urlPath === '/api/gate' && method === 'POST') {
        const body = await parseBody(req);
        if (body.keyword === ACCESS_KEY) {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Set-Cookie': cookie.serialize('access_key', 'granted', {
              httpOnly: true,
              maxAge: 365 * 24 * 60 * 60,  // 1 year
              path: '/',
              sameSite: 'lax'
            })
          });
          res.end(JSON.stringify({ ok: true }));
        } else {
          json(res, 401, { ok: false, error: 'Invalid access keyword' });
        }
        return;
      }


      // ═══════════════════════════════════════════════════════
      // DOCUMENT ROUTES
      // ═══════════════════════════════════════════════════════

      // GET /api/documents — load all
      if (urlPath === '/api/documents' && method === 'GET') {
        const user = requireAuth(req, res);
        if (!user) return;
        const docs = db.getAllDocuments();
        return json(res, 200, { ok: true, documents: docs });
      }

      // GET /api/documents/:id
      let params = matchRoute('/api/documents/:id', urlPath);
      if (params && method === 'GET') {
        const user = requireAuth(req, res);
        if (!user) return;
        const doc = db.getDocument(params.id);
        if (!doc) return json(res, 404, { ok: false, error: 'Document not found' });
        return json(res, 200, { ok: true, ...doc });
      }

      // PUT /api/documents/:id
      if (params && method === 'PUT') {
        const user = requireAuth(req, res);
        if (!user) return;
        const body = await parseBody(req);
        db.saveDocument(params.id, body.data, user.username);
        return json(res, 200, { ok: true });
      }


      // ═══════════════════════════════════════════════════════
      // HISTORY ROUTES
      // ═══════════════════════════════════════════════════════

      // GET /api/history/:docId/:fieldPath
      let histParams = matchRoute('/api/history/:docId/:fieldPath', urlPath);
      if (histParams && method === 'GET') {
        const user = requireAuth(req, res);
        if (!user) return;
        const history = db.getHistory(histParams.docId, histParams.fieldPath);
        return json(res, 200, { ok: true, history });
      }

      // GET /api/history/:docId
      histParams = matchRoute('/api/history/:docId', urlPath);
      if (histParams && method === 'GET') {
        const user = requireAuth(req, res);
        if (!user) return;
        const history = db.getHistory(histParams.docId);
        return json(res, 200, { ok: true, history });
      }


      // ═══════════════════════════════════════════════════════
      // APPROVAL ROUTES
      // ═══════════════════════════════════════════════════════

      // GET /api/approval-ledger — immutable audit log of all approvals
      if (urlPath === '/api/approval-ledger' && method === 'GET') {
        const user = requireAuth(req, res);
        if (!user) return;
        const entries = db.getLedger();
        return json(res, 200, { ok: true, entries });
      }

      // GET /api/approvals/:docId
      let appParams = matchRoute('/api/approvals/:docId', urlPath);
      if (appParams && method === 'GET') {
        const user = requireAuth(req, res);
        if (!user) return;
        const approvals = db.getApprovals(appParams.docId);
        return json(res, 200, { ok: true, approvals });
      }

      // PUT /api/approvals/:docId/:fieldPath
      appParams = matchRoute('/api/approvals/:docId/:fieldPath', urlPath);
      if (appParams && method === 'PUT') {
        const user = requireAuth(req, res);
        if (!user) return;
        if (user.role !== 'supervisor') {
          return json(res, 403, { ok: false, error: 'Only supervisors can approve fields' });
        }
        const body = await parseBody(req);
        db.setApproval(appParams.docId, appParams.fieldPath, body.approved, user.username);
        // Write to immutable ledger when approving (not when un-approving)
        if (body.approved) {
          db.addLedgerEntry({
            docId: appParams.docId,
            fieldPath: appParams.fieldPath,
            pageLabel: body.pageLabel || '',
            sectionLabel: body.sectionLabel || '',
            htmlElement: body.htmlElement || '',
            content: body.content || '',
            approvedBy: user.username
          });
        }
        return json(res, 200, { ok: true });
      }


      // ═══════════════════════════════════════════════════════
      // SEO SCORE ROUTES
      // ═══════════════════════════════════════════════════════

      // GET /api/seo-scores-summary — aggregate scores for dashboard
      if (urlPath === '/api/seo-scores-summary' && method === 'GET') {
        const user = requireAuth(req, res);
        if (!user) return;
        const summary = db.getAllSeoScoresSummary();
        return json(res, 200, { ok: true, summary });
      }

      // GET /api/seo-scores/:docId — all scores for a document
      let seoScoreParams = matchRoute('/api/seo-scores/:docId', urlPath);
      if (seoScoreParams && method === 'GET') {
        const user = requireAuth(req, res);
        if (!user) return;
        const scores = db.getSeoScores(seoScoreParams.docId);
        return json(res, 200, { ok: true, scores });
      }

      // POST /api/seo-check/:docId/:fieldPath — check a field via OpenAI
      let seoCheckParams = matchRoute('/api/seo-check/:docId/:fieldPath', urlPath);
      if (seoCheckParams && method === 'POST') {
        const user = requireAuth(req, res);
        if (!user) return;

        const body = await parseBody(req);
        const { fieldContent } = body;
        const { docId, fieldPath } = seoCheckParams;

        // Resolve SEO brief from DB
        // docId pattern: 'homepage' → seo:homepage, 'subpage:ats' → seo:ats
        let seoDocId;
        if (docId === 'homepage') {
          seoDocId = 'seo:homepage';
        } else if (docId.startsWith('subpage:')) {
          seoDocId = 'seo:' + docId.replace('subpage:', '');
        } else {
          seoDocId = 'seo:' + docId;
        }

        const seoDoc = db.getDocument(seoDocId);
        const seoBrief = seoDoc ? (seoDoc.data[fieldPath] || '') : '';

        // Build page context from the SEO brief document
        let pageContext = '';
        if (seoDoc && seoDoc.data) {
          const d = seoDoc.data;
          const parts = [];
          if (docId === 'homepage') {
            parts.push('Page type: Homepage (listicle of all resume examples)');
          } else {
            const slug = docId.replace('subpage:', '');
            parts.push(`Page: ${slug} resume examples`);
            parts.push('Page type: Listicle subpage for a specific job role');
          }
          if (d.title) parts.push(`Title brief: ${d.title.substring(0, 200)}`);
          if (d.h1) parts.push(`H1 brief: ${d.h1.substring(0, 200)}`);
          pageContext = parts.join('\n');
        }

        try {
          const scores = await checkFieldSEO({
            fieldContent: fieldContent || '',
            seoBrief,
            pageContext,
            fieldPath
          });

          const contentHash = crypto.createHash('sha256')
            .update(fieldContent || '').digest('hex').substring(0, 16);

          db.setSeoScore(docId, fieldPath, scores, contentHash, user.username);

          return json(res, 200, { ok: true, scores, contentHash });
        } catch (err) {
          console.error('  SEO check error:', err.message);
          return json(res, 500, { ok: false, error: 'SEO check failed: ' + err.message });
        }
      }


      // ═══════════════════════════════════════════════════════
      // SEO AUDIT — KEYWORD COVERAGE & RUBRIC SCORE
      // ═══════════════════════════════════════════════════════

      if (urlPath === '/api/seo-audit/keyword-coverage' && method === 'GET') {
        const user = requireAuth(req, res);
        if (!user) return;
        try {
          const htmlPath = path.join(DIR, 'index.html');
          const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
          const homepageDoc = db.getDocument('homepage');
          if (!homepageDoc) return json(res, 404, { ok: false, error: 'Homepage data not found' });
          const seoGoals = homepageDoc.data.seoGoals || [];
          const result = analyzeKeywordCoverage(htmlContent, seoGoals);
          return json(res, 200, { ok: true, ...result });
        } catch (err) {
          console.error('Keyword coverage error:', err);
          return json(res, 500, { ok: false, error: err.message });
        }
      }

      if (urlPath === '/api/seo-audit/rubric-score' && method === 'GET') {
        const user = requireAuth(req, res);
        if (!user) return;
        try {
          const htmlPath = path.join(DIR, 'index.html');
          const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
          const homepageDoc = db.getDocument('homepage');
          if (!homepageDoc) return json(res, 404, { ok: false, error: 'Homepage data not found' });
          const result = await analyzeRubricScore(htmlContent, homepageDoc.data);
          return json(res, 200, { ok: true, ...result });
        } catch (err) {
          console.error('Rubric score error:', err);
          return json(res, 500, { ok: false, error: err.message });
        }
      }

      // ═══════════════════════════════════════════════════════
      // AI CONTENT SUGGESTION
      // ═══════════════════════════════════════════════════════

      // POST /api/suggest/:docId/:fieldPath — generate content suggestion via OpenAI
      let suggestParams = matchRoute('/api/suggest/:docId/:fieldPath', urlPath);
      if (suggestParams && method === 'POST') {
        const user = requireAuth(req, res);
        if (!user) return;

        const body = await parseBody(req);
        const { fieldContent } = body;
        const { docId, fieldPath } = suggestParams;

        // Resolve SEO brief (same logic as seo-check)
        let seoDocId;
        if (docId === 'homepage') {
          seoDocId = 'seo:homepage';
        } else if (docId.startsWith('subpage:')) {
          seoDocId = 'seo:' + docId.replace('subpage:', '');
        } else {
          seoDocId = 'seo:' + docId;
        }

        const seoDoc = db.getDocument(seoDocId);
        const seoBrief = seoDoc ? (seoDoc.data[fieldPath] || '') : '';

        // Build page context
        let pageContext = '';
        if (seoDoc && seoDoc.data) {
          const d = seoDoc.data;
          const parts = [];
          if (docId === 'homepage') {
            parts.push('Page type: Homepage (listicle of all resume examples)');
          } else {
            const slug = docId.replace('subpage:', '');
            parts.push(`Page: ${slug} resume examples`);
            parts.push('Page type: Listicle subpage for a specific job role');
          }
          if (d.title) parts.push(`Title brief: ${d.title.substring(0, 200)}`);
          if (d.h1) parts.push(`H1 brief: ${d.h1.substring(0, 200)}`);
          pageContext = parts.join('\n');
        }

        // Gather edit history (last 10)
        const history = db.getHistory(docId, fieldPath, 10);

        // Gather comments with role annotation
        const comments = db.getComments(docId, fieldPath);
        // Lookup user roles from seeded users
        const userRoles = { sasha: 'supervisor', alejandro: 'supervisor', john: 'supervisor', inge: 'editor', boris: 'editor' };
        const annotatedComments = comments.map(c => ({
          ...c,
          role: userRoles[c.username] || 'editor'
        }));

        try {
          const result = await suggestFieldContent({
            fieldContent: fieldContent || '',
            seoBrief,
            pageContext,
            fieldPath,
            history,
            comments: annotatedComments
          });

          return json(res, 200, { ok: true, ...result });
        } catch (err) {
          console.error('  Suggest error:', err.message);
          return json(res, 500, { ok: false, error: 'Suggestion failed: ' + err.message });
        }
      }


      // ═══════════════════════════════════════════════════════
      // COMMENT ROUTES
      // ═══════════════════════════════════════════════════════

      // GET /api/comments-all — global feed of all comments across all docs
      if (urlPath === '/api/comments-all' && method === 'GET') {
        const user = requireAuth(req, res);
        if (!user) return;
        const comments = db.getAllCommentsGlobal();
        return json(res, 200, { ok: true, comments });
      }

      // GET /api/comments/:docId/:fieldPath — comments for a specific field
      let commentParams2 = matchRoute('/api/comments/:docId/:fieldPath', urlPath);
      if (commentParams2 && method === 'GET') {
        const user = requireAuth(req, res);
        if (!user) return;
        const comments = db.getComments(commentParams2.docId, commentParams2.fieldPath);
        return json(res, 200, { ok: true, comments });
      }

      // POST /api/comments/:docId/:fieldPath — add a comment
      if (commentParams2 && method === 'POST') {
        const user = requireAuth(req, res);
        if (!user) return;
        const body = await parseBody(req);
        if (!body.comment || !body.comment.trim()) {
          return json(res, 400, { ok: false, error: 'Comment text is required' });
        }
        const id = db.addComment(commentParams2.docId, commentParams2.fieldPath, user.username, body.comment.trim());
        return json(res, 200, { ok: true, id, username: user.username });
      }

      // GET /api/comments/:docId — all comments + counts for a document (feed)
      let commentParams1 = matchRoute('/api/comments/:docId', urlPath);
      if (commentParams1 && method === 'GET') {
        const user = requireAuth(req, res);
        if (!user) return;
        const comments = db.getAllComments(commentParams1.docId);
        const counts = db.getCommentCounts(commentParams1.docId);
        return json(res, 200, { ok: true, comments, counts });
      }

      // PUT /api/comments/:commentId/done — toggle done status
      const doneMatch = urlPath.match(/^\/api\/comments\/(\d+)\/done$/);
      if (doneMatch && method === 'PUT') {
        const user = requireAuth(req, res);
        if (!user) return;
        const result = db.toggleCommentDone(parseInt(doneMatch[1]));
        return json(res, 200, result);
      }

      // DELETE /api/comments/:commentId — delete a comment
      if (commentParams1 && method === 'DELETE') {
        const user = requireAuth(req, res);
        if (!user) return;
        const result = db.deleteComment(
          parseInt(commentParams1.docId),
          user.username,
          user.role
        );
        if (!result.ok) return json(res, 403, result);
        return json(res, 200, { ok: true });
      }


      // ═══════════════════════════════════════════════════════
      // REVIEWER MANAGEMENT ROUTES (CMS auth)
      // ═══════════════════════════════════════════════════════

      // GET /api/reviewers — list all reviewers
      if (urlPath === '/api/reviewers' && method === 'GET') {
        const user = requireAuth(req, res);
        if (!user) return;
        const reviewers = db.getAllReviewers();
        return json(res, 200, { ok: true, reviewers });
      }

      // POST /api/reviewers — create a reviewer
      if (urlPath === '/api/reviewers' && method === 'POST') {
        const user = requireAuth(req, res);
        if (!user) return;
        const body = await parseBody(req);
        const { full_name, email, linkedin, bio } = body;
        if (!full_name || !email) {
          return json(res, 400, { ok: false, error: 'Name and email are required' });
        }
        // Validate email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return json(res, 400, { ok: false, error: 'Invalid email format' });
        }
        // Validate bio word count if provided (50-100 words)
        if (bio && bio.trim()) {
          const wordCount = bio.trim().split(/\s+/).length;
          if (wordCount < 50 || wordCount > 100) {
            return json(res, 400, { ok: false, error: `Bio must be 50-100 words (currently ${wordCount})` });
          }
        }
        try {
          const token = db.createReviewer(full_name, email, linkedin || '', bio || '', user.username);
          return json(res, 200, { ok: true, token });
        } catch (e) {
          if (e.message && e.message.includes('UNIQUE')) {
            return json(res, 400, { ok: false, error: 'A reviewer with this email already exists' });
          }
          throw e;
        }
      }

      // POST /api/reviewers/:id/regenerate-token
      let regenParams = matchRoute('/api/reviewers/:id/regenerate-token', urlPath);
      if (regenParams && method === 'POST') {
        const user = requireAuth(req, res);
        if (!user) return;
        const token = db.regenerateReviewerToken(parseInt(regenParams.id));
        return json(res, 200, { ok: true, token });
      }

      // PUT /api/reviewers/:id — update reviewer
      let reviewerParams = matchRoute('/api/reviewers/:id', urlPath);
      if (reviewerParams && method === 'PUT') {
        const user = requireAuth(req, res);
        if (!user) return;
        const body = await parseBody(req);
        if (body.bio) {
          const wordCount = body.bio.trim().split(/\s+/).length;
          if (wordCount < 50 || wordCount > 100) {
            return json(res, 400, { ok: false, error: `Bio must be 50-100 words (currently ${wordCount})` });
          }
        }
        db.updateReviewer(parseInt(reviewerParams.id), body);
        return json(res, 200, { ok: true });
      }

      // DELETE /api/reviewers/:id — deactivate reviewer
      if (reviewerParams && method === 'DELETE') {
        const user = requireAuth(req, res);
        if (!user) return;
        db.deactivateReviewer(parseInt(reviewerParams.id));
        return json(res, 200, { ok: true });
      }


      // ═══════════════════════════════════════════════════════
      // EXPERT REVIEW ROUTES (CMS auth)
      // ═══════════════════════════════════════════════════════

      // GET /api/expert-reviews/:docId/:fieldPath — reviews for a specific field
      let erParams2 = matchRoute('/api/expert-reviews/:docId/:fieldPath', urlPath);
      if (erParams2 && method === 'GET') {
        const user = requireAuth(req, res);
        if (!user) return;
        const reviews = db.getExpertReviews(erParams2.docId, erParams2.fieldPath);
        return json(res, 200, { ok: true, reviews });
      }

      // GET /api/expert-reviews/:docId — all reviews + counts for a document
      let erParams1 = matchRoute('/api/expert-reviews/:docId', urlPath);
      if (erParams1 && method === 'GET') {
        const user = requireAuth(req, res);
        if (!user) return;
        const reviews = db.getAllExpertReviews(erParams1.docId);
        const counts = db.getExpertReviewCounts(erParams1.docId);
        return json(res, 200, { ok: true, reviews, counts });
      }

      // DELETE /api/expert-reviews/:reviewId — delete a review (supervisor only)
      if (erParams1 && method === 'DELETE') {
        const user = requireAuth(req, res);
        if (!user) return;
        if (user.role !== 'supervisor') {
          return json(res, 403, { ok: false, error: 'Only supervisors can delete expert reviews' });
        }
        db.deleteExpertReview(parseInt(erParams1.docId));
        return json(res, 200, { ok: true });
      }


      // ═══════════════════════════════════════════════════════
      // TOKEN-AUTH REVIEW ROUTES (public, token validates reviewer)
      // ═══════════════════════════════════════════════════════

      // GET /api/review-data/:token — homepage data + reviewer info
      let reviewDataParams = matchRoute('/api/review-data/:token', urlPath);
      if (reviewDataParams && method === 'GET') {
        const reviewer = db.getReviewerByToken(reviewDataParams.token);
        if (!reviewer) return json(res, 401, { ok: false, error: 'Invalid or inactive review link' });
        const doc = db.getDocument('homepage');
        if (!doc) return json(res, 404, { ok: false, error: 'Homepage data not found' });
        return json(res, 200, {
          ok: true,
          reviewer: { id: reviewer.id, full_name: reviewer.full_name },
          data: doc.data
        });
      }

      // POST /api/review-submit/:token — submit a review
      let reviewSubmitParams = matchRoute('/api/review-submit/:token', urlPath);
      if (reviewSubmitParams && method === 'POST') {
        const reviewer = db.getReviewerByToken(reviewSubmitParams.token);
        if (!reviewer) return json(res, 401, { ok: false, error: 'Invalid or inactive review link' });
        const body = await parseBody(req);
        const { docId, fieldPath, review, sources } = body;
        if (!docId || !fieldPath || !review || !review.trim()) {
          return json(res, 400, { ok: false, error: 'docId, fieldPath, and review are required' });
        }
        const id = db.addExpertReview(docId, fieldPath, reviewer.id, review.trim(), sources || []);
        return json(res, 200, { ok: true, id });
      }

      // GET /api/review-comments/:token/:docId — this reviewer's existing reviews
      let reviewCommentsParams = matchRoute('/api/review-comments/:token/:docId', urlPath);
      if (reviewCommentsParams && method === 'GET') {
        const reviewer = db.getReviewerByToken(reviewCommentsParams.token);
        if (!reviewer) return json(res, 401, { ok: false, error: 'Invalid or inactive review link' });
        const reviews = db.getExpertReviewsByReviewer(reviewer.id, reviewCommentsParams.docId);
        return json(res, 200, { ok: true, reviews });
      }


      // ═══════════════════════════════════════════════════════
      // SNAPSHOT ROUTES
      // ═══════════════════════════════════════════════════════

      // GET /api/snapshots
      if (urlPath === '/api/snapshots' && method === 'GET') {
        const user = requireAuth(req, res);
        if (!user) return;
        const snapshots = db.listSnapshots();
        return json(res, 200, { ok: true, snapshots });
      }

      // POST /api/snapshots
      if (urlPath === '/api/snapshots' && method === 'POST') {
        const user = requireAuth(req, res);
        if (!user) return;
        const body = await parseBody(req);
        db.createSnapshot(body.name || 'Manual snapshot', user.username);
        return json(res, 200, { ok: true });
      }

      // POST /api/snapshots/:id/restore
      let snapParams = matchRoute('/api/snapshots/:id/restore', urlPath);
      if (snapParams && method === 'POST') {
        const user = requireAuth(req, res);
        if (!user) return;
        if (user.role !== 'supervisor') {
          return json(res, 403, { ok: false, error: 'Only supervisors can restore snapshots' });
        }
        const ok = db.restoreSnapshot(parseInt(snapParams.id));
        if (!ok) return json(res, 404, { ok: false, error: 'Snapshot not found' });
        return json(res, 200, { ok: true });
      }


      // ═══════════════════════════════════════════════════════
      // APPLY PIPELINE
      // ═══════════════════════════════════════════════════════

      // POST /api/apply-homepage
      if (urlPath === '/api/apply-homepage' && method === 'POST') {
        const user = requireAuth(req, res);
        if (!user) return;

        // Auto-snapshot before applying
        db.createSnapshot('Auto: before apply homepage', user.username);

        // Get homepage data from DB
        const homepageDoc = db.getDocument('homepage');
        if (!homepageDoc) return json(res, 404, { ok: false, error: 'Homepage data not found in database' });

        // Enrich homepage data with card descriptions from subpage documents
        const allDocsForCards = db.getAllDocuments();
        const _cardDescriptions = {};
        const _cardExampleCounts = {};
        for (const [id, doc] of Object.entries(allDocsForCards)) {
          if (id.startsWith('subpage:')) {
            const slug = id.replace('subpage:', '');
            _cardDescriptions[slug] = doc.data.cardDescription || '';
            _cardExampleCounts[slug] = (doc.data.exampleIds || doc.data.examples || []).length || 6;
          }
        }
        homepageDoc.data._cardDescriptions = _cardDescriptions;
        homepageDoc.data._cardExampleCounts = _cardExampleCounts;

        // Write homepage-data.json
        const jsonPath = path.join(DIR, 'homepage-data.json');
        fs.writeFileSync(jsonPath, JSON.stringify(homepageDoc.data, null, 2), 'utf-8');

        // Run generate-homepage.js
        const output = execSync('node generate-homepage.js', {
          cwd: DIR,
          encoding: 'utf-8',
          timeout: 10000
        });

        json(res, 200, { ok: true, output });
        console.log(`  Homepage applied by ${user.username}`);
        return;
      }

      // POST /api/apply-pages
      if (urlPath === '/api/apply-pages' && method === 'POST') {
        const user = requireAuth(req, res);
        if (!user) return;

        // Auto-snapshot before applying
        db.createSnapshot('Auto: before apply pages', user.username);

        // Get examples and all subpages from DB
        const examplesDoc = db.getDocument('examples');
        const allDocs = db.getAllDocuments();

        // Reconstruct page-data.js from database documents
        const subpages = {};
        for (const [id, doc] of Object.entries(allDocs)) {
          if (id.startsWith('subpage:')) {
            const slug = id.replace('subpage:', '');
            subpages[slug] = doc.data;
          }
        }

        // Build the page-data.js content
        // Load existing page-data.js to understand the format
        let pageDataContent = 'const PAGE_DATA = ' + JSON.stringify(Object.values(subpages), null, 2) + ';\n\nmodule.exports = PAGE_DATA;\n';

        // Write page-data.js
        const jsPath = path.join(DIR, 'page-data.js');
        fs.writeFileSync(jsPath, pageDataContent, 'utf-8');

        // Run generate-pages.js
        const output = execSync('node generate-pages.js', {
          cwd: DIR,
          encoding: 'utf-8',
          timeout: 30000
        });

        json(res, 200, { ok: true, output });
        console.log(`  Pages applied by ${user.username}`);
        return;
      }


      // ═══════════════════════════════════════════════════════
      // SURVEYS
      // ═══════════════════════════════════════════════════════

      // GET /api/surveys — list all surveys (CMS auth)
      if (urlPath === '/api/surveys' && method === 'GET') {
        const user = requireAuth(req, res);
        if (!user) return;
        const surveys = db.listSurveys();
        for (const s of surveys) {
          s.responseCount = db.getSurveyResponseCount(s.id);
        }
        return json(res, 200, { ok: true, surveys });
      }

      // GET /api/surveys/:id — get survey (public, for the survey form)
      if (matchRoute('/api/surveys/:id', urlPath) && method === 'GET') {
        const { id } = matchRoute('/api/surveys/:id', urlPath);
        const survey = db.getSurvey(id);
        if (!survey) return json(res, 404, { ok: false, error: 'Survey not found' });
        if (!survey.active) return json(res, 403, { ok: false, error: 'This survey is no longer accepting responses' });
        return json(res, 200, { ok: true, survey });
      }

      // POST /api/surveys — create survey (CMS auth)
      if (urlPath === '/api/surveys' && method === 'POST') {
        const user = requireAuth(req, res);
        if (!user) return;
        const body = await parseBody(req);
        if (!body.id || !body.title || !body.questions) {
          return json(res, 400, { ok: false, error: 'Missing id, title, or questions' });
        }
        db.createSurvey(body.id, body.title, body.description || '', body.questions, user.username);
        return json(res, 200, { ok: true });
      }

      // PUT /api/surveys/:id — update survey (CMS auth)
      if (matchRoute('/api/surveys/:id', urlPath) && method === 'PUT') {
        const user = requireAuth(req, res);
        if (!user) return;
        const { id } = matchRoute('/api/surveys/:id', urlPath);
        const body = await parseBody(req);
        const updated = db.updateSurvey(id, body);
        if (!updated) return json(res, 404, { ok: false, error: 'Survey not found' });
        return json(res, 200, { ok: true, survey: updated });
      }

      // GET /api/survey-responses/:surveyId — get responses (CMS auth)
      if (matchRoute('/api/survey-responses/:surveyId', urlPath) && method === 'GET') {
        const user = requireAuth(req, res);
        if (!user) return;
        const { surveyId } = matchRoute('/api/survey-responses/:surveyId', urlPath);
        const responses = db.getSurveyResponses(surveyId);
        return json(res, 200, { ok: true, responses });
      }

      // POST /api/survey-responses/:surveyId — submit response (public)
      if (matchRoute('/api/survey-responses/:surveyId', urlPath) && method === 'POST') {
        const { surveyId } = matchRoute('/api/survey-responses/:surveyId', urlPath);
        const survey = db.getSurvey(surveyId);
        if (!survey) return json(res, 404, { ok: false, error: 'Survey not found' });
        if (!survey.active) return json(res, 403, { ok: false, error: 'This survey is no longer accepting responses' });
        const body = await parseBody(req);
        if (!body.name || !body.email || !body.position) {
          return json(res, 400, { ok: false, error: 'Name, email, and position are required' });
        }
        // Duplicate check
        if (db.checkSurveyEmailExists(surveyId, body.email)) {
          return json(res, 409, { ok: false, error: 'A response from this email has already been submitted' });
        }
        db.submitSurveyResponse(surveyId, body.name, body.email.toLowerCase().trim(), body.position, body.answers || {});
        return json(res, 200, { ok: true });
      }


      // ═══════════════════════════════════════════════════════
      // ACCESS GATE & STATIC FILE SERVING
      // ═══════════════════════════════════════════════════════

      // Serve gate.html
      if (urlPath === '/gate' || urlPath === '/gate/') {
        const gatePath = path.join(DIR, 'gate.html');
        fs.readFile(gatePath, (err, data) => {
          if (err) { res.writeHead(404); res.end('Not Found'); return; }
          res.writeHead(200, {
            'Content-Type': 'text/html',
            ...NOINDEX_HEADERS
          });
          res.end(data);
        });
        return;
      }

      // ─── Access gate check for public pages ────────────────
      // Exempt: /api/*, /login*, /cms*, /gate*, and non-HTML assets
      {
        const isApi = urlPath.startsWith('/api/');
        const isLogin = urlPath === '/login' || urlPath.startsWith('/login/');
        const isCms = urlPath === '/cms' || urlPath.startsWith('/cms/');
        const isGate = urlPath === '/gate' || urlPath.startsWith('/gate/');
        const isRobots = urlPath === '/robots.txt';
        const ext = path.extname(urlPath);
        const isStaticAsset = ext && ext !== '.html';  // .css, .js, .png, etc.

        const isReview = urlPath.startsWith('/review/');
        const isSurvey = urlPath.startsWith('/survey/');
        const isExempt = isApi || isLogin || isCms || isGate || isRobots || isStaticAsset || isReview || isSurvey;

        if (!isExempt) {
          // Check for CMS session cookie (editors/supervisors bypass gate)
          const cookies = cookie.parse(req.headers.cookie || '');
          const hasSession = db.validateSession(cookies.session);
          const hasAccessKey = cookies.access_key === 'granted';

          if (!hasSession && !hasAccessKey) {
            const redirect = urlPath === '/' ? '' : `?redirect=${encodeURIComponent(urlPath)}`;
            res.writeHead(302, { 'Location': '/gate' + redirect });
            res.end();
            return;
          }
        }
      }

      // SEO Content Outline — dynamic generation from index.html
      if (urlPath === '/outline' || urlPath === '/outline/') {
        const indexPath = path.join(DIR, 'index.html');
        const dataPath = path.join(DIR, 'homepage-data.json');
        // Parse ?phase= query parameter
        const qs = (req.url.split('?')[1] || '');
        const phaseParam = parseInt((qs.match(/phase=(\d)/) || [])[1]) || 0;
        fs.readFile(indexPath, 'utf8', (err, indexHtml) => {
          if (err) { res.writeHead(500); res.end('Error reading index.html'); return; }
          let phaseData = { _phases: {}, _currentPhase: 1, _filterPhase: phaseParam };
          try {
            const raw = fs.readFileSync(dataPath, 'utf8');
            const d = JSON.parse(raw);
            phaseData._phases = d._phases || {};
            phaseData._currentPhase = d._currentPhase || 1;
            phaseData._filterPhase = phaseParam;
          } catch (e2) { /* ignore — use defaults */ }
          try {
            const outlineHtml = generateOutline(indexHtml, phaseData);
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...NOINDEX_HEADERS });
            res.end(outlineHtml);
          } catch (e) {
            res.writeHead(500); res.end('Error generating outline: ' + e.message);
          }
        });
        return;
      }

      // Redirect /cms to cms.html (require auth)
      if (urlPath === '/cms' || urlPath === '/cms/') {
        const user = getUser(req);
        if (!user) {
          res.writeHead(302, { 'Location': '/login' });
          res.end();
          return;
        }
        // Serve cms.html
        const cmsPath = path.join(DIR, 'cms.html');
        fs.readFile(cmsPath, (err, data) => {
          if (err) { res.writeHead(404); res.end('Not Found'); return; }
          res.writeHead(200, { 'Content-Type': 'text/html', ...NOINDEX_HEADERS });
          res.end(data);
        });
        return;
      }

      // Redirect /login to login.html
      if (urlPath === '/login' || urlPath === '/login/') {
        const loginPath = path.join(DIR, 'login.html');
        fs.readFile(loginPath, (err, data) => {
          if (err) { res.writeHead(404); res.end('Not Found'); return; }
          res.writeHead(200, { 'Content-Type': 'text/html', ...NOINDEX_HEADERS });
          res.end(data);
        });
        return;
      }

      // Serve review.html for /review/:token
      if (matchRoute('/review/:token', urlPath)) {
        const reviewPath = path.join(DIR, 'review.html');
        fs.readFile(reviewPath, (err, data) => {
          if (err) { res.writeHead(404); res.end('Not Found'); return; }
          res.writeHead(200, { 'Content-Type': 'text/html', ...NOINDEX_HEADERS });
          res.end(data);
        });
        return;
      }

      // Serve survey.html for /survey/:id
      if (matchRoute('/survey/:id', urlPath)) {
        const surveyPath = path.join(DIR, 'survey.html');
        fs.readFile(surveyPath, (err, data) => {
          if (err) { res.writeHead(404); res.end('Not Found'); return; }
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(data);
        });
        return;
      }

      // ─── General static file serving ────────────────────────
      let filePath = path.join(DIR, urlPath === '/' ? 'index.html' : urlPath);
      let ext = path.extname(filePath);

      // Extensionless URL resolution
      if (!ext) {
        const tryIndex = path.join(filePath, 'index.html');
        const tryHtml  = filePath + '.html';
        if (fs.existsSync(tryIndex)) { filePath = tryIndex; ext = '.html'; }
        else if (fs.existsSync(tryHtml)) { filePath = tryHtml; ext = '.html'; }
      }

      const contentType = MIME[ext] || 'application/octet-stream';

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        // Add noindex headers to all HTML responses
        const headers = { 'Content-Type': contentType };
        if (ext === '.html') {
          Object.assign(headers, NOINDEX_HEADERS);
        }
        res.writeHead(200, headers);
        res.end(data);
      });

    } catch (err) {
      console.error('  Server error:', err.message);
      json(res, 500, { ok: false, error: err.message });
    }
  });

  server.listen(PORT, () => {
    console.log(`\n  Server running at http://localhost:${PORT}`);
    console.log(`  CMS:   http://localhost:${PORT}/cms`);
    console.log(`  Login: http://localhost:${PORT}/login\n`);

    // ─── Ensure all users exist ─────────────────────────────────
    try {
      db.createUser('andy', 'toptal2024', 'Andy', 'supervisor');
      console.log('  ✅ Ensured user: andy (supervisor)');
    } catch (e) { /* already exists */ }

    // ─── Auto-apply homepage & pages on startup ────────────────
    // This ensures that after each deploy, index.html and subpages
    // are regenerated from the DB (not stale git versions).
    try {
      const homepageDoc = db.getDocument('homepage');
      if (homepageDoc) {
        const allDocs = db.getAllDocuments();
        const _cardDescriptions = {};
        const _cardExampleCounts = {};
        for (const [id, doc] of Object.entries(allDocs)) {
          if (id.startsWith('subpage:')) {
            const slug = id.replace('subpage:', '');
            _cardDescriptions[slug] = doc.data.cardDescription || '';
            _cardExampleCounts[slug] = (doc.data.exampleIds || doc.data.examples || []).length || 6;
          }
        }
        homepageDoc.data._cardDescriptions = _cardDescriptions;
        homepageDoc.data._cardExampleCounts = _cardExampleCounts;
        const jsonPath = path.join(DIR, 'homepage-data.json');
        fs.writeFileSync(jsonPath, JSON.stringify(homepageDoc.data, null, 2), 'utf-8');
        execSync('node generate-homepage.js', { cwd: DIR, encoding: 'utf-8', timeout: 15000 });
        console.log('  ✅ Auto-applied homepage from DB');
      }
    } catch (err) {
      console.error('  ⚠️  Auto-apply homepage failed:', err.message);
    }

    try {
      const allDocs = db.getAllDocuments();
      const subpages = {};
      for (const [id, doc] of Object.entries(allDocs)) {
        if (id.startsWith('subpage:')) {
          const slug = id.replace('subpage:', '');
          subpages[slug] = doc.data;
        }
      }
      if (Object.keys(subpages).length) {
        const jsPath = path.join(DIR, 'page-data.js');
        fs.writeFileSync(jsPath, 'const PAGE_DATA = ' + JSON.stringify(Object.values(subpages), null, 2) + ';\n\nmodule.exports = PAGE_DATA;\n', 'utf-8');
        execSync('node generate-pages.js', { cwd: DIR, encoding: 'utf-8', timeout: 30000 });
        console.log('  ✅ Auto-applied subpages from DB');
      }
    } catch (err) {
      console.error('  ⚠️  Auto-apply pages failed:', err.message);
    }
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
