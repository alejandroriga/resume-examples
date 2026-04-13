/**
 * Replaces the 29 showcase sections in index.html with a compact 12-card grid
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(filePath, 'utf-8');

// Find markers by searching for the text identifiers
function findHtmlComment(html, text, startFrom) {
  const idx = html.indexOf(text, startFrom || 0);
  if (idx === -1) return -1;
  // Walk back to find the start of the <!-- comment
  let i = idx;
  while (i > 0 && html.substring(i - 5, i) !== '<!-- ') i--;
  if (i <= 0) return -1;
  // Walk further back to find leading whitespace
  let lineStart = i - 5;
  while (lineStart > 0 && html[lineStart - 1] === ' ') lineStart--;
  return lineStart;
}

const startIdx = findHtmlComment(html, 'CATEGORY SHOWCASE SECTIONS', 100000);
const endText = 'SECTION 3.5';
const endIdx = findHtmlComment(html, endText, startIdx + 100);

if (startIdx === -1) { console.error('START NOT FOUND'); process.exit(1); }
if (endIdx === -1) { console.error('END NOT FOUND'); process.exit(1); }
console.log('Start marker at char:', startIdx, '/ End marker at char:', endIdx);

function card(href, icon, iconBg, name, mockHtml, description) {
  const descHtml = description ? `\n              <p class="category-card-desc">${description}</p>` : '';
  return `
        <!-- ${name} -->
        <a href="${href}" class="category-card">
          <div class="category-card-preview">
            ${mockHtml}
          </div>
          <div class="category-card-info">
            <div class="category-card-title">
              <div class="category-card-icon" style="background:${iconBg};"><i data-lucide="${icon}" style="width:16px;height:16px;"></i></div>
              <span class="category-card-name">${name}</span>
            </div>${descHtml}
            <div class="category-card-meta">
              <span class="category-card-count">6 templates</span>
              <span class="category-card-link">View all <i data-lucide="arrow-right" style="width:14px;height:14px;"></i></span>
            </div>
          </div>
        </a>`;
}

function singleCol(nameColor, titleColor, sectionColor, lineColor) {
  return `<div class="resume-mock" style="padding:10%;">
              <div class="rm-name" style="width:60%;height:8px;margin-bottom:6px;background:${nameColor};"></div>
              <div class="rm-title" style="width:40%;height:5px;margin-bottom:4px;background:${titleColor};"></div>
              <div style="height:1px;background:#e5e7eb;margin:4px 0 8px;"></div>
              <div class="rm-section-title" style="height:5px;width:35%;margin-bottom:6px;margin-top:8px;background:${sectionColor};"></div>
              <div class="rm-line" style="width:95%;height:3px;margin-bottom:5px;background:${lineColor};"></div>
              <div class="rm-line" style="width:88%;height:3px;margin-bottom:5px;background:${lineColor};"></div>
              <div class="rm-line" style="width:92%;height:3px;margin-bottom:5px;background:${lineColor};"></div>
              <div class="rm-section-title" style="height:5px;width:30%;margin-bottom:6px;margin-top:8px;background:${sectionColor};"></div>
              <div class="rm-line" style="width:90%;height:3px;margin-bottom:5px;background:${lineColor};"></div>
              <div class="rm-line" style="width:85%;height:3px;margin-bottom:5px;background:${lineColor};"></div>
            </div>`;
}

function twoCol(sidebarBg, sectionColor, lineColor) {
  return `<div class="resume-mock two-col" style="padding:0;">
              <div class="rm-sidebar" style="width:35%;padding:10% 6%;background:${sidebarBg};">
                <div class="rm-name" style="width:80%;height:7px;margin-bottom:5px;"></div>
                <div class="rm-title" style="width:60%;height:4px;margin-bottom:12%;"></div>
                <div class="rm-section-title" style="width:50%;height:4px;margin-bottom:5px;margin-top:0;"></div>
                <div class="rm-line" style="width:85%;"></div>
                <div class="rm-line" style="width:75%;"></div>
              </div>
              <div class="rm-main" style="flex:1;padding:10% 6%;">
                <div class="rm-section-title" style="margin-top:0;background:${sectionColor};"></div>
                <div class="rm-line" style="width:95%;background:${lineColor};"></div>
                <div class="rm-line" style="width:88%;background:${lineColor};"></div>
                <div class="rm-section-title" style="background:${sectionColor};"></div>
                <div class="rm-line" style="width:90%;background:${lineColor};"></div>
                <div class="rm-line" style="width:85%;background:${lineColor};"></div>
              </div>
            </div>`;
}

function minimalCol(nameColor, titleColor, sectionColor, lineColor) {
  return `<div class="resume-mock" style="padding:10%;">
              <div class="rm-name" style="width:45%;height:7px;margin-bottom:4px;background:${nameColor};"></div>
              <div class="rm-title" style="width:30%;height:4px;margin-bottom:4px;background:${titleColor};"></div>
              <div style="height:1px;background:#e5e7eb;margin:8px 0 12px;"></div>
              <div class="rm-section-title" style="height:5px;width:25%;margin-bottom:6px;margin-top:0;background:${sectionColor};"></div>
              <div class="rm-line" style="width:95%;height:3px;margin-bottom:5px;background:${lineColor};"></div>
              <div class="rm-line" style="width:88%;height:3px;margin-bottom:5px;background:${lineColor};"></div>
              <div style="height:10px;"></div>
              <div class="rm-section-title" style="height:5px;width:28%;margin-bottom:6px;background:${sectionColor};"></div>
              <div class="rm-line" style="width:90%;height:3px;margin-bottom:5px;background:${lineColor};"></div>
              <div class="rm-line" style="width:82%;height:3px;margin-bottom:5px;background:${lineColor};"></div>
            </div>`;
}

function centeredCol(nameColor, titleColor, sectionColor, lineColor) {
  return `<div class="resume-mock" style="padding:10%;text-align:center;align-items:center;">
              <div class="rm-name" style="width:50%;height:8px;margin:0 auto 6px;background:${nameColor};"></div>
              <div class="rm-title" style="width:35%;height:5px;margin:0 auto 4px;background:${titleColor};"></div>
              <div style="height:1px;background:#e5e7eb;margin:4px 0 8px;"></div>
              <div class="rm-section-title" style="width:25%;height:5px;margin:8px auto 6px;background:${sectionColor};"></div>
              <div class="rm-line" style="width:90%;height:3px;margin:0 auto 5px;background:${lineColor};"></div>
              <div class="rm-line" style="width:85%;height:3px;margin:0 auto 5px;background:${lineColor};"></div>
              <div class="rm-section-title" style="width:28%;height:5px;margin:8px auto 6px;background:${sectionColor};"></div>
              <div class="rm-line" style="width:92%;height:3px;margin:0 auto 5px;background:${lineColor};"></div>
              <div class="rm-line" style="width:80%;height:3px;margin:0 auto 5px;background:${lineColor};"></div>
            </div>`;
}

function headerBarCol(nameColor, titleColor, sectionColor, lineColor) {
  return `<div class="resume-mock" style="padding:0;">
              <div style="padding:8% 12% 6%;">
                <div class="rm-name" style="width:55%;height:8px;margin-bottom:5px;background:${nameColor};"></div>
                <div class="rm-title" style="width:40%;height:4px;margin-bottom:0;background:${titleColor};"></div>
              </div>
              <div style="height:1px;background:#e5e7eb;margin:0;"></div>
              <div style="padding:6% 12% 10%;">
                <div class="rm-section-title" style="margin-top:4px;background:${sectionColor};"></div>
                <div class="rm-line" style="width:95%;background:${lineColor};"></div>
                <div class="rm-line" style="width:88%;background:${lineColor};"></div>
                <div class="rm-section-title" style="background:${sectionColor};"></div>
                <div class="rm-line" style="width:85%;background:${lineColor};"></div>
                <div class="rm-line" style="width:90%;background:${lineColor};"></div>
              </div>
            </div>`;
}

const cards = [
  card('/free-resume-templates', 'gift', '#10B981', 'Free Templates',
    singleCol('#374151', '#9CA3AF', '#374151', '#F3F4F6'),
    'Download free resume templates instantly — no sign-up needed. ATS-tested formats in Word and PDF.'),
  card('/resume-templates/ats', 'shield-check', '#065F46', 'ATS-Friendly',
    singleCol('#065F46', '#6EE7B7', '#065F46', '#ECFDF5'),
    'Resume templates built to pass applicant tracking systems at Workday, Greenhouse, and iCIMS.'),
  card('/resume-templates/simple', 'layout', '#374151', 'Simple & Standard',
    minimalCol('#374151', '#9CA3AF', '#374151', '#F3F4F6'),
    'Clean, straightforward layouts that let your experience and qualifications speak for themselves.'),
  card('/resume-templates/professional', 'briefcase', '#1E3A5F', 'Professional',
    twoCol('#0F256E', '#0F256E', '#e5e7eb'),
    'Polished designs favored by hiring managers in corporate, finance, and executive roles.'),
  card('/resume-templates/modern', 'zap', '#204ECF', 'Modern',
    singleCol('#204ECF', '#7C93DB', '#204ECF', '#eef0f4'),
    'Contemporary designs with clean typography and strategic use of color accents.'),
  card('/resume-templates/creative', 'palette', '#7C3AED', 'Creative',
    twoCol('#7C3AED', '#7C3AED', '#F3F0FF'),
    'Bold layouts with visual flair for design, marketing, and creative industry professionals.'),
  card('/resume-templates/one-page', 'file-text', '#0D9488', 'One-Page',
    centeredCol('#0D9488', '#5EEAD4', '#0D9488', '#F0FDFA'),
    'Concise single-page templates that highlight your strongest qualifications at a glance.'),
  card('/resume-templates/word', 'file-type', '#2B579A', 'Word & DOCX',
    headerBarCol('#2B579A', '#7B9BD4', '#2B579A', '#EDF1FD'),
    'Fully editable DOCX templates compatible with Microsoft Word 2016 and later versions.'),
  card('/resume-templates/google-docs', 'file-text', '#0F9D58', 'Google Docs',
    singleCol('#0F9D58', '#81C995', '#0F9D58', '#E6F4EA'),
    'Resume templates formatted for Google Docs — live editing, easy sharing, no downloads.'),
  card('/resume-templates/student', 'graduation-cap', '#6D28D9', 'Student & Entry-Level',
    singleCol('#6D28D9', '#A78BFA', '#6D28D9', '#EDE9FE'),
    'Designed for students, recent graduates, and first-time job seekers starting their careers.'),
  card('/resume-templates/two-column', 'columns', '#204ECF', 'Two-Column',
    twoCol('#204ECF', '#204ECF', '#eef0f4'),
    'Space-efficient layouts that organize your skills and experience side by side.'),
  card('/resume-templates/minimalist', 'minus-circle', '#111827', 'Minimalist & Clean',
    minimalCol('#111827', '#D1D5DB', '#111827', '#F9FAFB'),
    'Stripped-back designs with generous whitespace and a focused content hierarchy.'),
];

const morePills = [
  ['/resume-templates/traditional', 'Traditional'],
  ['/resume-templates/with-photo', 'With Photo'],
  ['/functional-resume-templates', 'Functional'],
  ['/chronological-resume-templates', 'Chronological'],
  ['/europass-resume-templates', 'Europass'],
  ['/overleaf-resume-templates', 'Overleaf / LaTeX'],
  ['/two-page-resume-templates', 'Two-Page'],
  ['/experienced-resume-templates', 'Experienced'],
  ['/internship-resume-templates', 'Internship'],
  ['/easy-resume-templates', 'Easy'],
  ['/basic-resume-templates', 'Basic'],
  ['/pdf-resume-templates', 'PDF'],
  ['/printable-resume-templates', 'Free Printable'],
  ['/british-resume-templates', 'British CV'],
  ['/canadian-resume-templates', 'Canadian'],
  ['/american-resume-templates', 'American'],
  ['/australian-resume-templates', 'Australian'],
];

const pillsHtml = morePills.map(([url, label]) =>
  `          <a href="${url}" class="more-pill">${label}</a>`
).join('\n');

const newSection = `  <!-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
       BROWSE BY CATEGORY (COMPACT GRID)
       \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->
  <section class="categories-grid-section">
    <div class="container">

      <div class="categories-grid-header">
        <div class="section-eyebrow" style="display:inline-flex;align-items:center;gap:8px;background:var(--blue-light);color:var(--blue);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:6px 14px;border-radius:100px;margin-bottom:16px;">
          <i data-lucide="grid" style="width:14px;height:14px;"></i>
          Browse by Category
        </div>
        <h2>Resume Templates for Every Need</h2>
        <p>Explore 29 categories \u2014 each with curated templates, expert guides, and free downloads.</p>
      </div>

      <div class="categories-grid">
${cards.join('\n')}
      </div>

      <!-- More Categories -->
      <div class="more-categories">
        <p class="more-categories-label">More Categories</p>
        <div class="more-categories-pills">
${pillsHtml}
        </div>
      </div>

    </div>
  </section>

`;

html = html.substring(0, startIdx) + newSection + html.substring(endIdx);
fs.writeFileSync(filePath, html, 'utf-8');

const lines = html.split('\n').length;
console.log(`Done! File: ${(html.length / 1024).toFixed(1)} KB, ${lines} lines`);
console.log(`Removed ~1,770 lines of showcases, added ~300 lines of compact grid`);
