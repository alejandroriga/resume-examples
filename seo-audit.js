/**
 * seo-audit.js
 * Server-side SEO analysis engine for keyword coverage and rubric scoring.
 */

const { callOpenAI } = require('./openai');

// ═══════════════════════════════════════════════════════════
// HTML PARSING UTILITIES
// ═══════════════════════════════════════════════════════════

/**
 * Extract structured content from the homepage HTML.
 */
function extractPageContent(html) {
  // Meta tags
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i)
    || html.match(/<meta\s+content=["']([\s\S]*?)["']\s+name=["']description["']/i);
  const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : '';

  const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([\s\S]*?)["']/i);
  const ogTitle = ogTitleMatch ? ogTitleMatch[1].trim() : '';

  const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([\s\S]*?)["']/i);
  const ogDescription = ogDescMatch ? ogDescMatch[1].trim() : '';

  const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([\s\S]*?)["']/i);
  const ogImage = ogImageMatch ? ogImageMatch[1].trim() : '';

  const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([\s\S]*?)["']/i);
  const canonical = canonicalMatch ? canonicalMatch[1].trim() : '';

  // H1
  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  const h1s = h1Matches.map(m => stripTags(m[1]).trim());

  // H2s
  const h2Matches = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)];
  const h2s = h2Matches.map(m => stripTags(m[1]).trim());

  // Sections with visibility
  const sections = [];
  const sectionRegex = /<section\b([^>]*)>([\s\S]*?)<\/section>/gi;
  let match;
  while ((match = sectionRegex.exec(html)) !== null) {
    const attrs = match[1];
    const content = match[2];
    const classMatch = attrs.match(/class=["']([^"']+)["']/);
    const className = classMatch ? classMatch[1] : '';
    const styleMatch = attrs.match(/style=["']([^"']+)["']/);
    const style = styleMatch ? styleMatch[1] : '';
    const hidden = style.toLowerCase().includes('display:none') || style.toLowerCase().includes('display: none');
    const text = stripTags(content).replace(/\s+/g, ' ').trim();
    sections.push({ className, hidden, text, rawHtml: content });
  }

  // JSON-LD schemas
  const schemaBlocks = [];
  const ldRegex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  while ((match = ldRegex.exec(html)) !== null) {
    try {
      schemaBlocks.push(JSON.parse(match[1].trim()));
    } catch (e) { /* skip invalid */ }
  }

  // Internal links
  const linkRegex = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>/gi;
  const links = [];
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1].trim();
    if (href.startsWith('/') || href.includes('toptal.com')) {
      links.push(href);
    }
  }
  const internalLinks = [...new Set(links)];

  // Full visible text
  const visibleText = sections
    .filter(s => !s.hidden)
    .map(s => s.text)
    .join(' ')
    .toLowerCase();

  // First 100 words (above fold approximation)
  const bodyStart = html.indexOf('<body');
  const firstChunk = bodyStart >= 0 ? html.substring(bodyStart, bodyStart + 5000) : html.substring(0, 5000);
  const first100Words = stripTags(firstChunk).replace(/\s+/g, ' ').trim().split(/\s+/).slice(0, 100).join(' ').toLowerCase();

  // Images with lazy loading
  const lazyImages = (html.match(/loading=["']lazy["']/gi) || []).length;
  const totalImages = (html.match(/<img\b/gi) || []).length;

  return {
    title, metaDescription, ogTitle, ogDescription, ogImage, canonical,
    h1s, h2s, sections, schemaBlocks, internalLinks,
    visibleText, first100Words, lazyImages, totalImages
  };
}

function stripTags(html) {
  return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// ═══════════════════════════════════════════════════════════
// STEMMING (minimal, no deps)
// ═══════════════════════════════════════════════════════════

function stem(word) {
  word = word.toLowerCase().trim();
  if (word.length <= 3) return word;
  if (word.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y';
  if (word.endsWith('ses') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('es') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) return word.slice(0, -1);
  if (word.endsWith('ing') && word.length > 5) return word.slice(0, -3);
  if (word.endsWith('ed') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('ly') && word.length > 4) return word.slice(0, -2);
  return word;
}

function stemPhrase(phrase) {
  return phrase.toLowerCase().split(/\s+/).map(stem).join(' ');
}

// ═══════════════════════════════════════════════════════════
// KEYWORD COVERAGE ANALYSIS
// ═══════════════════════════════════════════════════════════

function analyzeKeywordCoverage(html, seoGoals) {
  const page = extractPageContent(html);
  const pageText = page.visibleText;
  const pageStemmed = stemPhrase(pageText);

  // Also include meta content in searchable text
  const fullSearchText = [
    pageText,
    page.title.toLowerCase(),
    page.metaDescription.toLowerCase(),
    page.h1s.join(' ').toLowerCase(),
    page.h2s.join(' ').toLowerCase()
  ].join(' ');
  const fullStemmed = stemPhrase(fullSearchText);

  const results = [];
  let found = 0;
  const tiers = {
    high:   { label: 'High Volume (>10k)', total: 0, found: 0 },
    medium: { label: 'Medium (1k–10k)',    total: 0, found: 0 },
    low:    { label: 'Low (<1k)',           total: 0, found: 0 }
  };

  for (const goal of seoGoals) {
    const kw = (goal.keyword || '').toLowerCase().trim();
    if (!kw) continue;

    const vol = parseInt(goal.volume) || 0;
    const tier = vol >= 10000 ? 'high' : vol >= 1000 ? 'medium' : 'low';
    tiers[tier].total++;

    let matchType = 'none';

    // 1. Exact match
    if (fullSearchText.includes(kw)) {
      matchType = 'exact';
    }
    // 2. Stemmed match — all stemmed tokens present
    else {
      const kwStemmed = stemPhrase(kw);
      const kwTokens = kwStemmed.split(/\s+/).filter(t => t.length > 2);
      if (kwTokens.length > 0 && kwTokens.every(t => fullStemmed.includes(t))) {
        matchType = 'stem';
      }
    }

    const isFound = matchType !== 'none';
    if (isFound) { found++; tiers[tier].found++; }

    results.push({
      keyword: goal.keyword,
      volume: vol,
      targetPosition: goal.targetPosition,
      found: isFound,
      matchType,
      tier
    });
  }

  // Sort by volume descending
  results.sort((a, b) => b.volume - a.volume);

  const total = results.length;
  return {
    total,
    found,
    missing: total - found,
    coveragePercent: total > 0 ? Math.round((found / total) * 1000) / 10 : 0,
    tiers,
    keywords: results
  };
}


// ═══════════════════════════════════════════════════════════
// RUBRIC SCORE (/110)
// ═══════════════════════════════════════════════════════════

// LSI term lists from §9 of SEO report
const LSI_TERMS = {
  documentFormats: {
    label: 'Document Formats & Output',
    terms: ['ats-friendly', 'pdf', 'word', 'docx', 'plain text', 'print-ready', 'one-page', 'two-column', 'fillable', 'editable', 'downloadable']
  },
  resumeStructure: {
    label: 'Resume Structure & Anatomy',
    terms: ['reverse-chronological', 'functional format', 'combination resume', 'hybrid layout', 'executive summary', 'skills section', 'work history', 'quantifiable achievements', 'action verbs', 'bullet points', 'career objective']
  },
  atsTechnology: {
    label: 'ATS & Parsing Technology',
    terms: ['applicant tracking system', 'keyword matching', 'machine-readable', 'parsed correctly', 'column-safe layout', 'header detection', 'font compatibility', 'plain heading tags', 'keyword density']
  },
  careerStages: {
    label: 'Career Stages & Audiences',
    terms: ['entry-level', 'mid-career', 'senior professional', 'c-suite', 'career change', 'recent graduate', 'fresher', 'executive', 'director-level', 'internship', 'mba', 'phd']
  },
  designLanguage: {
    label: 'Design & Visual Language',
    terms: ['typography', 'white space', 'visual hierarchy', 'sans-serif', 'margin balance', 'color accent', 'minimalist', 'clean layout', 'grid system', 'font pairing', 'line height', 'section spacing']
  },
  hiringContext: {
    label: 'Hiring & Recruitment Context',
    terms: ['hiring manager', 'recruiter', 'job description tailoring', 'linkedin profile', 'cover letter', 'portfolio', 'interview screening', 'shortlisted', 'callback rate', 'placement', 'talent assessment', 'candidate fit']
  }
};

// Section class mapping (CMS key → HTML class)
const SECTION_MAP = {
  hero:              'hero',
  filterBar:         'filter-section',
  galleryGrid:       'gallery-section',
  cta:               'cta-section',
  examplesJob:       'categories-grid-section',
  featuresValueProps: 'features-section',
  educationalTips:   'guide-section',
  faq:               'faq-section',
  expertise:         'expertise-section',
  expertPanel:       'panel-section',
  testimonials:      'testimonials-section',
  whyToptal:         'features-section',
  freeTemplates:     'free-templates-section'
};

async function analyzeRubricScore(html, homepageData) {
  const page = extractPageContent(html);
  const categories = [];
  const phaseNotes = [];
  const phases = homepageData._phases || {};
  const currentPhase = homepageData._currentPhase || 1;

  // Helper: check if a section class is visible
  function sectionVisible(cssClass) {
    const sec = page.sections.find(s => s.className.includes(cssClass));
    return sec ? !sec.hidden : false;
  }

  function sectionExists(cssClass) {
    return page.sections.some(s => s.className.includes(cssClass));
  }

  function sectionText(cssClass) {
    const sec = page.sections.find(s => s.className.includes(cssClass));
    return sec ? sec.text.toLowerCase() : '';
  }

  function checkSectionPhase(sectionKey, cssClass, label, maxPts) {
    if (sectionExists(cssClass) && !sectionVisible(cssClass)) {
      phaseNotes.push(`${label} deferred (hidden in current phase) — ${maxPts} pts unavailable`);
      return { deferred: true };
    }
    return { deferred: false };
  }

  // ── Category 1: Metadata & On-Page SEO [15 pts] ──
  const cat1 = { name: 'Metadata & On-Page SEO', maxScore: 15, criteria: [] };

  // Title tag [5]
  {
    const checks = [];
    const t = page.title;
    checks.push({ test: t.length > 0, detail: t.length > 0 ? `Present (${t.length} chars)` : 'Missing' });
    checks.push({ test: t.length <= 65, detail: `Length ${t.length} chars (target <=65)` });
    checks.push({ test: /resume\s*template/i.test(t), detail: 'Primary keyword "resume template"' });
    checks.push({ test: /toptal/i.test(t), detail: 'Contains Toptal brand' });
    checks.push({ test: /2026/.test(t), detail: 'Year 2026 present' });
    const passed = checks.filter(c => c.test).length;
    const score = passed === checks.length ? 5 : passed >= 3 ? 3 : passed >= 1 ? 1 : 0;
    cat1.criteria.push({
      name: 'Title Tag', score, maxScore: 5,
      checks: checks.map(c => ({ pass: c.test, detail: c.detail }))
    });
  }

  // Meta description [4]
  {
    const checks = [];
    const d = page.metaDescription;
    checks.push({ test: d.length > 0, detail: d.length > 0 ? `Present (${d.length} chars)` : 'Missing' });
    checks.push({ test: d.length >= 120 && d.length <= 160, detail: `Length ${d.length} chars (target 120-160)` });
    checks.push({ test: /^(browse|build|find|get|create|discover|explore)/i.test(d), detail: 'Opens with imperative verb' });
    checks.push({ test: /resume\s*template/i.test(d), detail: 'Contains "resume template"' });
    checks.push({ test: d.toLowerCase() !== page.title.toLowerCase(), detail: 'Different from title tag' });
    const passed = checks.filter(c => c.test).length;
    const score = passed === checks.length ? 4 : passed >= 3 ? 2 : passed >= 1 ? 1 : 0;
    cat1.criteria.push({
      name: 'Meta Description', score, maxScore: 4,
      checks: checks.map(c => ({ pass: c.test, detail: c.detail }))
    });
  }

  // H1 [4]
  {
    const checks = [];
    checks.push({ test: page.h1s.length === 1, detail: `${page.h1s.length} H1 tag(s) found (expect exactly 1)` });
    checks.push({ test: page.h1s.some(h => /resume\s*template/i.test(h)), detail: 'H1 contains "resume template"' });
    checks.push({ test: page.h1s[0] && page.h1s[0] !== page.title, detail: 'Different from title tag' });
    checks.push({ test: page.h1s[0] && page.h1s[0].length <= 80, detail: `H1 length: ${page.h1s[0] ? page.h1s[0].length : 0} chars` });
    const passed = checks.filter(c => c.test).length;
    const score = passed === checks.length ? 4 : passed >= 2 ? 2 : passed >= 1 ? 1 : 0;
    cat1.criteria.push({
      name: 'H1 Heading', score, maxScore: 4,
      checks: checks.map(c => ({ pass: c.test, detail: c.detail }))
    });
  }

  // URL & Canonical [2]
  {
    const checks = [];
    checks.push({ test: page.canonical.length > 0, detail: page.canonical ? `Canonical: ${page.canonical}` : 'Missing canonical' });
    checks.push({ test: page.ogTitle.length > 0 && page.ogDescription.length > 0, detail: 'OG tags present' });
    const passed = checks.filter(c => c.test).length;
    const score = passed === checks.length ? 2 : passed >= 1 ? 1 : 0;
    cat1.criteria.push({
      name: 'URL & Canonical', score, maxScore: 2,
      checks: checks.map(c => ({ pass: c.test, detail: c.detail }))
    });
  }

  cat1.score = cat1.criteria.reduce((s, c) => s + c.score, 0);
  categories.push(cat1);

  // ── Category 2: Must-Have Content Sections [22 pts] ──
  const cat2 = { name: 'Must-Have Content Sections', maxScore: 22, criteria: [] };

  function scoreMustHaveSection(label, cssClass, headingKws, bodyKws, maxPts) {
    const deferInfo = checkSectionPhase(null, cssClass, label, maxPts);
    if (deferInfo.deferred) {
      cat2.criteria.push({ name: label, score: 0, maxScore: maxPts, deferred: true,
        checks: [{ pass: false, detail: `Deferred — hidden in current phase` }] });
      return;
    }
    const checks = [];
    const exists = sectionExists(cssClass);
    const visible = sectionVisible(cssClass);
    const text = sectionText(cssClass);
    checks.push({ test: exists && visible, detail: exists ? (visible ? 'Visible on page' : 'Present but hidden') : 'Section not found' });

    // Check heading keywords in section
    const headingFound = headingKws.filter(kw => text.includes(kw.toLowerCase()));
    checks.push({ test: headingFound.length >= 1, detail: `Heading keywords: ${headingFound.length}/${headingKws.length} found` });

    // Check body keywords
    const bodyFound = bodyKws.filter(kw => text.includes(kw.toLowerCase()));
    checks.push({ test: bodyFound.length >= 1, detail: `Body keywords: ${bodyFound.length}/${bodyKws.length} found` });

    const passed = checks.filter(c => c.test).length;
    const score = passed === checks.length ? maxPts : passed >= 2 ? Math.round(maxPts * 0.5) : passed >= 1 ? 1 : 0;
    cat2.criteria.push({ name: label, score, maxScore: maxPts,
      checks: checks.map(c => ({ pass: c.test, detail: c.detail })) });
  }

  scoreMustHaveSection('Hero Section', 'hero',
    ['resume template', 'free', 'professional'],
    ['download', 'customiz', 'ats'], 6);

  scoreMustHaveSection('Template Filter Bar', 'filter-section',
    ['template', 'filter', 'find'],
    ['style', 'layout', 'industry'], 6);

  scoreMustHaveSection('Template Grid Gallery', 'gallery-section',
    ['resume template', 'browse', 'gallery'],
    ['preview', 'download', 'customiz'], 6);

  scoreMustHaveSection('Final CTA', 'cta-section',
    ['resume', 'template', 'start'],
    ['browse', 'download', 'free'], 6);

  cat2.score = cat2.criteria.reduce((s, c) => s + c.score, 0);
  categories.push(cat2);

  // ── Category 3: Should-Have Content Sections [13 pts] ──
  const cat3 = { name: 'Should-Have Content Sections', maxScore: 13, criteria: [] };

  function scoreShouldHaveSection(label, cssClass, maxPts) {
    const deferInfo = checkSectionPhase(null, cssClass, label, maxPts);
    if (deferInfo.deferred) {
      cat3.criteria.push({ name: label, score: 0, maxScore: maxPts, deferred: true,
        checks: [{ pass: false, detail: 'Deferred — hidden in current phase' }] });
      return;
    }
    const exists = sectionExists(cssClass);
    const visible = sectionVisible(cssClass);
    const checks = [{ test: exists && visible, detail: exists ? (visible ? 'Present and visible' : 'Present but hidden') : 'Section not found' }];
    const score = exists && visible ? maxPts : exists ? Math.round(maxPts * 0.5) : 0;
    cat3.criteria.push({ name: label, score, maxScore: maxPts,
      checks: checks.map(c => ({ pass: c.test, detail: c.detail })) });
  }

  scoreShouldHaveSection('Resume Examples by Job', 'categories-grid-section', 3);
  scoreShouldHaveSection('Features / Value Props', 'features-section', 3);
  scoreShouldHaveSection('Educational Tips / Guide', 'guide-section', 3);
  scoreShouldHaveSection('FAQ Section', 'faq-section', 3);

  cat3.score = cat3.criteria.reduce((s, c) => s + c.score, 0);
  categories.push(cat3);

  // ── Category 4: Keyword & Semantic Coverage [10 pts] ──
  const cat4 = { name: 'Keyword & Semantic Coverage', maxScore: 10, criteria: [] };

  // Primary keyword placement [4]
  {
    const kw = 'resume template';
    const locations = [];
    const inTitle = page.title.toLowerCase().includes(kw);
    const inH1 = page.h1s.some(h => h.toLowerCase().includes(kw));
    const inMeta = page.metaDescription.toLowerCase().includes(kw);
    const inFirst100 = page.first100Words.includes(kw);
    const inH2 = page.h2s.some(h => h.toLowerCase().includes(kw));

    if (inTitle) locations.push('title');
    if (inH1) locations.push('H1');
    if (inMeta) locations.push('meta description');
    if (inFirst100) locations.push('first 100 words');
    if (inH2) locations.push('H2');

    const score = Math.min(4, locations.length);
    cat4.criteria.push({
      name: 'Primary Keyword Placement', score, maxScore: 4,
      checks: [
        { pass: inTitle, detail: 'In title tag' },
        { pass: inH1, detail: 'In H1' },
        { pass: inMeta, detail: 'In meta description' },
        { pass: inFirst100, detail: 'In first 100 words' },
        { pass: inH2, detail: 'In at least one H2' }
      ]
    });
  }

  // Secondary keywords [3]
  {
    const secondaryKws = ['cv template', 'resume templates', 'resume format', 'resume templates free',
      'cv format', 'free resume templates', 'professional resume', 'ats friendly resume',
      'resume builder', 'best resume template'];
    const found = secondaryKws.filter(kw => page.visibleText.includes(kw));
    const ratio = found.length / secondaryKws.length;
    const score = ratio >= 0.5 ? 3 : ratio >= 0.3 ? 2 : ratio >= 0.1 ? 1 : 0;
    cat4.criteria.push({
      name: 'Secondary & Long-tail Keywords', score, maxScore: 3,
      checks: secondaryKws.map(kw => ({
        pass: page.visibleText.includes(kw),
        detail: kw
      }))
    });
  }

  // Search intent [3] — will be filled by AI call below
  cat4.criteria.push({ name: 'Search Intent Alignment', score: 0, maxScore: 3, checks: [], _aiPending: true });

  cat4.score = cat4.criteria.reduce((s, c) => s + c.score, 0);
  categories.push(cat4);

  // ── Category 5: LSI & Domain Vocabulary [10 pts] ──
  const cat5 = { name: 'LSI & Domain Vocabulary', maxScore: 10, criteria: [] };

  for (const [key, group] of Object.entries(LSI_TERMS)) {
    const found = group.terms.filter(t => page.visibleText.includes(t.toLowerCase()));
    const score = found.length >= 3 ? 2 : found.length >= 1 ? 1 : 0;
    cat5.criteria.push({
      name: group.label, score, maxScore: 2,
      checks: group.terms.map(t => ({
        pass: page.visibleText.includes(t.toLowerCase()),
        detail: t
      }))
    });
  }

  cat5.score = cat5.criteria.reduce((s, c) => s + c.score, 0);
  categories.push(cat5);

  // ── Category 6: Technical SEO [12 pts] ──
  const cat6 = { name: 'Technical SEO', maxScore: 12, criteria: [] };

  // Schema [5]
  {
    const schemaTypes = page.schemaBlocks.map(s => s['@type'] || (s['@graph'] ? 'graph' : 'unknown'));
    const flatTypes = page.schemaBlocks.flatMap(s => {
      if (s['@graph']) return s['@graph'].map(g => g['@type']);
      return [s['@type']];
    }).filter(Boolean);

    const hasBreadcrumb = flatTypes.some(t => /breadcrumb/i.test(t));
    const hasFAQ = flatTypes.some(t => /faq/i.test(t));
    const hasItemList = flatTypes.some(t => /itemlist/i.test(t));
    const isJsonLd = page.schemaBlocks.length > 0;

    const checks = [
      { test: isJsonLd, detail: `JSON-LD blocks: ${page.schemaBlocks.length}` },
      { test: hasBreadcrumb, detail: 'BreadcrumbList schema' },
      { test: hasFAQ, detail: 'FAQPage schema' },
      { test: hasItemList, detail: 'ItemList schema' }
    ];
    const passed = checks.filter(c => c.test).length;
    const score = passed >= 4 ? 5 : passed >= 3 ? 4 : passed >= 2 ? 3 : passed >= 1 ? 2 : 0;
    cat6.criteria.push({ name: 'Structured Data / Schema', score, maxScore: 5,
      checks: checks.map(c => ({ pass: c.test, detail: c.detail })) });
  }

  // Internal linking [4]
  {
    const count = page.internalLinks.length;
    const score = count >= 10 ? 4 : count >= 5 ? 3 : count >= 2 ? 2 : count >= 1 ? 1 : 0;
    cat6.criteria.push({
      name: 'Internal Linking', score, maxScore: 4,
      checks: [{ pass: count >= 5, detail: `${count} unique internal links found` }]
    });
  }

  // Core Web Vitals & Hygiene [3]
  {
    const checks = [
      { test: page.ogTitle.length > 0 && page.ogDescription.length > 0 && page.ogImage.length > 0,
        detail: 'Open Graph tags (title, description, image)' },
      { test: page.lazyImages > 0, detail: `Lazy loading: ${page.lazyImages}/${page.totalImages} images` },
      { test: page.canonical.length > 0, detail: 'Canonical tag present' }
    ];
    const passed = checks.filter(c => c.test).length;
    const score = passed === 3 ? 3 : passed >= 2 ? 2 : passed >= 1 ? 1 : 0;
    cat6.criteria.push({ name: 'Core Web Vitals & Hygiene', score, maxScore: 3,
      checks: checks.map(c => ({ pass: c.test, detail: c.detail })) });
  }

  cat6.score = cat6.criteria.reduce((s, c) => s + c.score, 0);
  categories.push(cat6);

  // ── Category 7: Brand & Toptal Compliance [11 pts] ──
  const cat7 = { name: 'Brand & Toptal Compliance', maxScore: 11, criteria: [] };

  // Pricing transparency [4]
  {
    const text = page.visibleText;
    const checks = [
      { test: text.includes('free') && (text.includes('download') || text.includes('template')),
        detail: '"Free" + download/template messaging' },
      { test: text.includes('no account required') || text.includes('no credit card') || text.includes('no sign'),
        detail: 'No-barrier messaging (no account/credit card/sign-up)' },
      { test: /\bpro\b|\bpremium\b/i.test(text), detail: 'Pro/Premium tier mentioned' }
    ];
    const passed = checks.filter(c => c.test).length;
    const score = passed >= 3 ? 4 : passed >= 2 ? 3 : passed >= 1 ? 2 : 0;
    cat7.criteria.push({ name: 'Pricing Tier Transparency', score, maxScore: 4,
      checks: checks.map(c => ({ pass: c.test, detail: c.detail })) });
  }

  // CTA brand voice [4] — AI pending
  cat7.criteria.push({ name: 'CTA Copy & Brand Voice', score: 0, maxScore: 4, checks: [], _aiPending: true });

  // Trademark [3]
  {
    const fullText = page.visibleText;
    const checks = [
      { test: fullText.includes('toptal'), detail: 'Toptal brand name present' },
      { test: !fullText.includes('toptal') || !/(toptal|toptaler)/i.test(fullText.replace(/toptal/gi, '')),
        detail: 'No misspellings (TopTal, Toptaler)' },
      { test: !/\b(elite|rock star|ninja|guru)\b/i.test(fullText), detail: 'No prohibited terms (elite, ninja, guru, rock star)' }
    ];
    const passed = checks.filter(c => c.test).length;
    const score = passed === 3 ? 3 : passed >= 2 ? 2 : passed >= 1 ? 1 : 0;
    cat7.criteria.push({ name: 'Trademark & Terminology', score, maxScore: 3,
      checks: checks.map(c => ({ pass: c.test, detail: c.detail })) });
  }

  cat7.score = cat7.criteria.reduce((s, c) => s + c.score, 0);
  categories.push(cat7);

  // ── Category 8: E-E-A-T, Differentiation & Anti-Automation [17 pts] ──
  const cat8 = { name: 'E-E-A-T & Anti-Automation', maxScore: 17, criteria: [] };

  // Trust signals [6] — deterministic
  {
    const checks = [
      { test: sectionExists('panel-section') && sectionVisible('panel-section'),
        detail: 'Expert panel section present' },
      { test: sectionExists('testimonials-section') && sectionVisible('testimonials-section'),
        detail: 'Testimonials section present' },
      { test: page.visibleText.includes('trustpilot') || page.visibleText.includes('4.7') || page.visibleText.includes('review'),
        detail: 'Trust badges / social proof (Trustpilot, reviews)' },
      { test: page.visibleText.includes('2.7m') || page.visibleText.includes('2,700,000') || page.visibleText.includes('million'),
        detail: 'Proprietary data points (resumes analyzed)' },
      { test: page.visibleText.includes('hiring') || page.visibleText.includes('placement'),
        detail: 'Hiring platform context' }
    ];
    const passed = checks.filter(c => c.test).length;
    const score = passed >= 5 ? 6 : passed >= 3 ? 4 : passed >= 2 ? 3 : passed >= 1 ? 1 : 0;
    cat8.criteria.push({ name: 'Anti-Automation & Trust Signals', score, maxScore: 6,
      checks: checks.map(c => ({ pass: c.test, detail: c.detail })) });
  }

  // AI-pending criteria
  cat8.criteria.push({ name: 'Toptal Unique Differentiation', score: 0, maxScore: 5, checks: [], _aiPending: true });
  cat8.criteria.push({ name: 'Original Content & Expertise', score: 0, maxScore: 6, checks: [], _aiPending: true });

  cat8.score = cat8.criteria.reduce((s, c) => s + c.score, 0);
  categories.push(cat8);

  // ── AI Evaluation (batched single call) ──
  try {
    const aiScores = await runAIEvaluation(page);

    // Fill in AI-pending criteria
    // Cat 4: Search Intent
    const intentCrit = cat4.criteria.find(c => c._aiPending);
    if (intentCrit && aiScores.searchIntent) {
      intentCrit.score = Math.min(3, aiScores.searchIntent.score || 0);
      intentCrit.checks = [{ pass: intentCrit.score >= 2, detail: aiScores.searchIntent.justification || '' }];
      delete intentCrit._aiPending;
    }

    // Cat 7: CTA Brand Voice
    const ctaCrit = cat7.criteria.find(c => c._aiPending);
    if (ctaCrit && aiScores.ctaBrandVoice) {
      ctaCrit.score = Math.min(4, aiScores.ctaBrandVoice.score || 0);
      ctaCrit.checks = [{ pass: ctaCrit.score >= 3, detail: aiScores.ctaBrandVoice.justification || '' }];
      delete ctaCrit._aiPending;
    }

    // Cat 8: Differentiation
    const diffCrit = cat8.criteria.find(c => c.name.includes('Differentiation'));
    if (diffCrit && aiScores.differentiation) {
      diffCrit.score = Math.min(5, aiScores.differentiation.score || 0);
      diffCrit.checks = [{ pass: diffCrit.score >= 3, detail: aiScores.differentiation.justification || '' }];
      delete diffCrit._aiPending;
    }

    // Cat 8: Original Content
    const origCrit = cat8.criteria.find(c => c.name.includes('Original'));
    if (origCrit && aiScores.originalContent) {
      origCrit.score = Math.min(6, aiScores.originalContent.score || 0);
      origCrit.checks = [{ pass: origCrit.score >= 4, detail: aiScores.originalContent.justification || '' }];
      delete origCrit._aiPending;
    }

    // Recalculate category totals
    for (const cat of categories) {
      cat.score = cat.criteria.reduce((s, c) => s + c.score, 0);
    }
  } catch (err) {
    console.error('AI evaluation failed, scoring without AI:', err.message);
    // Clean up pending flags
    for (const cat of categories) {
      for (const crit of cat.criteria) {
        if (crit._aiPending) {
          crit.checks = [{ pass: false, detail: 'AI evaluation unavailable' }];
          delete crit._aiPending;
        }
      }
    }
  }

  const totalScore = categories.reduce((s, c) => s + c.score, 0);
  const maxScore = 110;
  const pct = Math.round((totalScore / maxScore) * 100);
  let rating, ratingColor;
  if (pct >= 90) { rating = 'Outstanding'; ratingColor = '#4ade80'; }
  else if (pct >= 75) { rating = 'Good'; ratingColor = '#4ade80'; }
  else if (pct >= 60) { rating = 'Acceptable'; ratingColor = '#fbbf24'; }
  else if (pct >= 40) { rating = 'Needs Work'; ratingColor = '#f97316'; }
  else { rating = 'Not Ready'; ratingColor = '#ef4444'; }

  return { totalScore, maxScore, rating, ratingColor, categories, phaseNotes };
}

/**
 * Batched AI evaluation for subjective rubric criteria.
 */
async function runAIEvaluation(page) {
  // Gather excerpts
  const heroText = page.sections.find(s => s.className.includes('hero'));
  const ctaText = page.sections.find(s => s.className.includes('cta-section'));
  const first500 = page.visibleText.substring(0, 2000);
  const h2List = page.h2s.join(' | ');

  const prompt = `You are an SEO auditor evaluating a resume templates page. Score these 4 criteria based on the page content below.

PAGE TITLE: ${page.title}
META DESCRIPTION: ${page.metaDescription}
H1: ${page.h1s.join(', ')}
H2s: ${h2List}

HERO SECTION TEXT: ${heroText ? heroText.text.substring(0, 500) : 'N/A'}
CTA SECTION TEXT: ${ctaText ? ctaText.text.substring(0, 500) : 'N/A'}
VISIBLE PAGE TEXT (first 2000 chars): ${first500}

Score each criterion and provide a brief 1-sentence justification.

1. SEARCH INTENT ALIGNMENT (0-3 pts): Does the page satisfy both informational AND transactional intent for "resume templates"? Content matches title/meta promise? No bait-and-switch?

2. CTA BRAND VOICE (0-4 pts): Do CTAs use approved verbs (Build, Find, Browse, Create, Get Started)? NOT "Hire" (wrong product). Voice direct and fact-based? No superlatives/unverifiable claims? CTA reflects free tier?

3. TOPTAL DIFFERENTIATION (0-5 pts): Does the page communicate Toptal is a hiring platform, not just a template gallery? References data advantage (resumes reviewed, talent assessed)? Specific/factual claims no competitor can replicate?

4. ORIGINAL CONTENT & EXPERTISE (0-6 pts): Original proprietary data points? Genuine ATS/hiring knowledge? Not paraphrased competitor content? Clear editorial POV? Author/team identified? Content depth exceeds competitors?

Respond in JSON only:
{
  "searchIntent": { "score": 0, "justification": "" },
  "ctaBrandVoice": { "score": 0, "justification": "" },
  "differentiation": { "score": 0, "justification": "" },
  "originalContent": { "score": 0, "justification": "" }
}`;

  const response = await callOpenAI(
    [{ role: 'system', content: 'You are an expert SEO auditor. Respond with valid JSON only.' },
     { role: 'user', content: prompt }],
    { type: 'json_object' },
    { maxTokens: 600, temperature: 0.2 }
  );

  return JSON.parse(response);
}


module.exports = { extractPageContent, analyzeKeywordCoverage, analyzeRubricScore };
