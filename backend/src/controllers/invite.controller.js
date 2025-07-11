const { generateInviteToken } = require("../utils/tokenGenerator");
const Channel = require("../models/Channel");

const generateInviteLink = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const channel = await Channel.findById(channelId);

    if (!channel) return res.status(404).json({ error: "Channel not found" });

    if (!channel.inviteToken) {
      channel.inviteToken = generateInviteToken(channelId);
      await channel.save();
    }

    const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
    const inviteLink = `${baseUrl}/invite/${channel.inviteToken}`;
    res.json({ link: inviteLink });

  } catch (err) {
    next(err);
  }
};

const regenerateInviteLink = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const channel = await Channel.findById(channelId);

    if (!channel) return res.status(404).json({ error: "Channel not found" });

    channel.inviteToken = generateInviteToken(channelId);
    await channel.save();

    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const inviteLink = `${baseUrl}/invite/${channel.inviteToken}`;
    res.json({ link: inviteLink });

  } catch (err) {
    next(err);
  }
};

const acceptInvite = async (req, res, next) => {
  try {
    const { token } = req.params;
    const userId = req.user.id;

    const channel = await Channel.findOne({ inviteToken: token });
    if (!channel) {
      return res.status(404).json({ error: "Invalid or expired invite link" });
    }

    if (!channel.users.includes(userId)) {
      channel.users.push(userId);
      await channel.save();
    }

    res.status(200).json({ message: "You have joined the channel", channelId: channel._id });

  } catch (err) {
    next(err);
  }
};

module.exports = {
  generateInviteLink,
  regenerateInviteLink,
  acceptInvite,
};
