const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// ─────────────────────────────────────────────────────────────────────────────
// Configure Cloudinary SDK with credentials from .env
// ─────────────────────────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─────────────────────────────────────────────────────────────────────────────
// Resume Storage
// Stores PDF / DOC / DOCX in Cloudinary as raw files (not images).
// Files land at:  job-portal/resumes/<random-public-id>
// ─────────────────────────────────────────────────────────────────────────────
const resumeStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'job-portal/resumes',
    resource_type: 'raw',  // required for non-image files
    public_id: `resume_${req.user._id}_${Date.now()}`,
    // Cloudinary raw files keep the original extension
    format: file.originalname.split('.').pop(),
  }),
});

const resumeFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Only PDF and Word documents (.pdf, .doc, .docx) are allowed for resumes'
      ),
      false
    );
  }
};

const uploadResume = multer({
  storage: resumeStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: resumeFileFilter,
});

// ─────────────────────────────────────────────────────────────────────────────
// Avatar Storage
// Stores profile images in Cloudinary as images with auto-transformation.
// Files land at:  job-portal/avatars/<user_id>
// Using the user's _id as the public_id means each upload overwrites the
// previous avatar automatically — no orphaned files build up.
// ─────────────────────────────────────────────────────────────────────────────
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'job-portal/avatars',
    resource_type: 'image',
    // Overwrite the previous avatar for this user
    public_id: `avatar_${req.user._id}`,
    overwrite: true,
    // Crop and resize to a square thumbnail on upload
    transformation: [
      {
        width: 300,
        height: 300,
        crop: 'fill',
        gravity: 'face',  // centre on the face if detected
        quality: 'auto',
        fetch_format: 'auto',
      },
    ],
  }),
});

const avatarFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(
      new Error('Only image files (jpg, png, webp, etc.) are allowed for avatars'),
      false
    );
  }
};

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB
  },
  fileFilter: avatarFileFilter,
});

// ─────────────────────────────────────────────────────────────────────────────
// Company Logo Storage
// Employers can upload a company logo separately.
// Files land at:  job-portal/logos/<user_id>
// ─────────────────────────────────────────────────────────────────────────────
const logoStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'job-portal/logos',
    resource_type: 'image',
    public_id: `logo_${req.user._id}`,
    overwrite: true,
    transformation: [
      {
        width: 400,
        height: 400,
        crop: 'pad',       // pad to square without cropping logo
        background: 'white',
        quality: 'auto',
        fetch_format: 'auto',
      },
    ],
  }),
});

const uploadLogo = multer({
  storage: logoStorage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB
  },
  fileFilter: avatarFileFilter, // same image-only filter
});

// ─────────────────────────────────────────────────────────────────────────────
// deleteFromCloudinary
// Helper to delete a file by its public_id when e.g. a user deletes
// their account or replaces their resume.
// ─────────────────────────────────────────────────────────────────────────────
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error.message);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// getPublicIdFromUrl
// Extracts the Cloudinary public_id from a full Cloudinary URL so we can
// delete files by URL rather than having to store the public_id separately.
//
// Example input:
//   https://res.cloudinary.com/demo/image/upload/v123/job-portal/avatars/avatar_abc.jpg
// Example output:
//   job-portal/avatars/avatar_abc
// ─────────────────────────────────────────────────────────────────────────────
const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  try {
    // Split on '/upload/' and take everything after it
    const afterUpload = url.split('/upload/')[1];
    if (!afterUpload) return null;

    // Remove the version segment (v1234567890/) if present
    const withoutVersion = afterUpload.replace(/^v\d+\//, '');

    // Remove file extension
    const withoutExtension = withoutVersion.replace(/\.[^/.]+$/, '');

    return withoutExtension;
  } catch {
    return null;
  }
};

module.exports = {
  cloudinary,
  uploadResume,
  uploadAvatar,
  uploadLogo,
  deleteFromCloudinary,
  getPublicIdFromUrl,
};