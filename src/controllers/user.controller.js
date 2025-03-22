import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { v2 as cloudinary } from "cloudinary";
import { sendEmail } from "../utils/sendEmail.js";
import crypto from "crypto";
import { image_ID_Parser } from "../utils/imageParser.js";
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
    throw new ApiError(500, "Error while generating tokens");
  }
};

const registerUser = asyncHandler(async (req, res, next) => {
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
  if (
    [fullname, email, password, aboutMe, phone].some(
      (field) => field?.trim() === ""
    )
  ) {
    throw new ApiError("Please fill in all fields", 400);
  }
  const existedUser = await User.findOne({
    $or: [{ email }, { phone }],
  });
  if (existedUser) {
    throw new ApiError("User already exists", 400);
  }
  const avatarLocalPath = req.files?.avatar[0].path;
  const resumeLocalPath = req.files?.resume[0].path;
  if (!avatarLocalPath) {
    throw new ApiError("Please upload an avatar", 400);
  }
  if (!resumeLocalPath) {
    throw new ApiError("Please upload a resume", 400);
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath, "avatar");
  const resume = await uploadOnCloudinary(resumeLocalPath, "resume");

  if (!avatar || !resume) {
    throw new ApiError("Error while uploading files", 500);
  }
  const user = await User.create({
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
    avatar: avatar?.url || "",
    resume: resume?.url || "",
  });
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "user not created");
  }
  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "none", // Required for cross-domain (Netlify to Render)
    maxAge: 24 * 60 * 60 * 1000, // 1 day expiration
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: createdUser, // Changed from loggedInUser to createdUser
          accessToken,
          refreshToken,
        },
        "User registered successfully" // Changed message to reflect registration
      )
    );
});

const loginUser = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError("Please provide email and password", 400);
  }
  ///select("+password") is used to select the password field which is not selected by default
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.isPasswordCorrect(password))) {
    throw new ApiError("Invalid credentials", 401);
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!loggedInUser) {
    throw new ApiError(500, "user not found");
  }
  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "none", // Required for cross-domain (Netlify to Render)
    maxAge: 24 * 60 * 60 * 1000, // 1 day expiration
  };
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
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res, next) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "none", // Required for cross-domain (Netlify to Render)
    maxAge: 24 * 60 * 60 * 1000, // 1 day expiration
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});
const getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).select(
    "-password -refreshToken"
  );
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return res.status(200).json(new ApiResponse(200, user, "User details"));
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
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  if (!currentPassword || !newPassword || !confirmNewPassword) {
    throw new ApiError("Please provide all fields", 400);
  }
  if (newPassword !== confirmNewPassword) {
    throw new ApiError("Passwords do not match", 400);
  }
  if (newPassword === currentPassword) {
    throw new ApiError(
      "New password cannot be the same as the current password",
      400
    );
  }
  const user = await User.findById(req.user._id).select("+password");
  const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);
  if (!isPasswordCorrect) {
    throw new ApiError("Invalid current password", 400);
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: true });
  res
    .status(200)
    .json(new ApiResponse(200, {}, "Password updated successfully"));
});

const getUserForPortfolio = asyncHandler(async (req, res, next) => {
  const id = "67d41e8cd83e39a8d115f164";
  const user = await User.findById(id).select("-password -refreshToken");
  res.status(200).json(new ApiResponse(200, user, "User details"));
});

const forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  const resetToken = user.generateResetPasswordToken();
  await user.save({ validateBeforeSave: false });
  // Send email with resetToken
  const resetPasswordURL = `${process.env.DASHBOARD_URL}/password/reset/${resetToken}`;
  const message = `your reset password token is as follows: \n\n ${resetPasswordURL} \n\n if you have not requested this email, please ignore it`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Password reset token",
      message,
    });
    res.status(200).json(new ApiResponse(200, {}, "Email sent successfully"));
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(500, "Error while sending email");
  }
});

const resetPassword = asyncHandler(async (req, res, next) => {
  const token = req.params.resetToken;
  if (!token) {
    throw new ApiError(400, "Invalid token");
  }
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });
  if (!user) {
    throw new ApiError(400, "Invalid token or token expired");
  }
  const { password, confirmPassword } = req.body;
  if (!password || !confirmPassword) {
    throw new ApiError("Please provide all fields", 400);
  }
  if (password !== confirmPassword) {
    throw new ApiError("Passwords do not match", 400);
  }
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save({ validateBeforeSave: false });
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );
  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "none", // Required for cross-domain (Netlify to Render)
    maxAge: 24 * 60 * 60 * 1000, // 1 day expiration
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          accessToken,
          refreshToken,
        },
        "password changed successfully"
      )
    );
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
};
