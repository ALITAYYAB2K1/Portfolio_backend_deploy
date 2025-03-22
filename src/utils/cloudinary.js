import { v2 as cloudinary } from "cloudinary";
import DataURIParser from "datauri/parser.js";
import path from "path";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Log configuration on startup
console.log("Cloudinary Configuration Status:", {
  cloud_name: !!process.env.CLOUDINARY_CLOUD_NAME,
  api_key: !!process.env.CLOUDINARY_API_KEY,
  api_secret: !!process.env.CLOUDINARY_API_SECRET,
});

const parser = new DataURIParser();

const uploadOnCloudinary = async (file, folder = "") => {
  try {
    if (!file) {
      console.log("No file provided to uploadOnCloudinary");
      return null;
    }

    console.log("Uploading file to Cloudinary:", {
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      folder,
    });

    // Convert file buffer to Data URI
    const fileFormat = path.extname(file.originalname).toString();
    const fileUri = parser.format(fileFormat, file.buffer);

    // If it's SVG, handle specifically
    const resourceType = file.mimetype === "image/svg+xml" ? "image" : "auto";

    // Upload to Cloudinary using a Promise
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        fileUri.content,
        {
          folder,
          resource_type: resourceType,
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            reject(error);
          } else {
            console.log("Cloudinary upload success:", result.url);
            resolve(result);
          }
        }
      );
    });
  } catch (error) {
    console.error("Error in uploadOnCloudinary:", error);
    return null;
  }
};

export { uploadOnCloudinary };
