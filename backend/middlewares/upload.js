const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { cloudinary, hasCloudinary } = require("../config/cloudinary");
const mustUseCloudinary = process.env.NODE_ENV === "production" || !!process.env.VERCEL;

let storage = null;

if (hasCloudinary) {
  const { CloudinaryStorage } = require("multer-storage-cloudinary");
  storage = new CloudinaryStorage({
    cloudinary,
    params: (req, file) => ({
      folder: "localbasket",
      resource_type: "auto",
      public_id: `${Date.now()}-${path.parse(file.originalname || "upload").name}`
    })
  });
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
  fileFilter
});

const withUploadGuard = (handler) => (req, res, next) => {
  if (mustUseCloudinary && !hasCloudinary) {
    const err = new Error("Cloudinary is not configured on this deployment");
    err.statusCode = 500;
    return next(err);
  }
  return handler(req, res, next);
};

module.exports = {
  single: (field) => withUploadGuard(multerInstance.single(field)),
  array: (field, maxCount) => withUploadGuard(multerInstance.array(field, maxCount)),
  any: () => withUploadGuard(multerInstance.any()),
  fields: (fields) => withUploadGuard(multerInstance.fields(fields))
};
