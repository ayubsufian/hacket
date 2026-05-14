// =============================================================================
// HackET — File Upload Configuration (Multer)
// Configures disk-based temporary storage for submission file uploads.
// =============================================================================

const multer = require('multer');
const path = require('path');
const AppError = require('../utils/AppError');

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB for demo videos

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'video/mp4', // demo videos
  'video/webm',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',   // .docx
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fs = require('fs');
    const dir = path.join(__dirname, '../../uploads/tmp');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(`File type '${file.mimetype}' is not allowed.`, 400), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

module.exports = upload;
