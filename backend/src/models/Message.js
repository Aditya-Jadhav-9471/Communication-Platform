const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  channelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sender: {
    id: String,
    name: String,
  },
  text: {
    type: String,
    default: '',
  },
  attachments: [{
    id: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['image', 'file'],
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
    },
  }],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null,
  },
  forwardedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null,
  },
  status: {
    type: String,
    enum: ['sent', 'seen'],
    default: 'sent',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  visibleTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;