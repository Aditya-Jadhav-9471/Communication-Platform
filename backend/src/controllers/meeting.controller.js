const Joi = require("joi");
const Meeting = require("../models/Meeting");

const meetingSchema = Joi.object({
  title: Joi.string().required(),
  room: Joi.string().required(),
  scheduled_at: Joi.date().required(),
  calendar_link: Joi.string().uri().required(),
});

const createMeeting = async (req, res, next) => {
  try {
    const { error, value } = meetingSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const userId = req.user.id;
    const meeting = new Meeting({ ...value, created_by: userId });
    await meeting.save();

    res.status(201).json({
      message: "Meeting created",
      meetingId: meeting._id,
    });
  } catch (err) {
    next(err);
  }
};

const getMeetings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const meetings = await Meeting.find({ created_by: userId }).sort("scheduled_at");
    res.json({ meetings });
  } catch (err) {
    next(err);
  }
};

module.exports = { createMeeting, getMeetings };
