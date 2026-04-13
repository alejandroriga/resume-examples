/**
 * generate-homepage.js
 *
 * Reads homepage-data.json and patches the corresponding values into index.html.
 * This closes the CMS → Resume Examples homepage pipeline:
 *
 *   CMS edit → Export homepage.json → node generate-homepage.js → index.html updated
 *
 * Usage:  node generate-homepage.js
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, process.argv[2] || 'homepage-data.json');
const HTML_PATH  = path.join(__dirname, 'index.html');

// ─── Load files ───────────────────────────────────────────────
const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
let html = fs.readFileSync(HTML_PATH, 'utf-8');

let patchCount = 0;

// ─── Helpers ──────────────────────────────────────────────────

/** Escape special regex chars in a string */
function esc(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** HTML-encode basic entities */
function he(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/™/g, '&trade;');
}

/** Apply a regex replacement and track it */
function patch(regex, replacement, label) {
  const match = html.match(regex);
  if (!match) {
    console.log(`  ⚠ NOT FOUND: ${label}`);
    return;
  }
  const before = html;
  html = html.replace(regex, replacement);
  if (html !== before) {
    patchCount++;
    console.log(`  ✓ ${label}`);
  } else {
    console.log(`  · ${label} (already up to date)`);
  }
}

/** Replace the Nth match of a regex (0-indexed) */
function patchNth(regex, replacement, n, label) {
  let count = 0;
  const before = html;
  html = html.replace(regex, (match) => {
    if (count === n) { count++; return replacement; }
    count++;
    return match;
  });
  if (html !== before) {
    patchCount++;
    console.log(`  ✓ ${label}`);
  } else {
    console.log(`  ⚠ NOT FOUND: ${label}`);
  }
}


// ═══════════════════════════════════════════════════════════════
// 1. META TAGS
// ═══════════════════════════════════════════════════════════════
console.log('\n📄 Meta tags');

if (data.meta) {
  if (data.meta.title) {
    patch(/<title>[^<]+<\/title>/, `<title>${he(data.meta.title)}</title>`, 'title');
  }
  if (data.meta.metaDescription) {
    patch(
      /(<meta\s+name="description"\s+content=")[^"]*(")/,
      `$1${he(data.meta.metaDescription)}$2`,
      'meta description'
    );
  }
  if (data.meta.ogTitle) {
    patch(
      /(<meta\s+property="og:title"\s+content=")[^"]*(")/,
      `$1${he(data.meta.ogTitle)}$2`,
      'og:title'
    );
  }
  if (data.meta.ogDescription) {
    patch(
      /(<meta\s+property="og:description"\s+content=")[^"]*(")/,
      `$1${he(data.meta.ogDescription)}$2`,
      'og:description'
    );
  }
  if (data.meta.ogImage) {
    patch(
      /(<meta\s+property="og:image"\s+content=")[^"]*(")/,
      `$1${he(data.meta.ogImage)}$2`,
      'og:image'
    );
  }
  if (data.meta.ogUrl) {
    patch(
      /(<meta\s+property="og:url"\s+content=")[^"]*(")/,
      `$1${he(data.meta.ogUrl)}$2`,
      'og:url'
    );
    patch(
      /(<link\s+rel="canonical"\s+href=")[^"]*(")/,
      `$1${he(data.meta.ogUrl)}$2`,
      'canonical'
    );
  }
}


// ═══════════════════════════════════════════════════════════════
// 2. HERO SECTION
// ═══════════════════════════════════════════════════════════════
console.log('\n🦸 Hero section');

if (data.hero) {
  // Badge text (after </i> icon inside .hero-badge div)
  if (data.hero.badge) {
    patch(
      /(<div class="hero-badge">\s*<i[^>]*><\/i>)\s*[^<]+\s*(<\/div>)/,
      `$1\n            ${he(data.hero.badge)}\n          $2`,
      'hero badge'
    );
  }

  // H1 heading (replace full inner content)
  if (data.hero.h1) {
    patch(
      /<h1>[\s\S]*?<\/h1>/,
      `<h1>${he(data.hero.h1)}</h1>`,
      'h1 heading'
    );
  }

  // Subtitle
  if (data.hero.subtitle) {
    patch(
      /(<p class="hero-subtitle">)\s*[\s\S]*?\s*(<\/p>)/,
      `$1\n            ${he(data.hero.subtitle)}\n          $2`,
      'hero subtitle'
    );
  }

  // Trust line (span inside .hero-data-line)
  if (data.hero.trustLine) {
    patch(
      /(<div class="hero-data-line">\s*<i[^>]*><\/i>\s*<span>)[\s\S]*?(<\/span>)/,
      `$1${he(data.hero.trustLine)}$2`,
      'trust line'
    );
  }

  // CTA Primary button (first .btn-primary.btn-lg in .hero-ctas)
  if (data.hero.ctaPrimary) {
    patch(
      /(<div class="hero-ctas">\s*<button class="btn btn-primary btn-lg">)[^<]*(<\/button>)/,
      `$1${he(data.hero.ctaPrimary)}$2`,
      'hero CTA primary'
    );
  }

  // No account chip (text after </i> inside .no-account-chip)
  if (data.hero.noAccountChip) {
    patch(
      /(<span class="no-account-chip"><i[^>]*><\/i>)\s*[^<]*(<\/span>)/,
      `$1 ${he(data.hero.noAccountChip)}$2`,
      'no-account chip'
    );
  }

  // CTA Secondary button (.btn-white in .hero-ctas)
  if (data.hero.ctaSecondary) {
    patch(
      /(<button class="btn btn-white btn-lg">)[^<]*(<\/button>)/,
      `$1${he(data.hero.ctaSecondary)}$2`,
      'hero CTA secondary'
    );
  }
}


// ═══════════════════════════════════════════════════════════════
// 3. PERFORMANCE SCORE
// ═══════════════════════════════════════════════════════════════
console.log('\n📊 Performance Score');

if (data.performanceScore) {
  const val = data.performanceScore.value;

  // Numeric value
  if (val) {
    patch(
      /(<span class="perf-score-value">)\d+(<\/span>)/,
      `$1${val}$2`,
      `score value → ${val}`
    );

    // SVG ring dashoffset (117 dasharray, offset = 117 * (1 - val/100))
    const offset = Math.round(117 * (1 - val / 100));
    patch(
      /(stroke-dasharray="117"\s+stroke-dashoffset=")\d+(")/,
      `$1${offset}$2`,
      `SVG ring offset → ${offset}`
    );
  }

  // Label (strong inside .perf-score-text)
  if (data.performanceScore.label) {
    patch(
      /(<div class="perf-score-text">\s*<strong>)[^<]*(<\/strong>)/,
      `$1${he(data.performanceScore.label)}$2`,
      'score label'
    );
  }

  // Subtitle (span inside .perf-score-text, after the strong)
  if (data.performanceScore.subtitle) {
    patch(
      /(<div class="perf-score-text">\s*<strong>[^<]*<\/strong>\s*<span>)[^<]*(<\/span>)/,
      `$1${he(data.performanceScore.subtitle)}$2`,
      'score subtitle'
    );
  }

  // Note (text after </i> inside .perf-score-note)
  if (data.performanceScore.note) {
    patch(
      /(<div class="perf-score-note">\s*<i[^>]*><\/i>)\s*[^\n<]+/,
      `$1\n              ${he(data.performanceScore.note)}`,
      'score note'
    );
  }
}


// ═══════════════════════════════════════════════════════════════
// 4. TRUSTPILOT
// ═══════════════════════════════════════════════════════════════
console.log('\n⭐ Trustpilot');

if (data.trustpilot) {
  if (data.trustpilot.rating) {
    patch(
      /(<span class="tp-rating"><strong>Excellent<\/strong> )[\d.]+( \/)/,
      `$1${data.trustpilot.rating}$2`,
      `rating → ${data.trustpilot.rating}`
    );
  }
  if (data.trustpilot.reviewCount) {
    patch(
      /(&middot;\s*)[^<]*reviews/,
      `$1${he(data.trustpilot.reviewCount)} reviews`,
      `review count → ${data.trustpilot.reviewCount}`
    );
  }
}


// ═══════════════════════════════════════════════════════════════
// 5. FILTER COUNT
// ═══════════════════════════════════════════════════════════════
console.log('\n🔢 Filter count');

if (data.filterCounts && data.filterCounts.total) {
  patch(
    /(<span class="count">)\d+(<\/span>)/,
    `$1${data.filterCounts.total}$2`,
    `example count → ${data.filterCounts.total}`
  );
}


// ═══════════════════════════════════════════════════════════════
// 6. FAQs
// ═══════════════════════════════════════════════════════════════
console.log('\n❓ FAQs');

if (data.faqs && data.faqs.length) {
  // Rebuild entire FAQ list from CMS data
  let faqListHtml = '';
  data.faqs.forEach((faq, i) => {
    const activeClass = i === 0 ? ' active' : '';
    faqListHtml += `\n        <div class="faq-item${activeClass}">
          <h3 class="faq-question" onclick="toggleFaq(this)">
            ${he(faq.question)}
            <span class="faq-toggle"><i data-lucide="chevron-down" style="width:16px;height:16px;"></i></span>
          </h3>
          <div class="faq-answer">
            <div class="faq-answer-inner">
              ${he(faq.answer)}
            </div>
          </div>
        </div>\n`;
    console.log(`  ✓ FAQ ${i + 1}: ${faq.question.substring(0, 50)}...`);
  });

  patch(
    /<div class="faq-list">[\s\S]*?<\/div>\s*<\/div>\s*<\/section>/,
    `<div class="faq-list">${faqListHtml}      </div>\n    </div>\n  </section>`,
    'FAQ list'
  );

  // Rebuild FAQ JSON-LD structured data
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": data.faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer.replace(/<[^>]+>/g, '').substring(0, 500)
      }
    }))
  };
  patch(
    /(<script type="application\/ld\+json">\s*\{[^}]*"@type":\s*"FAQPage"[\s\S]*?<\/script>)/,
    `<script type="application/ld+json">\n  ${JSON.stringify(faqSchema, null, 4).replace(/\n/g, '\n  ')}\n  </script>`,
    'FAQ JSON-LD'
  );
}


// ═══════════════════════════════════════════════════════════════
// 7. EXPERTISE SECTION
// ═══════════════════════════════════════════════════════════════
console.log('\n💪 Expertise section');

if (data.expertise) {
  // Heading
  if (data.expertise.heading) {
    patch(
      /(<div class="expertise-content">\s*<h2>)[\s\S]*?(<\/h2>)/,
      `$1${he(data.expertise.heading)}$2`,
      'expertise heading'
    );
  }

  // Subtitle paragraph (right after h2, before .expertise-stats)
  if (data.expertise.subtitle) {
    patch(
      /(<div class="expertise-content">\s*<h2>[\s\S]*?<\/h2>\s*<p>)[\s\S]*?(<\/p>)/,
      `$1${he(data.expertise.subtitle)}$2`,
      'expertise subtitle'
    );
  }

  // Stats (4 value/label pairs)
  if (data.expertise.stats && data.expertise.stats.length) {
    const statValRegex = /(<div class="expertise-stat-value">)[^<]*(<\/div>)/g;
    const statLblRegex = /(<div class="expertise-stat-label">)[^<]*(<\/div>)/g;

    let si = 0;
    html = html.replace(statValRegex, (match, open, close) => {
      if (si < data.expertise.stats.length) {
        const val = he(data.expertise.stats[si].value);
        si++;
        patchCount++;
        console.log(`  ✓ stat value ${si}: ${val}`);
        return `${open}${val}${close}`;
      }
      return match;
    });

    let li = 0;
    html = html.replace(statLblRegex, (match, open, close) => {
      if (li < data.expertise.stats.length) {
        const lbl = he(data.expertise.stats[li].label);
        li++;
        patchCount++;
        console.log(`  ✓ stat label ${li}: ${lbl}`);
        return `${open}${lbl}${close}`;
      }
      return match;
    });
  }
}


// ═══════════════════════════════════════════════════════════════
// 8. CTA SECTION
// ═══════════════════════════════════════════════════════════════
console.log('\n📣 CTA section');

if (data.cta) {
  // Heading
  if (data.cta.heading) {
    patch(
      /(<div class="cta-inner">\s*<h2>)[\s\S]*?(<\/h2>)/,
      `$1${he(data.cta.heading)}$2`,
      'CTA heading'
    );
  }

  // Subtitle
  if (data.cta.subtitle) {
    patch(
      /(<p class="cta-subtitle">)[^<]*(<\/p>)/,
      `$1${he(data.cta.subtitle)}$2`,
      'CTA subtitle'
    );
  }

  // Primary button (inside .cta-buttons)
  if (data.cta.ctaPrimary) {
    patch(
      /(<div class="cta-buttons">\s*<button class="btn btn-primary btn-lg">)[^<]*(<\/button>)/,
      `$1${he(data.cta.ctaPrimary)}$2`,
      'CTA primary button'
    );
  }

  // Secondary button (inside .cta-buttons)
  if (data.cta.ctaSecondary) {
    patch(
      /(<div class="cta-buttons">[\s\S]*?<button class="btn btn-outline btn-lg"[^>]*>)[^<]*(<\/button>)/,
      `$1${he(data.cta.ctaSecondary)}$2`,
      'CTA secondary button'
    );
  }

  // Features (4 items, text after </i> icon inside .cta-feature)
  if (data.cta.features && data.cta.features.length) {
    const featRegex = /(<div class="cta-feature">\s*<i[^>]*><\/i>)\s*[^\n<]+/g;
    let fi = 0;
    html = html.replace(featRegex, (match, open) => {
      if (fi < data.cta.features.length) {
        const feat = he(data.cta.features[fi]);
        fi++;
        patchCount++;
        console.log(`  ✓ CTA feature ${fi}: ${feat}`);
        return `${open}\n            ${feat}`;
      }
      return match;
    });
  }
}


// ═══════════════════════════════════════════════════════════════
// 9. GALLERY / BROWSE-BY-CATEGORY HEADER (full block replacement)
// ═══════════════════════════════════════════════════════════════
console.log('\n🖼️ Gallery header (categories-grid-header)');

if (data.galleryHeader) {
  const gh = data.galleryHeader;
  const galleryHeaderHtml =
    `<div class="categories-grid-header">
        <div class="section-eyebrow" style="display:inline-flex;align-items:center;gap:8px;background:var(--blue-light);color:var(--blue);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:6px 14px;border-radius:100px;margin-bottom:16px;">
          <i data-lucide="grid" style="width:14px;height:14px;"></i>
          ${he(gh.eyebrow || '')}
        </div>
        <h2>${he(gh.title || '')}</h2>
        <p>${he(gh.subtitle || '')}</p>
      </div>`;
  patch(
    /<div class="categories-grid-header">[\s\S]*?<\/p>\s*<\/div>/,
    galleryHeaderHtml,
    'gallery header'
  );
}


// ═══════════════════════════════════════════════════════════════
// 10. FEATURED EXAMPLES HEADER (full block replacement)
// ═══════════════════════════════════════════════════════════════
console.log('\n🎁 Featured examples header');

if (data.featuredExamplesHeader) {
  const fh = data.featuredExamplesHeader;
  const freeHeaderHtml =
    `<div class="featured-examples-header">
        <div class="section-eyebrow">
          <i data-lucide="download" style="width:12px;height:12px;"></i>
          ${he(fh.eyebrow || '')}
        </div>
        <h2>${he(fh.title || '')}</h2>
        <p>${he(fh.subtitle || '')}</p>
      </div>`;
  patch(
    /<div class="featured-examples-header">[\s\S]*?<\/p>\s*<\/div>/,
    freeHeaderHtml,
    'featured examples header'
  );
}


// ═══════════════════════════════════════════════════════════════
// 11. GUIDE — HEADER, TOC & FULL CHAPTER CONTENT
// ═══════════════════════════════════════════════════════════════
console.log('\n📖 Guide section');

if (data.guide) {
  const g = data.guide;

  // 9a. Guide header — eyebrow
  if (g.eyebrow) {
    patch(
      /(<div class="section-eyebrow"[^>]*>\s*<i[^>]*><\/i>)\s*[\s\S]*?\s*(<\/div>\s*<h2>)/,
      `$1\n          ${he(g.eyebrow)}\n        $2`,
      'guide eyebrow'
    );
  }

  // 9b. Guide header — title (h2 inside .guide-header)
  if (g.title) {
    patch(
      /(<div class="guide-header">[\s\S]*?<h2>)[\s\S]*?(<\/h2>)/,
      `$1${he(g.title)}$2`,
      'guide title'
    );
  }

  // 9c. Guide header — subtitle (p inside .guide-header, after h2)
  if (g.subtitle) {
    patch(
      /(<div class="guide-header">[\s\S]*?<\/h2>\s*<p>)[\s\S]*?(<\/p>)/,
      `$1${he(g.subtitle)}$2`,
      'guide subtitle'
    );
  }

  // 9d. Guide authors — from expert panel
  if (data.expertPanel) {
    const allExperts = [
      ...(data.expertPanel.recruiters || []),
      ...(data.expertPanel.writers || [])
    ].filter(p => p.guideAuthor);

    if (allExperts.length) {
      const lh = (hex) => {
        const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
        return '#' + [Math.min(255,r+80), Math.min(255,g+80), Math.min(255,b+80)].map(v => v.toString(16).padStart(2,'0')).join('');
      };
      let authorsHtml = '<div class="guide-authors">\n';
      authorsHtml += '          <div class="guide-authors-label">Written by</div>\n';
      authorsHtml += '          <div class="guide-authors-list">\n';
      allExperts.forEach(a => {
        const c = a.avatarColor || '#4F46E5';
        const tag = a.linkedin ? 'a' : 'div';
        const linkAttrs = a.linkedin ? ` href="${he(a.linkedin)}" target="_blank" rel="noopener noreferrer"` : '';
        authorsHtml += `            <${tag}${linkAttrs} class="guide-author">\n`;
        authorsHtml += `              <span class="guide-author-avatar" style="background:linear-gradient(135deg,${c},${lh(c)})">${he(a.initials || '')}</span>\n`;
        authorsHtml += `              <span class="guide-author-info">\n`;
        authorsHtml += `                <span class="guide-author-name">${he(a.name || '')}</span>\n`;
        if (a.role) authorsHtml += `                <span class="guide-author-role">${he(a.role)}</span>\n`;
        if (a.bio) authorsHtml += `                <span class="guide-author-bio">${he(a.bio)}</span>\n`;
        if (a.linkedin) authorsHtml += `                <span class="guide-author-linkedin"><i data-lucide="linkedin" style="width:13px;height:13px;"></i> LinkedIn</span>\n`;
        authorsHtml += `              </span>\n`;
        authorsHtml += `            </${tag}>\n`;
      });
      authorsHtml += '          </div>\n';
      authorsHtml += '        </div>';
      patch(
        /<div class="guide-authors">[\s\S]*?<\/div>\s*<\/div>\s*<!-- Table of Contents -->/,
        authorsHtml + '\n      </div>\n\n      <!-- Table of Contents -->',
        'guide authors'
      );
    } else {
      patch(
        /<div class="guide-authors">[\s\S]*?<\/div>\s*<\/div>\s*<!-- Table of Contents -->/,
        '<div class="guide-authors"></div>\n      </div>\n\n      <!-- Table of Contents -->',
        'guide authors (empty)'
      );
    }
  }

  // 9e. Rebuild Table of Contents
  if (g.chapters && g.chapters.length) {
    let tocHtml = '<div class="guide-toc">\n        <div class="guide-toc-title">In This Guide</div>\n        <ol>\n';
    g.chapters.forEach((ch, i) => {
      tocHtml += `          <li><a href="#guide-${i+1}">${he(ch.heading)}</a></li>\n`;
    });
    tocHtml += '        </ol>\n      </div>';
    patch(
      /<div class="guide-toc">[\s\S]*?<\/ol>\s*<\/div>/,
      tocHtml,
      'guide TOC'
    );
  }

  // 9e. Rebuild full guide-chapters block
  if (g.chapters && g.chapters.length) {
    let chaptersHtml = '<div class="guide-chapters collapsed">\n';

    g.chapters.forEach((ch, i) => {
      const n = i + 1;
      chaptersHtml += `\n        <!-- Chapter ${n} -->\n`;
      chaptersHtml += `        <div class="guide-chapter" id="guide-${n}">\n`;
      chaptersHtml += `          <div class="guide-chapter-num">${n}</div>\n`;
      chaptersHtml += `          <h3>${he(ch.heading)}</h3>\n`;

      // Body — raw HTML from WYSIWYG (not entity-encoded)
      if (ch.body) {
        chaptersHtml += `          ${ch.body}\n`;
      }

      // Table (optional)
      if (ch.table && ch.table.length) {
        chaptersHtml += '\n          <div class="guide-table-wrap">\n';
        chaptersHtml += '            <table class="guide-table">\n';
        chaptersHtml += '              <thead>\n                <tr>\n';
        ch.table[0].forEach(th => {
          chaptersHtml += `                  <th>${he(th)}</th>\n`;
        });
        chaptersHtml += '                </tr>\n              </thead>\n';
        chaptersHtml += '              <tbody>\n';
        ch.table.slice(1).forEach(row => {
          chaptersHtml += '                <tr>';
          row.forEach(cell => {
            chaptersHtml += `<td>${he(cell)}</td>`;
          });
          chaptersHtml += '</tr>\n';
        });
        chaptersHtml += '              </tbody>\n';
        chaptersHtml += '            </table>\n          </div>\n';
      }

      // Tip / Callout (optional)
      if (ch.tip) {
        const colorClass = ch.tip.color === 'green' ? ' green' : ch.tip.color === 'amber' ? ' amber' : '';
        const icon = ch.tip.icon || 'info';
        chaptersHtml += `\n          <div class="guide-callout${colorClass}">\n`;
        chaptersHtml += `            <div class="guide-callout-title"><i data-lucide="${he(icon)}" style="width:14px;height:14px;"></i> ${he(ch.tip.title)}</div>\n`;
        chaptersHtml += `            <p>${he(ch.tip.body)}</p>\n`;
        chaptersHtml += '          </div>\n';
      }

      chaptersHtml += '        </div>\n';
    });

    chaptersHtml += '\n      </div><!-- end guide-chapters -->';

    patch(
      /<div class="guide-chapters[^"]*">[\s\S]*?<\/div><!-- end guide-chapters -->/,
      chaptersHtml,
      'guide chapters (full content)'
    );
  }
}


// ═══════════════════════════════════════════════════════════════
// 12. EXPERT PANEL — Recruiters & Writers
// ═══════════════════════════════════════════════════════════════
console.log('\n👥 Expert panel');

if (data.expertPanel) {
  const ep = data.expertPanel;

  // 12a. Header (eyebrow, title, subtitle)
  if (ep.eyebrow || ep.title || ep.subtitle) {
    const headerHtml = `<div class="panel-header">
        <div class="section-eyebrow" style="justify-content:center;">
          <i data-lucide="users" style="width:14px;height:14px;"></i>
          ${he(ep.eyebrow || 'Expert Panel')}
        </div>
        <h2>${he(ep.title || '')}</h2>
        <p>${he(ep.subtitle || '')}</p>
      </div>`;
    patch(
      /<div class="panel-header">[\s\S]*?<\/p>\s*<\/div>/,
      headerHtml,
      'expert panel header'
    );
  }

  // Helper to build gradient from a hex color
  function lighten(hex) {
    const r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
    const lr = Math.min(255, r + 80), lg = Math.min(255, g + 80), lb = Math.min(255, b + 80);
    return '#' + [lr, lg, lb].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  // Helper to render a group of people
  function renderPeopleHtml(people, groupLabel, groupClass, groupIcon) {
    let out = `\n        <!-- ${groupLabel} -->\n`;
    out += `        <div class="panel-group">\n`;
    out += `          <h3 class="panel-group-label ${groupClass}">\n`;
    out += `            <i data-lucide="${groupIcon}" style="width:12px;height:12px;"></i>\n`;
    out += `            ${he(groupLabel)}\n`;
    out += `          </h3>\n`;
    out += `          <div class="panel-people">\n`;
    people.forEach(p => {
      const color = p.avatarColor || '#4F46E5';
      const light = lighten(color);
      const icon = p.credentialIcon || 'badge-check';
      out += `\n            <div class="panel-person">\n`;
      out += `              <div class="panel-avatar" style="background: linear-gradient(135deg, ${color}, ${light});">${he(p.initials || '')}</div>\n`;
      out += `              <div class="panel-info">\n`;
      out += `                <div class="panel-name">${he(p.name || '')}`;
      if (p.linkedin) {
        out += ` <a href="${he(p.linkedin)}" target="_blank" rel="noopener noreferrer" style="color:#818cf8;margin-left:4px;"><i data-lucide="linkedin" style="width:13px;height:13px;vertical-align:middle;"></i></a>`;
      }
      out += `</div>\n`;
      out += `                <div class="panel-role">${he(p.role || '')}`;
      if (p.location) {
        out += ` · ${he(p.location)}`;
      }
      out += `</div>\n`;
      out += `                <div class="panel-bio">"${he(p.bio || '')}"</div>\n`;
      out += `                <span class="panel-credential"><i data-lucide="${he(icon)}" style="width:12px;height:12px;"></i> ${he(p.credential || '')}</span>\n`;
      out += `              </div>\n`;
      out += `            </div>\n`;
    });
    out += `\n          </div>\n`;
    out += `        </div>\n`;
    return out;
  }

  // 12b. Full panel grid (recruiters + writers) — only visible reviewers (exclude authors)
  const recruiters = (ep.recruiters || []).filter(p => p.visible !== false && !p.guideAuthor);
  const writers = (ep.writers || []).filter(p => p.visible !== false && !p.guideAuthor);
  if (recruiters.length || writers.length) {
    let gridHtml = '<div class="panel-grid">\n';
    if (recruiters.length) gridHtml += renderPeopleHtml(recruiters, 'Senior Recruiters', 'recruiters', 'search');
    if (writers.length) gridHtml += renderPeopleHtml(writers, 'Resume Writers', 'writers', 'pen-tool');
    gridHtml += '\n      </div>';
    patch(
      /<div class="panel-grid">[\s\S]*?<\/div>\s*<!-- Why This Matters/,
      gridHtml + '\n\n      <!-- Why This Matters',
      'expert panel grid (recruiters + writers)'
    );
  }
}


// ═══════════════════════════════════════════════════════════════
// 13. TESTIMONIALS
// ═══════════════════════════════════════════════════════════════
console.log('\n💬 Testimonials');

if (data.testimonials && data.testimonials.length) {
  // Helper to build gradient from a hex color (same as expert panel)
  function lightenT(hex) {
    try {
      const r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
      const lr = Math.min(255, r + 80), lg = Math.min(255, g + 80), lb = Math.min(255, b + 80);
      return '#' + [lr, lg, lb].map(v => v.toString(16).padStart(2, '0')).join('');
    } catch(e) { return '#6366F1'; }
  }

  let gridHtml = '<div class="testimonials-grid">\n';

  data.testimonials.forEach(t => {
    const stars = parseInt(t.stars) || 5;
    const color = t.avatarColor || '#4F46E5';
    const light = lightenT(color);

    gridHtml += '        <div class="testimonial-card">\n';
    gridHtml += `          <div class="testimonial-stars">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</div>\n`;
    gridHtml += `          <div class="testimonial-quote">"${he(t.quote || '')}"</div>\n`;
    gridHtml += '          <div class="testimonial-author">\n';
    gridHtml += `            <div class="testimonial-avatar" style="background:linear-gradient(135deg, ${color}, ${light});">${he(t.initials || '')}</div>\n`;
    gridHtml += '            <div>\n';
    gridHtml += `              <div class="testimonial-name">${he(t.name || '')}</div>\n`;
    gridHtml += `              <div class="testimonial-role">${he(t.role || '')}</div>\n`;
    if (t.hiredAt) {
      gridHtml += `              <div class="testimonial-hired-at"><i data-lucide="check-circle" style="width:10px;height:10px;"></i> Hired at ${he(t.hiredAt)}</div>\n`;
    }
    gridHtml += '            </div>\n';
    gridHtml += '          </div>\n';
    gridHtml += '        </div>\n';
  });

  gridHtml += '      </div>';

  patch(
    /<div class="testimonials-grid">[\s\S]*?<\/div>\s*<\/div>\s*<\/section>/,
    gridHtml + '\n    </div>\n  </section>',
    'testimonials grid'
  );
} else {
  console.log('  (no testimonials data)');
}


// ═══════════════════════════════════════════════════════════════
// PHASE-BASED SECTION VISIBILITY
// ═══════════════════════════════════════════════════════════════

const SECTION_CLASS_MAP = {
  hero:              'hero',
  performanceScore:  'perf-section',
  trustpilot:        'perf-section',        // inside perf-section
  galleryExamples:   'gallery-section',
  featuredExamples:  'featured-examples-section',
  whyToptal:         'features-section',
  guide:             'guide-section',
  faqs:              'faq-section',
  expertise:         'expertise-section',
  expertPanel:       'panel-section',
  testimonials:      'testimonials-section',
  cta:               'cta-section',
  // filterSection removed — tied to galleryExamples (they show/hide together)
  categoriesGrid:    'categories-grid-section',
  examplesSection:   'examples-section',
};

const currentPhase = data._currentPhase || 1;
const phases = data._phases || {};

// Collect unique CSS classes that should be hidden
const hiddenClasses = new Set();
for (const [sectionKey, cssClass] of Object.entries(SECTION_CLASS_MAP)) {
  const sectionPhase = phases[sectionKey] || 1;
  if (sectionPhase > currentPhase) {
    hiddenClasses.add(cssClass);
  }
}

// First: remove any previous phase-hiding (display:none from prior apply)
// This ensures sections become visible again when phase advances
html = html.replace(
  /(<section\s+class="[^"]*")(\s+style="display:\s*none\s*;?\s*")([\s>])/g,
  '$1$3'
);

// Now hide sections beyond current phase
let hideCount = 0;
for (const cssClass of hiddenClasses) {
  const re = new RegExp(`(<section\\s+class="${cssClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}")([\\s>])`, 'g');
  const before = html;
  html = html.replace(re, `$1 style="display:none"$2`);
  if (html !== before) {
    hideCount++;
    console.log(`  🔒 Hidden: section.${cssClass} (phase ${phases[Object.keys(SECTION_CLASS_MAP).find(k => SECTION_CLASS_MAP[k] === cssClass)] || '?'} > current ${currentPhase})`);
  }
}

// Filter section follows gallery — if gallery is hidden, hide filter too
if (hiddenClasses.has('gallery-section')) {
  const filterRe = /(<section\s+class="filter-section")([\s>])/g;
  const beforeFilter = html;
  html = html.replace(filterRe, `$1 style="display:none"$2`);
  if (html !== beforeFilter) {
    hideCount++;
    console.log(`  🔒 Hidden: section.filter-section (follows gallery-section)`);
  }
}

console.log(`\n📋 Phase visibility: current phase = ${currentPhase}, ${hideCount} section(s) hidden, ${Object.keys(SECTION_CLASS_MAP).length - hiddenClasses.size} visible`);


// ═══════════════════════════════════════════════════════════════
// SECTION REORDERING
// ═══════════════════════════════════════════════════════════════

const sectionOrder = data._sectionOrder;
if (Array.isArray(sectionOrder) && sectionOrder.length > 0) {
  // Build a unique-class list from the order (skip duplicates like trustpilot→perf-section)
  const seenClasses = new Set();
  const orderedClasses = [];
  for (const key of sectionOrder) {
    const cls = SECTION_CLASS_MAP[key];
    if (cls && !seenClasses.has(cls)) {
      seenClasses.add(cls);
      orderedClasses.push(cls);
    }
  }

  // Extract each <section class="xxx">...</section> block
  // We match sections that are direct children of <main> (they sit between the hero and footer)
  const sectionBlocks = {};
  for (const cls of orderedClasses) {
    const escapedCls = cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match the full section including closing tag — sections may contain nested elements
    const re = new RegExp(`([ \\t]*<section\\s+class="${escapedCls}"[^>]*>[\\s\\S]*?\\n[ \\t]*<\\/section>)`, 'm');
    const match = html.match(re);
    if (match) {
      sectionBlocks[cls] = match[1];
    }
  }

  // Only reorder if we found at least 2 sections
  const foundClasses = orderedClasses.filter(cls => sectionBlocks[cls]);
  if (foundClasses.length >= 2) {
    // Find the positions of all found sections
    const positions = [];
    for (const cls of foundClasses) {
      const idx = html.indexOf(sectionBlocks[cls]);
      if (idx >= 0) positions.push({ cls, idx, block: sectionBlocks[cls] });
    }
    positions.sort((a, b) => a.idx - b.idx);

    // Replace each original position with a placeholder
    let tempHtml = html;
    for (let i = positions.length - 1; i >= 0; i--) {
      const p = positions[i];
      tempHtml = tempHtml.replace(p.block, `<!-- __SECTION_PLACEHOLDER_${i}__ -->`);
    }

    // Now replace placeholders in desired order
    // The placeholders are in original-position order (0=first in HTML, 1=second, etc.)
    // We want to fill position 0 with the first item in orderedClasses, position 1 with second, etc.
    const orderedFound = foundClasses.map(cls => sectionBlocks[cls]);
    for (let i = 0; i < positions.length; i++) {
      tempHtml = tempHtml.replace(`<!-- __SECTION_PLACEHOLDER_${i}__ -->`, orderedFound[i]);
    }

    html = tempHtml;
    console.log(`\n🔀 Section reorder: ${foundClasses.length} sections reordered per _sectionOrder`);
    for (let i = 0; i < foundClasses.length; i++) {
      console.log(`   ${i + 1}. ${foundClasses[i]}`);
    }
  }
}


// ═══════════════════════════════════════════════════════════════
// 14. CATEGORIES GRID — Card Descriptions
// ═══════════════════════════════════════════════════════════════
console.log('\n📋 Categories grid card descriptions');

if (data._cardDescriptions) {
  const descs = data._cardDescriptions;
  let descPatched = 0;

  for (const [slug, desc] of Object.entries(descs)) {
    if (!desc) continue;

    // Build possible hrefs for this slug
    const possibleHrefs = [
      `/resume-examples/${slug}`,
      `/${slug}-resume-examples`,
    ];

    for (const href of possibleHrefs) {
      const cardMarker = `href="${href}" class="category-card"`;
      const cardIdx = html.indexOf(cardMarker);
      if (cardIdx === -1) continue;

      // Find the category-card-info block within this card
      const infoIdx = html.indexOf('category-card-meta', cardIdx);
      if (infoIdx === -1) continue;

      // Check if there's already a category-card-desc in this card
      const descIdx = html.indexOf('category-card-desc', cardIdx);
      const escapedDesc = he(desc);

      if (descIdx !== -1 && descIdx < infoIdx) {
        // Replace existing description content
        const descTagStart = html.lastIndexOf('<p', descIdx);
        const descTagEnd = html.indexOf('</p>', descIdx) + 4;
        if (descTagStart !== -1 && descTagEnd > 4) {
          const newDescTag = `<p class="category-card-desc">${escapedDesc}</p>`;
          html = html.substring(0, descTagStart) + newDescTag + html.substring(descTagEnd);
          descPatched++;
        }
      } else {
        // Insert new description before category-card-meta
        const metaDivIdx = html.lastIndexOf('<div', infoIdx);
        const indent = '              ';
        const descHtml = `${indent}<p class="category-card-desc">${escapedDesc}</p>\n            `;
        html = html.substring(0, metaDivIdx) + descHtml + html.substring(metaDivIdx);
        descPatched++;
      }
      break; // Found the card, move to next slug
    }
  }

  if (descPatched > 0) {
    patchCount += descPatched;
    console.log(`  ✓ ${descPatched} card descriptions patched`);
  } else {
    console.log('  · no card descriptions to patch');
  }
}

// Patch example counts if available
if (data._cardExampleCounts) {
  let countPatched = 0;
  for (const [slug, count] of Object.entries(data._cardExampleCounts)) {
    if (!count) continue;
    const possibleHrefs = [`/resume-examples/${slug}`, `/${slug}-resume-examples`];
    for (const href of possibleHrefs) {
      const cardMarker = `href="${href}" class="category-card"`;
      const cardIdx = html.indexOf(cardMarker);
      if (cardIdx === -1) continue;

      const countIdx = html.indexOf('category-card-count', cardIdx);
      if (countIdx === -1) continue;

      const countStart = html.indexOf('>', countIdx) + 1;
      const countEnd = html.indexOf('</span>', countIdx);
      if (countStart > 0 && countEnd > countStart) {
        const newCount = `${count} example${count !== 1 ? 's' : ''}`;
        html = html.substring(0, countStart) + newCount + html.substring(countEnd);
        countPatched++;
      }
      break;
    }
  }
  if (countPatched > 0) {
    patchCount += countPatched;
    console.log(`  ✓ ${countPatched} example counts patched`);
  }
}


// ═══════════════════════════════════════════════════════════════
// 15. ITEMLIST SCHEMA — Structured data for category cards
// ═══════════════════════════════════════════════════════════════
console.log('\n🔗 ItemList schema for category cards');

if (data._cardDescriptions) {
  // Parse category cards from HTML to get URL, name, and description
  const cardRegex = /href="([^"]+)"\s+class="category-card"[\s\S]*?class="category-card-name">([^<]+)<\/h3>[\s\S]*?class="category-card-desc">([^<]*)<\/p>/g;
  const items = [];
  let match;
  let pos = 1;

  while ((match = cardRegex.exec(html)) !== null) {
    const [, href, name, desc] = match;
    items.push({
      '@type': 'ListItem',
      position: pos++,
      name: name.trim(),
      url: `https://www.toptal.com${href}`,
      ...(desc.trim() ? { description: desc.trim() } : {})
    });
  }

  if (items.length > 0) {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Resume Example Categories',
      description: 'Popular resume example categories with curated examples, expert guides, and free downloads.',
      numberOfItems: items.length,
      itemListElement: items
    };

    const jsonLd = `<script type="application/ld+json">\n  ${JSON.stringify(schema, null, 2).replace(/\n/g, '\n  ')}\n  </script>`;

    // Remove existing ItemList schema if present
    const existingItemList = /\s*<script type="application\/ld\+json">\s*\{[^}]*"@type"\s*:\s*"ItemList"[\s\S]*?<\/script>/;
    if (existingItemList.test(html)) {
      html = html.replace(existingItemList, '');
    }

    // Insert before </body>
    html = html.replace('</body>', `  ${jsonLd}\n</body>`);
    patchCount++;
    console.log(`  ✓ ItemList schema injected with ${items.length} categories`);
  } else {
    console.log('  · no category cards found to build schema');
  }
}


// ═══════════════════════════════════════════════════════════════
// WRITE OUTPUT
// ═══════════════════════════════════════════════════════════════
fs.writeFileSync(HTML_PATH, html, 'utf-8');

console.log(`\n${'═'.repeat(60)}`);
console.log(`✅ index.html updated — ${patchCount} patches applied`);
console.log(`   Source: homepage-data.json`);
console.log(`   Target: index.html`);
console.log(`${'═'.repeat(60)}\n`);
