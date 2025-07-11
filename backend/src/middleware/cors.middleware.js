const cors = require("cors");

const getAllowedOrigins = () => {
  return process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : [
        "http://localhost:4000",
        "http://localhost:5173",
        "http://192.168.0.243:5173/"
      ];
};

// CORS configuration function
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};

const corsMiddleware = cors(corsOptions);

module.exports = corsMiddleware;
