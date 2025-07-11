const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    room: { type: String, required: true },
    scheduled_at: { type: Date, required: true },
    calendar_link: { type: String, required: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const Meeting = mongoose.model('Meeting', meetingSchema);

module.exports = Meeting;
