const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true }, // bcrypt hash, never plain text
    isVerified: { type: Boolean, default: false },
    verifyToken: String, // sent in the verification email link
    verifyTokenExpires: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
