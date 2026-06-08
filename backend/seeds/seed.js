const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const connectDB = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// Seed Data
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN = {
  name: 'Admin User',
  email: 'admin@talenthive.com',
  password: 'Admin@1234',
  role: 'admin',
  isEmailVerified: true,
  headline: 'Platform Administrator',
};

const EMPLOYERS = [
  {
    name: 'Sarah Chen',
    email: 'hiring@stripe.com',
    password: 'Employer@1234',
    role: 'employer',
    isEmailVerified: true,
    headline: 'Head of Recruiting at Stripe',
    location: 'San Francisco, CA',
    company: {
      name: 'Stripe',
      website: 'https://stripe.com',
      industry: 'Fintech',
      size: '1000-5000',
      location: 'San Francisco, CA',
      description:
        'Stripe builds economic infrastructure for the internet. Businesses of every size use our software to accept payments and manage their businesses online.',
    },
  },
  {
    name: 'Marcus Webb',
    email: 'jobs@vercel.com',
    password: 'Employer@1234',
    role: 'employer',
    isEmailVerified: true,
    headline: 'Engineering Recruiter at Vercel',
    location: 'Remote',
    company: {
      name: 'Vercel',
      website: 'https://vercel.com',
      industry: 'Developer Tools',
      size: '201-500',
      location: 'Remote',
      description:
        'Vercel is the platform for frontend developers, providing the speed and reliability innovators need to create at the moment of inspiration.',
    },
  },
  {
    name: 'Priya Nair',
    email: 'talent@openai.com',
    password: 'Employer@1234',
    role: 'employer',
    isEmailVerified: true,
    headline: 'Technical Recruiter at OpenAI',
    location: 'San Francisco, CA',
    company: {
      name: 'OpenAI',
      website: 'https://openai.com',
      industry: 'Artificial Intelligence',
      size: '201-500',
      location: 'San Francisco, CA',
      description:
        'OpenAI is an AI safety company. Our mission is to ensure that artificial general intelligence benefits all of humanity.',
    },
  },
];

const CANDIDATES = [
  {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'Candidate@1234',
    role: 'candidate',
    isEmailVerified: true,
    headline: 'Senior Frontend Engineer',
    bio: '5+ years building exceptional web experiences with React and TypeScript. Passionate about performance, accessibility, and great developer experience.',
    location: 'San Francisco, CA',
    phone: '+1 (555) 100-2000',
    website: 'https://johndoe.dev',
    skills: [
      'React', 'TypeScript', 'Node.js', 'GraphQL',
      'CSS', 'Tailwind', 'Next.js', 'Figma',
    ],
    experience: [
      {
        title: 'Senior Frontend Engineer',
        company: 'TechCorp',
        location: 'San Francisco, CA',
        from: new Date('2021-03-01'),
        to: null,
        current: true,
        description:
          'Lead development of React component library used across 6 products. Improved page load time by 40% through code splitting and caching strategies.',
      },
      {
        title: 'Frontend Developer',
        company: 'StartupXYZ',
        location: 'Remote',
        from: new Date('2019-06-01'),
        to: new Date('2021-02-28'),
        current: false,
        description:
          'Built customer-facing dashboard serving 50k DAU. Integrated Stripe payments and real-time notifications using WebSockets.',
      },
    ],
    education: [
      {
        school: 'UC Berkeley',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        from: new Date('2015-09-01'),
        to: new Date('2019-05-31'),
        current: false,
      },
    ],
  },
  {
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: 'Candidate@1234',
    role: 'candidate',
    isEmailVerified: true,
    headline: 'Machine Learning Engineer',
    bio: 'ML engineer with 4 years of experience building production ML systems. Strong background in NLP and computer vision.',
    location: 'New York, NY',
    phone: '+1 (555) 200-3000',
    skills: [
      'Python', 'PyTorch', 'TensorFlow', 'Scikit-learn',
      'AWS', 'Docker', 'SQL', 'Pandas', 'NumPy',
    ],
    experience: [
      {
        title: 'ML Engineer',
        company: 'DataCo',
        location: 'New York, NY',
        from: new Date('2020-08-01'),
        to: null,
        current: true,
        description:
          'Designed and deployed NLP pipeline processing 1M documents/day. Reduced model inference latency by 60% via ONNX optimisation.',
      },
    ],
    education: [
      {
        school: 'MIT',
        degree: 'Master of Science',
        field: 'Computer Science — AI/ML',
        from: new Date('2018-09-01'),
        to: new Date('2020-06-30'),
        current: false,
      },
    ],
  },
  {
    name: 'Alex Kim',
    email: 'alex@example.com',
    password: 'Candidate@1234',
    role: 'candidate',
    isEmailVerified: true,
    headline: 'Full Stack Developer',
    bio: 'Versatile full stack developer comfortable across the entire web stack. Love building fast, reliable APIs and clean UIs.',
    location: 'Austin, TX',
    skills: [
      'JavaScript', 'Node.js', 'React', 'PostgreSQL',
      'Redis', 'Docker', 'AWS', 'Python',
    ],
    experience: [
      {
        title: 'Full Stack Developer',
        company: 'AgencyDev',
        location: 'Austin, TX',
        from: new Date('2022-01-01'),
        to: null,
        current: true,
        description:
          'Delivered 12+ client projects from design to deployment. Built REST APIs serving mobile and web clients.',
      },
    ],
    education: [
      {
        school: 'University of Texas at Austin',
        degree: 'Bachelor of Science',
        field: 'Software Engineering',
        from: new Date('2018-09-01'),
        to: new Date('2022-05-31'),
        current: false,
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// buildJobs
// Accepts created employer documents and returns a job definitions array
// with the correct employer ObjectIds embedded.
// ─────────────────────────────────────────────────────────────────────────────
const buildJobs = (stripe, vercel, openai) => [
  {
    title: 'Senior Frontend Engineer',
    description:
      'Build the financial infrastructure for the internet. You\'ll work on complex UI systems serving millions of global users. We ship fast, iterate constantly, and set the bar for quality.',
    requirements:
      '5+ years of experience with React and TypeScript. Strong understanding of browser fundamentals, CSS, and performance optimisation. Experience with design systems and component libraries.',
    responsibilities:
      'Architect and build React component library. Partner with design to implement pixel-perfect UIs. Mentor junior engineers. Drive best practices across the frontend team.',
    employer: stripe._id,
    company: {
      name: 'Stripe',
      logo: '',
      website: 'https://stripe.com',
      location: 'San Francisco, CA',
    },
    location: 'San Francisco, CA',
    isRemote: true,
    type: 'Full-time',
    level: 'Senior',
    category: 'Engineering',
    skills: ['React', 'TypeScript', 'GraphQL', 'CSS', 'Node.js'],
    salary: { min: 140000, max: 180000, currency: 'USD', period: 'yearly', isPublic: true },
    benefits: ['Health insurance', 'Equity', 'Remote work', '401k', 'Learning budget'],
    isFeatured: true,
  },
  {
    title: 'Product Designer',
    description:
      'Design the future of payment experiences used by millions of businesses worldwide. You\'ll own end-to-end design across multiple product surfaces.',
    requirements:
      '3+ years of product design experience. Exceptional Figma skills. Experience with design systems and B2B SaaS products. Strong communication and stakeholder management.',
    responsibilities:
      'Own the design of new features from discovery to delivery. Maintain and evolve the design system. Run user research sessions. Collaborate with engineers and PMs.',
    employer: stripe._id,
    company: {
      name: 'Stripe',
      logo: '',
      website: 'https://stripe.com',
      location: 'San Francisco, CA',
    },
    location: 'San Francisco, CA',
    isRemote: false,
    type: 'Full-time',
    level: 'Mid',
    category: 'Design',
    skills: ['Figma', 'Prototyping', 'User Research', 'Design Systems'],
    salary: { min: 110000, max: 145000, currency: 'USD', period: 'yearly', isPublic: true },
    benefits: ['Health insurance', 'Equity', 'Catered meals', '401k'],
  },
  {
    title: 'Backend Engineer',
    description:
      'Build the infrastructure that powers the modern web. Work on the systems that handle millions of deployments for developers and companies worldwide.',
    requirements:
      '3+ years of backend engineering experience. Proficiency in Node.js or Go. Experience with distributed systems, databases at scale, and CI/CD pipelines.',
    responsibilities:
      'Design and implement APIs consumed by millions of users. Improve reliability, performance, and observability. On-call rotation for critical infrastructure.',
    employer: vercel._id,
    company: {
      name: 'Vercel',
      logo: '',
      website: 'https://vercel.com',
      location: 'Remote',
    },
    location: 'Remote',
    isRemote: true,
    type: 'Full-time',
    level: 'Mid',
    category: 'Engineering',
    skills: ['Node.js', 'Go', 'PostgreSQL', 'Redis', 'Docker'],
    salary: { min: 110000, max: 140000, currency: 'USD', period: 'yearly', isPublic: true },
    benefits: ['Fully remote', 'Equity', 'Health insurance', 'Home office stipend'],
  },
  {
    title: 'DevOps Engineer',
    description:
      'Own and evolve the CI/CD infrastructure powering deployments for developers across the globe. You\'ll work on Kubernetes clusters, monitoring, and developer tooling.',
    requirements:
      '5+ years in a DevOps or Platform Engineering role. Deep Kubernetes and Terraform experience. Familiarity with AWS or GCP. Strong scripting skills (Bash, Python).',
    responsibilities:
      'Manage multi-region Kubernetes infrastructure. Improve deployment reliability and speed. Build internal developer tooling. Respond to and post-mortem incidents.',
    employer: vercel._id,
    company: {
      name: 'Vercel',
      logo: '',
      website: 'https://vercel.com',
      location: 'Remote',
    },
    location: 'Remote',
    isRemote: true,
    type: 'Full-time',
    level: 'Senior',
    category: 'Engineering',
    skills: ['Kubernetes', 'Terraform', 'AWS', 'Docker', 'Prometheus', 'Go'],
    salary: { min: 130000, max: 165000, currency: 'USD', period: 'yearly', isPublic: true },
    benefits: ['Fully remote', 'Equity', 'Health insurance', 'Conference budget'],
  },
  {
    title: 'Machine Learning Engineer',
    description:
      'Join the frontier of AI research and deployment. Work on training, optimising, and serving large language models at massive scale.',
    requirements:
      '4+ years of ML engineering experience. Strong Python skills. Experience with PyTorch and distributed training. Familiarity with CUDA and GPU optimisation preferred.',
    responsibilities:
      'Develop and maintain ML training pipelines. Optimise model inference for production. Collaborate with researchers to productionise new models. Drive ML infrastructure improvements.',
    employer: openai._id,
    company: {
      name: 'OpenAI',
      logo: '',
      website: 'https://openai.com',
      location: 'San Francisco, CA',
    },
    location: 'San Francisco, CA',
    isRemote: false,
    type: 'Full-time',
    level: 'Senior',
    category: 'Engineering',
    skills: ['Python', 'PyTorch', 'CUDA', 'AWS', 'Docker', 'Kubernetes'],
    salary: { min: 200000, max: 300000, currency: 'USD', period: 'yearly', isPublic: true },
    benefits: ['Equity', 'Health insurance', 'Generous PTO', 'Compute credits'],
    isFeatured: true,
  },
  {
    title: 'Technical Recruiter',
    description:
      'Help us find the world\'s best engineers and researchers. You\'ll own full-cycle recruiting for technical roles across engineering and AI research.',
    requirements:
      '3+ years of technical recruiting experience, ideally in AI or deep tech. Ability to evaluate technical candidates. Experience with ATS tools and sourcing strategies.',
    responsibilities:
      'Source and pipeline top technical talent. Run structured interviews. Partner with hiring managers. Improve recruiting processes and metrics.',
    employer: openai._id,
    company: {
      name: 'OpenAI',
      logo: '',
      website: 'https://openai.com',
      location: 'San Francisco, CA',
    },
    location: 'San Francisco, CA',
    isRemote: false,
    type: 'Full-time',
    level: 'Mid',
    category: 'HR',
    skills: ['Technical Recruiting', 'Sourcing', 'Interviewing', 'ATS', 'LinkedIn'],
    salary: { min: 90000, max: 130000, currency: 'USD', period: 'yearly', isPublic: true },
    benefits: ['Equity', 'Health insurance', 'Generous PTO'],
  },
  {
    title: 'Frontend Intern',
    description:
      'Join Vercel for a 12-week internship working directly on production code. You\'ll be embedded in an engineering squad and ship real features.',
    requirements:
      'Currently enrolled in a CS or related degree. Proficiency in JavaScript and React. Strong learner, comfortable asking questions.',
    responsibilities:
      'Work on a defined project with a dedicated mentor. Participate in sprint planning and daily standups. Present your work at the end of the internship.',
    employer: vercel._id,
    company: {
      name: 'Vercel',
      logo: '',
      website: 'https://vercel.com',
      location: 'Remote',
    },
    location: 'Remote',
    isRemote: true,
    type: 'Internship',
    level: 'Entry',
    category: 'Engineering',
    skills: ['JavaScript', 'React', 'CSS', 'Git'],
    salary: { min: 40, max: 55, currency: 'USD', period: 'hourly', isPublic: true },
    benefits: ['Remote', 'Mentorship', 'Potential full-time offer'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// seed
// ─────────────────────────────────────────────────────────────────────────────
const seed = async () => {
  await connectDB();

  console.log('\n🧹  Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Job.deleteMany({}),
    Application.deleteMany({}),
  ]);
  console.log('    Done.\n');

  // ── Create users ───────────────────────────────────────────────────────────
  console.log('👤  Creating users...');
  const admin = await User.create(ADMIN);

  const [stripe, vercel, openai] = await Promise.all(
    EMPLOYERS.map((e) => User.create(e))
  );

  const [john, jane, alex] = await Promise.all(
    CANDIDATES.map((c) => User.create(c))
  );

  console.log(`    ✅  1 admin, 3 employers, 3 candidates created.\n`);

  // ── Create jobs ────────────────────────────────────────────────────────────
  console.log('💼  Creating jobs...');
  const jobDefs = buildJobs(stripe, vercel, openai);
  const jobs = await Job.insertMany(jobDefs);
  console.log(`    ✅  ${jobs.length} jobs created.\n`);

  const [
    seniorFrontend,
    productDesigner,
    backendEngineer,
    devOps,
    mlEngineer,
    techRecruiter,
    frontendIntern,
  ] = jobs;

  // ── Create sample applications ─────────────────────────────────────────────
  console.log('📋  Creating applications...');

  const applications = await Application.create([
    // John (senior frontend) → Senior Frontend Engineer @ Stripe
    {
      job: seniorFrontend._id,
      candidate: john._id,
      employer: stripe._id,
      coverLetter:
        'I\'ve spent 5 years building large-scale React apps and I\'d love to bring that experience to Stripe\'s platform team.',
      resume: { url: '', filename: 'john_doe_resume.pdf' },
      matchScore: 92,
      status: 'interview',
      statusHistory: [
        { status: 'applied', changedAt: new Date('2026-05-20'), changedBy: john._id },
        { status: 'reviewing', changedAt: new Date('2026-05-22'), changedBy: stripe._id },
        { status: 'interview', changedAt: new Date('2026-05-25'), changedBy: stripe._id },
      ],
    },
    // John → Backend Engineer @ Vercel
    {
      job: backendEngineer._id,
      candidate: john._id,
      employer: vercel._id,
      coverLetter:
        'I have strong Node.js experience and would love to help Vercel scale their infrastructure.',
      resume: { url: '', filename: 'john_doe_resume.pdf' },
      matchScore: 74,
      status: 'reviewing',
      statusHistory: [
        { status: 'applied', changedAt: new Date('2026-05-28'), changedBy: john._id },
        { status: 'reviewing', changedAt: new Date('2026-05-30'), changedBy: vercel._id },
      ],
    },
    // Jane (ML) → ML Engineer @ OpenAI
    {
      job: mlEngineer._id,
      candidate: jane._id,
      employer: openai._id,
      coverLetter:
        'Four years of production ML systems experience with a focus on NLP — I\'m aligned with OpenAI\'s mission and excited about this role.',
      resume: { url: '', filename: 'jane_smith_resume.pdf' },
      matchScore: 88,
      status: 'shortlisted',
      statusHistory: [
        { status: 'applied', changedAt: new Date('2026-05-18'), changedBy: jane._id },
        { status: 'reviewing', changedAt: new Date('2026-05-20'), changedBy: openai._id },
        { status: 'shortlisted', changedAt: new Date('2026-05-24'), changedBy: openai._id },
      ],
    },
    // Jane → DevOps @ Vercel (rejected)
    {
      job: devOps._id,
      candidate: jane._id,
      employer: vercel._id,
      coverLetter: 'Interested in the DevOps role — I have some infrastructure experience.',
      resume: { url: '', filename: 'jane_smith_resume.pdf' },
      matchScore: 41,
      status: 'rejected',
      statusHistory: [
        { status: 'applied', changedAt: new Date('2026-05-10'), changedBy: jane._id },
        { status: 'rejected', changedAt: new Date('2026-05-15'), changedBy: vercel._id },
      ],
    },
    // Alex → Backend Engineer @ Vercel
    {
      job: backendEngineer._id,
      candidate: alex._id,
      employer: vercel._id,
      coverLetter:
        'Full stack background with strong Node.js and PostgreSQL skills — excited about Vercel\'s infrastructure challenges.',
      resume: { url: '', filename: 'alex_kim_resume.pdf' },
      matchScore: 79,
      status: 'applied',
      statusHistory: [
        { status: 'applied', changedAt: new Date('2026-06-01'), changedBy: alex._id },
      ],
    },
    // Alex → Frontend Intern @ Vercel
    {
      job: frontendIntern._id,
      candidate: alex._id,
      employer: vercel._id,
      coverLetter: 'Looking for a great internship to grow my frontend skills.',
      resume: { url: '', filename: 'alex_kim_resume.pdf' },
      matchScore: 55,
      status: 'offered',
      statusHistory: [
        { status: 'applied', changedAt: new Date('2026-05-01'), changedBy: alex._id },
        { status: 'reviewing', changedAt: new Date('2026-05-03'), changedBy: vercel._id },
        { status: 'interview', changedAt: new Date('2026-05-08'), changedBy: vercel._id },
        { status: 'offered', changedAt: new Date('2026-05-15'), changedBy: vercel._id },
      ],
    },
  ]);

  // Update application counts on jobs
  await Promise.all([
    Job.findByIdAndUpdate(seniorFrontend._id, { applicationCount: 1 }),
    Job.findByIdAndUpdate(backendEngineer._id, { applicationCount: 2 }),
    Job.findByIdAndUpdate(mlEngineer._id, { applicationCount: 1 }),
    Job.findByIdAndUpdate(devOps._id, { applicationCount: 1 }),
    Job.findByIdAndUpdate(frontendIntern._id, { applicationCount: 1 }),
  ]);

  console.log(`    ✅  ${applications.length} applications created.\n`);

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('═'.repeat(52));
  console.log('✅  DATABASE SEEDED SUCCESSFULLY');
  console.log('═'.repeat(52));
  console.log('\n📋  Test Accounts:\n');
  console.log('  Role       Email                       Password');
  console.log('  ─────────  ──────────────────────────  ──────────────');
  console.log('  Admin      admin@talenthive.com        Admin@1234');
  console.log('  Employer   hiring@stripe.com           Employer@1234');
  console.log('  Employer   jobs@vercel.com             Employer@1234');
  console.log('  Employer   talent@openai.com           Employer@1234');
  console.log('  Candidate  john@example.com            Candidate@1234');
  console.log('  Candidate  jane@example.com            Candidate@1234');
  console.log('  Candidate  alex@example.com            Candidate@1234');
  console.log('\n🌐  API: http://localhost:5000/api');
  console.log('❤️   Health check: http://localhost:5000/api/health\n');

  await mongoose.disconnect();
  process.exit(0);
};

// ─────────────────────────────────────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────────────────────────────────────
seed().catch((err) => {
  console.error('\n❌  Seed failed:', err.message);
  mongoose.disconnect();
  process.exit(1);
});