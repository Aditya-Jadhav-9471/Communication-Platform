const mongoose = require('mongoose');

const messageReadReceiptSchema = new mongoose.Schema({
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  seenAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

messageReadReceiptSchema.index({ messageId: 1, userId: 1 }, { unique: true });

// Prevent model overwrite
const MessageReadReceipt = mongoose.models.MessageReadReceipt || mongoose.model('MessageReadReceipt', messageReadReceiptSchema);

module.exports = MessageReadReceipt;