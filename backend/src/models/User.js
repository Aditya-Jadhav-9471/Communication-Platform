// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["member", "agent", "admin"], default: "member" },
    
    // Profile fields
    phone: { type: String },
    location: { type: String },
    position: { type: String }, // Same as occupation in UI
    bio: { type: String },      // Same as about in UI
    joinDate: { type: Date, default: Date.now },
    
    // Social links
    socialLinks: {
      twitter: { type: String },
      github: { type: String },
      linkedin: { type: String }
    },
    
    // Additional fields
    avatar: { public_id: String, url: String}, // URL to avatar image
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = User;