import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  // Remove cloudinary_url as it's not needed and could cause conflicts
});

// Log cloudinary config status on startup
console.log("Cloudinary Configuration Status:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? "✓" : "✗",
  api_key: process.env.CLOUDINARY_API_KEY ? "✓" : "✗",
  api_secret: process.env.CLOUDINARY_API_SECRET ? "✓" : "✗",
});

// Modified to handle either file paths or buffers
const uploadOnCloudinary = async (fileInput, folderName = "") => {
  try {
    if (!fileInput) return null;

    console.log("Upload file details:", {
      mimetype: fileInput.mimetype,
      originalname: fileInput.originalname,
      size: fileInput.size,
    });

    // Check if it's an SVG file
    const isSvg =
      fileInput.mimetype === "image/svg+xml" ||
      (fileInput.originalname &&
        fileInput.originalname.toLowerCase().endsWith(".svg"));

    // Special handling for SVG files
    const uploadOptions = {
      folder: folderName,
      resource_type: isSvg ? "image" : "auto", // Explicitly set as "image" for SVGs
    };

    if (Buffer.isBuffer(fileInput.buffer)) {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              console.log("Cloudinary upload error:", error);
              return reject(error);
            }
            console.log(
              "File uploaded successfully to cloudinary:",
              result.url
            );
            resolve(result);
          }
        );

        // Convert buffer to stream and pipe to cloudinary
        const readableStream = require("stream").Readable.from(
          fileInput.buffer
        );
        readableStream.pipe(uploadStream);
      });
    }
    // For file path (legacy)
    else if (typeof fileInput === "string") {
      const uploadResult = await cloudinary.uploader.upload(
        fileInput,
        uploadOptions
      );
      console.log(
        "File uploaded successfully to cloudinary:",
        uploadResult.url
      );
      return uploadResult;
    } else {
      console.log("Invalid file input type");
      return null;
    }
  } catch (error) {
    console.log("Error while uploading file to cloudinary:", error);
    return null;
  }
};

export { uploadOnCloudinary };
