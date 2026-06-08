const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const https = require('https');
const http = require('http');

// ─────────────────────────────────────────────────────────────────────────────
// Skill keyword dictionary
// Grouped by category so the parser can also return skill categories.
// Add / remove keywords to tune detection for your target audience.
// ─────────────────────────────────────────────────────────────────────────────
const SKILL_DICTIONARY = {
  languages: [
    'javascript', 'typescript', 'python', 'java', 'go', 'golang', 'rust',
    'c++', 'c#', 'php', 'ruby', 'swift', 'kotlin', 'scala', 'r', 'matlab',
    'perl', 'bash', 'shell', 'powershell', 'dart', 'lua', 'elixir', 'haskell',
  ],
  frontend: [
    'react', 'react.js', 'reactjs', 'vue', 'vue.js', 'vuejs', 'angular',
    'svelte', 'next.js', 'nextjs', 'nuxt', 'gatsby', 'remix', 'html', 'html5',
    'css', 'css3', 'sass', 'scss', 'less', 'tailwind', 'tailwindcss',
    'bootstrap', 'material ui', 'chakra ui', 'styled-components', 'webpack',
    'vite', 'redux', 'zustand', 'mobx', 'graphql', 'apollo',
  ],
  backend: [
    'node.js', 'nodejs', 'express', 'express.js', 'fastapi', 'django',
    'flask', 'spring', 'spring boot', 'laravel', 'rails', 'ruby on rails',
    'asp.net', 'nestjs', 'nest.js', 'hapi', 'koa', 'fiber', 'gin',
    'rest api', 'restful', 'grpc', 'graphql', 'websocket', 'microservices',
  ],
  databases: [
    'mongodb', 'mongoose', 'postgresql', 'postgres', 'mysql', 'sqlite',
    'redis', 'elasticsearch', 'dynamodb', 'cassandra', 'firebase',
    'supabase', 'prisma', 'sequelize', 'typeorm', 'sql', 'nosql',
  ],
  cloud: [
    'aws', 'amazon web services', 'gcp', 'google cloud', 'azure',
    'microsoft azure', 'heroku', 'vercel', 'netlify', 'digitalocean',
    'cloudflare', 'lambda', 'ec2', 's3', 'rds', 'cloudfront',
  ],
  devops: [
    'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'jenkins',
    'ci/cd', 'github actions', 'gitlab ci', 'circleci', 'travis ci',
    'prometheus', 'grafana', 'nginx', 'apache', 'linux', 'unix',
  ],
  mobile: [
    'react native', 'flutter', 'ios', 'android', 'swift', 'swiftui',
    'xcode', 'kotlin', 'java android', 'expo',
  ],
  design: [
    'figma', 'sketch', 'adobe xd', 'invision', 'zeplin', 'photoshop',
    'illustrator', 'after effects', 'ui/ux', 'ux design', 'ui design',
    'wireframing', 'prototyping', 'design systems', 'accessibility', 'a11y',
  ],
  data: [
    'machine learning', 'deep learning', 'pytorch', 'tensorflow', 'keras',
    'scikit-learn', 'pandas', 'numpy', 'scipy', 'matplotlib', 'seaborn',
    'tableau', 'power bi', 'data analysis', 'data science', 'nlp',
    'computer vision', 'spark', 'hadoop', 'airflow', 'dbt',
  ],
  tools: [
    'git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence',
    'notion', 'slack', 'trello', 'agile', 'scrum', 'kanban',
    'test driven development', 'tdd', 'jest', 'mocha', 'cypress',
    'playwright', 'selenium', 'postman', 'swagger', 'openapi',
  ],
};

// Flatten all skills into a single sorted-by-length array
// (longer phrases first so "react native" matches before "react")
const ALL_SKILLS = Object.values(SKILL_DICTIONARY)
  .flat()
  .sort((a, b) => b.length - a.length);

// ─────────────────────────────────────────────────────────────────────────────
// fetchBuffer
// Downloads a file from a URL (Cloudinary) into a Buffer so pdf-parse /
// mammoth can work with it in memory — no local disk writes needed.
// ─────────────────────────────────────────────────────────────────────────────
const fetchBuffer = (url) =>
  new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol
      .get(url, (response) => {
        // Follow redirects (Cloudinary sometimes redirects)
        if (
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          return fetchBuffer(response.headers.location)
            .then(resolve)
            .catch(reject);
        }

        if (response.statusCode !== 200) {
          return reject(
            new Error(`Failed to fetch file: HTTP ${response.statusCode}`)
          );
        }

        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      })
      .on('error', reject);
  });

// ─────────────────────────────────────────────────────────────────────────────
// extractText
// Pulls raw text out of a PDF or Word document buffer.
// ─────────────────────────────────────────────────────────────────────────────
const extractText = async (buffer, mimetype) => {
  if (mimetype === 'application/pdf') {
    const data = await pdfParse(buffer);
    return data.text || '';
  }

  if (
    mimetype === 'application/msword' ||
    mimetype ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }

  throw new Error(`Unsupported file type: ${mimetype}`);
};

// ─────────────────────────────────────────────────────────────────────────────
// extractSkills
// Scans the lowercased text for every keyword in ALL_SKILLS.
// Returns deduplicated, properly capitalised skill names.
// ─────────────────────────────────────────────────────────────────────────────
const extractSkills = (text) => {
  const lower = text.toLowerCase();
  const found = new Set();

  for (const skill of ALL_SKILLS) {
    // Use word-boundary-aware check — avoid "java" matching inside "javascript"
    // We build a simple regex only for short single-word skills
    if (skill.split(' ').length === 1) {
      const regex = new RegExp(`\\b${escapeRegex(skill)}\\b`, 'i');
      if (regex.test(lower)) {
        found.add(skill);
      }
    } else {
      // Multi-word skills: plain substring check is fine
      if (lower.includes(skill)) {
        found.add(skill);
      }
    }
  }

  // Convert to display-friendly capitalisation
  return [...found].map((s) =>
    s
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// extractYearsOfExperience
// Looks for patterns like "5 years experience", "3+ years", "10 yrs", etc.
// Returns the highest number found, or null if none detected.
// ─────────────────────────────────────────────────────────────────────────────
const extractYearsOfExperience = (text) => {
  const patterns = [
    /(\d+)\+?\s*years?\s+(?:of\s+)?(?:professional\s+)?experience/gi,
    /(\d+)\+?\s*yrs?\s+(?:of\s+)?experience/gi,
    /experience\s+(?:of\s+)?(\d+)\+?\s*years?/gi,
  ];

  const found = [];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n <= 50) found.push(n); // cap at 50 to ignore noise
    }
  }

  return found.length > 0 ? Math.max(...found) : null;
};

// ─────────────────────────────────────────────────────────────────────────────
// extractEmail
// Returns the first valid email address found in the text.
// ─────────────────────────────────────────────────────────────────────────────
const extractEmail = (text) => {
  const match = text.match(
    /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/
  );
  return match ? match[0].toLowerCase() : null;
};

// ─────────────────────────────────────────────────────────────────────────────
// extractPhone
// Returns the first phone-like string found in the text.
// Handles international formats: +1 (555) 000-0000, +44 7700 900000, etc.
// ─────────────────────────────────────────────────────────────────────────────
const extractPhone = (text) => {
  const match = text.match(
    /(?:\+?\d{1,3}[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}/
  );
  return match ? match[0].trim() : null;
};

// ─────────────────────────────────────────────────────────────────────────────
// extractName
// Very rough heuristic — the first non-empty line of the resume is usually
// the candidate's name. Only used when we can't get it from elsewhere.
// ─────────────────────────────────────────────────────────────────────────────
const extractName = (text) => {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // First line that looks like a name (2–5 words, no numbers or special chars)
  for (const line of lines.slice(0, 5)) {
    if (/^[a-zA-Z\s.'-]{3,60}$/.test(line) && line.split(' ').length <= 5) {
      return line;
    }
  }

  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// calculateParseConfidence
// Returns 'high' / 'medium' / 'low' based on how much text was extracted
// and how many data points were successfully parsed.
// ─────────────────────────────────────────────────────────────────────────────
const calculateParseConfidence = (text, skills, email, phone) => {
  const dataPoints = [
    text.length > 500,
    skills.length >= 3,
    email !== null,
    phone !== null,
  ].filter(Boolean).length;

  if (dataPoints >= 3 && text.length > 1000) return 'high';
  if (dataPoints >= 2 && text.length > 300) return 'medium';
  return 'low';
};

// ─────────────────────────────────────────────────────────────────────────────
// escapeRegex
// Escapes special regex characters in a skill name so it's safe to use
// inside a RegExp constructor.
// ─────────────────────────────────────────────────────────────────────────────
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ─────────────────────────────────────────────────────────────────────────────
// parseResume  (main export)
//
// @param  {Object} file  — multer file object
//                          file.path      = Cloudinary URL (after upload)
//                          file.mimetype  = MIME type of original file
//                          file.originalname
//
// @returns {Object} {
//   text              — first 5000 chars of extracted text (stored in DB)
//   skills            — array of detected skill strings
//   yearsOfExperience — number or null
//   email             — string or null
//   phone             — string or null
//   name              — string or null
//   confidence        — 'high' | 'medium' | 'low'
// }
// ─────────────────────────────────────────────────────────────────────────────
const parseResume = async (file) => {
  let rawText = '';

  try {
    const buffer = await fetchBuffer(file.path);
    rawText = await extractText(buffer, file.mimetype);
  } catch (err) {
    console.error('Resume text extraction failed:', err.message);
    // Return empty result — caller handles gracefully
    return {
      text: '',
      skills: [],
      yearsOfExperience: null,
      email: null,
      phone: null,
      name: null,
      confidence: 'low',
    };
  }

  // Normalise whitespace
  const cleanText = rawText.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();

  const skills = extractSkills(cleanText);
  const yearsOfExperience = extractYearsOfExperience(cleanText);
  const email = extractEmail(cleanText);
  const phone = extractPhone(cleanText);
  const name = extractName(cleanText);
  const confidence = calculateParseConfidence(cleanText, skills, email, phone);

  return {
    text: cleanText.slice(0, 5000), // cap storage size
    skills,
    yearsOfExperience,
    email,
    phone,
    name,
    confidence,
  };
};

module.exports = { parseResume };