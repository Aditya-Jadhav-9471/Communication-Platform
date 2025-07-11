const Message = require("../models/Message");
const MessageReadReceipt = require("../models/MessageReadReceipt");
const Channel = require("../models/Channel");
const User = require("../models/User");
const { getIO } = require("../services/socketio.service");

const sendMessage = async (req, res) => {
  try {
    const { channelId, text, replyTo, forwardedFrom, attachments } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId).select('name avatar');

    const channel = await Channel.findOne({ _id: channelId, users: userId });
    if (!channel) {
      return res.status(403).json({ error: 'User not authorized for this channel' });
    }

    let replyToData = null;
    if (replyTo) {
      const replyMessage = await Message.findById(replyTo);
      if (!replyMessage || replyMessage.channelId.toString() !== channelId) {
        return res.status(400).json({ error: 'Invalid replyTo message' });
      }
      replyToData = {
        id: replyMessage._id.toString(),
        sender: {
          id: replyMessage.sender.id,
          name: replyMessage.sender.name,
        },
        content: replyMessage.text,
      };
    }

    const message = new Message({
      channelId,
      user: userId,
      sender: {
        id: userId,
        name: user.name,
        avatar: user.avatar?.url,
      },
      text: text || '',
      attachments: attachments || [],
      replyTo: replyTo || null,
      forwardedFrom: forwardedFrom || null,
      status: 'sent',
      visibleTo: channel.users, // Initialize with all channel users
    });
    await message.save();

    channel.lastMessage = text || (attachments?.length ? '[Attachment]' : '');
    channel.lastMessageTime = new Date();
    channel.lastMessageSenderId = userId;
    channel.unreadCounts.set(userId, 0);
    channel.users.forEach(uid => {
      if (uid.toString() !== userId) {
        const currentCount = channel.unreadCounts.get(uid.toString()) || 0;
        channel.unreadCounts.set(uid.toString(), currentCount + 1);
      }
    });
    await channel.save();

    const populatedMessage = await Message.findById(message._id).lean();

    const formattedMessage = {
      id: message._id.toString(),
      channelId,
      sender: {
        id: userId,
        name: user.name,
        avatar: user.avatar?.url,
      },
      content: text || '',
      attachments: populatedMessage.attachments || [],
      timestamp: message.createdAt.toISOString(),
      status: 'sent',
      seenBy: [],
      replyTo: replyToData,
      visibleTo: channel.users.map(uid => uid.toString()),
    };

    const io = getIO();
    io.to(channelId).emit('receiveMessage', formattedMessage);

    const populatedChannel = await Channel.findById(channelId).populate('users', 'name avatar').lean();
    channel.users.forEach(uid => {
      const formattedChannel = {
        id: populatedChannel._id.toString(),
        name: populatedChannel.name,
        type: populatedChannel.type,
        users: populatedChannel.users.map(u => ({
          id: u._id.toString(),
          name: u.name,
          avatar: u.avatar?.url,
        })),
        lastMessage: populatedChannel.lastMessage || '',
        lastMessageTime: populatedChannel.lastMessageTime.toISOString(),
        unreadCount: populatedChannel.unreadCounts[uid.toString()] || 0,
        lastMessageSenderId: populatedChannel.lastMessageSenderId,
      };
      io.to(uid.toString()).emit('channelUpdated', formattedChannel);
    });

    res.status(201).json(formattedMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

const fetchMessages = async (req, res) => {
  try {
    const { channelId } = req.query;
    const userId = req.user.id;

    const channel = await Channel.findOne({ _id: channelId, users: userId });
    if (!channel) {
      return res.status(403).json({ error: 'User not authorized for this channel' });
    }

    const messages = await Message.find({ 
      channelId,
      visibleTo: userId // Filter messages visible to the user
    })
      .populate('user', 'name avatar')
      .populate('replyTo', 'sender text')
      .sort({ createdAt: 1 })
      .lean();

    const receipts = await MessageReadReceipt.find({ userId, messageId: { $in: messages.map(m => m._id) } });

    const messagesWithStatus = messages.map(message => ({
      id: message._id.toString(),
      channelId: message.channelId.toString(),
      sender: {
        id: message.sender.id,
        name: message.sender.name,
        avatar: message.sender.avatar,
      },
      content: message.text,
      attachments: message.attachments || [],
      timestamp: message.createdAt.toISOString(),
      status: message.status,
      isCurrentUser: message.user.toString() === userId,
      replyTo: message.replyTo
        ? {
            id: message.replyTo._id.toString(),
            sender: {
              id: message.replyTo.sender.id,
              name: message.replyTo.sender.name,
            },
            content: message.replyTo.text,
          }
        : null,
      forwardedFrom: message.forwardedFrom ? message.forwardedFrom.toString() : null,
      seenBy: receipts
        .filter(r => r.messageId.toString() === message._id.toString())
        .map(r => r.userId.toString()),
      visibleTo: message.visibleTo.map(uid => uid.toString()),
    }));

    channel.unreadCounts.set(userId, 0);
    await channel.save();

    const io = getIO();
    const populatedChannel = await Channel.findById(channelId).populate('users', 'name avatar').lean();
    const formattedChannel = {
      id

: populatedChannel._id.toString(),
      name: populatedChannel.name,
      type: populatedChannel.type,
      users: populatedChannel.users.map(u => ({
        id: u._id.toString(),
        name: u.name,
        avatar: u.avatar?.url,
      })),
      lastMessage: populatedChannel.lastMessage || '',
      lastMessageTime: populatedChannel.lastMessageTime.toISOString(),
      unreadCount: populatedChannel.unreadCounts[userId] || 0,
      lastMessageSenderId: populatedChannel.lastMessageSenderId,
    };
    io.to(userId).emit('channelUpdated', formattedChannel);

    res.json(messagesWithStatus);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

const markSeen = async (req, res) => {
  try {
    const { messageId } = req.body;
    const userId = req.user.id;
    console.log(`Processing markSeen API: messageId=${messageId}, userId=${userId}`);

    const message = await Message.findById(messageId);
    if (!message) {
      console.error(`Message not found: messageId=${messageId}`);
      return res.status(404).json({ error: 'Message not found' });
    }

    const channel = await Channel.findOne({ _id: message.channelId, users: userId });
    if (!channel) {
      console.error(`Channel not found or user not authorized: channelId=${message.channelId}, userId=${userId}`);
      return res.status(403).json({ error: 'User not authorized for this channel' });
    }

    // Create or update read receipt
    await MessageReadReceipt.findOneAndUpdate(
      { messageId, userId },
      { seenAt: new Date() },
      { upsert: true }
    );

    // Check if all recipients have seen the message
    const receipts = await MessageReadReceipt.find({ messageId });
    const recipientIds = channel.users
      .map(uid => uid.toString())
      .filter(uid => uid !== message.user.toString());
    const seenByAll = recipientIds.every(uid =>
      receipts.some(r => r.userId.toString() === uid)
    );

    if (seenByAll) {
      console.log(`All recipients have seen message: messageId=${messageId}`);
      await Message.findByIdAndUpdate(messageId, { status: 'seen' });
    }

    // Calculate unread count for the user
    const unreadMessages = await Message.find({
      channelId: message.channelId,
      user: { $ne: userId },
    }).lean();
    const unreadCount = await Promise.all(
      unreadMessages.map(async msg => {
        const receipt = await MessageReadReceipt.findOne({ messageId: msg._id, userId });
        return !receipt ? 1 : 0;
      })
    ).then(results => results.reduce((sum, count) => sum + count, 0));

    console.log(`Updated unread count for user ${userId} in channel ${message.channelId}: ${unreadCount}`);
    channel.unreadCounts.set(userId, unreadCount);
    await channel.save();

    const io = getIO();
    io.to(message.channelId).emit('messageSeen', { messageId, userId });

    // Fetch updated channel without .lean() to preserve Map
    const populatedChannel = await Channel.findById(message.channelId).populate('users', 'name avatar');
    channel.users.forEach(uid => {
      const formattedChannel = {
        id: populatedChannel._id.toString(),
        name: populatedChannel.name,
        type: populatedChannel.type,
        users: populatedChannel.users.map(u => ({
          id: u._id.toString(),
          name: u.name,
          avatar: u.avatar?.url,
        })),
        lastMessage: populatedChannel.lastMessage || '',
        lastMessageTime: populatedChannel.lastMessageTime.toISOString(),
        unreadCount: populatedChannel.unreadCounts.get(uid.toString()) || 0,
        lastMessageSenderId: populatedChannel.lastMessageSenderId,
      };
      console.log(`Emitting channelUpdated to user ${uid}:`, formattedChannel);
      io.to(uid.toString()).emit('channelUpdated', formattedChannel);
    });

    res.json({ message: 'Message marked as seen' });
  } catch (error) {
    console.error(`Error marking message seen: ${error.message}`, {
      messageId,
      userId,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to mark message seen' });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if the user is authorized
    if (message.user.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this message' });
    }

    // Verify channel access
    const channel = await Channel.findOne({ _id: message.channelId, users: userId });
    if (!channel) {
      return res.status(403).json({ error: 'User not authorized for this channel' });
    }

    // Delete the message
    await Message.deleteOne({ _id: messageId });

    // Update channel's last message
    const latestMessage = await Message.findOne({ channelId: message.channelId })
      .sort({ createdAt: -1 })
      .lean();
    if (latestMessage) {
      channel.lastMessage = latestMessage.text || (latestMessage.attachments?.length ? '[Attachment]' : '');
      channel.lastMessageTime = latestMessage.createdAt;
      channel.lastMessageSenderId = latestMessage.user.toString();
    } else {
      channel.lastMessage = '';
      channel.lastMessageTime = new Date();
      channel.lastMessageSenderId = null;
    }
    await channel.save();

    // Emit deletion event
    const io = getIO();
    io.to(message.channelId).emit('messageDeleted', { messageId });

    // Update channel for all users
    const populatedChannel = await Channel.findById(message.channelId).populate('users', 'name avatar').lean();
    channel.users.forEach(uid => {
      const formattedChannel = {
        id: populatedChannel._id.toString(),
        name: populatedChannel.name,
        type: populatedChannel.type,
        users: populatedChannel.users.map(u => ({
          id: u._id.toString(),
          name: u.name,
          avatar: u.avatar?.url,
        })),
        lastMessage: populatedChannel.lastMessage || '',
        lastMessageTime: populatedChannel.lastMessageTime.toISOString(),
        unreadCount: populatedChannel.unreadCounts[uid.toString()] || 0,
        lastMessageSenderId: populatedChannel.lastMessageSenderId,
      };
      io.to(uid.toString()).emit('channelUpdated', formattedChannel);
    });

    res.status(200).json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

const editMessage = async (req, res) => {
  try {
    const { messageId, text } = req.body;
    const userId = req.user.id;

    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if the user is authorized
    if (message.user.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized to edit this message' });
    }

    // Check 5-minute edit window
    const messageTime = new Date(message.createdAt);
    const currentTime = new Date();
    const timeDiff = (currentTime - messageTime) / 1000 / 60; // Difference in minutes
    if (timeDiff > 5) {
      return res.status(403).json({ error: 'Message can only be edited within 5 minutes of sending' });
    }

    // Update the message
    message.text = text;
    message.edited = true;
    message.updatedAt = new Date();
    await message.save();

    // Update channel's last message if this was the latest message
    const channel = await Channel.findById(message.channelId);
    const latestMessage = await Message.findOne({ channelId: message.channelId })
      .sort({ createdAt: -1 })
      .lean();
    if (latestMessage._id.toString() === messageId) {
      channel.lastMessage = text || (latestMessage.attachments?.length ? '[Attachment]' : '');
      channel.lastMessageTime = message.updatedAt;
    }
    await channel.save();

    // Emit updated message
    const populatedMessage = await Message.findById(message._id)
      .populate('replyTo', 'sender text')
      .lean();
    const formattedMessage = {
      id: message._id.toString(),
      channelId: message.channelId.toString(),
      sender: {
        id: message.sender.id,
        name: message.sender.name,
        avatar: message.sender.avatar,
      },
      content: message.text,
      attachments: message.attachments || [],
      timestamp: message.createdAt.toISOString(),
      status: message.status,
      isCurrentUser: message.user.toString() === userId,
      replyTo: message.replyTo
        ? {
            id: message.replyTo._id.toString(),
            sender: {
              id: message.replyTo.sender.id,
              name: message.replyTo.sender.name,
            },
            content: message.replyTo.text,
          }
        : null,
      forwardedFrom: message.forwardedFrom ? message.forwardedFrom.toString() : null,
      seenBy: message.seenBy || [],
      edited: message.edited,
    };

    const io = getIO();
    io.to(message.channelId).emit('messageUpdated', formattedMessage);

    // Update channel for all users
    const populatedChannel = await Channel.findById(message.channelId).populate('users', 'name avatar').lean();
    channel.users.forEach(uid => {
      const formattedChannel = {
        id: populatedChannel._id.toString(),
        name: populatedChannel.name,
        type: populatedChannel.type,
        users: populatedChannel.users.map(u => ({
          id: u._id.toString(),
          name: u.name,
          avatar: u.avatar?.url,
        })),
        lastMessage: populatedChannel.lastMessage || '',
        lastMessageTime: populatedChannel.lastMessageTime.toISOString(),
        unreadCount: populatedChannel.unreadCounts[uid.toString()] || 0,
        lastMessageSenderId: populatedChannel.lastMessageSenderId,
      };
      io.to(uid.toString()).emit('channelUpdated', formattedChannel);
    });

    res.status(200).json({ message: 'Message updated successfully', updatedMessage: formattedMessage });
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ error: 'Failed to edit message' });
  }
};

module.exports = { sendMessage, fetchMessages, markSeen, deleteMessage, editMessage };