const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { UPLOADS_DIR } = require("./constants");

const getStorage = () => {
  // Local storage for development
  return multer.diskStorage({
    destination: (req, file, cb) => {
      if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      }
      cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + "-" + file.originalname);
    },
  });
  // TODO: Add cloud storage  configuration here
  // Example for future cloud integration:
  // return multer.memoryStorage();
};

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMimeTypes.includes(file.mimetype) || ext === ".txt" || ext === ".csv") {
    cb(null, true);
  } else {
    console.warn("🚫 Rejected upload:", file.originalname, file.mimetype, ext);
    cb(new Error("File type not allowed"), false);
  }
};

const upload = multer({
  storage: getStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter,
});

module.exports = upload;