import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { v2 as cloudinary } from "cloudinary";
import { sendEmail } from "../utils/sendEmail.js";
import crypto from "crypto";
import { image_ID_Parser } from "../utils/imageParser.js";
import jwt from "jsonwebtoken";

// Cookie options helper
const getCookieOptions = () => ({
  httpOnly: true,
  secure: true,
  sameSite: "none", // Required for cross-domain (Netlify to Render)
  maxAge: 24 * 60 * 60 * 1000, // 1 day expiration
});

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    if (!user.generateRefreshToken || !user.generateAccessToken) {
      throw new ApiError(500, "Token generation methods are missing");
    }

    const refreshToken = user.generateRefreshToken();
    const accessToken = user.generateAccessToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Token generation error:", error);
    throw new ApiError(500, "Error while generating tokens");
  }
};

const registerUser = asyncHandler(async (req, res, next) => {
  try {
    console.log("Processing user registration request");

    const {
      fullname,
      email,
      password,
      aboutMe,
      phone,
      portfolioURL,
      githubURL,
      linkedinURL,
      facebookURL,
      twitterURL,
      instagramURL,
    } = req.body;

    // Validate required fields
    if (
      [fullname, email, password, aboutMe, phone].some(
        (field) => !field || field?.trim() === ""
      )
    ) {
      throw new ApiError(400, "Please fill in all required fields");
    }

    // Check for existing user
    const existedUser = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (existedUser) {
      throw new ApiError(400, "User already exists with this email or phone");
    }

    // Check for required files
    if (!req.files?.avatar || !req.files?.avatar[0]) {
      throw new ApiError(400, "Please upload an avatar image");
    }

    if (!req.files?.resume || !req.files?.resume[0]) {
      throw new ApiError(400, "Please upload a resume file");
    }

    // Get files from memory
    const avatarFile = req.files.avatar[0];
    const resumeFile = req.files.resume[0];

    console.log("Processing avatar:", avatarFile.originalname);
    console.log("Processing resume:", resumeFile.originalname);

    // Upload files to Cloudinary
    let avatar, resume;

    try {
      avatar = await uploadOnCloudinary(avatarFile, "avatars");
      if (!avatar || !avatar.url) {
        throw new Error("Avatar upload failed");
      }
    } catch (error) {
      console.error("Avatar upload error:", error);
      throw new ApiError(500, "Failed to upload avatar");
    }

    try {
      resume = await uploadOnCloudinary(resumeFile, "resumes");
      if (!resume || !resume.url) {
        throw new Error("Resume upload failed");
      }
    } catch (error) {
      console.error("Resume upload error:", error);
      throw new ApiError(500, "Failed to upload resume");
    }

    // Create user
    const user = await User.create({
      fullname,
      email,
      password,
      aboutMe,
      phone,
      portfolioURL: portfolioURL || "",
      githubURL: githubURL || "",
      linkedinURL: linkedinURL || "",
      facebookURL: facebookURL || "",
      twitterURL: twitterURL || "",
      instagramURL: instagramURL || "",
      avatar: avatar.url,
      resume: resume.url,
    });

    // Generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );

    // Get user data without sensitive fields
    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    if (!createdUser) {
      throw new ApiError(500, "User created but failed to retrieve user data");
    }

    // Set cookies and return response
    const options = getCookieOptions();

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            user: createdUser,
            accessToken,
            refreshToken,
          },
          "User registered successfully"
        )
      );
  } catch (error) {
    console.error("Registration error:", error);
    next(error);
  }
});

const loginUser = asyncHandler(async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(400, "Please provide email and password");
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      throw new ApiError(401, "Invalid email or password");
    }

    const isPasswordCorrect = await user.isPasswordCorrect(password);

    if (!isPasswordCorrect) {
      throw new ApiError(401, "Invalid email or password");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );

    const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    if (!loggedInUser) {
      throw new ApiError(500, "Failed to retrieve user data after login");
    }

    const options = getCookieOptions();

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            user: loggedInUser,
            accessToken,
            refreshToken,
          },
          "Login successful"
        )
      );
  } catch (error) {
    console.error("Login error:", error);
    next(error);
  }
});

const refreshAccessToken = asyncHandler(async (req, res, next) => {
  try {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
      throw new ApiError(401, "Unauthorized request: No refresh token");
    }

    // Verify the token
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // Find the user
    const user = await User.findById(decodedToken._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token: User not found");
    }

    // Check if incoming token matches stored token
    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    // Generate new tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );

    // Set cookies and return response
    const options = getCookieOptions();

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    console.error("Token refresh error:", error);

    if (error.name === "JsonWebTokenError") {
      return next(new ApiError(401, "Invalid refresh token"));
    }

    if (error.name === "TokenExpiredError") {
      return next(new ApiError(401, "Refresh token expired"));
    }

    next(error);
  }
});

const logoutUser = asyncHandler(async (req, res, next) => {
  try {
    // Clear refresh token in database
    await User.findByIdAndUpdate(
      req.user._id,
      { $unset: { refreshToken: 1 } },
      { new: true }
    );

    // Clear cookies
    const options = getCookieOptions();

    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "Logged out successfully"));
  } catch (error) {
    console.error("Logout error:", error);
    next(error);
  }
});

const getUser = asyncHandler(async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, { user }, "User details retrieved"));
  } catch (error) {
    console.error("Get user error:", error);
    next(error);
  }
});

const updateUserProfile = asyncHandler(async (req, res, next) => {
  try {
    console.log("Processing profile update request");

    const newProfile = {
      fullname: req.body.fullname || req.user.fullname,
      email: req.body.email || req.user.email,
      aboutMe: req.body.aboutMe || req.user.aboutMe,
      phone: req.body.phone || req.user.phone,
      portfolioURL: req.body.portfolioURL || req.user.portfolioURL || "",
      githubURL: req.body.githubURL || req.user.githubURL || "",
      linkedinURL: req.body.linkedinURL || req.user.linkedinURL || "",
      facebookURL: req.body.facebookURL || req.user.facebookURL || "",
      twitterURL: req.body.twitterURL || req.user.twitterURL || "",
      instagramURL: req.body.instagramURL || req.user.instagramURL || "",
    };

    // Handle avatar update
    if (req.files && req.files.avatar && req.files.avatar[0]) {
      const avatarFile = req.files.avatar[0];
      const previousAvatar = req.user.avatar;

      // Delete previous avatar if it exists
      if (previousAvatar) {
        try {
          const publicId = image_ID_Parser(previousAvatar);
          console.log(`Deleting previous avatar: ${publicId}`);

          const result = await cloudinary.uploader.destroy(publicId);
          console.log("Avatar deletion result:", result);
        } catch (error) {
          console.error("Error deleting previous avatar:", error);
          // Continue with upload even if deletion fails
        }
      }

      // Upload new avatar
      try {
        const avatar = await uploadOnCloudinary(avatarFile, "avatars");

        if (!avatar || !avatar.url) {
          throw new Error("Avatar upload failed");
        }

        newProfile.avatar = avatar.url;
      } catch (error) {
        console.error("Avatar update error:", error);
        throw new ApiError(500, "Failed to update avatar");
      }
    }

    // Handle resume update
    if (req.files && req.files.resume && req.files.resume[0]) {
      const resumeFile = req.files.resume[0];
      const previousResume = req.user.resume;

      // Delete previous resume if it exists
      if (previousResume) {
        try {
          // Parse resume public ID
          const publicId = image_ID_Parser(previousResume);
          console.log(`Deleting previous resume: ${publicId}`);

          // Determine resource type
          const fileExtension = previousResume.split(".").pop().toLowerCase();
          const isDocument = ["pdf", "doc", "docx"].includes(fileExtension);
          const resourceType = isDocument ? "raw" : "image";

          const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
          });
          console.log("Resume deletion result:", result);
        } catch (error) {
          console.error("Error deleting previous resume:", error);
          // Continue with upload even if deletion fails
        }
      }

      // Upload new resume
      try {
        const resume = await uploadOnCloudinary(resumeFile, "resumes");

        if (!resume || !resume.url) {
          throw new Error("Resume upload failed");
        }

        newProfile.resume = resume.url;
      } catch (error) {
        console.error("Resume update error:", error);
        throw new ApiError(500, "Failed to update resume");
      }
    }

    // Update user profile
    const user = await User.findByIdAndUpdate(req.user._id, newProfile, {
      new: true,
      runValidators: true,
    }).select("-password -refreshToken");

    if (!user) {
      throw new ApiError(500, "Failed to update profile");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, { user }, "Profile updated successfully"));
  } catch (error) {
    console.error("Profile update error:", error);
    next(error);
  }
});

const updatePassword = asyncHandler(async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    // Validate inputs
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      throw new ApiError(400, "Please provide all password fields");
    }

    if (newPassword !== confirmNewPassword) {
      throw new ApiError(400, "New passwords do not match");
    }

    if (newPassword === currentPassword) {
      throw new ApiError(
        400,
        "New password must be different from current password"
      );
    }

    // Get user with password
    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Verify current password
    const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);

    if (!isPasswordCorrect) {
      throw new ApiError(400, "Current password is incorrect");
    }

    // Update password
    user.password = newPassword;
    await user.save({ validateBeforeSave: true });

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Password updated successfully"));
  } catch (error) {
    console.error("Password update error:", error);
    next(error);
  }
});

const getUserForPortfolio = asyncHandler(async (req, res, next) => {
  try {
    const id = "67d41e8cd83e39a8d115f164"; // Consider making this configurable
    const user = await User.findById(id).select("-password -refreshToken");

    if (!user) {
      throw new ApiError(404, "Portfolio user not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, { user }, "Portfolio user details retrieved"));
  } catch (error) {
    console.error("Get portfolio user error:", error);
    next(error);
  }
});

const forgotPassword = asyncHandler(async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ApiError(400, "Please provide your email address");
    }

    const user = await User.findOne({ email });

    if (!user) {
      throw new ApiError(404, "No user found with this email address");
    }

    // Generate reset token
    const resetToken = user.generateResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const resetPasswordURL = `${process.env.DASHBOARD_URL}/password/reset/${resetToken}`;
    const message = `Your password reset link is: \n\n ${resetPasswordURL} \n\n If you did not request this reset, please ignore this email.`;

    try {
      await sendEmail({
        email: user.email,
        subject: "Password Reset Request",
        message,
      });

      return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password reset email sent"));
    } catch (emailError) {
      console.error("Email sending error:", emailError);

      // Reset the token fields
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      throw new ApiError(500, "Failed to send password reset email");
    }
  } catch (error) {
    console.error("Forgot password error:", error);
    next(error);
  }
});

const resetPassword = asyncHandler(async (req, res, next) => {
  try {
    const { resetToken } = req.params;
    const { password, confirmPassword } = req.body;

    if (!resetToken) {
      throw new ApiError(400, "Reset token is required");
    }

    if (!password || !confirmPassword) {
      throw new ApiError(400, "Please provide both password fields");
    }

    if (password !== confirmPassword) {
      throw new ApiError(400, "Passwords do not match");
    }

    // Hash the token for comparison
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      throw new ApiError(400, "Invalid or expired reset token");
    }

    // Update password and clear reset fields
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    // Generate new tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );

    // Set cookies and return response
    const options = getCookieOptions();

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Password changed successfully"
        )
      );
  } catch (error) {
    console.error("Reset password error:", error);
    next(error);
  }
});

export {
  registerUser,
  loginUser,
  logoutUser,
  getUser,
  updateUserProfile,
  updatePassword,
  getUserForPortfolio,
  forgotPassword,
  resetPassword,
  refreshAccessToken,
};
