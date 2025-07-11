const webpush = require("web-push");

webpush.setVapidDetails(
  "mailto:satyajitnikam09@gmail.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

let pushSubscriptions = [];

function addSubscription(userId, subscription) {
  pushSubscriptions = pushSubscriptions.filter((sub) => sub.userId !== userId);
  pushSubscriptions.push({ userId, subscription });
}

function sendPushNotification(payload) {
  pushSubscriptions.forEach((subscription, index) => {
    webpush
      .sendNotification(subscription.subscription, JSON.stringify(payload))
      .catch((err) => {
        console.error("Push failed:", err);
        if (err.statusCode === 410 || err.statusCode === 404) {
          pushSubscriptions.splice(index, 1);
        }
      });
  });
}

module.exports = {
  addSubscription,
  sendPushNotification,
};
