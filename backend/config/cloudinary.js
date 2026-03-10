const cloudinary = require("cloudinary").v2;

const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
const apiKey = String(process.env.CLOUDINARY_API_KEY || "").trim();
const apiSecret = String(process.env.CLOUDINARY_API_SECRET || "").trim();

const hasCloudinary = !!(cloudName && apiKey && apiSecret);

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret
  });
}

const uploadToCloudinary = async (file, options = {}) => {
  if (!file || !hasCloudinary) return null;

  const existing = String(file.secure_url || file.url || file.path || "").trim();
  if (/^https?:\/\//i.test(existing)) {
    return {
      secure_url: existing,
      public_id: String(file.filename || "").trim() || null
    };
  }

  const uploadOptions = {
    folder: "localbasket",
    resource_type: "auto",
    ...options
  };

  if (file.buffer && file.mimetype) {
    const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
    return cloudinary.uploader.upload(dataUri, uploadOptions);
  }

  const localPath = String(file.path || "").trim();
  if (localPath) {
    return cloudinary.uploader.upload(localPath, uploadOptions);
  }

  return null;
};

module.exports = {
  cloudinary,
  hasCloudinary,
  uploadToCloudinary
};
