const express = require("express");
const router = express.Router();
const {
  createMeeting,
  getMeetings,
} = require("../controllers/meeting.controller");

router.post("/", createMeeting);
router.get("/", getMeetings);

module.exports = router;
