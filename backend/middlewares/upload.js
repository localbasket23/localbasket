const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { hasCloudinary } = require("../config/cloudinary");
const mustUseCloudinary = process.env.NODE_ENV === "production" || !!process.env.VERCEL;

let storage = null;

if (hasCloudinary) {
  storage = multer.memoryStorage();
} else if (!mustUseCloudinary) {
  const uploadDir = path.join(__dirname, "..", "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = Date.now() + path.extname(file.originalname);
      cb(null, uniqueName);
    }
  });
} else {
  storage = multer.memoryStorage();
}

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype === "application/pdf"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only images or PDFs allowed"), false);
  }
};

const multerInstance = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

const requestHasFiles = (req) => {
  if (Array.isArray(req?.files) && req.files.length > 0) return true;
  if (req?.files && typeof req.files === "object") {
    return Object.values(req.files).some((value) => Array.isArray(value) && value.length > 0);
  }
  return !!req?.file;
};

const withUploadGuard = (handler) => (req, res, next) => {
  return handler(req, res, (err) => {
    if (err) return next(err);

    if (mustUseCloudinary && !hasCloudinary && requestHasFiles(req)) {
      const uploadErr = new Error("Cloudinary is not configured on this deployment");
      uploadErr.statusCode = 500;
      return next(uploadErr);
    }

    return next();
  });
};

module.exports = {
  single: (field) => withUploadGuard(multerInstance.single(field)),
  array: (field, maxCount) => withUploadGuard(multerInstance.array(field, maxCount)),
  any: () => withUploadGuard(multerInstance.any()),
  fields: (fields) => withUploadGuard(multerInstance.fields(fields))
};
