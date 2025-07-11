const express = require('express');
const router = express.Router();

// =======================================
// 11. Push Notification Subscription
// =======================================
router.post("/subscribe", (req, res) => {
  const { userId, ...subscription } = req.body;
  if (!userId || !subscription.endpoint) {
    return res.status(400).json({ error: "Invalid subscription" });
  }
  addSubscription(userId, subscription); // Using the extracted function
  res.status(201).json({ message: "Subscription saved" });
});

module.exports= router;
