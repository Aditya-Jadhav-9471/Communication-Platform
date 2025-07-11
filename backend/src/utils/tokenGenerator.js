const crypto = require("crypto");

function generateInviteToken(channelId) {
  const raw = `${channelId}-${Date.now()}-${Math.random()}`;
  return crypto.createHash("sha256").update(raw).digest("hex").substring(0, 32);
}

module.exports = {
  generateInviteToken,
};
