/**
 * Sub-Page Generator for Resume Examples
 * Generates individual showcase pages from page-data.js
 *
 * Usage: node generate-pages.js
 */

const fs = require('fs');
const path = require('path');
const pages = require('./page-data.js');

const DIR = __dirname;

// ══════════════════════════════════════════════════════
//  RESUME MOCK WIREFRAME VARIATIONS
// ══════════════════════════════════════════════════════

function getResumeMockHtml(variation, experienceLevel, industry) {
  if (industry === 'two-col') {
    if (variation === 5) {
      // Two-column with photo
      return `<div class="resume-mock two-col">
                <div class="rm-sidebar">
                  <div class="rm-photo" style="width:36px;height:36px;border-radius:50%;margin-bottom:8%;"></div>
                  <div class="rm-name" style="width:80%;height:7px;margin-bottom:5px;"></div>
                  <div class="rm-title" style="width:60%;height:4px;margin-bottom:12%;"></div>
                  <div class="rm-section-title" style="width:50%;height:4px;margin-bottom:5px;margin-top:0;"></div>
                  <div class="rm-line" style="width:90%;"></div>
                  <div class="rm-line" style="width:75%;"></div>
                  <div class="rm-line" style="width:85%;"></div>
                  <div class="rm-section-title" style="width:45%;height:4px;margin-bottom:5px;"></div>
                  <div class="rm-line" style="width:80%;"></div>
                  <div class="rm-line" style="width:70%;"></div>
                </div>
                <div class="rm-main">
                  <div class="rm-section-title" style="margin-top:0;"></div>
                  <div class="rm-line" style="width:95%;"></div>
                  <div class="rm-line" style="width:88%;"></div>
                  <div class="rm-line" style="width:92%;"></div>
                  <div class="rm-line" style="width:80%;"></div>
                  <div class="rm-section-title"></div>
                  <div class="rm-line" style="width:90%;"></div>
                  <div class="rm-line" style="width:85%;"></div>
                  <div class="rm-line" style="width:95%;"></div>
                  <div class="rm-section-title"></div>
                  <div class="rm-line" style="width:88%;"></div>
                  <div class="rm-line" style="width:75%;"></div>
                </div>
              </div>`;
    }
    if (variation === 7) {
      // Creative two-column (wide sidebar)
      return `<div class="resume-mock two-col">
                <div class="rm-sidebar" style="width:40%;">
                  <div class="rm-name" style="width:85%;height:8px;margin-bottom:5px;"></div>
                  <div class="rm-title" style="width:65%;height:4px;margin-bottom:12%;"></div>
                  <div class="rm-section-title" style="width:55%;height:4px;margin-bottom:5px;margin-top:0;"></div>
                  <div class="rm-line" style="width:90%;"></div>
                  <div class="rm-line" style="width:80%;"></div>
                  <div class="rm-line" style="width:85%;"></div>
                  <div class="rm-section-title" style="width:50%;height:4px;margin-bottom:5px;"></div>
                  <div class="rm-line" style="width:75%;"></div>
                  <div class="rm-line" style="width:90%;"></div>
                  <div class="rm-section-title" style="width:45%;height:4px;margin-bottom:5px;"></div>
                  <div class="rm-line" style="width:80%;"></div>
                  <div class="rm-line" style="width:70%;"></div>
                </div>
                <div class="rm-main">
                  <div class="rm-section-title" style="margin-top:0;"></div>
                  <div class="rm-line" style="width:92%;"></div>
                  <div class="rm-line" style="width:88%;"></div>
                  <div class="rm-line" style="width:95%;"></div>
                  <div class="rm-line" style="width:82%;"></div>
                  <div class="rm-section-title"></div>
                  <div class="rm-line" style="width:90%;"></div>
                  <div class="rm-line" style="width:86%;"></div>
                  <div class="rm-line" style="width:78%;"></div>
                  <div class="rm-section-title"></div>
                  <div class="rm-line" style="width:88%;"></div>
                  <div class="rm-line" style="width:92%;"></div>
                </div>
              </div>`;
    }
    // variation 4: standard two-column
    return `<div class="resume-mock two-col">
              <div class="rm-sidebar">
                <div class="rm-name" style="width:80%;height:7px;margin-bottom:5px;"></div>
                <div class="rm-title" style="width:60%;height:4px;margin-bottom:12%;"></div>
                <div class="rm-section-title" style="width:50%;height:4px;margin-bottom:5px;margin-top:0;"></div>
                <div class="rm-line" style="width:85%;"></div>
                <div class="rm-line" style="width:75%;"></div>
                <div class="rm-line" style="width:90%;"></div>
                <div class="rm-section-title" style="width:45%;height:4px;margin-bottom:5px;"></div>
                <div class="rm-line" style="width:80%;"></div>
                <div class="rm-line" style="width:70%;"></div>
              </div>
              <div class="rm-main">
                <div class="rm-section-title" style="margin-top:0;"></div>
                <div class="rm-line" style="width:95%;"></div>
                <div class="rm-line" style="width:88%;"></div>
                <div class="rm-line" style="width:92%;"></div>
                <div class="rm-section-title"></div>
                <div class="rm-line" style="width:90%;"></div>
                <div class="rm-line" style="width:85%;"></div>
                <div class="rm-line" style="width:78%;"></div>
                <div class="rm-section-title"></div>
                <div class="rm-line" style="width:88%;"></div>
                <div class="rm-line" style="width:75%;"></div>
              </div>
            </div>`;
  }

  // Single-column variations
  switch (variation) {
    case 2: // Centered
      return `<div class="resume-mock" style="text-align:center;align-items:center;">
                <div class="rm-name" style="width:50%;height:8px;margin:0 auto 6px;"></div>
                <div class="rm-title" style="width:35%;height:5px;margin:0 auto 4px;"></div>
                <div class="rm-divider"></div>
                <div class="rm-section-title" style="width:25%;margin:8px auto 6px;"></div>
                <div class="rm-line" style="width:90%;margin:0 auto 5px;"></div>
                <div class="rm-line" style="width:85%;margin:0 auto 5px;"></div>
                <div class="rm-line" style="width:88%;margin:0 auto 5px;"></div>
                <div class="rm-section-title" style="width:28%;margin:8px auto 6px;"></div>
                <div class="rm-line" style="width:92%;margin:0 auto 5px;"></div>
                <div class="rm-line" style="width:80%;margin:0 auto 5px;"></div>
                <div class="rm-line" style="width:86%;margin:0 auto 5px;"></div>
                <div class="rm-section-title" style="width:22%;margin:8px auto 6px;"></div>
                <div class="rm-line" style="width:78%;margin:0 auto 5px;"></div>
                <div class="rm-line" style="width:84%;margin:0 auto 5px;"></div>
              </div>`;
    case 3: // Minimal
      return `<div class="resume-mock">
                <div class="rm-name" style="width:45%;height:7px;margin-bottom:4px;"></div>
                <div class="rm-title" style="width:30%;height:4px;margin-bottom:4px;"></div>
                <div style="height:1px;background:#e5e7eb;margin:8px 0 12px;"></div>
                <div class="rm-section-title" style="width:25%;margin-top:0;"></div>
                <div class="rm-line" style="width:95%;"></div>
                <div class="rm-line" style="width:88%;"></div>
                <div class="rm-line" style="width:92%;"></div>
                <div style="height:10px;"></div>
                <div class="rm-section-title" style="width:28%;"></div>
                <div class="rm-line" style="width:90%;"></div>
                <div class="rm-line" style="width:82%;"></div>
                <div style="height:10px;"></div>
                <div class="rm-section-title" style="width:20%;"></div>
                <div class="rm-line" style="width:85%;"></div>
                <div class="rm-line" style="width:78%;"></div>
              </div>`;
    case 6: // Header-bar
      return `<div class="resume-mock" style="padding:0;">
                <div style="padding:8% 12% 6%;border-radius:2px 2px 0 0;">
                  <div class="rm-name" style="width:55%;height:8px;margin-bottom:5px;"></div>
                  <div class="rm-title" style="width:40%;height:4px;margin-bottom:0;"></div>
                </div>
                <div class="rm-divider" style="margin:0;"></div>
                <div style="padding:6% 12% 10%;">
                  <div class="rm-section-title" style="margin-top:4px;"></div>
                  <div class="rm-line" style="width:95%;"></div>
                  <div class="rm-line" style="width:88%;"></div>
                  <div class="rm-line" style="width:92%;"></div>
                  <div class="rm-section-title"></div>
                  <div class="rm-line" style="width:85%;"></div>
                  <div class="rm-line" style="width:90%;"></div>
                  <div class="rm-line" style="width:78%;"></div>
                  <div class="rm-section-title"></div>
                  <div class="rm-line" style="width:88%;"></div>
                  <div class="rm-line" style="width:82%;"></div>
                </div>
              </div>`;
    case 8: // Dense (experienced/two-page)
      return `<div class="resume-mock">
                <div class="rm-name" style="width:55%;height:7px;margin-bottom:4px;"></div>
                <div class="rm-title" style="width:40%;height:4px;margin-bottom:3px;"></div>
                <div class="rm-line" style="width:70%;height:2px;margin-bottom:3px;"></div>
                <div class="rm-divider" style="margin:3px 0 5px;"></div>
                <div class="rm-section-title" style="margin-top:2px;margin-bottom:4px;"></div>
                <div class="rm-line" style="width:95%;margin-bottom:3px;"></div>
                <div class="rm-line" style="width:88%;margin-bottom:3px;"></div>
                <div class="rm-line" style="width:92%;margin-bottom:3px;"></div>
                <div class="rm-line" style="width:85%;margin-bottom:3px;"></div>
                <div class="rm-section-title" style="margin-bottom:4px;"></div>
                <div class="rm-line" style="width:90%;margin-bottom:3px;"></div>
                <div class="rm-line" style="width:86%;margin-bottom:3px;"></div>
                <div class="rm-line" style="width:92%;margin-bottom:3px;"></div>
                <div class="rm-line" style="width:80%;margin-bottom:3px;"></div>
                <div class="rm-section-title" style="margin-bottom:4px;"></div>
                <div class="rm-line" style="width:88%;margin-bottom:3px;"></div>
                <div class="rm-line" style="width:82%;margin-bottom:3px;"></div>
                <div class="rm-line" style="width:90%;margin-bottom:3px;"></div>
              </div>`;
    default: // variation 1: Standard single-column
      return `<div class="resume-mock">
                <div class="rm-name" style="width:60%;height:8px;margin-bottom:6px;"></div>
                <div class="rm-title" style="width:40%;height:5px;margin-bottom:4px;"></div>
                <div class="rm-divider"></div>
                <div class="rm-section-title"></div>
                <div class="rm-line" style="width:95%;"></div>
                <div class="rm-line" style="width:88%;"></div>
                <div class="rm-line" style="width:92%;"></div>
                <div class="rm-section-title"></div>
                <div class="rm-line" style="width:90%;"></div>
                <div class="rm-line" style="width:85%;"></div>
                <div class="rm-line" style="width:78%;"></div>
                <div class="rm-section-title"></div>
                <div class="rm-line" style="width:88%;"></div>
                <div class="rm-line" style="width:82%;"></div>
              </div>`;
  }
}

// ══════════════════════════════════════════════════════
//  BADGE HTML HELPER
// ══════════════════════════════════════════════════════

function getBadgesHtml(badges) {
  if (!badges || badges.length === 0) return '';
  const badgeMap = {
    'ats': '<span class="card-badge ats"><i data-lucide="shield-check" style="width:10px;height:10px;"></i> ATS</span>',
    'popular': '<span class="card-badge popular"><i data-lucide="trending-up" style="width:10px;height:10px;"></i> Popular</span>',
    'free': '<span class="card-badge free"><i data-lucide="gift" style="width:10px;height:10px;"></i> Free</span>',
    'builder-only': '<span class="card-badge builder-only"><i data-lucide="lock" style="width:10px;height:10px;"></i> Builder</span>',
  };
  return `<div class="card-badges">${badges.map(b => badgeMap[b] || '').join('\n              ')}</div>`;
}

// ══════════════════════════════════════════════════════
//  EXAMPLE CARD HTML
// ══════════════════════════════════════════════════════

function getExampleCardHtml(card) {
  const mockHtml = getResumeMockHtml(card.mockVariation || 1, card.experienceLevel, card.industry);
  const badgesHtml = getBadgesHtml(card.badges);
  const tagsHtml = (card.tags || []).map(t => `<span class="example-card-tag">${t}</span>`).join('\n                ');

  return `<div class="example-card" data-style="${card.experienceLevel}">
            <div class="example-card-preview">
              ${badgesHtml}
              ${mockHtml}
              <div class="example-card-overlay">
                <button class="btn btn-primary">Preview Example</button>
                <button class="btn btn-white">Customize</button>
              </div>
            </div>
            <div class="example-card-info">
              <div class="example-card-name">${card.name}</div>
              <div class="example-card-description">${card.description}</div>
              <div class="example-card-meta">
                ${tagsHtml}
              </div>
            </div>
          </div>`;
}

// ══════════════════════════════════════════════════════
//  RELATED RESUME EXAMPLES SECTION
// ══════════════════════════════════════════════════════

function getRelatedHtml(page, allPages) {
  const related = (page.relatedSlugs || [])
    .map(slug => allPages.find(p => p.slug === slug))
    .filter(Boolean)
    .slice(0, 5);

  if (related.length === 0) return '';

  const cards = related.map(r => {
    const url = r.group === 'A' ? `/resume-examples/${r.slug}` : `/${r.slug}-resume-examples`;
    return `<a href="${url}" class="related-card">
              <div class="related-card-icon" style="background:${r.iconBgColor};">
                <i data-lucide="${r.iconName}" style="width:20px;height:20px;"></i>
              </div>
              <h3>${r.h1.replace(/ — .*$/, '').replace(/ \u2014 .*$/, '')}</h3>
              <p>${r.examples.length} examples available</p>
            </a>`;
  }).join('\n          ');

  return `<section class="related-section">
    <div class="container">
      <h2 style="text-align:center;margin-bottom:12px;">Related Resume Examples</h2>
      <p style="text-align:center;color:var(--muted);font-size:16px;max-width:600px;margin:0 auto 40px;">Explore more example categories that complement your search.</p>
      <div class="related-grid">
          ${cards}
      </div>
    </div>
  </section>`;
}

// ══════════════════════════════════════════════════════
//  GUIDE SECTION HTML
// ══════════════════════════════════════════════════════

function getGuideHtml(guide, relatedSlugs, allPages) {
  // Build internal links for guide text
  const internalLinks = (relatedSlugs || []).slice(0, 3).map(slug => {
    const p = allPages.find(pg => pg.slug === slug);
    if (!p) return '';
    const url = p.group === 'A' ? `/resume-examples/${p.slug}` : `/${p.slug}-resume-examples`;
    return `<a href="${url}">${p.h1.replace(/ — .*$/, '').replace(/ \u2014 .*$/, '')}</a>`;
  }).filter(Boolean);

  let html = `<section class="guide-section">
    <div class="container">
      <div class="guide-content">`;

  // What Is
  if (guide.whatIs) {
    html += `
        <h2>${guide.whatIs.heading}</h2>
        <p>${guide.whatIs.body}</p>`;
  }

  // When to Use
  if (guide.whenToUse) {
    html += `
        <h2>${guide.whenToUse.heading}</h2>
        <ul>
          ${guide.whenToUse.items.map(item => `<li>${item}</li>`).join('\n          ')}
        </ul>`;
    if (internalLinks.length > 0) {
      html += `
        <div class="guide-callout">
          <strong>Explore alternatives:</strong> If this format doesn't quite fit your needs, consider ${internalLinks.join(', ')}.
        </div>`;
    }
  }

  // When NOT to Use
  if (guide.whenNotToUse) {
    html += `
        <h2>${guide.whenNotToUse.heading}</h2>
        <div class="guide-callout warning">
          <ul style="margin:0;padding-left:20px;">
            ${guide.whenNotToUse.items.map(item => `<li>${item}</li>`).join('\n            ')}
          </ul>
        </div>`;
  }

  // How to Customize
  if (guide.howToCustomize) {
    html += `
        <h2>${guide.howToCustomize.heading}</h2>`;
    guide.howToCustomize.steps.forEach((step, i) => {
      html += `
        <h3>Step ${i + 1}: ${step.title}</h3>
        <p>${step.body}</p>`;
    });
  }

  // Expert Tips
  if (guide.expertTips) {
    html += `
        <h2>${guide.expertTips.heading}</h2>
        <div class="guide-tip-grid">
          ${guide.expertTips.tips.map(tip => `<div class="guide-tip-card">
            <h4>${tip.title}</h4>
            <p>${tip.body}</p>
          </div>`).join('\n          ')}
        </div>`;
  }

  html += `
      </div>
    </div>
  </section>`;

  return html;
}

// ══════════════════════════════════════════════════════
//  FAQ SECTION HTML
// ══════════════════════════════════════════════════════

function getFaqHtml(faqs) {
  if (!faqs || faqs.length === 0) return '';

  const items = faqs.map((faq, i) => {
    const activeClass = i === 0 ? ' active' : '';
    return `<div class="faq-item${activeClass}">
          <div class="faq-question" onclick="toggleFaq(this)">
            ${faq.question}
            <span class="faq-toggle"><i data-lucide="chevron-down" style="width:16px;height:16px;"></i></span>
          </div>
          <div class="faq-answer">
            <div class="faq-answer-inner">
              ${faq.answer}
            </div>
          </div>
        </div>`;
  }).join('\n        ');

  return `<section class="faq-section">
    <div class="container">
      <div class="section-header" style="text-align:center;margin-bottom:48px;">
        <div class="section-eyebrow" style="display:inline-flex;align-items:center;gap:8px;background:var(--blue-light);color:var(--blue);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:6px 14px;border-radius:100px;margin-bottom:16px;">
          <i data-lucide="help-circle" style="width:14px;height:14px;"></i>
          FAQ
        </div>
        <h2>Frequently Asked Questions</h2>
      </div>
      <div class="faq-list">
        ${items}
      </div>
    </div>
  </section>`;
}

// ══════════════════════════════════════════════════════
//  JSON-LD SCHEMA
// ══════════════════════════════════════════════════════

function getSchemaHtml(page) {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": page.breadcrumbs.filter(b => b.url).map((b, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": b.label,
      "item": `https://toptal.com${b.url}`
    })).concat([{
      "@type": "ListItem",
      "position": page.breadcrumbs.length,
      "name": page.breadcrumbs[page.breadcrumbs.length - 1].label
    }])
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": (page.faqs || []).map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": page.h1,
    "description": page.metaDescription,
    "url": `https://toptal.com${page.canonicalUrl}`,
    "isPartOf": { "@type": "WebSite", "name": "Toptal Resume", "url": "https://toptal.com" },
    "about": { "@type": "Thing", "name": page.h1.replace(/ — .*$/, '') },
    "numberOfItems": page.examples.length
  };

  return `<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(faqSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(collectionSchema)}</script>`;
}

// ══════════════════════════════════════════════════════
//  MAIN HTML TEMPLATE
// ══════════════════════════════════════════════════════

function htmlTemplate(page, allPages) {
  const exampleCardsHtml = page.examples.map(card => getExampleCardHtml(card)).join('\n          ');
  const guideHtml = getGuideHtml(page.guide, page.relatedSlugs, allPages);
  const faqHtml = getFaqHtml(page.faqs);
  const relatedHtml = getRelatedHtml(page, allPages);
  const schemaHtml = getSchemaHtml(page);

  const breadcrumbHtml = page.breadcrumbs.map((b, i) => {
    if (b.url) return `<a href="${b.url}">${b.label}</a>`;
    return b.label;
  }).join('<span>›</span>');

  const galleryHeading = `Top ${page.h1.replace(/ — .*$/, '').replace(/ \u2014 .*$/, '')}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.title}</title>
  <meta name="description" content="${page.metaDescription}">
  <meta name="robots" content="noindex, nofollow">
  <link rel="canonical" href="https://toptal.com${page.canonicalUrl}">

  <!-- Open Graph -->
  <meta property="og:title" content="${page.title}">
  <meta property="og:description" content="${page.metaDescription}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://toptal.com${page.canonicalUrl}">
  <meta property="og:image" content="${page.ogImage || ''}">

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>

  <!-- Structured Data -->
  ${schemaHtml}

  <style>
    /* ══════════════════════════════════════════════════════
       RESET & BASE
       ══════════════════════════════════════════════════════ */
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --green: #00CC83;
      --green-hover: #00b574;
      --blue: #204ECF;
      --blue-light: #EDF1FD;
      --navy: #0F256E;
      --navy-dark: #030A42;
      --charcoal: #262D3D;
      --near-black: #191E28;
      --body-text: #455065;
      --muted: #84888E;
      --surface: #F5F5F7;
      --off-white: #FBFCFC;
      --border: #E5E7EA;
      --border-light: #D8D9DC;
      --white: #FFFFFF;
      --radius: 4px;
      --radius-lg: 8px;
      --radius-xl: 12px;
      --radius-pill: 100px;
      --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
      --shadow-md: 0 4px 12px rgba(0,0,0,0.1);
      --shadow-lg: 0 8px 30px rgba(0,0,0,0.12);
      --shadow-xl: 0 20px 60px rgba(0,0,0,0.15);
      --container: 1200px;
      --transition: 0.2s ease;
    }

    html { scroll-behavior: smooth; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: var(--body-text);
      background: var(--white);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .container {
      max-width: var(--container);
      margin: 0 auto;
      padding: 0 24px;
    }

    a { color: var(--blue); text-decoration: none; transition: color var(--transition); }
    a:hover { color: var(--navy); }

    h1, h2, h3, h4 { color: var(--near-black); line-height: 1.25; }
    h1 { font-size: 48px; font-weight: 700; }
    h2 { font-size: 36px; font-weight: 700; letter-spacing: -0.5px; }
    h3 { font-size: 20px; font-weight: 600; }

    img { max-width: 100%; display: block; }

    /* ══════════════════════════════════════════════════════
       HEADER
       ══════════════════════════════════════════════════════ */
    .header {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      background: linear-gradient(90deg, var(--navy), var(--navy-dark));
      height: 64px; display: flex; align-items: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .header .container { display: flex; align-items: center; justify-content: space-between; width: 100%; }
    .header-logo { display: flex; align-items: center; gap: 3px; color: var(--white); font-size: 22px; font-weight: 700; letter-spacing: -0.5px; text-decoration: none; }
    .header-logo .logo-dot { color: var(--green); }
    .header-logo .logo-product { font-weight: 400; opacity: 0.85; margin-left: 4px; font-size: 18px; }
    .header-nav { display: flex; align-items: center; gap: 32px; }
    .header-nav a { color: rgba(255,255,255,0.8); font-size: 14px; font-weight: 500; transition: color var(--transition); }
    .header-nav a:hover { color: var(--white); }
    .header-actions { display: flex; align-items: center; gap: 16px; }
    .btn-login { color: var(--white); font-size: 14px; font-weight: 500; background: none; border: none; cursor: pointer; }

    /* ══════════════════════════════════════════════════════
       BUTTONS
       ══════════════════════════════════════════════════════ */
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-family: inherit; font-weight: 600; font-size: 14px; border: none; border-radius: var(--radius); cursor: pointer; transition: all var(--transition); white-space: nowrap; }
    .btn-primary { background: var(--green); color: var(--white); padding: 10px 28px; height: 40px; }
    .btn-primary:hover { background: var(--green-hover); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,204,131,0.3); }
    .btn-secondary { background: var(--blue); color: var(--white); padding: 10px 28px; height: 40px; }
    .btn-secondary:hover { background: #1a3fa6; transform: translateY(-1px); }
    .btn-outline { background: transparent; color: var(--blue); padding: 10px 28px; height: 40px; border: 1.5px solid var(--blue); }
    .btn-outline:hover { background: var(--blue-light); }
    .btn-lg { height: 42px; padding: 10px 28px; font-size: 14px; border-radius: var(--radius-lg); }
    .btn-white { background: var(--white); color: var(--navy); padding: 10px 28px; height: 40px; }
    .btn-white:hover { background: #f0f0f0; }

    /* ══════════════════════════════════════════════════════
       BREADCRUMB
       ══════════════════════════════════════════════════════ */
    .breadcrumb { padding: 8px 0 0; font-size: 12px; color: var(--muted); }
    .breadcrumb a { color: rgba(255,255,255,0.5); }
    .breadcrumb a:hover { color: var(--white); }
    .breadcrumb span { margin: 0 8px; color: rgba(255,255,255,0.3); }

    /* ══════════════════════════════════════════════════════
       SUB-PAGE HERO
       ══════════════════════════════════════════════════════ */
    .subpage-hero {
      padding-top: 64px;
      background: linear-gradient(135deg, var(--navy) 0%, var(--navy-dark) 100%);
      position: relative; overflow: hidden;
    }
    .subpage-hero::before {
      content: ''; position: absolute; top: -50%; right: -20%; width: 800px; height: 800px;
      background: radial-gradient(circle, rgba(0,204,131,0.08) 0%, transparent 70%); border-radius: 50%;
    }
    .subpage-hero::after {
      content: ''; position: absolute; bottom: -30%; left: -10%; width: 600px; height: 600px;
      background: radial-gradient(circle, rgba(32,78,207,0.1) 0%, transparent 70%); border-radius: 50%;
    }
    .subpage-hero-inner {
      position: relative; z-index: 1; padding: 32px 0 48px; max-width: 720px;
    }
    .subpage-hero h1 {
      color: var(--white); font-size: 36px; font-weight: 800; line-height: 1.15;
      margin: 0 0 12px; letter-spacing: -0.5px;
    }
    .subpage-hero h1 .accent { color: var(--green); }
    .subpage-hero-subtitle {
      color: rgba(255,255,255,0.7); font-size: 15px; line-height: 1.55; max-width: 560px; margin: 0 0 14px;
    }
    .hero-data-line {
      display: flex; align-items: center; gap: 8px; font-size: 12px;
      color: rgba(255,255,255,0.5); margin-bottom: 20px;
    }
    .hero-data-line i { opacity: 0.5; }
    .hero-data-line strong { color: rgba(255,255,255,0.75); }
    .subpage-hero-ctas { display: flex; align-items: center; gap: 12px; }

    /* ══════════════════════════════════════════════════════
       EXAMPLE GALLERY
       ══════════════════════════════════════════════════════ */
    .gallery-section { padding: 64px 0; background: var(--surface); }
    .gallery-section .section-header { text-align: center; margin-bottom: 40px; }
    .gallery-section .section-header h2 { font-size: 28px; margin-bottom: 8px; }
    .gallery-section .section-header p { font-size: 16px; color: var(--muted); max-width: 520px; margin: 0 auto; }
    .gallery-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
    }

    /* ══════════════════════════════════════════════════════
       EXAMPLE CARDS & RESUME MOCK
       ══════════════════════════════════════════════════════ */
    .example-card {
      background: var(--white); border-radius: var(--radius-xl); overflow: hidden;
      border: 1px solid var(--border); transition: all 0.3s ease; cursor: pointer; position: relative;
    }
    .example-card:hover { transform: translateY(-6px); box-shadow: var(--shadow-xl); border-color: transparent; }
    .example-card-preview {
      position: relative; aspect-ratio: 210/297; background: #f8f9fa; overflow: hidden;
    }
    .resume-mock {
      width: 85%; height: 92%; margin: 4% auto; background: white; border-radius: 2px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08); padding: 12%; display: flex; flex-direction: column; position: relative;
    }
    .resume-mock .rm-header { display: flex; gap: 8%; margin-bottom: 8%; }
    .resume-mock .rm-photo { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; }
    .resume-mock .rm-name { height: 8px; border-radius: 2px; width: 65%; margin-bottom: 6px; }
    .resume-mock .rm-title { height: 5px; border-radius: 2px; width: 45%; margin-bottom: 4px; }
    .resume-mock .rm-line { height: 3px; border-radius: 1px; margin-bottom: 5px; }
    .resume-mock .rm-section-title { height: 5px; border-radius: 2px; width: 35%; margin-bottom: 6px; margin-top: 8px; }
    .resume-mock .rm-divider { height: 1px; background: #e5e7eb; margin: 4px 0 8px; }

    /* Style variations */
    .example-card[data-style="professional"] .rm-name { background: #0F256E; }
    .example-card[data-style="professional"] .rm-title { background: #204ECF; opacity: 0.5; }
    .example-card[data-style="professional"] .rm-section-title { background: #0F256E; }
    .example-card[data-style="professional"] .rm-line { background: #e5e7eb; }
    .example-card[data-style="professional"] .rm-photo { background: #0F256E; }

    .example-card[data-style="modern"] .rm-name { background: #204ECF; }
    .example-card[data-style="modern"] .rm-title { background: #7C93DB; }
    .example-card[data-style="modern"] .rm-section-title { background: #204ECF; }
    .example-card[data-style="modern"] .rm-line { background: #eef0f4; }
    .example-card[data-style="modern"] .rm-photo { background: #204ECF; }

    .example-card[data-style="creative"] .rm-name { background: #7C3AED; }
    .example-card[data-style="creative"] .rm-title { background: #A78BFA; }
    .example-card[data-style="creative"] .rm-section-title { background: #7C3AED; }
    .example-card[data-style="creative"] .rm-line { background: #F3F0FF; }
    .example-card[data-style="creative"] .rm-photo { background: #7C3AED; }

    .example-card[data-style="simple"] .rm-name { background: #374151; }
    .example-card[data-style="simple"] .rm-title { background: #9CA3AF; }
    .example-card[data-style="simple"] .rm-section-title { background: #374151; }
    .example-card[data-style="simple"] .rm-line { background: #F3F4F6; }
    .example-card[data-style="simple"] .rm-photo { background: #6B7280; }

    .example-card[data-style="minimalist"] .rm-name { background: #111827; }
    .example-card[data-style="minimalist"] .rm-title { background: #D1D5DB; }
    .example-card[data-style="minimalist"] .rm-section-title { background: #111827; }
    .example-card[data-style="minimalist"] .rm-line { background: #F9FAFB; }
    .example-card[data-style="minimalist"] .rm-photo { display: none; }

    .example-card[data-style="ats"] .rm-name { background: #065F46; }
    .example-card[data-style="ats"] .rm-title { background: #6EE7B7; }
    .example-card[data-style="ats"] .rm-section-title { background: #065F46; }
    .example-card[data-style="ats"] .rm-line { background: #ECFDF5; }
    .example-card[data-style="ats"] .rm-photo { display: none; }

    .example-card[data-style="executive"] .rm-name { background: #1E293B; }
    .example-card[data-style="executive"] .rm-title { background: #64748B; }
    .example-card[data-style="executive"] .rm-section-title { background: #1E293B; }
    .example-card[data-style="executive"] .rm-line { background: #F1F5F9; }
    .example-card[data-style="executive"] .rm-photo { background: #334155; }

    .example-card[data-style="bold"] .rm-name { background: #DC2626; }
    .example-card[data-style="bold"] .rm-title { background: #FCA5A5; }
    .example-card[data-style="bold"] .rm-section-title { background: #DC2626; }
    .example-card[data-style="bold"] .rm-line { background: #FEF2F2; }
    .example-card[data-style="bold"] .rm-photo { background: #DC2626; }

    /* Two-column resume layout */
    .resume-mock.two-col { flex-direction: row; padding: 0; gap: 0; }
    .resume-mock.two-col .rm-sidebar { width: 35%; padding: 10% 6%; flex-shrink: 0; }
    .resume-mock.two-col .rm-main { flex: 1; padding: 10% 6%; }

    .example-card[data-style="professional"] .rm-sidebar { background: #0F256E; }
    .example-card[data-style="modern"] .rm-sidebar { background: #204ECF; }
    .example-card[data-style="creative"] .rm-sidebar { background: #7C3AED; }
    .example-card[data-style="executive"] .rm-sidebar { background: #1E293B; }
    .example-card[data-style="bold"] .rm-sidebar { background: #DC2626; }

    .rm-sidebar .rm-name, .rm-sidebar .rm-title, .rm-sidebar .rm-section-title, .rm-sidebar .rm-line { background: rgba(255,255,255,0.2) !important; }
    .rm-sidebar .rm-name { background: rgba(255,255,255,0.9) !important; }
    .rm-sidebar .rm-photo { background: rgba(255,255,255,0.3) !important; }

    /* Card overlay */
    .example-card-overlay {
      position: absolute; inset: 0; background: rgba(3,10,66,0.6);
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
      opacity: 0; transition: opacity 0.3s ease; backdrop-filter: blur(2px);
    }
    .example-card:hover .example-card-overlay { opacity: 1; }
    .example-card-overlay .btn { width: 160px; font-size: 13px; height: 38px; }

    /* Card badges */
    .card-badges { position: absolute; top: 10px; left: 10px; display: flex; flex-direction: column; gap: 6px; z-index: 2; }
    .card-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: var(--radius-pill); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .card-badge.ats { background: #ECFDF5; color: #065F46; }
    .card-badge.builder-only { background: linear-gradient(135deg, #6366F1, #4F46E5); color: white; }
    .card-badge.free { background: var(--blue-light); color: var(--blue); }
    .card-badge.popular { background: #FEF3C7; color: #92400E; }

    /* Card info */
    .example-card-info { padding: 16px; }
    .example-card-name { font-size: 14px; font-weight: 600; color: var(--near-black); margin-bottom: 4px; }
    .example-card-description { font-size: 12px; line-height: 1.5; color: var(--muted); margin-bottom: 8px; }
    .example-card-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .example-card-tag { font-size: 11px; font-weight: 500; color: var(--muted); background: var(--surface); padding: 2px 8px; border-radius: var(--radius-pill); }

    /* ══════════════════════════════════════════════════════
       GUIDE SECTION
       ══════════════════════════════════════════════════════ */
    .guide-section { padding: 80px 0; background: var(--white); }
    .guide-content { max-width: 800px; margin: 0 auto; }
    .guide-content h2 { font-size: 28px; font-weight: 700; color: var(--near-black); margin: 48px 0 16px; }
    .guide-content h2:first-child { margin-top: 0; }
    .guide-content h3 { font-size: 20px; font-weight: 600; color: var(--near-black); margin: 32px 0 12px; }
    .guide-content p { font-size: 16px; line-height: 1.7; color: var(--body-text); margin-bottom: 16px; }
    .guide-content ul, .guide-content ol { margin: 0 0 16px 24px; font-size: 16px; line-height: 1.7; color: var(--body-text); }
    .guide-content li { margin-bottom: 8px; }

    .guide-callout {
      border-left: 4px solid var(--blue); background: var(--blue-light);
      padding: 16px 20px; border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
      margin: 24px 0; font-size: 15px; line-height: 1.6; color: var(--body-text);
    }
    .guide-callout.warning { border-left-color: #F59E0B; background: #FFFBEB; }
    .guide-callout strong { color: var(--near-black); }

    .guide-tip-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-top: 24px;
    }
    .guide-tip-card {
      background: var(--surface); border-radius: var(--radius-xl); padding: 24px; border: 1px solid var(--border);
    }
    .guide-tip-card h4 { font-size: 15px; font-weight: 600; color: var(--near-black); margin-bottom: 8px; }
    .guide-tip-card p { font-size: 14px; margin: 0; }

    /* ══════════════════════════════════════════════════════
       FAQ SECTION
       ══════════════════════════════════════════════════════ */
    .faq-section { padding: 80px 0; background: var(--surface); }
    .faq-list { max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; }
    .faq-item { background: var(--white); border-radius: var(--radius-xl); border: 1px solid var(--border); overflow: hidden; transition: all var(--transition); }
    .faq-item:hover { border-color: var(--blue); }
    .faq-item.active { border-color: var(--blue); box-shadow: 0 2px 12px rgba(32,78,207,0.08); }
    .faq-question { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 20px 24px; cursor: pointer; font-size: 15px; font-weight: 600; color: var(--near-black); user-select: none; }
    .faq-question:hover { color: var(--blue); }
    .faq-toggle { width: 28px; height: 28px; border-radius: 50%; background: var(--surface); display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.3s ease; color: var(--muted); }
    .faq-item.active .faq-toggle { background: var(--blue); color: var(--white); transform: rotate(180deg); }
    .faq-answer { max-height: 0; overflow: hidden; transition: max-height 0.35s ease; }
    .faq-item.active .faq-answer { max-height: 500px; }
    .faq-answer-inner { padding: 0 24px 24px; font-size: 14px; line-height: 1.7; color: var(--body-text); }

    /* ══════════════════════════════════════════════════════
       RELATED EXAMPLES
       ══════════════════════════════════════════════════════ */
    .related-section { padding: 80px 0; background: var(--white); }
    .related-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; }
    .related-card {
      background: var(--surface); border-radius: var(--radius-xl); padding: 24px;
      border: 1px solid var(--border); transition: all 0.3s ease; text-decoration: none; display: block;
    }
    .related-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); border-color: var(--blue); }
    .related-card-icon {
      width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center;
      justify-content: center; color: var(--white); margin-bottom: 16px;
    }
    .related-card h3 { font-size: 16px; font-weight: 600; margin-bottom: 8px; color: var(--near-black); }
    .related-card p { font-size: 14px; color: var(--muted); margin: 0; }

    /* ══════════════════════════════════════════════════════
       CTA SECTION
       ══════════════════════════════════════════════════════ */
    .cta-section {
      padding: 100px 0;
      background: linear-gradient(135deg, var(--navy) 0%, var(--navy-dark) 100%);
      position: relative; overflow: hidden;
    }
    .cta-section::before {
      content: ''; position: absolute; top: -40%; left: 50%; transform: translateX(-50%);
      width: 1200px; height: 1200px;
      background: radial-gradient(circle, rgba(0,204,131,0.06) 0%, transparent 50%); border-radius: 50%;
    }
    .cta-inner { position: relative; z-index: 1; text-align: center; }
    .cta-inner h2 { color: var(--white); font-size: 42px; font-weight: 800; margin-bottom: 16px; letter-spacing: -0.5px; }
    .cta-inner h2 .accent { color: var(--green); }
    .cta-subtitle { color: rgba(255,255,255,0.6); font-size: 18px; line-height: 1.6; max-width: 480px; margin: 0 auto 40px; }
    .cta-buttons { display: flex; justify-content: center; gap: 16px; margin-bottom: 40px; }
    .cta-features { display: flex; justify-content: center; gap: 40px; }
    .cta-feature { display: flex; align-items: center; gap: 8px; font-size: 14px; color: rgba(255,255,255,0.5); }
    .cta-feature i { color: var(--green); }

    /* ══════════════════════════════════════════════════════
       FOOTER
       ══════════════════════════════════════════════════════ */
    .footer { background: #0a1a4a; padding: 64px 0 32px; border-top: 1px solid rgba(255,255,255,0.05); }
    .footer-grid { display: grid; grid-template-columns: 2fr repeat(3, 1fr); gap: 48px; margin-bottom: 48px; }
    .footer-brand p { color: rgba(255,255,255,0.45); font-size: 14px; line-height: 1.6; margin-top: 16px; max-width: 280px; }
    .footer-col h4 { color: var(--white); font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; }
    .footer-col ul { list-style: none; }
    .footer-col ul li { margin-bottom: 10px; }
    .footer-col ul a { color: rgba(255,255,255,0.5); font-size: 14px; font-weight: 400; transition: color var(--transition); }
    .footer-col ul a:hover { color: var(--white); }
    .footer-bottom { padding-top: 32px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center; }
    .footer-bottom p { color: rgba(255,255,255,0.3); font-size: 13px; }
    .footer-bottom-links { display: flex; gap: 24px; }
    .footer-bottom-links a { color: rgba(255,255,255,0.3); font-size: 13px; }
    .footer-bottom-links a:hover { color: rgba(255,255,255,0.6); }

    /* ══════════════════════════════════════════════════════
       RESPONSIVE
       ══════════════════════════════════════════════════════ */
    @media (max-width: 1024px) {
      .gallery-grid { grid-template-columns: repeat(3, 1fr); }
      .subpage-hero h1 { font-size: 30px; }
    }

    @media (max-width: 768px) {
      h1 { font-size: 32px; }
      h2 { font-size: 28px; }
      .subpage-hero h1 { font-size: 26px; }
      .gallery-grid { grid-template-columns: repeat(2, 1fr); gap: 16px; }
      .cta-buttons { flex-direction: column; align-items: center; }
      .cta-features { flex-direction: column; align-items: center; gap: 16px; }
      .footer-grid { grid-template-columns: repeat(2, 1fr); }
      .header-nav { display: none; }
      .guide-content h2 { font-size: 24px; }
      .guide-tip-grid { grid-template-columns: 1fr; }
      .related-grid { grid-template-columns: repeat(2, 1fr); }
      .subpage-hero-ctas { flex-direction: column; }
    }

    @media (max-width: 480px) {
      .gallery-grid { grid-template-columns: 1fr; }
      .footer-grid { grid-template-columns: 1fr; }
      .related-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <header class="header">
    <div class="container">
      <a href="/" class="header-logo">
        Toptal<span class="logo-dot">.</span> <span class="logo-product">Resume</span>
      </a>
      <nav class="header-nav">
        <a href="/">Resume Examples</a>
        <a href="#">Resume Builder</a>
        <a href="#">Cover Letters</a>
        <a href="#">Resume Examples</a>
        <a href="#">Career Advice</a>
      </nav>
      <div class="header-actions">
        <button class="btn-login">Log In</button>
        <button class="btn btn-primary">Build My Resume</button>
      </div>
    </div>
  </header>

  <!-- HERO -->
  <section class="subpage-hero">
    <div class="container">
      <div class="breadcrumb">${breadcrumbHtml}</div>
      <div class="subpage-hero-inner">
        <h1>${page.h1}</h1>
        <p class="subpage-hero-subtitle">${page.heroSubtitle}</p>
        <div class="hero-data-line">
          <i data-lucide="bar-chart-2" style="width:14px;height:14px;"></i>
          ${page.trustSignal}
        </div>
        <div class="subpage-hero-ctas">
          <button class="btn btn-primary btn-lg">Build My Resume</button>
          <a href="/" class="btn btn-outline btn-lg" style="border-color:rgba(255,255,255,0.3);color:var(--white);">Browse All Examples</a>
        </div>
      </div>
    </div>
  </section>

  <!-- EXAMPLE GALLERY -->
  <section class="gallery-section">
    <div class="container">
      <div class="section-header">
        <h2>${galleryHeading}</h2>
        <p>Choose from ${page.examples.length} professionally crafted examples, all free to download and customize.</p>
      </div>
      <div class="gallery-grid">
          ${exampleCardsHtml}
      </div>
    </div>
  </section>

  <!-- GUIDE -->
  ${guideHtml}

  <!-- FAQ -->
  ${faqHtml}

  <!-- RELATED EXAMPLES -->
  ${relatedHtml}

  <!-- CTA -->
  <section class="cta-section">
    <div class="container">
      <div class="cta-inner">
        <h2>Find Your Perfect Resume<br>Example <span class="accent">Today</span></h2>
        <p class="cta-subtitle">Browse 100+ professional resume examples, download for free, and customize in minutes. Your next interview starts here.</p>
        <div class="cta-buttons">
          <button class="btn btn-primary btn-lg">Build My Resume</button>
          <button class="btn btn-outline btn-lg" style="border-color:rgba(255,255,255,0.3);color:var(--white);">Import Existing Resume</button>
        </div>
        <div class="cta-features">
          <div class="cta-feature">
            <i data-lucide="check-circle" style="width:16px;height:16px;color:var(--green);"></i>
            Free DOCX Downloads
          </div>
          <div class="cta-feature">
            <i data-lucide="check-circle" style="width:16px;height:16px;color:var(--green);"></i>
            98% ATS Pass Rate
          </div>
          <div class="cta-feature">
            <i data-lucide="check-circle" style="width:16px;height:16px;color:var(--green);"></i>
            PDF, Word &amp; Google Docs
          </div>
          <div class="cta-feature">
            <i data-lucide="check-circle" style="width:16px;height:16px;color:var(--green);"></i>
            No Account Required
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- FOOTER -->
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <div class="header-logo" style="font-size:20px;">
            Toptal<span class="logo-dot">.</span> <span class="logo-product">Resume</span>
          </div>
          <p>Professional resume examples and career tools built by experts. Part of the Toptal network connecting top talent with the world's leading companies.</p>
        </div>
        <div class="footer-col">
          <h4>Examples</h4>
          <ul>
            <li><a href="/">All Examples</a></li>
            <li><a href="/resume-examples/ats">ATS-Friendly</a></li>
            <li><a href="/resume-examples/professional">Professional</a></li>
            <li><a href="/resume-examples/modern">Modern</a></li>
            <li><a href="/resume-examples/simple">Simple</a></li>
            <li><a href="/resume-examples/creative">Creative</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Resources</h4>
          <ul>
            <li><a href="#">Resume Builder</a></li>
            <li><a href="#">Cover Letter Templates</a></li>
            <li><a href="#">Resume Examples</a></li>
            <li><a href="#">Resume Format Guide</a></li>
            <li><a href="#">How to Write a Resume</a></li>
            <li><a href="#">Career Advice</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Company</h4>
          <ul>
            <li><a href="#">About Toptal</a></li>
            <li><a href="#">Blog</a></li>
            <li><a href="#">Careers</a></li>
            <li><a href="#">Contact</a></li>
            <li><a href="#">Privacy Policy</a></li>
            <li><a href="#">Terms of Service</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2026 Toptal, LLC. All rights reserved.</p>
        <div class="footer-bottom-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Cookies</a>
        </div>
      </div>
    </div>
  </footer>

  <script>
    lucide.createIcons();

    function toggleFaq(el) {
      const item = el.closest('.faq-item');
      const wasActive = item.classList.contains('active');
      document.querySelectorAll('.faq-item.active').forEach(i => i.classList.remove('active'));
      if (!wasActive) item.classList.add('active');
    }
  </script>
</body>
</html>`;
}

// ══════════════════════════════════════════════════════
//  GENERATE ALL PAGES
// ══════════════════════════════════════════════════════

function generate() {
  console.log(`\nGenerating ${pages.length} sub-pages...\n`);

  let created = 0;
  let errors = 0;

  pages.forEach((page, i) => {
    try {
      const dirFullPath = path.join(DIR, page.dirPath);
      const filePath = path.join(dirFullPath, 'index.html');

      // Create directory recursively
      fs.mkdirSync(dirFullPath, { recursive: true });

      // Generate HTML
      const html = htmlTemplate(page, pages);

      // Write file
      fs.writeFileSync(filePath, html, 'utf-8');

      const num = String(i + 1).padStart(2, ' ');
      console.log(`  ${num}. ✓ ${page.dirPath}/index.html  (${(html.length / 1024).toFixed(1)} KB)`);
      created++;
    } catch (err) {
      console.error(`  ✗ ${page.dirPath}: ${err.message}`);
      errors++;
    }
  });

  console.log(`\n  Done: ${created} pages created, ${errors} errors.\n`);

  if (errors > 0) {
    process.exit(1);
  }
}

generate();
