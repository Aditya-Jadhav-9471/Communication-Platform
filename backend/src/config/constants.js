const path = require("path");

module.exports = {
  UPLOADS_DIR: path.join(__dirname, "../../uploads"),
  SALT_ROUNDS: 12,
  JWT_EXPIRY: "1d",
  JWT_REFRESH_EXPIRY: "7d",
  RATE_LIMIT_WINDOW: 15 * 60 * 1000,
  RATE_LIMIT_MAX: 1000,
  DB_TIMEZONE: "+00:00",
  MAX_CONNECTION_ATTEMPTS: 5,
  pushSubscriptions: [],
};
