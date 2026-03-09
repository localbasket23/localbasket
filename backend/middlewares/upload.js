const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { cloudinary, hasCloudinary } = require("../config/cloudinary");

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
} else {
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

const upload = multer({
  storage,
  fileFilter
});

module.exports = upload;
