/**
 * generate-seo-briefs.js
 *
 * Reads page-data.js and generates comprehensive SEO brief instructions
 * for all 29 resume template sub-pages. Outputs seo-briefs-all.json.
 *
 * Usage: node generate-seo-briefs.js
 */

const fs = require('fs');
const path = require('path');
const pages = require('./page-data.js');

// ═══════════════════════════════════════════════════════════════════════
//  SECTION A: PAGE SEO CONFIGURATION — Keyword research per page
// ═══════════════════════════════════════════════════════════════════════

const PAGE_SEO_CONFIG = {

  // ─── STYLE PAGES ───

  'ats': {
    primaryKW: 'ATS resume template',
    secondaryKWs: ['ATS-friendly resume', 'ATS resume format', 'applicant tracking system resume', 'ATS-optimized resume'],
    lsiTerms: ['Workday', 'Greenhouse', 'Lever', 'Taleo', 'iCIMS', 'keyword matching', 'resume parsing', 'machine-readable', 'resume scanner'],
    intent: 'commercial investigation',
    audience: 'job seekers applying through online portals at mid-to-large companies',
    differentiator: 'machine readability and parsing compatibility over visual design',
    competitorAngle: 'Jobscan, Resume.io, Zety for ATS-specific template searches',
    topPAA: ['What is an ATS-friendly resume?', 'How do I make my resume ATS compatible?', 'Do ATS systems reject resumes?', 'What format is best for ATS?'],
  },

  'simple': {
    primaryKW: 'simple resume template',
    secondaryKWs: ['clean resume template', 'basic resume layout', 'straightforward resume', 'no-frills resume template'],
    lsiTerms: ['white space', 'readability', 'minimalism', 'professional', 'easy to scan', 'clutter-free', 'classic format'],
    intent: 'commercial investigation',
    audience: 'professionals across all industries who prefer clarity over complexity',
    differentiator: 'emphasizes clarity and universality — works in any industry',
    competitorAngle: 'Canva, Indeed, Resume.io for simple/clean template searches',
    topPAA: ['What is a simple resume format?', 'Is a simple resume better?', 'What should a basic resume look like?', 'How to make a simple resume?'],
  },

  'professional': {
    primaryKW: 'professional resume template',
    secondaryKWs: ['business resume template', 'corporate resume layout', 'executive resume format', 'polished resume template'],
    lsiTerms: ['corporate', 'executive', 'business formal', 'career advancement', 'leadership', 'C-suite', 'management', 'Fortune 500'],
    intent: 'commercial investigation',
    audience: 'mid-to-senior career professionals, managers, and executives',
    differentiator: 'polished and authoritative — signals seniority and business acumen',
    competitorAngle: 'Zety, Novoresume, TopResume for professional template searches',
    topPAA: ['What is the most professional resume format?', 'What resume template do employers prefer?', 'How do I make my resume look professional?', 'What is the best resume format for 2025?'],
  },

  'creative': {
    primaryKW: 'creative resume template',
    secondaryKWs: ['designer resume template', 'artistic resume layout', 'creative CV template', 'portfolio resume template'],
    lsiTerms: ['graphic design', 'portfolio', 'visual storytelling', 'typography', 'color palette', 'branding', 'Adobe', 'UX/UI'],
    intent: 'commercial investigation',
    audience: 'designers, artists, marketers, and creative professionals',
    differentiator: 'showcases visual design skills and personal brand through layout',
    competitorAngle: 'Canva, Behance, Envato for creative resume template searches',
    topPAA: ['Are creative resumes a good idea?', 'What jobs accept creative resumes?', 'How do I make a creative resume?', 'Do employers like creative resumes?'],
  },

  'minimalist': {
    primaryKW: 'minimalist resume template',
    secondaryKWs: ['minimal resume design', 'clean minimal resume', 'elegant resume template', 'less-is-more resume'],
    lsiTerms: ['negative space', 'typography-driven', 'Helvetica', 'elegant', 'refined', 'understated', 'Scandinavian design'],
    intent: 'commercial investigation',
    audience: 'design-conscious professionals who value aesthetic restraint and sophistication',
    differentiator: 'intentional use of space and typography — elegance through restraint',
    competitorAngle: 'Canva, Resumake, LaTeX templates for minimalist resume searches',
    topPAA: ['What is a minimalist resume?', 'Is a minimalist resume good?', 'What should a minimalist resume include?', 'How do I create a minimalist resume?'],
  },

  'modern': {
    primaryKW: 'modern resume template',
    secondaryKWs: ['contemporary resume design', 'updated resume format', '2025 resume template', 'trendy resume layout'],
    lsiTerms: ['infographic elements', 'skill bars', 'icons', 'sidebar layout', 'color accents', 'tech-savvy', 'digital-first'],
    intent: 'commercial investigation',
    audience: 'professionals in tech, startups, and forward-thinking industries',
    differentiator: 'incorporates current design trends — sidebars, icons, visual skill indicators',
    competitorAngle: 'Zety, Novoresume, Enhancv for modern resume template searches',
    topPAA: ['What does a modern resume look like?', 'What is the best resume format for 2025?', 'Are modern resume templates ATS-friendly?', 'Should I use a modern resume template?'],
  },

  'traditional': {
    primaryKW: 'traditional resume template',
    secondaryKWs: ['classic resume format', 'conventional resume layout', 'standard resume template', 'old-school resume format'],
    lsiTerms: ['Times New Roman', 'reverse chronological', 'conservative', 'formal', 'corporate', 'established industries', 'banking', 'legal'],
    intent: 'commercial investigation',
    audience: 'professionals in conservative industries: finance, law, government, academia',
    differentiator: 'proven format that signals professionalism in conservative fields',
    competitorAngle: 'Indeed, Microsoft Word templates, Resume-Now for traditional format searches',
    topPAA: ['What is a traditional resume format?', 'When should I use a traditional resume?', 'What industries prefer traditional resumes?', 'Is a traditional resume still effective?'],
  },

  'basic': {
    primaryKW: 'basic resume template',
    secondaryKWs: ['beginner resume template', 'starter resume layout', 'plain resume format', 'entry-level resume template'],
    lsiTerms: ['first resume', 'no experience', 'starter', 'foundational', 'fill-in-the-blank', 'quick setup', 'straightforward'],
    intent: 'commercial investigation',
    audience: 'first-time job seekers, career changers, and anyone who needs a quick starting point',
    differentiator: 'lowest barrier to entry — no design decisions needed, just fill and submit',
    competitorAngle: 'Google Docs templates, Indeed, My Perfect Resume for basic resume searches',
    topPAA: ['What is a basic resume?', 'How do I write a basic resume?', 'What should a basic resume contain?', 'Is a basic resume OK?'],
  },

  // ─── FORMAT PAGES ───

  'one-page': {
    primaryKW: 'one page resume template',
    secondaryKWs: ['single page resume', 'one-page CV template', 'concise resume layout', 'short resume template'],
    lsiTerms: ['concise', 'brevity', 'content prioritization', 'space optimization', 'font sizing', 'margin adjustment', 'condensed'],
    intent: 'commercial investigation',
    audience: 'early-to-mid career professionals and anyone applying where brevity is valued',
    differentiator: 'optimized for fitting maximum impact on a single page',
    competitorAngle: 'Zety, Resume.io, Kickresume for one-page resume searches',
    topPAA: ['Should a resume be one page?', 'How do I fit my resume on one page?', 'Is a one-page resume better?', 'What to cut to make resume one page?'],
  },

  'two-page': {
    primaryKW: 'two page resume template',
    secondaryKWs: ['2-page resume format', 'multi-page resume template', 'extended resume layout', 'long resume template'],
    lsiTerms: ['senior professional', 'extensive experience', 'page break', 'continuation header', '10+ years', 'academic CV', 'detailed work history'],
    intent: 'commercial investigation',
    audience: 'senior professionals, executives, and academics with extensive experience',
    differentiator: 'structured for 10+ years of experience with proper page-break handling',
    competitorAngle: 'Novoresume, Resume Genius, Hloom for two-page resume searches',
    topPAA: ['When should a resume be two pages?', 'Is a two-page resume acceptable?', 'How do I format a two-page resume?', 'What goes on page two of a resume?'],
  },

  'two-column': {
    primaryKW: 'two column resume template',
    secondaryKWs: ['2-column resume layout', 'sidebar resume template', 'split-column resume', 'dual-column resume format'],
    lsiTerms: ['sidebar', 'information density', 'skills column', 'contact sidebar', 'visual hierarchy', 'left panel', 'grid layout'],
    intent: 'commercial investigation',
    audience: 'professionals who want to display more information in an organized visual layout',
    differentiator: 'maximizes information density with a sidebar for skills/contact and main body for experience',
    competitorAngle: 'Canva, Novoresume, Enhancv for two-column resume searches',
    topPAA: ['Are two-column resumes ATS-friendly?', 'What is a two-column resume?', 'Is a sidebar resume good?', 'How to format a two-column resume?'],
  },

  'functional': {
    primaryKW: 'functional resume template',
    secondaryKWs: ['skills-based resume', 'functional CV format', 'skill-focused resume template', 'non-chronological resume'],
    lsiTerms: ['career gap', 'career change', 'transferable skills', 'skills grouping', 'relevance-based', 'de-emphasize dates', 'competency-based'],
    intent: 'commercial investigation',
    audience: 'career changers, professionals with employment gaps, and those re-entering the workforce',
    differentiator: 'organizes by skill rather than timeline — de-emphasizes career gaps',
    competitorAngle: 'Indeed, The Muse, Resume Genius for functional resume searches',
    topPAA: ['What is a functional resume?', 'When should I use a functional resume?', 'Do employers like functional resumes?', 'What is the difference between functional and chronological?'],
  },

  'chronological': {
    primaryKW: 'chronological resume template',
    secondaryKWs: ['reverse chronological resume', 'timeline resume format', 'chronological CV template', 'date-ordered resume'],
    lsiTerms: ['work history', 'career progression', 'reverse order', 'most recent first', 'timeline', 'employment dates', 'career trajectory'],
    intent: 'commercial investigation',
    audience: 'professionals with a steady career progression and no significant employment gaps',
    differentiator: 'the standard format recruiters expect — showcases career trajectory clearly',
    competitorAngle: 'Indeed, Zety, The Balance for chronological resume searches',
    topPAA: ['What is a chronological resume?', 'Is chronological resume the best format?', 'How do I write a chronological resume?', 'What is reverse chronological order on a resume?'],
  },

  'pdf': {
    primaryKW: 'PDF resume template',
    secondaryKWs: ['resume PDF download', 'downloadable resume template', 'PDF CV template', 'resume template PDF format'],
    lsiTerms: ['download', 'print-ready', 'portable document', 'formatting preserved', 'cross-platform', 'email attachment', 'file format'],
    intent: 'transactional',
    audience: 'job seekers who need a ready-to-download, print-ready resume file',
    differentiator: 'focuses on download/print readiness and cross-platform formatting consistency',
    competitorAngle: 'Template.net, Hloom, FreePik for PDF resume template downloads',
    topPAA: ['Should I send my resume as PDF?', 'How do I make a PDF resume?', 'Is PDF or Word better for resumes?', 'Where can I download a free resume template?'],
  },

  'word': {
    primaryKW: 'Word resume template',
    secondaryKWs: ['Microsoft Word resume template', 'resume template DOCX', '.doc resume format', 'Word document resume'],
    lsiTerms: ['Microsoft Office', '.docx', 'editable', 'Word formatting', 'Office 365', 'track changes', 'spell check'],
    intent: 'transactional',
    audience: 'job seekers who prefer editing in Microsoft Word or need .docx format for ATS',
    differentiator: 'native Word format for easy editing with familiar tools',
    competitorAngle: 'Microsoft Office templates, Hloom, Resume.io for Word template searches',
    topPAA: ['How do I make a resume in Word?', 'Does Microsoft Word have resume templates?', 'Is Word good for resume making?', 'Where can I get free Word resume templates?'],
  },

  // ─── PLATFORM PAGES ───

  'google-docs': {
    primaryKW: 'Google Docs resume template',
    secondaryKWs: ['resume template for Google Docs', 'Google Drive resume format', 'free Google Docs resume', 'Google Docs CV template'],
    lsiTerms: ['Google Drive', 'cloud-based', 'collaborative editing', 'shareable link', 'real-time editing', 'free', 'browser-based'],
    intent: 'transactional',
    audience: 'job seekers who prefer free, cloud-based tools and Google ecosystem',
    differentiator: 'designed specifically for Google Docs constraints and strengths',
    competitorAngle: 'Google template gallery, Goodocs, Resume.io for Google Docs resume searches',
    topPAA: ['Does Google Docs have resume templates?', 'How to make a resume in Google Docs?', 'Are Google Docs resumes professional?', 'Can I use Google Docs for my resume?'],
  },

  'overleaf': {
    primaryKW: 'Overleaf resume template',
    secondaryKWs: ['LaTeX resume template', 'Overleaf CV template', 'LaTeX CV format', 'academic resume LaTeX'],
    lsiTerms: ['LaTeX', 'typesetting', 'academic CV', 'research', 'publications', 'IEEE', 'Computer Science', 'PhD', 'postdoc'],
    intent: 'commercial investigation',
    audience: 'academics, researchers, engineers, and computer scientists who use LaTeX',
    differentiator: 'leverages LaTeX typesetting for publication-quality formatting',
    competitorAngle: 'Overleaf gallery, ShareLaTeX, GitHub LaTeX templates',
    topPAA: ['How to make a resume in Overleaf?', 'What is the best LaTeX resume template?', 'Is LaTeX good for resumes?', 'How to use Overleaf for CV?'],
  },

  // ─── AUDIENCE PAGES ───

  'student': {
    primaryKW: 'student resume template',
    secondaryKWs: ['college resume template', 'university student CV', 'graduate resume format', 'entry-level resume template'],
    lsiTerms: ['GPA', 'coursework', 'internship', 'extracurricular', 'campus leadership', 'Dean\'s list', 'part-time', 'volunteer'],
    intent: 'commercial investigation',
    audience: 'college students, recent graduates, and young professionals with limited work experience',
    differentiator: 'structured to highlight education, projects, and extracurriculars over work history',
    competitorAngle: 'Zety, Indeed, Resume.io for student resume template searches',
    topPAA: ['How do I write a resume as a student?', 'What should a student resume look like?', 'How to make a resume with no experience?', 'What do I put on a student resume?'],
  },

  'internship': {
    primaryKW: 'internship resume template',
    secondaryKWs: ['intern resume format', 'internship application resume', 'summer internship CV', 'intern resume example'],
    lsiTerms: ['summer internship', 'co-op', 'relevant coursework', 'projects', 'skills section', 'career objective', 'cover letter'],
    intent: 'commercial investigation',
    audience: 'college students and recent graduates applying specifically for internship positions',
    differentiator: 'tailored for internship applications — highlights potential over experience',
    competitorAngle: 'Indeed, Handshake, WayUp for internship resume searches',
    topPAA: ['How do I write an internship resume?', 'What should be on an internship resume?', 'Do interns need a resume?', 'How long should an intern resume be?'],
  },

  'experienced': {
    primaryKW: 'experienced resume template',
    secondaryKWs: ['senior professional resume', 'executive resume template', 'experienced worker CV', '10+ years resume format'],
    lsiTerms: ['career highlights', 'achievements', 'leadership', 'P&L', 'revenue growth', 'team management', 'strategic', 'C-level'],
    intent: 'commercial investigation',
    audience: 'senior professionals with 10+ years of experience, managers, directors, VPs',
    differentiator: 'designed to showcase depth of experience, leadership, and measurable achievements',
    competitorAngle: 'TopResume, Ladders, Zety for senior/experienced resume searches',
    topPAA: ['What resume format is best for experienced professionals?', 'How do I write a resume with 20 years of experience?', 'Should an experienced resume be two pages?', 'What do senior-level resumes look like?'],
  },

  // ─── ATTRIBUTE PAGES ───

  'free': {
    primaryKW: 'free resume template',
    secondaryKWs: ['free resume download', 'no-cost resume template', 'free CV template', 'resume template free download'],
    lsiTerms: ['free download', 'no sign-up', 'no watermark', 'completely free', 'no hidden costs', 'open access', 'free to use'],
    intent: 'transactional',
    audience: 'budget-conscious job seekers who want quality templates without paying',
    differentiator: 'genuinely free with no hidden costs, sign-ups, or watermarks',
    competitorAngle: 'Canva free, Google Docs, Indeed for free resume template searches',
    topPAA: ['Where can I get a free resume template?', 'Are free resume templates good?', 'What is the best free resume builder?', 'Can I download a resume template for free?'],
  },

  'easy': {
    primaryKW: 'easy resume template',
    secondaryKWs: ['simple to use resume', 'fill-in resume template', 'quick resume builder', 'beginner-friendly resume'],
    lsiTerms: ['fill-in-the-blank', 'guided', 'step-by-step', 'no design skills', 'plug-and-play', 'fast', '10 minutes'],
    intent: 'commercial investigation',
    audience: 'people who find resume creation intimidating or want the fastest path to a finished resume',
    differentiator: 'lowest friction — fill in your details and you are done',
    competitorAngle: 'Indeed resume builder, Resume.com, MyPerfectResume for easy resume searches',
    topPAA: ['What is the easiest way to make a resume?', 'How do I create a simple resume quickly?', 'What is the easiest resume format?', 'Can I make a resume in 10 minutes?'],
  },

  'printable': {
    primaryKW: 'printable resume template',
    secondaryKWs: ['print-ready resume', 'resume template to print', 'printable CV format', 'hard copy resume template'],
    lsiTerms: ['print quality', 'paper size', 'A4', 'Letter', 'margins', 'ink-friendly', 'career fair', 'in-person', 'hard copy'],
    intent: 'transactional',
    audience: 'job seekers attending career fairs, networking events, or in-person interviews',
    differentiator: 'optimized for print quality — proper margins, ink-efficient design, paper-size options',
    competitorAngle: 'Template.net, Hloom, Canva Print for printable resume searches',
    topPAA: ['What is a printable resume?', 'How do I print a resume properly?', 'What paper should I print my resume on?', 'Should I bring a printed resume to an interview?'],
  },

  'with-photo': {
    primaryKW: 'resume template with photo',
    secondaryKWs: ['photo resume template', 'resume with headshot', 'CV template with picture', 'resume with profile photo'],
    lsiTerms: ['headshot', 'profile picture', 'professional photo', 'LinkedIn photo', 'personal branding', 'visual identity', 'European CV'],
    intent: 'commercial investigation',
    audience: 'professionals in industries/regions where photos are common (Europe, Asia, creative fields)',
    differentiator: 'includes a dedicated photo placement area with proper sizing and alignment',
    competitorAngle: 'Canva, Europass, Novoresume for photo resume template searches',
    topPAA: ['Should I put a photo on my resume?', 'When is it OK to include a photo on a resume?', 'What countries require a photo on resume?', 'How do I add a photo to my resume template?'],
  },

  'europass': {
    primaryKW: 'Europass resume template',
    secondaryKWs: ['Europass CV template', 'European CV format', 'EU resume template', 'Europass format download'],
    lsiTerms: ['European Union', 'CEDEFOP', 'standardized CV', 'language passport', 'mobility', 'Schengen', 'recognition of qualifications'],
    intent: 'commercial investigation',
    audience: 'job seekers applying for positions within EU member states or European institutions',
    differentiator: 'follows the official Europass CV standard recognized across EU countries',
    competitorAngle: 'europa.eu Europass editor, CVmaker, EuropassMaker',
    topPAA: ['What is a Europass CV?', 'Is Europass CV still used?', 'How do I create a Europass CV?', 'What countries use Europass format?'],
  },

  // ─── REGION PAGES ───

  'british': {
    primaryKW: 'British CV template',
    secondaryKWs: ['UK resume template', 'CV template UK', 'British resume format', 'United Kingdom CV'],
    lsiTerms: ['CV', 'British English', 'no photo', 'personal statement', 'A4 paper', 'UCAS', 'National Insurance', 'right to work'],
    intent: 'commercial investigation',
    audience: 'job seekers applying for positions in the United Kingdom',
    differentiator: 'follows UK conventions: uses "CV" not "resume," A4 format, British English spelling',
    competitorAngle: 'Reed.co.uk, CV-Library, Totaljobs for UK CV template searches',
    topPAA: ['What is a British CV format?', 'What is the difference between a CV and resume UK?', 'Should a UK CV include a photo?', 'How long should a UK CV be?'],
  },

  'canadian': {
    primaryKW: 'Canadian resume template',
    secondaryKWs: ['Canada resume format', 'Canadian CV template', 'resume template Canada', 'Canadian-style resume'],
    lsiTerms: ['bilingual', 'French and English', 'Canadian experience', 'SIN number', 'work permit', 'provincial', 'NOC code', 'Express Entry'],
    intent: 'commercial investigation',
    audience: 'job seekers applying for positions in Canada, including newcomers and immigrants',
    differentiator: 'follows Canadian conventions including bilingual considerations and no-photo standard',
    competitorAngle: 'Indeed Canada, Jobbank.gc.ca, Monster Canada for Canadian resume searches',
    topPAA: ['What is a Canadian resume format?', 'Should a Canadian resume include a photo?', 'How is a Canadian resume different?', 'How long should a Canadian resume be?'],
  },

  'american': {
    primaryKW: 'American resume template',
    secondaryKWs: ['US resume format', 'American-style resume', 'USA resume template', 'United States resume'],
    lsiTerms: ['Letter size', 'social security', 'at-will employment', 'EEOC', 'no photo', 'GPA', 'ZIP code', 'state abbreviation'],
    intent: 'commercial investigation',
    audience: 'job seekers applying for positions in the United States, including international applicants',
    differentiator: 'follows US conventions: Letter size, no photo, concise 1-page preference',
    competitorAngle: 'Indeed, LinkedIn, Monster for American resume template searches',
    topPAA: ['What is an American resume format?', 'How is a US resume different from other countries?', 'Should an American resume include a photo?', 'How long should an American resume be?'],
  },

  'australian': {
    primaryKW: 'Australian resume template',
    secondaryKWs: ['Australia resume format', 'Australian CV template', 'resume template Australia', 'Aussie resume format'],
    lsiTerms: ['A4 paper', 'referees', 'Australian English', 'ABN', 'visa status', 'working holiday', 'SEEK', 'state-based'],
    intent: 'commercial investigation',
    audience: 'job seekers applying for positions in Australia, including working holiday visa holders',
    differentiator: 'follows Australian conventions: referees section, A4 format, Australian English',
    competitorAngle: 'SEEK, Indeed Australia, Hudson for Australian resume template searches',
    topPAA: ['What is an Australian resume format?', 'How is an Australian resume different?', 'Should an Australian resume include a photo?', 'How long should an Australian resume be?'],
  },
};


// ═══════════════════════════════════════════════════════════════════════
//  SECTION B: FIELD BRIEF GENERATORS
// ═══════════════════════════════════════════════════════════════════════

function briefTitle(page, seo) {
  return `PRIMARY KEYWORD: "${seo.primaryKW}" — front-load in the first 30 characters. ` +
    `Secondary KW to weave in: "${seo.secondaryKWs[0]}". ` +
    `Keep total length under 60 characters (currently ${page.title.length} chars). ` +
    `Use a pipe (|) or dash (—) to separate the benefit statement or brand. ` +
    `Search intent: ${seo.intent}. Must read naturally — no keyword stuffing. ` +
    `Differentiate from competitors: ${seo.competitorAngle}. ` +
    `Include a compelling value proposition or action word (e.g., "Download," "Free," "Professional").`;
}

function briefMetaDescription(page, seo) {
  return `Include keywords: "${seo.secondaryKWs[0]}" + "${seo.secondaryKWs[1]}". ` +
    `Target 150–160 characters (currently ${page.metaDescription.length} chars). ` +
    `Open with an action verb or benefit statement. ` +
    `Include a clear CTA (e.g., "Download free," "Browse templates," "Get started"). ` +
    `Mention 1–2 differentiators: ${seo.differentiator}. ` +
    `Search intent: ${seo.intent}. ` +
    `Avoid duplicating the title tag — this should expand on the promise. ` +
    `Target audience: ${seo.audience}.`;
}

function briefH1(page, seo) {
  return `PRIMARY KEYWORD: "${seo.primaryKW}" — must appear naturally in the H1. ` +
    `Keep concise (6–10 words). The H1 should NOT be identical to the title tag — vary the phrasing. ` +
    `Tone: authoritative yet approachable. ` +
    `This is the first heading visitors see — make it clear what the page offers. ` +
    `LSI terms to consider near the H1: ${seo.lsiTerms.slice(0, 3).join(', ')}. ` +
    `Target audience: ${seo.audience}.`;
}

function briefHeroSubtitle(page, seo) {
  return `Supporting keywords to weave in: "${seo.secondaryKWs[1] || seo.secondaryKWs[0]}", "${seo.secondaryKWs[2] || seo.lsiTerms[0]}". ` +
    `Target 20–35 words. Expand on the H1 with a specific value proposition. ` +
    `Address the audience directly: ${seo.audience}. ` +
    `Mention 1 concrete benefit or feature (e.g., "free download," "customizable," "ATS-tested"). ` +
    `LSI terms: ${seo.lsiTerms.slice(0, 4).join(', ')}. ` +
    `Tone: confident, helpful, action-oriented. ` +
    `Avoid repeating the H1 verbatim.`;
}

function briefTrustSignal(page, seo) {
  return `E-E-A-T signal: establish credibility with a specific stat, endorsement, or social proof. ` +
    `Ideas: user count, template downloads, expert endorsement, industry recognition. ` +
    `Keep under 20 words — this is a single-line trust badge. ` +
    `Should feel factual and verifiable, not hyperbolic. ` +
    `Tie to ${seo.differentiator}. ` +
    `Competitor context: ${seo.competitorAngle} — what credibility signal can we claim that they can't?`;
}

function briefTemplateName(page, seo, template, index) {
  return `Include the page keyword "${seo.primaryKW.split(' ')[0]}" or a close variant in the template name. ` +
    `Current name: "${template.name}". Keep under 30 characters. ` +
    `Must be distinct from the other 5 template names on this page — avoid repetition. ` +
    `Tags associated: ${template.tags.join(', ')}. ` +
    `Make the name descriptive enough that users understand the template's style at a glance.`;
}

function briefTemplateDesc(page, seo, template, index) {
  return `Weave in 1–2 LSI terms from: ${seo.lsiTerms.slice(index % seo.lsiTerms.length, (index % seo.lsiTerms.length) + 3).join(', ')}. ` +
    `Target 15–25 words. Describe what makes THIS template different from the others. ` +
    `Current style: "${template.style}", layout: "${template.layout}". ` +
    `Highlight the unique value — why would someone pick this specific template? ` +
    `Avoid generic phrases like "great for all industries." Be specific. ` +
    `Audience: ${seo.audience}.`;
}

function briefGuideHeading(page, seo, sectionType) {
  const headingMap = {
    'whatIs': `Use an H2 that matches the PAA query: "${seo.topPAA[0]}". ` +
      `Include "${seo.primaryKW.replace(' template', '')}" in the heading. ` +
      `Format as a question for featured snippet eligibility. ` +
      `Keep under 60 characters.`,
    'whenToUse': `Use an H2/H3 targeting "when to use a ${seo.primaryKW.replace(' template', '')}". ` +
      `Include the page keyword naturally. ` +
      `This heading should signal practical, actionable content. ` +
      `Consider matching PAA: "${seo.topPAA[1]}".`,
    'whenNotToUse': `Use an H2/H3 that addresses when this format is NOT ideal. ` +
      `Include "${seo.primaryKW.replace(' template', '')}" in the heading. ` +
      `This builds E-E-A-T by showing balanced, honest guidance. ` +
      `Helps differentiate from competitor content that only promotes.`,
    'howToCustomize': `Use an H2 targeting "how to customize" or "how to use" + "${seo.primaryKW.replace(' template', '')}". ` +
      `Match PAA: "${seo.topPAA[2]}". ` +
      `Format for how-to rich snippets (Google). ` +
      `Keep actionable — start with "How to" if possible.`,
    'expertTips': `Use an H2 with E-E-A-T authority: "Expert Tips" or "Pro Tips" + "${seo.primaryKW.replace(' template', '')}". ` +
      `This heading signals expert-level content for both users and search engines. ` +
      `Avoid generic headings like "Tips and Tricks." Be specific to the page topic.`,
  };
  return headingMap[sectionType] || `Include "${seo.primaryKW}" in this section heading. Target H2/H3 keyword placement.`;
}

function briefWhatIsBody(page, seo) {
  return `TARGET WORD COUNT: 100–150 words. ` +
    `Open with a definition-style sentence for featured snippet eligibility (e.g., "A ${seo.primaryKW.replace(' template', '')} is…"). ` +
    `LSI terms to weave in naturally: ${seo.lsiTerms.join(', ')}. ` +
    `Explain WHO this format is for: ${seo.audience}. ` +
    `Include 1 internal link to a related page: /resume-templates/${page.relatedSlugs[0]}. ` +
    `E-E-A-T: cite practical experience or industry conventions. ` +
    `Key differentiator to communicate: ${seo.differentiator}. ` +
    `Avoid duplicating language from the hero subtitle or FAQ answers. ` +
    `Competitor gap: most competitors give thin definitions — provide genuine depth and specifics.`;
}

function briefWhenToUseItem(page, seo, itemIndex, totalItems) {
  const scenarios = seo.lsiTerms.slice(itemIndex, itemIndex + 2);
  return `Target a specific scenario/keyword: ${scenarios.join(', ')}. ` +
    `Be concrete — name specific industries, job types, or situations. ` +
    `Target 15–25 words per item. ` +
    `Internal link opportunity: consider linking to /resume-templates/${page.relatedSlugs[itemIndex % page.relatedSlugs.length]}. ` +
    `Each item should cover a DIFFERENT use case — item ${itemIndex + 1} of ${totalItems}. ` +
    `Audience context: ${seo.audience}.`;
}

function briefWhenNotToUseItem(page, seo, itemIndex, totalItems) {
  return `Describe a specific scenario where this format is NOT ideal. ` +
    `Suggest an alternative format and link to it (e.g., /resume-templates/${page.relatedSlugs[itemIndex % page.relatedSlugs.length]}). ` +
    `Target 15–25 words. Be honest and specific — this builds E-E-A-T trust. ` +
    `Item ${itemIndex + 1} of ${totalItems} — each should cover a unique scenario. ` +
    `Avoid vague advice like "if you need something different."`;
}

function briefStepTitle(page, seo, stepIndex, totalSteps) {
  return `Action keyword for step ${stepIndex + 1} of ${totalSteps}. ` +
    `Start with an imperative verb (e.g., "Choose," "Customize," "Review," "Adjust"). ` +
    `Include 1 keyword from: ${seo.lsiTerms.slice(stepIndex * 2, stepIndex * 2 + 2).join(', ')}. ` +
    `Keep under 8 words — titles should be scannable. ` +
    `Steps should follow a logical progression from setup to final review.`;
}

function briefStepBody(page, seo, stepIndex, totalSteps) {
  return `TARGET: 30–50 words. Provide specific, actionable instructions for step ${stepIndex + 1}. ` +
    `Weave in LSI terms: ${seo.lsiTerms.slice(stepIndex, stepIndex + 3).join(', ')}. ` +
    `Include concrete examples relevant to ${seo.audience}. ` +
    `This content targets how-to rich snippets — be step-by-step and specific. ` +
    `E-E-A-T: write from expert perspective with practical, tested advice. ` +
    `Link opportunity: /resume-templates/${page.relatedSlugs[stepIndex % page.relatedSlugs.length]}.`;
}

function briefTipTitle(page, seo, tipIndex, totalTips) {
  return `Expert tip ${tipIndex + 1} of ${totalTips} — choose a specific aspect of ${seo.primaryKW.replace(' template', '')} usage. ` +
    `Include 1 keyword: ${seo.lsiTerms[tipIndex + 3] || seo.lsiTerms[tipIndex]}. ` +
    `Keep under 8 words. The title should promise a specific, actionable insight. ` +
    `E-E-A-T: frame as advice from an experienced professional, not generic guidance.`;
}

function briefTipBody(page, seo, tipIndex, totalTips) {
  return `TARGET: 30–50 words. Provide expert-level advice for tip ${tipIndex + 1}. ` +
    `Supporting keywords: ${seo.secondaryKWs[tipIndex % seo.secondaryKWs.length]}, ${seo.lsiTerms[tipIndex + 4] || seo.lsiTerms[tipIndex + 1]}. ` +
    `E-E-A-T: cite real-world experience, hiring manager preferences, or industry research. ` +
    `Be specific to ${seo.audience}. ` +
    `Differentiate from competitors: ${seo.differentiator}. ` +
    `Avoid generic advice — each tip should reveal something non-obvious.`;
}

function briefFaqQuestion(page, seo, faq, faqIndex) {
  return `TARGET PAA (People Also Ask) query: "${seo.topPAA[faqIndex] || seo.topPAA[0]}". ` +
    `Format as a natural question that matches how people search. ` +
    `Include "${seo.primaryKW.replace(' template', '')}" or a close variant. ` +
    `Current question: "${faq.question}" — optimize for search volume while keeping it natural. ` +
    `Each FAQ should target a DIFFERENT search query. FAQ ${faqIndex + 1} of ${page.faqs.length}.`;
}

function briefFaqAnswer(page, seo, faq, faqIndex) {
  return `FEATURED SNIPPET TARGET: Start with a direct 1-sentence answer (under 40 words), then elaborate. ` +
    `Total target: 50–80 words. ` +
    `Include keywords: "${seo.secondaryKWs[faqIndex % seo.secondaryKWs.length]}", ` +
    `"${seo.lsiTerms[faqIndex + 2] || seo.lsiTerms[0]}". ` +
    `E-E-A-T: answer with authority — cite specifics, not vague generalities. ` +
    `Internal link opportunity: /resume-templates/${page.relatedSlugs[faqIndex % page.relatedSlugs.length]}. ` +
    `Avoid duplicating content from the "What Is" section. ` +
    `Competitor gap: most competitor FAQ answers are thin — provide genuine depth.`;
}


// ═══════════════════════════════════════════════════════════════════════
//  SECTION C: MAIN GENERATOR
// ═══════════════════════════════════════════════════════════════════════

function main() {
  const allBriefs = {};
  let totalFields = 0;
  let missingConfig = 0;

  for (const page of pages) {
    const seo = PAGE_SEO_CONFIG[page.slug];
    if (!seo) {
      console.warn(`⚠ No SEO config for slug: "${page.slug}" — skipping.`);
      missingConfig++;
      continue;
    }

    const briefs = {};

    // ── Metadata (5 fields) ──
    briefs['title'] = briefTitle(page, seo);
    briefs['metaDescription'] = briefMetaDescription(page, seo);
    briefs['h1'] = briefH1(page, seo);
    briefs['heroSubtitle'] = briefHeroSubtitle(page, seo);
    briefs['trustSignal'] = briefTrustSignal(page, seo);

    // ── Template Cards (6 × 2 = 12 fields) ──
    page.templates.forEach((t, i) => {
      briefs[`templates.${i}.name`] = briefTemplateName(page, seo, t, i);
      briefs[`templates.${i}.description`] = briefTemplateDesc(page, seo, t, i);
    });

    // ── Guide: What Is (heading + body = 2 fields) ──
    briefs['guide.whatIs.heading'] = briefGuideHeading(page, seo, 'whatIs');
    briefs['guide.whatIs.body'] = briefWhatIsBody(page, seo);

    // ── Guide: When to Use (heading + items = variable) ──
    briefs['guide.whenToUse.heading'] = briefGuideHeading(page, seo, 'whenToUse');
    if (page.guide.whenToUse && page.guide.whenToUse.items) {
      page.guide.whenToUse.items.forEach((item, i) => {
        briefs[`guide.whenToUse.items.${i}`] = briefWhenToUseItem(page, seo, i, page.guide.whenToUse.items.length);
      });
    }

    // ── Guide: When Not to Use (heading + items = variable) ──
    briefs['guide.whenNotToUse.heading'] = briefGuideHeading(page, seo, 'whenNotToUse');
    if (page.guide.whenNotToUse && page.guide.whenNotToUse.items) {
      page.guide.whenNotToUse.items.forEach((item, i) => {
        briefs[`guide.whenNotToUse.items.${i}`] = briefWhenNotToUseItem(page, seo, i, page.guide.whenNotToUse.items.length);
      });
    }

    // ── Guide: How to Customize (heading + steps = variable) ──
    briefs['guide.howToCustomize.heading'] = briefGuideHeading(page, seo, 'howToCustomize');
    if (page.guide.howToCustomize && page.guide.howToCustomize.steps) {
      page.guide.howToCustomize.steps.forEach((step, i) => {
        briefs[`guide.howToCustomize.steps.${i}.title`] = briefStepTitle(page, seo, i, page.guide.howToCustomize.steps.length);
        briefs[`guide.howToCustomize.steps.${i}.body`] = briefStepBody(page, seo, i, page.guide.howToCustomize.steps.length);
      });
    }

    // ── Guide: Expert Tips (heading + tips = variable) ──
    briefs['guide.expertTips.heading'] = briefGuideHeading(page, seo, 'expertTips');
    if (page.guide.expertTips && page.guide.expertTips.tips) {
      page.guide.expertTips.tips.forEach((tip, i) => {
        briefs[`guide.expertTips.tips.${i}.title`] = briefTipTitle(page, seo, i, page.guide.expertTips.tips.length);
        briefs[`guide.expertTips.tips.${i}.body`] = briefTipBody(page, seo, i, page.guide.expertTips.tips.length);
      });
    }

    // ── FAQs (question + answer per FAQ = variable) ──
    if (page.faqs) {
      page.faqs.forEach((faq, i) => {
        briefs[`faqs.${i}.question`] = briefFaqQuestion(page, seo, faq, i);
        briefs[`faqs.${i}.answer`] = briefFaqAnswer(page, seo, faq, i);
      });
    }

    allBriefs[page.slug] = briefs;
    const fieldCount = Object.keys(briefs).length;
    totalFields += fieldCount;
    console.log(`  ✓ ${page.slug}: ${fieldCount} fields`);
  }

  // Write output
  const outputPath = path.join(__dirname, 'seo-briefs-all.json');
  fs.writeFileSync(outputPath, JSON.stringify(allBriefs, null, 2), 'utf8');

  console.log(`\n═══════════════════════════════════════`);
  console.log(`  Generated SEO briefs for ${Object.keys(allBriefs).length} pages`);
  console.log(`  Total fields: ${totalFields}`);
  if (missingConfig > 0) console.log(`  ⚠ Missing configs: ${missingConfig}`);
  console.log(`  Output: ${outputPath}`);
  console.log(`═══════════════════════════════════════\n`);
}

main();
