require("dotenv").config();
const connectMongoDB = require("./src/config/mongo");
const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const fs = require("fs");

// Configs & Constants
const { UPLOADS_DIR } = require("./src/config/constants");

// Middlewares
const { authenticateToken } = require("./src/middleware/auth.middleware");
const corsMiddleware = require("./src/middleware/cors.middleware");
const errorHandler = require("./src/middleware/errorHandler");

// Routes
const notificationRoutes = require('./src/routes/notification.routes');
const authRoutes = require("./src/routes/auth.routes");
const messageRoutes = require("./src/routes/message.routes");
const uploadRoutes = require('./src/routes/upload.routes');
const channelsRoutes = require('./src/routes/channels.routes');
const userRoutes = require('./src/routes/user.routes');
const meetingRoutes = require('./src/routes/meeting.routes');
const callRoutes = require('./src/routes/call.routes');
const inviteRoutes = require('./src/routes/invite.routes');

// Express & HTTP server
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

// Create uploads directory if missing
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Middlewares
app.use(corsMiddleware);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));


// Public routes
app.use("/", authRoutes);
app.use("/", notificationRoutes);
app.use('/users', userRoutes);
app.use("/invite", inviteRoutes);
app.use("/uploads", express.static(UPLOADS_DIR));

// Auth middleware
app.use(authenticateToken);

// Protected routes
app.use('/message', messageRoutes);
app.use('/channels', channelsRoutes);
app.use('/', uploadRoutes);
app.use('/meetings', meetingRoutes);
app.use("/call-history", callRoutes);

// Socket.IO setup
const { setupSocketIO } = require('./src/services/socketio.service');
setupSocketIO(server).catch(err => {
  console.error('Failed to initialize Socket.IO:', err);
  process.exit(1);
});

// Error Handler
app.use(errorHandler);

// Connect to MongoDB
connectMongoDB();

// Start server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}...`);
});