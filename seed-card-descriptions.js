/**
 * seed-card-descriptions.js
 * One-time script to add cardDescription to subpage documents in the DB.
 * Also initializes categoriesGrid config in homepage document.
 *
 * Usage: node seed-card-descriptions.js
 */
const db = require('./db');

const CARD_DESCRIPTIONS = {
  free: 'Download free resume templates instantly — no sign-up needed. ATS-tested formats in Word and PDF.',
  ats: 'Resume templates built to pass applicant tracking systems at Workday, Greenhouse, and iCIMS.',
  simple: 'Clean, straightforward layouts that let your experience and qualifications speak for themselves.',
  professional: 'Polished designs favored by hiring managers in corporate, finance, and executive roles.',
  modern: 'Contemporary designs with clean typography and strategic use of color accents.',
  creative: 'Bold layouts with visual flair for design, marketing, and creative industry professionals.',
  'one-page': 'Concise single-page templates that highlight your strongest qualifications at a glance.',
  word: 'Fully editable DOCX templates compatible with Microsoft Word 2016 and later versions.',
  'google-docs': 'Resume templates formatted for Google Docs — live editing, easy sharing, no downloads.',
  student: 'Designed for students, recent graduates, and first-time job seekers starting their careers.',
  'two-column': 'Space-efficient layouts that organize your skills and experience side by side.',
  minimalist: 'Stripped-back designs with generous whitespace and a focused content hierarchy.',
};

const FEATURED_SLUGS = [
  'free', 'ats', 'simple', 'professional', 'modern', 'creative',
  'one-page', 'word', 'google-docs', 'student', 'two-column', 'minimalist'
];

const MORE_PILLS = [
  { slug: 'traditional', label: 'Traditional', url: '/resume-templates/traditional' },
  { slug: 'with-photo', label: 'With Photo', url: '/resume-templates/with-photo' },
  { slug: 'functional', label: 'Functional', url: '/functional-resume-templates' },
  { slug: 'chronological', label: 'Chronological', url: '/chronological-resume-templates' },
  { slug: 'europass', label: 'Europass', url: '/europass-resume-templates' },
  { slug: 'overleaf', label: 'Overleaf / LaTeX', url: '/overleaf-resume-templates' },
  { slug: 'two-page', label: 'Two-Page', url: '/two-page-resume-templates' },
  { slug: 'experienced', label: 'Experienced', url: '/experienced-resume-templates' },
  { slug: 'internship', label: 'Internship', url: '/internship-resume-templates' },
  { slug: 'easy', label: 'Easy', url: '/easy-resume-templates' },
  { slug: 'basic', label: 'Basic', url: '/basic-resume-templates' },
  { slug: 'pdf', label: 'PDF', url: '/pdf-resume-templates' },
  { slug: 'printable', label: 'Free Printable', url: '/printable-resume-templates' },
  { slug: 'british', label: 'British CV', url: '/british-resume-templates' },
  { slug: 'canadian', label: 'Canadian', url: '/canadian-resume-templates' },
  { slug: 'american', label: 'American', url: '/american-resume-templates' },
  { slug: 'australian', label: 'Australian', url: '/australian-resume-templates' },
];

(async () => {
  await db.initDB();

  // 1. Seed cardDescription into subpage documents
  let updated = 0;
  for (const [slug, desc] of Object.entries(CARD_DESCRIPTIONS)) {
    const doc = db.getDocument('subpage:' + slug);
    if (!doc) {
      console.log(`  ⚠ subpage:${slug} not found, skipping`);
      continue;
    }
    if (!doc.data.cardDescription) {
      doc.data.cardDescription = desc;
      db.saveDocument('subpage:' + slug, doc.data, 'system');
      console.log(`  ✓ subpage:${slug} → cardDescription added`);
      updated++;
    } else {
      console.log(`  · subpage:${slug} → already has cardDescription`);
    }
  }
  console.log(`\n${updated} subpage documents updated with cardDescription\n`);

  // 2. Initialize categoriesGrid in homepage document
  const homepage = db.getDocument('homepage');
  if (homepage) {
    if (!homepage.data.categoriesGrid) {
      homepage.data.categoriesGrid = {
        featuredSlugs: FEATURED_SLUGS,
        morePills: MORE_PILLS,
      };
      db.saveDocument('homepage', homepage.data, 'system');
      console.log('✓ homepage.categoriesGrid initialized');
    } else {
      console.log('· homepage.categoriesGrid already exists');
    }
  }

  console.log('\nDone!');
})();
