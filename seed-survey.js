/**
 * seed-survey.js
 * Seeds the "Hiring Managers" internal survey into the database.
 *
 * Usage: node seed-survey.js
 */
const db = require('./db');

const SURVEY_ID = 'hiring-managers-2026';
const SURVEY_TITLE = 'Toptal Resume — Internal Survey: Decision-Makers';
const SURVEY_DESC = 'As a hiring decision-maker at Toptal, your perspective directly shapes Toptal Resume — our service that helps talent build the best possible resumes. Your insights will become data-backed guidance used by thousands of candidates.';

const QUESTIONS = [
  // ─── First Impressions & Scanning ───
  {
    id: 'q1', num: 1, section: 'First Impressions & Scanning',
    text: 'How much time do you typically spend on an initial resume review before deciding to proceed or pass?',
    type: 'single',
    options: [
      { value: 'A', label: 'Less than 10 seconds' },
      { value: 'B', label: '10–30 seconds' },
      { value: 'C', label: '30–60 seconds' },
      { value: 'D', label: '1–2 minutes' },
      { value: 'E', label: 'More than 2 minutes' },
    ]
  },
  {
    id: 'q2', num: 2, section: 'First Impressions & Scanning',
    text: 'What is the FIRST thing you look at on a resume?',
    type: 'single',
    options: [
      { value: 'A', label: 'Professional summary / headline' },
      { value: 'B', label: 'Most recent job title & company' },
      { value: 'C', label: 'Skills / tech stack' },
      { value: 'D', label: 'Education / credentials' },
      { value: 'E', label: 'Overall layout & visual quality' },
    ]
  },
  {
    id: 'q3', num: 3, section: 'First Impressions & Scanning',
    text: 'What makes a resume instantly stand out in a positive way?',
    type: 'single',
    options: [
      { value: 'A', label: 'Quantified impact in recent roles (metrics, percentages, outcomes)' },
      { value: 'B', label: 'Clean, scannable layout' },
      { value: 'C', label: 'Clear match to the role requirements' },
      { value: 'D', label: 'Recognizable companies or brands' },
      { value: 'E', label: 'Strong, compelling professional summary' },
    ]
  },

  // ─── Deal-Breakers & Red Flags ───
  {
    id: 'q4', num: 4, section: 'Deal-Breakers & Red Flags',
    text: 'What is the #1 resume mistake that makes you immediately lose interest?',
    type: 'single', hasOther: true,
    options: [
      { value: 'A', label: 'Generic, one-size-fits-all resume (not tailored)' },
      { value: 'B', label: 'No metrics or quantified impact — listing only duties instead of measurable achievements' },
      { value: 'C', label: 'Poor formatting or hard to read' },
      { value: 'D', label: 'Typos or grammatical errors' },
    ]
  },
  {
    id: 'q5', num: 5, section: 'Deal-Breakers & Red Flags',
    text: 'Have you ever rejected a strong candidate primarily because of their resume presentation (not content)?',
    type: 'single',
    options: [
      { value: 'A', label: 'Yes, more than once' },
      { value: 'B', label: 'Yes, once or twice' },
      { value: 'C', label: 'Probably, but not consciously' },
      { value: 'D', label: 'No — content always overrides presentation' },
      { value: 'E', label: "I don't look at resumes directly — a recruiter screens first" },
    ]
  },

  // ─── Format, Structure & Content ───
  {
    id: 'q6', num: 6, section: 'Format, Structure & Content',
    text: 'What is the ideal resume length for someone with 5–10 years of experience?',
    type: 'single',
    options: [
      { value: 'A', label: 'Strictly 1 page' },
      { value: 'B', label: '1–2 pages' },
      { value: 'C', label: '2 pages exactly' },
      { value: 'D', label: '2–3 pages' },
      { value: 'E', label: "Length doesn't matter if content is relevant" },
    ]
  },
  {
    id: 'q7', num: 7, section: 'Format, Structure & Content',
    text: 'How important is a professional summary / headline at the top of a resume?',
    type: 'single',
    options: [
      { value: 'A', label: "Essential — it's the first thing I read" },
      { value: 'B', label: 'Very important' },
      { value: 'C', label: 'Somewhat important' },
      { value: 'D', label: 'Rarely matters — I skip to experience' },
      { value: 'E', label: 'Prefer no summary — let the work speak' },
    ]
  },
  {
    id: 'q8', num: 8, section: 'Format, Structure & Content',
    text: 'Which type of achievement on a resume carries the most weight with you?',
    type: 'single', hasOther: true,
    options: [
      { value: 'A', label: 'Revenue or cost impact with numbers ($, %)' },
      { value: 'B', label: 'Team or org-level outcomes (scaled a team, shipped a product)' },
      { value: 'C', label: 'Technical complexity solved (system design, architecture)' },
      { value: 'D', label: 'Speed or efficiency gains (reduced time-to-market, automated X)' },
    ]
  },
  {
    id: 'q9', num: 9, section: 'Format, Structure & Content',
    text: 'How do you prefer to see skills presented on a resume?',
    type: 'single',
    options: [
      { value: 'A', label: 'Dedicated skills section with categories (e.g. Languages, Frameworks)' },
      { value: 'B', label: 'Woven into experience descriptions naturally' },
      { value: 'C', label: 'Both — a skills section plus context in experience' },
      { value: 'D', label: "Don't care, as long as I can find them quickly" },
      { value: 'E', label: 'Skill proficiency ratings (e.g. expert, intermediate)' },
    ]
  },
  {
    id: 'q10', num: 10, section: 'Format, Structure & Content',
    text: "What most clearly differentiates a senior candidate's resume from a mid-level one?",
    type: 'single',
    options: [
      { value: 'A', label: 'Business outcomes over task descriptions' },
      { value: 'B', label: 'Scope indicators (budget, team size, revenue impact)' },
      { value: 'C', label: 'Strategic language vs. tactical language' },
      { value: 'D', label: 'Evidence of cross-functional influence' },
      { value: 'E', label: 'Fewer roles, each with deeper impact' },
    ]
  },

  // ─── Entry-Level, Hobbies & Extras ───
  {
    id: 'q11', num: 11, section: 'Entry-Level, Hobbies & Extras',
    text: 'For a candidate with little or no professional experience, what do you most want to see on their resume?',
    type: 'single', hasOther: true,
    options: [
      { value: 'A', label: 'Relevant personal or academic projects with outcomes' },
      { value: 'B', label: 'Internships or freelance work, even if brief' },
      { value: 'C', label: 'Technical skills and certifications' },
      { value: 'D', label: 'Volunteer work or community involvement' },
    ]
  },
  {
    id: 'q12', num: 12, section: 'Entry-Level, Hobbies & Extras',
    text: 'What is your opinion on including hobbies or personal interests on a resume?',
    type: 'single',
    options: [
      { value: 'A', label: 'Great idea — shows personality and culture fit' },
      { value: 'B', label: 'Fine if relevant to the role or industry' },
      { value: 'C', label: "Neutral — I notice them but they don't sway me" },
      { value: 'D', label: 'Waste of space — use it for work experience instead' },
      { value: 'E', label: 'Depends on the seniority level' },
    ]
  },
  {
    id: 'q13', num: 13, section: 'Entry-Level, Hobbies & Extras',
    text: 'How important are volunteer work and personal/side projects on a resume?',
    type: 'single',
    options: [
      { value: 'A', label: 'Very important — shows initiative and breadth beyond paid work' },
      { value: 'B', label: 'Important for junior candidates, less so for senior' },
      { value: 'C', label: 'Nice to have, but never a deciding factor' },
      { value: 'D', label: 'Only if directly relevant to the role' },
      { value: 'E', label: 'Rarely look at them' },
    ]
  },

  // ─── AI & Modern Trends ───
  {
    id: 'q14', num: 14, section: 'AI & Modern Trends',
    text: 'Can you tell when a resume was written entirely by AI (e.g., ChatGPT)?',
    type: 'single',
    options: [
      { value: 'A', label: 'Yes, almost always' },
      { value: 'B', label: 'Usually, most of the time' },
      { value: 'C', label: 'Sometimes' },
      { value: 'D', label: 'Rarely' },
      { value: 'E', label: "No, I can't tell" },
    ]
  },
  {
    id: 'q15', num: 15, section: 'AI & Modern Trends',
    text: 'What gives away an AI-generated resume?',
    type: 'multi', hasOther: true,
    options: [
      { value: 'A', label: 'Overly polished, generic language — no personal voice' },
      { value: 'B', label: 'Buzzword-heavy without specifics or real examples' },
      { value: 'C', label: 'Suspiciously perfect grammar and structure' },
      { value: 'D', label: 'Emojis, icons, or unusual decorative formatting' },
      { value: 'E', label: 'Excessive use of em-dashes, semicolons, or filler phrases' },
      { value: 'F', label: 'Achievements that sound inflated or fabricated' },
      { value: 'G', label: 'Every bullet follows the exact same sentence pattern' },
    ]
  },
  {
    id: 'q16', num: 16, section: 'AI & Modern Trends',
    text: 'How does a clearly AI-generated resume affect your perception of the candidate?',
    type: 'single',
    options: [
      { value: 'A', label: 'Strong negative — shows low effort or lack of authenticity' },
      { value: 'B', label: 'Somewhat negative' },
      { value: 'C', label: 'Neutral — content matters more than how it was produced' },
      { value: 'D', label: 'Somewhat positive — shows resourcefulness' },
      { value: 'E', label: "Doesn't affect my evaluation" },
    ]
  },

  // ─── Hiring Impact ───
  {
    id: 'q17', num: 17, section: 'Hiring Impact',
    text: "How much does a well-tailored resume improve a candidate's chances of getting an interview?",
    type: 'single',
    options: [
      { value: 'A', label: 'Dramatically — 3x or more likely to advance' },
      { value: 'B', label: 'Significantly — about 2x' },
      { value: 'C', label: 'Moderately — noticeable advantage' },
      { value: 'D', label: 'Slightly — marginal difference' },
      { value: 'E', label: 'Not much — qualifications matter more than presentation' },
    ]
  },
  {
    id: 'q18', num: 18, section: 'Hiring Impact',
    text: 'Do you value portfolio or project links (GitHub, Behance, etc.) and personal websites on a resume?',
    type: 'single',
    options: [
      { value: 'A', label: 'Yes — I always check them if provided' },
      { value: 'B', label: 'Yes, but only for technical / creative roles' },
      { value: 'C', label: 'Sometimes glance at them' },
      { value: 'D', label: 'Rarely — the resume should stand on its own' },
      { value: 'E', label: 'Never look at them' },
    ]
  },

  // ─── Expert Advice (Open-Ended) ───
  {
    id: 'q19', num: 19, section: 'Your Expert Advice',
    text: "If you had to give one single piece of advice on format or structure to someone who's been sending resumes for months with no response, what would it be and why?",
    type: 'textarea',
    placeholder: "Your advice may be quoted (with your permission and name) on Toptal Resume's public pages. This is your chance to directly help thousands of job seekers with your expertise.",
    maxLength: 2000,
    permission: "I give permission to quote my response with my first name and role on Toptal Resume's public pages."
  },
];

(async () => {
  await db.initDB();

  const existing = db.getSurvey(SURVEY_ID);
  if (existing) {
    console.log(`Survey "${SURVEY_ID}" already exists (${existing.questions.length} questions). Updating...`);
  }

  db.createSurvey(SURVEY_ID, SURVEY_TITLE, SURVEY_DESC, QUESTIONS, 'system');
  console.log(`✓ Survey "${SURVEY_ID}" seeded with ${QUESTIONS.length} questions`);
  console.log(`  URL: /survey/${SURVEY_ID}`);
})();
