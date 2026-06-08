const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never return password in queries by default
    },
    role: {
      type: String,
      enum: ['candidate', 'employer', 'admin'],
      default: 'candidate',
    },
    avatar: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    // ── Candidate Fields ──────────────────────────────────────────────────
    headline: {
      type: String,
      default: '',
      maxlength: [200, 'Headline cannot exceed 200 characters'],
    },
    bio: {
      type: String,
      default: '',
      maxlength: [2000, 'Bio cannot exceed 2000 characters'],
    },
    location: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
    website: {
      type: String,
      default: '',
    },
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
    experience: [
      {
        title: { type: String, required: true },
        company: { type: String, required: true },
        location: { type: String, default: '' },
        from: { type: Date, required: true },
        to: { type: Date, default: null },
        current: { type: Boolean, default: false },
        description: { type: String, default: '' },
      },
    ],
    education: [
      {
        school: { type: String, required: true },
        degree: { type: String, default: '' },
        field: { type: String, default: '' },
        from: { type: Date, default: null },
        to: { type: Date, default: null },
        current: { type: Boolean, default: false },
        description: { type: String, default: '' },
      },
    ],
    resume: {
      url: { type: String, default: '' },
      filename: { type: String, default: '' },
      parsedText: { type: String, default: '' },
      uploadedAt: { type: Date, default: null },
    },
    savedJobs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
      },
    ],

    // ── Employer Fields ───────────────────────────────────────────────────
    company: {
      name: { type: String, default: '' },
      logo: { type: String, default: '' },
      website: { type: String, default: '' },
      industry: { type: String, default: '' },
      size: {
        type: String,
        enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000-5000', '5000+', ''],
        default: '',
      },
      description: { type: String, default: '' },
      location: { type: String, default: '' },
    },

    // ── LinkedIn OAuth ────────────────────────────────────────────────────
    linkedinId: {
      type: String,
      default: null,
    },
    linkedinAccessToken: {
      type: String,
      default: null,
      select: false, // Never expose access token
    },
    linkedinProfile: {
      headline: { type: String, default: '' },
      location: { type: String, default: '' },
      summary: { type: String, default: '' },
      positions: { type: Array, default: [] },
      educations: { type: Array, default: [] },
    },

    // ── Auth / Security Tokens ────────────────────────────────────────────
    emailVerificationToken: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetToken: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ linkedinId: 1 });
userSchema.index({ isActive: 1 });

// ─── Middleware: Hash password before save ───────────────────────────────────
userSchema.pre('save', async function (next) {
  // Only hash when password field is actually modified
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ─── Instance Method: Compare entered password with hashed ──────────────────
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ─── Instance Method: Return safe public JSON (strip sensitive fields) ───────
userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.password;
  delete obj.linkedinAccessToken;
  delete obj.emailVerificationToken;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  return obj;
};

// ─── Virtual: Full profile completion percentage ─────────────────────────────
userSchema.virtual('profileStrength').get(function () {
  const fields = [
    this.avatar,
    this.headline,
    this.bio,
    this.location,
    this.phone,
    this.skills?.length,
    this.experience?.length,
    this.education?.length,
    this.resume?.url,
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
});

module.exports = mongoose.model('User', userSchema);