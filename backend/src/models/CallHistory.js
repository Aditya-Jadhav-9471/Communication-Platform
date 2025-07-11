const mongoose = require("mongoose");

const callHistorySchema = new mongoose.Schema({
  caller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  callee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  startedAt: {
    type: Date,
    required: true,
  },
  endedAt: {
    type: Date,
  },
  status: {
    type: String, // e.g. "missed", "completed", etc.
    enum: ["missed", "completed", "rejected"],
    default: "completed",
  },
}, { timestamps: true });

module.exports = mongoose.model("CallHistory", callHistorySchema);
