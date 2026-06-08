// ─────────────────────────────────────────────────────────────────────────────
// Job Matching Engine
//
// Scores how well a candidate's profile matches a job listing.
// Returns an integer between 0 and 100.
//
// Scoring breakdown:
//   45%  Skill match      — exact + soft (keyword in description)
//   25%  Experience level — years of experience vs job level requirement
//   15%  Resume text      — word overlap between resume and job description
//   10%  Location         — remote flag or location string similarity
//    5%  Education        — has any education entry on profile
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// normalize
// Lowercase + trim a string safely, returning '' for null/undefined.
// ─────────────────────────────────────────────────────────────────────────────
const normalize = (str) => (str || '').toLowerCase().trim();

// ─────────────────────────────────────────────────────────────────────────────
// escapeRegex
// Makes a string safe to embed inside a RegExp.
// ─────────────────────────────────────────────────────────────────────────────
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ─────────────────────────────────────────────────────────────────────────────
// jaccardSimilarity
// Measures the overlap between two skill arrays using the Jaccard index.
// Result: 0.0 (no overlap) → 1.0 (identical sets).
// ─────────────────────────────────────────────────────────────────────────────
const jaccardSimilarity = (arrayA, arrayB) => {
  if (!arrayA.length && !arrayB.length) return 1; // both empty = perfect match
  if (!arrayA.length || !arrayB.length) return 0;

  const setA = new Set(arrayA.map(normalize));
  const setB = new Set(arrayB.map(normalize));

  let intersectionCount = 0;
  for (const item of setA) {
    if (setB.has(item)) intersectionCount++;
  }

  const unionCount = new Set([...setA, ...setB]).size;
  return intersectionCount / unionCount;
};

// ─────────────────────────────────────────────────────────────────────────────
// softSkillMatch
// Checks how many of the candidate's skills appear anywhere in the job
// description or job skills list (catches synonyms / phrasing differences).
// Result: 0.0 → 1.0
// ─────────────────────────────────────────────────────────────────────────────
const softSkillMatch = (candidateSkills, jobDescription, jobSkills) => {
  if (!candidateSkills || candidateSkills.length === 0) return 0;

  const searchText = normalize(
    `${jobDescription || ''} ${(jobSkills || []).join(' ')}`
  );

  let matchCount = 0;
  for (const skill of candidateSkills) {
    const skillNorm = normalize(skill);
    // Word-boundary regex so "go" doesn't match inside "going"
    const regex = new RegExp(`\\b${escapeRegex(skillNorm)}\\b`);
    if (regex.test(searchText)) matchCount++;
  }

  return matchCount / candidateSkills.length;
};

// ─────────────────────────────────────────────────────────────────────────────
// calculateYearsOfExperience
// Sums up months across all experience entries, then converts to years.
// Handles open-ended current positions (uses today as the end date).
// ─────────────────────────────────────────────────────────────────────────────
const calculateYearsOfExperience = (experience = []) => {
  if (!experience || experience.length === 0) return 0;

  const now = new Date();
  let totalMonths = 0;

  for (const exp of experience) {
    const start = exp.from ? new Date(exp.from) : null;
    const end = exp.current ? now : exp.to ? new Date(exp.to) : null;

    if (!start || !end || end < start) continue;

    const months =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());

    totalMonths += Math.max(0, months);
  }

  return totalMonths / 12; // fractional years
};

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL_YEARS_MAP
// Maps each experience level label to a [minYears, maxYears] range.
// Candidates within the range score 100%; outside the range score is
// reduced proportionally.
// ─────────────────────────────────────────────────────────────────────────────
const LEVEL_YEARS_MAP = {
  Entry: [0, 2],
  Mid: [2, 5],
  Senior: [5, 10],
  Lead: [8, 15],
  Executive: [12, 40],
};

// ─────────────────────────────────────────────────────────────────────────────
// scoreExperience
// Returns 0.0 → 1.0 based on how well the candidate's years of experience
// aligns with the job's required level.
// ─────────────────────────────────────────────────────────────────────────────
const scoreExperience = (yearsOfExperience, jobLevel) => {
  const range = LEVEL_YEARS_MAP[jobLevel] || [0, 30];
  const [min, max] = range;

  if (yearsOfExperience >= min && yearsOfExperience <= max) {
    return 1; // perfect fit
  }

  if (yearsOfExperience > max) {
    // Overqualified — penalise gently (stays above 0.5 unless way over)
    const over = yearsOfExperience - max;
    return Math.max(0.4, 1 - over * 0.08);
  }

  // Under-qualified — penalise more strongly
  const under = min - yearsOfExperience;
  return Math.max(0, 1 - under * 0.2);
};

// ─────────────────────────────────────────────────────────────────────────────
// scoreResumeText
// Measures how many meaningful words from the job description appear in
// the candidate's parsed resume text.
// Ignores common stop-words to avoid inflating the score with "the", "and", etc.
// ─────────────────────────────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'you', 'will', 'our', 'are', 'your',
  'that', 'have', 'this', 'from', 'they', 'work', 'able', 'also',
  'into', 'their', 'more', 'other', 'about', 'been', 'team', 'join',
  'role', 'must', 'good', 'well', 'over', 'such', 'both', 'each',
]);

const scoreResumeText = (resumeParsedText, jobDescription) => {
  if (!resumeParsedText || !jobDescription) return 0;

  const resumeWords = new Set(
    normalize(resumeParsedText)
      .split(/\W+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
  );

  if (resumeWords.size === 0) return 0;

  const jobWords = normalize(jobDescription)
    .split(/\W+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

  if (jobWords.length === 0) return 0;

  const matchCount = jobWords.filter((w) => resumeWords.has(w)).length;
  return Math.min(matchCount / jobWords.length, 1);
};

// ─────────────────────────────────────────────────────────────────────────────
// scoreLocation
// Returns 1.0 for remote jobs or exact location match, 0.3 for partial
// match (same city or country), 0.1 for complete mismatch.
// ─────────────────────────────────────────────────────────────────────────────
const scoreLocation = (candidateLocation, jobLocation, isRemote) => {
  if (isRemote) return 1; // remote = anywhere = perfect

  if (!candidateLocation || !jobLocation) return 0.3; // unknown = neutral

  const cLoc = normalize(candidateLocation);
  const jLoc = normalize(jobLocation);

  if (cLoc === jLoc) return 1; // exact match

  // Partial match — city name or country appears in both strings
  const cParts = cLoc.split(/[,\s]+/).filter((p) => p.length > 2);
  for (const part of cParts) {
    if (jLoc.includes(part)) return 0.7;
  }

  return 0.1; // different locations
};

// ─────────────────────────────────────────────────────────────────────────────
// calculateMatchScore  (main export)
//
// @param  {Object} candidate  — Mongoose User document (or plain object)
// @param  {Object} job        — Mongoose Job document (or plain object)
//
// @returns {number}  integer 0–100
// ─────────────────────────────────────────────────────────────────────────────
const calculateMatchScore = (candidate, job) => {
  if (!candidate || !job) return 0;

  // ── 1. Skill Match (45%) ────────────────────────────────────────────────
  const candidateSkills = candidate.skills || [];
  const jobSkills = job.skills || [];

  const exactSkillScore = jaccardSimilarity(candidateSkills, jobSkills);
  const softSkillScore = softSkillMatch(
    candidateSkills,
    job.description,
    jobSkills
  );
  // Weighted: exact overlap counts more than soft keyword presence
  const skillScore = exactSkillScore * 0.65 + softSkillScore * 0.35;

  // ── 2. Experience Level (25%) ────────────────────────────────────────────
  const years = calculateYearsOfExperience(candidate.experience || []);
  const expScore = scoreExperience(years, job.level);

  // ── 3. Resume Text Match (15%) ───────────────────────────────────────────
  const resumeScore = scoreResumeText(
    candidate.resume?.parsedText,
    job.description
  );

  // ── 4. Location (10%) ────────────────────────────────────────────────────
  const locationScore = scoreLocation(
    candidate.location,
    job.location,
    job.isRemote
  );

  // ── 5. Education (5%) ────────────────────────────────────────────────────
  const educationScore = candidate.education?.length > 0 ? 1 : 0;

  // ── Weighted total ────────────────────────────────────────────────────────
  const weights = {
    skill: 0.45,
    experience: 0.25,
    resume: 0.15,
    location: 0.10,
    education: 0.05,
  };

  const raw =
    skillScore * weights.skill * 100 +
    expScore * weights.experience * 100 +
    resumeScore * weights.resume * 100 +
    locationScore * weights.location * 100 +
    educationScore * weights.education * 100;

  // Clamp to 5–99 so we never show 0% (discouraging) or 100% (misleading)
  return Math.round(Math.min(Math.max(raw, 5), 99));
};

module.exports = {
  calculateMatchScore,
  // Export helpers so they can be unit-tested independently
  jaccardSimilarity,
  softSkillMatch,
  calculateYearsOfExperience,
  scoreExperience,
  scoreResumeText,
  scoreLocation,
};