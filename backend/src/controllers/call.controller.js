const CallHistory = require("../models/CallHistory");

exports.getCallHistory = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;

    const callHistory = await CallHistory.find({
      $or: [{ caller: currentUserId }, { callee: currentUserId }],
    })
      .sort({ startedAt: -1 })
      .populate("caller", "username") // Optional: populate usernames
      .populate("callee", "username");

    res.status(200).json({ callHistory });
  } catch (error) {
    next(error);
  }
};
