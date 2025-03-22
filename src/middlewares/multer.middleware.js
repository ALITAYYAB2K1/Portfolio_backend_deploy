import multer from "multer";

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// Accept SVG files explicitly
const fileFilter = (req, file, cb) => {
  console.log("Multer processing file:", file.originalname, file.mimetype);

  if (
    file.mimetype === "image/svg+xml" ||
    file.originalname.toLowerCase().endsWith(".svg")
  ) {
    cb(null, true);
  } else if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    console.log("Rejected file:", file.originalname, file.mimetype);
    cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});
