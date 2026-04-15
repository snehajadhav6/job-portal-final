const multer = require('multer');
const CloudinaryStorage = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'pdf'];

const storage = CloudinaryStorage({
  cloudinary: cloudinary,
  params: function (req, file, cb) {
    try {
      const ext = file.originalname.split('.').pop().toLowerCase();

      if (!ALLOWED_FORMATS.includes(ext)) {
        return cb(new Error('Only JPG, PNG, and PDF files are allowed'));
      }

      const baseName = file.originalname
        .split('.')[0]
        .replace(/[^a-zA-Z0-9]/g, '_');

      cb(null, {
        folder: 'job-platform',
        resource_type: ext === 'pdf' ? 'raw' : 'auto',
        public_id: `${baseName}_${Date.now()}`,
        format: ext,
      });
    } catch (error) {
      console.error('Cloudinary Params Error:', error.message);
      cb(error);
    }
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();

    if (!ALLOWED_FORMATS.includes(ext)) {
      return cb(new Error('Invalid file type. Only JPG, PNG, PDF allowed'), false);
    }

    cb(null, true);
  },
});

module.exports = upload;