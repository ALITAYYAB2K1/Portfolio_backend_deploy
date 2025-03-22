import multer from "multer";

// Use memory storage for cloud environments
const storage = multer.memoryStorage();

// Add file filter to explicitly allow SVG files
const fileFilter = (req, file, cb) => {
  // Accept SVG files explicitly
  if (
    file.mimetype === "image/svg+xml" ||
    (file.originalname && file.originalname.toLowerCase().endsWith(".svg"))
  ) {
    cb(null, true);
  } else if (file.mimetype.startsWith("image/")) {
    // Accept other image types
    cb(null, true);
  } else {
    // Reject other file types
    cb(new Error("Unsupported file type"), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});
