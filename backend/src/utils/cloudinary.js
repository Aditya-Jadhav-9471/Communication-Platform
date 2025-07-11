// utils/cloudinary.js
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

try {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
} catch (error) {
  console.error('Cloudinary configuration error:', error);
}

exports.cloudinary = cloudinary;
exports.uploadToCloudinary = async (fileBuffer, mimetype) => {
  const b64 = Buffer.from(fileBuffer).toString("base64");
  const dataURI = `data:${mimetype};base64,${b64}`;
  return cloudinary.uploader.upload(dataURI, {
    folder: "avatars",
    resource_type: "auto"
  });
};