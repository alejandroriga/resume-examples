/**
 * openai.js — OpenAI API integration for SEO field evaluation
 *
 * Uses native https (no npm deps). Exports checkFieldSEO().
 */

const https = require('https');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = 'gpt-4o-mini';

// ─── OpenAI API call ────────────────────────────────────────

async function callOpenAI(messages, responseFormat, opts = {}) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');

  const payload = JSON.stringify({
    model: MODEL,
    messages,
    temperature: opts.temperature || 0.3,
    max_tokens: opts.maxTokens || 800,
    ...(responseFormat ? { response_format: responseFormat } : {})
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.error) return reject(new Error(data.error.message));
          resolve(data.choices[0].message.content);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('OpenAI request timeout')); });
    req.write(payload);
    req.end();
  });
}


// ─── SEO Field Evaluation ───────────────────────────────────

const SYSTEM_PROMPT = `You are an SEO quality evaluator for a resume templates website (toptal.com/resume). Analyze the given field content against its SEO brief and return a JSON evaluation.

Your response MUST be valid JSON with this exact structure:
{
  "generalScore": <0-100>,
  "keywordScore": <0-100>,
  "aiProbability": <0-100>,
  "recommendations": {
    "critical": ["<string>", ...],
    "nonCritical": ["<string>", ...]
  }
}

Scoring criteria:

generalScore (0-100): How well does the content fulfill the SEO brief instructions?
- Length requirements (word count, character count)
- Structure and formatting compliance
- Specificity and depth of information
- E-E-A-T signals (expertise, experience, authority, trust)
- Differentiation from generic/competitor content
- User intent alignment

keywordScore (0-100): How effectively are target keywords integrated?
- Primary keyword presence and placement (front-loading)
- Secondary/LSI keyword inclusion
- Natural integration (not stuffed)
- Keyword density appropriate for field type
- Semantic relevance

aiProbability (0-100): How likely is this content AI-generated?
- 0 = clearly human-written (unique voice, specific examples, personal insights)
- 100 = clearly AI-generated (generic, predictable, formulaic)
- Look for: filler phrases, lack of specificity, predictable structure, generic advice, absence of unique data points or opinions

recommendations.critical: Max 3 items. Issues that significantly hurt SEO (missing primary keyword, wrong length, thin content, duplicate-sounding text).
recommendations.nonCritical: Max 3 items. Minor improvements (better keyword placement, readability tweaks, additional LSI terms).

Keep recommendations concise (under 20 words each). Be specific — reference actual keywords and numbers.`;

/**
 * Evaluate a single field's content against its SEO brief.
 * @param {object} opts
 * @param {string} opts.fieldContent - The actual field content to evaluate
 * @param {string} opts.seoBrief - The SEO brief instructions for this field
 * @param {string} opts.pageContext - Page-level context (slug, keywords, type)
 * @param {string} opts.fieldPath - The field path (e.g., "guide.whatIs.body")
 * @returns {object} { generalScore, keywordScore, aiProbability, recommendations }
 */
async function checkFieldSEO({ fieldContent, seoBrief, pageContext, fieldPath }) {
  const userPrompt = `## Page Context
${pageContext || 'No page context provided.'}

## Field Being Evaluated
Field path: ${fieldPath || 'unknown'}

## SEO Brief for This Field
${seoBrief || 'No SEO brief provided for this field.'}

## Field Content to Evaluate
${fieldContent || '(empty — field has no content)'}`;

  const response = await callOpenAI([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt }
  ], { type: 'json_object' });

  const parsed = JSON.parse(response);

  // Clamp values and sanitize
  return {
    generalScore: Math.max(0, Math.min(100, Math.round(parsed.generalScore || 0))),
    keywordScore: Math.max(0, Math.min(100, Math.round(parsed.keywordScore || 0))),
    aiProbability: Math.max(0, Math.min(100, Math.round(parsed.aiProbability || 0))),
    recommendations: {
      critical: (parsed.recommendations?.critical || []).slice(0, 3),
      nonCritical: (parsed.recommendations?.nonCritical || []).slice(0, 3)
    }
  };
}


// ─── Content Suggestion ──────────────────────────────────────

const SUGGEST_SYSTEM_PROMPT = `You are an expert SEO content writer for toptal.com/resume, a resume templates website by Toptal. Your job is to suggest improved content for a specific field based on:

1. The SEO brief (instructions for this field) — HIGHEST PRIORITY
2. The current content
3. The edit history (how the content evolved over time)
4. Reviewer comments (feedback from the team)

PRIORITY HIERARCHY (strict order):
1. SEO BRIEF — This is the #1 authority. The brief's keyword requirements, length constraints, formatting rules, and strategic directives ALWAYS take precedence. If anything else contradicts the brief, the brief wins.
2. Recent supervisor comments — High weight, but must not override SEO brief requirements.
3. Recent editor comments — Moderate weight.
4. Older comments — Low weight.
5. Edit history direction — Contextual signal only.

CONFLICT DETECTION (critical):
Compare the SEO brief requirements against the reviewer comments. If you detect ANY significant discrepancies — for example:
- A comment asks to shorten text but the brief requires a minimum word count
- A comment suggests removing a keyword that the brief lists as mandatory
- A comment pushes a tone/style that contradicts the brief's guidelines
- A comment requests content that conflicts with the brief's target search intent
You MUST list these conflicts in the "conflicts" array. Each conflict should clearly state what the brief says vs. what the comment asks, and your recommended resolution (always favoring the brief unless the comment has a compelling editorial reason).

If there are NO conflicts, return an empty array.

PROCESS (follow this internally):
1. Parse the SEO brief first — extract all hard requirements (keywords, length, format, intent)
2. Analyze the timeline: original → edits → comments → current state
3. Check for conflicts between brief requirements and comments
4. Generate text that FULLY complies with the SEO brief while incorporating non-conflicting feedback

FIELD TYPE AWARENESS:
- For titles/h1/h2: Keep concise, front-load keywords, match character limits
- For meta descriptions: 150-160 chars, include CTA, primary keyword early
- For body/paragraph content: Natural flow, proper keyword density, E-E-A-T signals
- For short fields (eyebrow, subtitle): Very concise, punchy, on-brand

Your response MUST be valid JSON:
{
  "analysis": "<2-3 sentence analysis of the content evolution and what reviewers want>",
  "conflicts": ["<conflict description: Brief says X, but comment by Y asks Z. Resolution: ...>", ...],
  "suggestion": "<the suggested replacement text for this field>",
  "tip": "<1 sentence tip for the user about what comments/context would help generate even better suggestions>"
}

Write content that sounds human, specific, and authoritative — NOT generic AI text. Use concrete data points, specific examples, and a confident editorial voice.`;

/**
 * Generate a content suggestion for a field based on full context.
 * @param {object} opts
 * @param {string} opts.fieldContent - Current field content
 * @param {string} opts.seoBrief - SEO brief instructions
 * @param {string} opts.pageContext - Page-level context
 * @param {string} opts.fieldPath - Field path (e.g., "hero.h1")
 * @param {Array} opts.history - Edit history entries [{old_value, new_value, username, changed_at}]
 * @param {Array} opts.comments - Comments [{username, comment, created_at, role, done}]
 * @returns {object} { analysis, suggestion, tip }
 */
async function suggestFieldContent({ fieldContent, seoBrief, pageContext, fieldPath, history, comments }) {
  let userPrompt = `## Page Context\n${pageContext || 'No page context provided.'}\n\n`;
  userPrompt += `## Field\nPath: ${fieldPath || 'unknown'}\n\n`;
  userPrompt += `## SEO Brief\n${seoBrief || 'No SEO brief for this field.'}\n\n`;
  userPrompt += `## Current Content\n${fieldContent || '(empty)'}\n\n`;

  // Edit history — chronological (oldest first)
  if (history && history.length > 0) {
    userPrompt += `## Edit History (oldest → newest)\n`;
    const sorted = [...history].reverse(); // getHistory returns DESC, we want ASC
    for (const h of sorted) {
      userPrompt += `- [${h.changed_at}] by ${h.username}: "${h.old_value || '(empty)'}" → "${h.new_value || '(empty)'}"\n`;
    }
    userPrompt += '\n';
  } else {
    userPrompt += `## Edit History\nNo edits recorded yet.\n\n`;
  }

  // Comments — chronological with role weighting markers
  if (comments && comments.length > 0) {
    userPrompt += `## Comments (oldest → newest, recent ones matter MORE)\n`;
    const sorted = [...comments].reverse(); // getComments returns DESC, we want ASC
    const total = sorted.length;
    for (let i = 0; i < total; i++) {
      const c = sorted[i];
      const roleTag = c.role === 'supervisor' ? '[SUPERVISOR]' : '[EDITOR]';
      const recency = i >= total - 2 ? ' ⚡ HIGH PRIORITY (recent)' : i >= total - 4 ? ' (moderately recent)' : '';
      const doneTag = c.done ? ' [RESOLVED]' : '';
      userPrompt += `- ${roleTag} ${c.username} (${c.created_at})${recency}${doneTag}: "${c.comment}"\n`;
    }
    userPrompt += '\n';
  } else {
    userPrompt += `## Comments\nNo comments yet. Tip: Adding specific feedback comments will produce much better suggestions.\n\n`;
  }

  userPrompt += `## Task\nBased on ALL the above context, generate the optimal replacement text for this field. Comply with the SEO brief, address recent reviewer feedback (especially supervisors), and maintain the editorial direction shown in the edit history.`;

  const response = await callOpenAI([
    { role: 'system', content: SUGGEST_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt }
  ], { type: 'json_object' }, { maxTokens: 1500, temperature: 0.5 });

  const parsed = JSON.parse(response);

  return {
    analysis: parsed.analysis || '',
    conflicts: Array.isArray(parsed.conflicts) ? parsed.conflicts : [],
    suggestion: parsed.suggestion || '',
    tip: parsed.tip || 'Add specific comments about tone, keywords, or length to get more targeted suggestions.'
  };
}


module.exports = { checkFieldSEO, suggestFieldContent, callOpenAI };
