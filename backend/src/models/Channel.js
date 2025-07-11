const mongoose = require("mongoose");

const channelSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    name: {
      type: String,
      required: function () {
        return this.type === "group";
      },
    },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    inviteToken: { type: String },
    deletedAt: { type: Map, of: Date, default: {} },
    lastMessage: { type: String, default: '' },
    lastMessageTime: { type: Date, default: Date.now },
    lastMessageSenderId: String,
    unreadCounts: { type: Map, of: Number, default: {} }, // Per-user unread counts
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Middleware to initialize unreadCounts
channelSchema.pre('save', function(next) {
  if (!this.unreadCounts) {
    this.unreadCounts = new Map();
  }
  next();
});

const Channel = mongoose.model("Channel", channelSchema);

module.exports = Channel;