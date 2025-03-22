import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";

const userSchema = new Schema(
  {
    fullname: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      unique: true,
    },
    phone: {
      type: String,
      required: [true, "Phone is required"],
      trim: true,
      unique: true,
    },
    aboutMe: {
      type: String,
      required: [true, "About Me is required"],
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minLength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    avatar: {
      type: String,
      required: [true, "Avatar is required"],
    },
    resume: {
      type: String,
      required: [true, "Resume is required"],
    },

    portfolioURL: {
      type: String,
    },
    githubURL: String,
    linkedinURL: String,
    facebookURL: String,
    twitterURL: String,
    instagramURL: String,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    refreshToken: String,
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      fullname: this.fullname,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  );
};
userSchema.methods.generateResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetPasswordExpire = Date.now() + 30 * (60 * 1000);
  return resetToken;
};

export const User = mongoose.model("User", userSchema);

// The expression Date.now() + 10 * (60 * 1000) adds 10 minutes to the current time
// It breaks down as:
// 60 * 1000 = 60,000 milliseconds (1 minute)
// 10 * 60,000 = 600,000 milliseconds (10 minutes)
// This sets the reset password token to expire in 10 minutes
