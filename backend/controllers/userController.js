const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const { parseResume } = require('../services/resumeParser');

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get logged-in user's full profile
// @route   GET /api/users/profile
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate(
    'savedJobs',
    'title company.name salary type level isRemote location status createdAt'
  );

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json({
    success: true,
    user: user.toPublicJSON(),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Update logged-in user's profile
// @route   PUT /api/users/profile
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const updateProfile = asyncHandler(async (req, res) => {
  // Whitelist of fields each role is allowed to update
  const candidateFields = [
    'name',
    'headline',
    'bio',
    'location',
    'phone',
    'website',
    'skills',
    'experience',
    'education',
  ];

  const employerFields = [
    'name',
    'headline',
    'bio',
    'location',
    'phone',
    'website',
    'company',
  ];

  const allowedFields =
    req.user.role === 'employer' ? employerFields : candidateFields;

  // Build update object from only allowed fields
  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  if (Object.keys(updates).length === 0) {
    res.status(400);
    throw new Error('No valid fields provided for update');
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    user: user.toPublicJSON(),
    message: 'Profile updated successfully',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Upload and parse resume
// @route   POST /api/users/resume
// @access  Private (candidate only)
// ─────────────────────────────────────────────────────────────────────────────
const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded. Please attach a PDF or Word document.');
  }

  // Parse the uploaded resume for skills / experience / contact info
  let parsedData = {
    text: '',
    skills: [],
    yearsOfExperience: null,
    email: null,
    phone: null,
    confidence: 'low',
  };

  try {
    parsedData = await parseResume(req.file);
  } catch (parseError) {
    // Parsing failure is non-fatal — we still save the file
    console.error('Resume parse warning:', parseError.message);
  }

  // Build resume update object
  const resumeUpdate = {
    resume: {
      url: req.file.path,        // Cloudinary URL
      filename: req.file.originalname,
      parsedText: parsedData.text || '',
      uploadedAt: new Date(),
    },
  };

  // Auto-populate skills from resume if candidate has none yet
  const currentUser = await User.findById(req.user._id);
  if (
    parsedData.skills.length > 0 &&
    (!currentUser.skills || currentUser.skills.length === 0)
  ) {
    resumeUpdate.skills = parsedData.skills;
  }

  // Auto-populate phone if not already set
  if (parsedData.phone && !currentUser.phone) {
    resumeUpdate.phone = parsedData.phone;
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: resumeUpdate },
    { new: true }
  );

  res.status(200).json({
    success: true,
    resume: user.resume,
    parsed: {
      skills: parsedData.skills,
      yearsOfExperience: parsedData.yearsOfExperience,
      confidence: parsedData.confidence,
    },
    message: 'Resume uploaded and parsed successfully',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Upload avatar image
// @route   POST /api/users/avatar
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded. Please attach an image.');
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { avatar: req.file.path }, // Cloudinary URL
    { new: true }
  );

  res.status(200).json({
    success: true,
    avatar: user.avatar,
    message: 'Avatar updated successfully',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get any user's public profile by ID
// @route   GET /api/users/:id
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const getPublicProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select(
    'name headline bio avatar location skills experience education company role createdAt'
  );

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (!user.isActive) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json({
    success: true,
    user,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Import LinkedIn profile data into user profile
// @route   POST /api/users/linkedin/import
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const importLinkedIn = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user.linkedinId) {
    res.status(400);
    throw new Error(
      'No LinkedIn account connected. Please authenticate via LinkedIn OAuth first.'
    );
  }

  const { linkedinData } = req.body;

  if (!linkedinData) {
    res.status(400);
    throw new Error('No LinkedIn data provided');
  }

  const updates = {};

  // Map LinkedIn profile fields to our User schema
  if (linkedinData.headline) updates.headline = linkedinData.headline;
  if (linkedinData.summary) updates.bio = linkedinData.summary;
  if (linkedinData.location?.name) updates.location = linkedinData.location.name;

  // Map positions to experience array
  if (linkedinData.positions?.values?.length) {
    updates.experience = linkedinData.positions.values.map((pos) => ({
      title: pos.title || '',
      company: pos.company?.name || '',
      location: pos.location?.name || '',
      from: pos.startDate
        ? new Date(pos.startDate.year, (pos.startDate.month || 1) - 1)
        : new Date(),
      to: pos.endDate
        ? new Date(pos.endDate.year, (pos.endDate.month || 1) - 1)
        : null,
      current: pos.isCurrent || false,
      description: pos.summary || '',
    }));
  }

  // Map educations
  if (linkedinData.educations?.values?.length) {
    updates.education = linkedinData.educations.values.map((edu) => ({
      school: edu.schoolName || '',
      degree: edu.degree || '',
      field: edu.fieldOfStudy || '',
      from: edu.startDate ? new Date(edu.startDate.year, 0) : null,
      to: edu.endDate ? new Date(edu.endDate.year, 0) : null,
      current: false,
    }));
  }

  // Store snapshot of raw LinkedIn profile
  updates.linkedinProfile = {
    headline: linkedinData.headline || '',
    location: linkedinData.location?.name || '',
    summary: linkedinData.summary || '',
    positions: linkedinData.positions?.values || [],
    educations: linkedinData.educations?.values || [],
  };

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    user: updatedUser.toPublicJSON(),
    message: 'LinkedIn profile imported successfully',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Add a job to saved jobs list
// @route   POST /api/users/saved-jobs/:jobId
// @access  Private (candidate)
// ─────────────────────────────────────────────────────────────────────────────
const saveJob = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const jobId = req.params.jobId;

  const alreadySaved = user.savedJobs.some(
    (id) => id.toString() === jobId
  );

  if (alreadySaved) {
    // Unsave it (toggle)
    user.savedJobs = user.savedJobs.filter(
      (id) => id.toString() !== jobId
    );
    await user.save();

    return res.status(200).json({
      success: true,
      saved: false,
      message: 'Job removed from saved list',
    });
  }

  user.savedJobs.push(jobId);
  await user.save();

  res.status(200).json({
    success: true,
    saved: true,
    message: 'Job saved successfully',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all saved jobs for logged-in candidate
// @route   GET /api/users/saved-jobs
// @access  Private (candidate)
// ─────────────────────────────────────────────────────────────────────────────
const getSavedJobs = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'savedJobs',
    match: { status: 'active' }, // Only return active jobs
    select: 'title company salary type level isRemote location skills createdAt',
  });

  res.status(200).json({
    success: true,
    count: user.savedJobs.length,
    jobs: user.savedJobs,
  });
});

module.exports = {
  getProfile,
  updateProfile,
  uploadResume,
  uploadAvatar,
  getPublicProfile,
  importLinkedIn,
  saveJob,
  getSavedJobs,
};