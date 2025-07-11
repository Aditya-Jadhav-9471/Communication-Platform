const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const Message = require('../models/Message');
const MessageReadReceipt = require('../models/MessageReadReceipt');
const Channel = require('../models/Channel');
const User = require('../models/User');

let ioInstance = null;

const setupSocketIO = async (server) => {
  const io = new Server(server, {
    cors: {
      origin: 'http://localhost:5173',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });

  ioInstance = io;

  const pubClient = createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
  });
  const subClient = pubClient.duplicate();

  pubClient.on('error', (err) => console.error('Redis Pub Client Error:', err));
  subClient.on('error', (err) => console.error('Redis Sub Client Error:', err));
  pubClient.on('end', () => console.log('Redis Pub Client Disconnected'));
  subClient.on('end', () => console.log('Redis Sub Client Disconnected'));

  try {
    await pubClient.connect();
    await subClient.connect();
    console.log('Redis clients connected successfully');
  } catch (err) {
    console.error('Failed to connect Redis clients:', err);
    throw err;
  }

  io.adapter(createAdapter(pubClient, subClient));

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      console.log('Socket.IO: No token provided');
      return next(new Error('Authentication error: No token provided'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      console.error('Socket.IO: Token verification failed:', err.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`⚡ User connected: ${socket.user.id} (${socket.id})`);

    socket.join(socket.user.id);

    socket.on('joinChat', async (channelId) => {
      try {
        const channel = await Channel.findOne({ _id: channelId, users: socket.user.id });
        if (!channel) {
          return socket.emit('error', { message: 'Unauthorized or invalid channel' });
        }
        socket.join(channelId);
        console.log(`User ${socket.user.id} joined channel ${channelId}`);
      } catch (err) {
        console.error('Socket.IO: Error joining channel:', err.message);
        socket.emit('error', { message: 'Failed to join channel' });
      }
    });

    socket.on('leaveChat', async (channelId) => {
      try {
        socket.leave(channelId);
        console.log(`User ${socket.user.id} left channel ${channelId}`);
      } catch (err) {
        console.error('Socket.IO: Error leaving channel:', err.message);
        socket.emit('error', { message: 'Failed to leave channel' });
      }
    });

    socket.on('sendMessage', async (message, callback) => {
      try {
        const channel = await Channel.findOne({ _id: message.channelId, users: socket.user.id });
        if (!channel) {
          callback({ error: 'Unauthorized or invalid channel' });
          return socket.emit('error', { message: 'Unauthorized or invalid channel' });
        }
    
        const user = await User.findById(socket.user.id).select('name avatar');
    
        let replyToData = null;
        if (message.replyTo) {
          const replyMessage = await Message.findById(message.replyTo);
          if (!replyMessage || replyMessage.channelId.toString() !== message.channelId) {
            callback({ error: 'Invalid replyTo message' });
            return socket.emit('error', { message: 'Invalid replyTo message' });
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
    
        const newMessage = new Message({
          channelId: message.channelId,
          user: socket.user.id,
          sender: {
            id: socket.user.id,
            name: user.name,
            avatar: user.avatar?.url,
          },
          text: message.content || '',
          attachments: message.attachments || [],
          replyTo: message.replyTo || null,
          createdAt: new Date(message.timestamp),
          visibleTo: channel.users, // Initialize with all channel users
        });
        await newMessage.save();
    
        channel.lastMessage = message.content || (message.attachments?.length ? '[Attachment]' : '');
        channel.lastMessageTime = new Date(message.timestamp);
        channel.lastMessageSenderId = socket.user.id;
        channel.unreadCounts.set(socket.user.id, 0);
        channel.users.forEach(uid => {
          if (uid.toString() !== socket.user.id) {
            const currentCount = channel.unreadCounts.get(uid.toString()) || 0;
            channel.unreadCounts.set(uid.toString(), currentCount + 1);
          }
        });
        await channel.save();
    
        const populatedMessage = await Message.findById(newMessage._id).lean();
    
        const formattedMessage = {
          id: populatedMessage._id.toString(),
          channelId: message.channelId.toString(),
          sender: {
            id: socket.user.id,
            name: user.name,
            avatar: user.avatar?.url,
          },
          content: populatedMessage.text,
          attachments: populatedMessage.attachments || [],
          timestamp: populatedMessage.createdAt.toISOString(),
          status: populatedMessage.status,
          seenBy: [],
          replyTo: replyToData,
          visibleTo: channel.users.map(uid => uid.toString()),
        };
    
        console.log(`Broadcasting message to channel ${message.channelId}:`, formattedMessage);
        io.to(message.channelId).emit('receiveMessage', formattedMessage);
    
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
          console.log(`Emitting channelUpdated to user ${uid}:`, formattedChannel);
          io.to(uid.toString()).emit('channelUpdated', formattedChannel);
        });
    
        callback({ message: formattedMessage });
      } catch (err) {
        console.error('Socket.IO: Error sending message:', err.message);
        callback({ error: 'Failed to send message' });
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
    socket.on('typing', async ({ channelId, isTyping }) => {
      try {
        const channel = await Channel.findOne({ _id: channelId, users: socket.user.id });
        if (!channel) return;
        socket.to(channelId).emit('typing', { userId: socket.user.id, name: socket.user.name, isTyping });
      } catch (err) {
        console.error('Socket.IO: Error broadcasting typing event:', err.message);
      }
    });

    socket.on('markSeen', async ({ channelId, messageId }) => {
      try {
        console.log(`Processing markSeen: channelId=${channelId}, messageId=${messageId}, userId=${socket.user.id}`);
        const channel = await Channel.findOne({ _id: channelId, users: socket.user.id });
        if (!channel) {
          console.error(`Channel not found or user not authorized: channelId=${channelId}, userId=${socket.user.id}`);
          return socket.emit('error', { message: 'Unauthorized or invalid channel' });
        }
    
        const message = await Message.findById(messageId);
        if (!message) {
          console.error(`Message not found: messageId=${messageId}`);
          return socket.emit('error', { message: 'Message not found' });
        }
    
        // Create or update read receipt
        await MessageReadReceipt.findOneAndUpdate(
          { messageId, userId: socket.user.id },
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
          channelId,
          user: { $ne: socket.user.id },
        }).lean();
        const unreadCount = await Promise.all(
          unreadMessages.map(async msg => {
            const receipt = await MessageReadReceipt.findOne({ messageId: msg._id, userId: socket.user.id });
            return !receipt ? 1 : 0;
          })
        ).then(results => results.reduce((sum, count) => sum + count, 0));
    
        console.log(`Updated unread count for user ${socket.user.id} in channel ${channelId}: ${unreadCount}`);
        channel.unreadCounts.set(socket.user.id, unreadCount);
        await channel.save();
    
        // Emit messageSeen to the channel
        io.to(channelId).emit('messageSeen', { messageId, userId: socket.user.id });
    
        // Fetch updated channel without .lean() to preserve Map
        const populatedChannel = await Channel.findById(channelId).populate('users', 'name avatar');
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
      } catch (err) {
        console.error(`Socket.IO: Error marking message seen: ${err.message}`, {
          channelId,
          messageId,
          userId: socket.user.id,
          stack: err.stack,
        });
        socket.emit('error', { message: 'Failed to mark message seen' });
      }
    });
    socket.on('deleteMessage', async ({ messageId, channelId }, callback) => {
      try {
        // Verify the channel and user
        const channel = await Channel.findOne({ _id: channelId, users: socket.user.id });
        if (!channel) {
          callback({ error: 'Unauthorized or invalid channel' });
          return socket.emit('error', { message: 'Unauthorized or invalid channel' });
        }
    
        // Find the message
        const message = await Message.findById(messageId);
        if (!message) {
          callback({ error: 'Message not found' });
          return socket.emit('error', { message: 'Message not found' });
        }
    
        // Check if the user is the sender
        if (message.user.toString() !== socket.user.id) {
          callback({ error: 'Unauthorized to delete this message' });
          return socket.emit('error', { message: 'Unauthorized to delete this message' });
        }
    
        // Delete the message
        await Message.deleteOne({ _id: messageId });
    
        // Update channel's last message if the deleted message was the latest
        const latestMessage = await Message.findOne({ channelId })
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
    
        // Emit deletion event to all clients in the channel
        io.to(channelId).emit('messageDeleted', { messageId });
    
        // Update channel for all users
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
    
        callback({ success: true });
      } catch (err) {
        console.error('Socket.IO: Error deleting message:', err.message);
        callback({ error: 'Failed to delete message' });
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    socket.on('forwardMessage', async ({ messageId, targetChannelId }, callback) => {
      console.log(`ForwardMessage request: messageId=${messageId}, targetChannelId=${targetChannelId}, userId=${socket.user.id}`);
      try {
        const sourceMessage = await Message.findById(messageId);
        if (!sourceMessage) {
          console.log(`Message not found: ${messageId}`);
          callback({ error: 'Message not found' });
          return socket.emit('error', { message: 'Message not found' });
        }
        const sourceChannel = await Channel.findOne({ 
          _id: sourceMessage.channelId, 
          users: socket.user.id,
          $or: [
            { deletedAt: { $exists: false } },
            { [`deletedAt.${socket.user.id}`]: { $exists: false } },
          ],
        });
        if (!sourceChannel) {
          console.log(`Unauthorized or invalid source channel: ${sourceMessage.channelId} for user ${socket.user.id}`);
          callback({ error: 'Unauthorized or invalid source channel' });
          return socket.emit('error', { message: 'Unauthorized or invalid source channel' });
        }
        const targetChannel = await Channel.findOne({ 
          _id: targetChannelId, 
          users: socket.user.id,
          $or: [
            { deletedAt: { $exists: false } },
            { [`deletedAt.${socket.user.id}`]: { $exists: false } },
          ],
        });
        if (!targetChannel) {
          console.log(`Unauthorized or invalid target channel: ${targetChannelId} for user ${socket.user.id}`);
          callback({ error: 'Unauthorized, invalid, or deleted target channel' });
          return socket.emit('error', { message: 'Unauthorized, invalid, or deleted target channel' });
        }
    
    const user = await User.findById(socket.user.id).select('name avatar');
    
    const forwardedMessage = new Message({
      channelId: targetChannelId,
      user: socket.user.id,
      sender: {
        id: socket.user.id,
        name: user.name,
        avatar: user.avatar?.url,
      },
      text: sourceMessage.text || '',
      attachments: sourceMessage.attachments || [],
      forwardedFrom: sourceMessage._id,
      status: 'sent',
      createdAt: new Date(),
    });
    await forwardedMessage.save();
    
    targetChannel.lastMessage = sourceMessage.text || (sourceMessage.attachments?.length ? '[Attachment]' : '');
    targetChannel.lastMessageTime = forwardedMessage.createdAt;
    targetChannel.lastMessageSenderId = socket.user.id;
    targetChannel.unreadCounts.set(socket.user.id, 0);
    targetChannel.users.forEach(uid => {
      if (uid.toString() !== socket.user.id) {
        const currentCount = targetChannel.unreadCounts.get(uid.toString()) || 0;
        targetChannel.unreadCounts.set(uid.toString(), currentCount + 1);
      }
    });
    await targetChannel.save();
    
    const populatedMessage = await Message.findById(forwardedMessage._id).lean();
    const formattedMessage = {
      id: populatedMessage._id.toString(),
      channelId: targetChannelId.toString(),
      sender: {
        id: socket.user.id,
        name: user.name,
        avatar: user.avatar?.url,
      },
      content: populatedMessage.text,
      attachments: populatedMessage.attachments || [],
      timestamp: populatedMessage.createdAt.toISOString(),
      status: populatedMessage.status,
      forwardedFrom: populatedMessage.forwardedFrom?.toString(),
      seenBy: [],
    };
    
    io.to(targetChannelId).emit('receiveMessage', formattedMessage);
    
    const populatedChannel = await Channel.findById(targetChannelId).populate('users', 'name avatar').lean();
    targetChannel.users.forEach(uid => {
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
    
    callback({ success: true });
  } catch (err) {
    console.error(`Error forwarding message: ${err.message}`, { messageId, targetChannelId, userId: socket.user.id });
    callback({ error: 'Failed to forward message' });
    socket.emit('error', { message: 'Failed to forward message' });
  }
});

    socket.on('userNameUpdated', async ({ userId, newName }) => {
      try {
        const channels = await Channel.find({
          type: 'direct',
          users: userId,
        }).populate('users', 'name avatar').lean();
        
        for (const channel of channels) {
          const otherUserId = channel.users.find(u => u._id.toString() !== userId.toString())?._id.toString();
          const formattedChannel = {
            id: channel._id.toString(),
            name: newName,
            type: channel.type,
            users: channel.users.map(u => ({
              id: u._id.toString(),
              name: u._id.toString() === userId ? newName : u.name,
              avatar: u.avatar?.url,
            })),
            lastMessage: channel.lastMessage || '',
            lastMessageTime: channel.lastMessageTime || new Date().toISOString(),
            unreadCount: channel.unreadCounts[otherUserId] || 0,
          };
          channel.users.forEach(u => {
            io.to(u._id.toString()).emit('channelUpdated', formattedChannel);
          });
        }
      } catch (err) {
        console.error('Socket.IO: Error broadcasting user name update:', err.message);
      }
    });

    socket.on('editMessage', async ({ messageId, text, channelId }, callback) => {
      try {
        // Verify the channel and user
        const channel = await Channel.findOne({ _id: channelId, users: socket.user.id });
        if (!channel) {
          callback({ error: 'Unauthorized or invalid channel' });
          return socket.emit('error', { message: 'Unauthorized or invalid channel' });
        }
    
        // Find the message
        const message = await Message.findById(messageId);
        if (!message) {
          callback({ error: 'Message not found' });
          return socket.emit('error', { message: 'Message not found' });
        }
    
        // Check if the user is the sender
        if (message.user.toString() !== socket.user.id) {
          callback({ error: 'Unauthorized to edit this message' });
          return socket.emit('error', { message: 'Unauthorized to edit this message' });
        }
    
        // Check 5-minute edit window
        const messageTime = new Date(message.createdAt);
        const currentTime = new Date();
        const timeDiff = (currentTime - messageTime) / 1000 / 60; // Difference in minutes
        if (timeDiff > 5) {
          callback({ error: 'Message can only be edited within 5 minutes of sending' });
          return socket.emit('error', { message: 'Message can only be edited within 5 minutes of sending' });
        }
    
        // Update the message
        message.text = text;
        message.edited = true;
        message.updatedAt = new Date();
        await message.save();
    
        // Update channel's last message if this was the latest
        const latestMessage = await Message.findOne({ channelId })
          .sort({ createdAt: -1 })
          .lean();
        if (latestMessage._id.toString() === messageId) {
          channel.lastMessage = text || (latestMessage.attachments?.length ? '[Attachment]' : '');
          channel.lastMessageTime = message.updatedAt;
        }
        await channel.save();
    
        // Prepare formatted message
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
          seenBy: message.seenBy || [],
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
          edited: message.edited,
        };
    
        // Broadcast updated message
        io.to(channelId).emit('messageUpdated', formattedMessage);
    
        // Update channel for all users
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
    
        callback({ success: true, message: formattedMessage });
      } catch (err) {
        console.error('Socket.IO: Error editing message:', err.message);
        callback({ error: 'Failed to edit message' });
        socket.emit('error', { message: 'Failed to edit message' });
      }
    });

    socket.on('deleteChat', async ({ channelId }, callback) => {
      try {
        const channel = await Channel.findOne({ _id: channelId, users: socket.user.id });
        if (!channel) {
          callback({ error: 'Unauthorized or invalid channel' });
          return socket.emit('error', { message: 'Unauthorized or invalid channel' });
        }
    
        const users = channel.users.map(String);
        const deletedAtObj = channel.deletedAt || {};
    
        await Message.updateMany(
          { channelId, visibleTo: socket.user.id },
          { $pull: { visibleTo: socket.user.id } }
        );
    
        deletedAtObj[socket.user.id] = new Date();
        channel.deletedAt = deletedAtObj;
        channel.lastMessage = ''; // Explicitly clear lastMessage
        channel.lastMessageTime = channel.createdAt || new Date(); // Reset to createdAt
        channel.lastMessageSenderId = null; // Clear sender ID
        channel.unreadCounts.set(socket.user.id, 0);
    
        const bothDeleted = users.every(uid => deletedAtObj[uid]);
    
        if (bothDeleted) {
          await channel.deleteOne();
          await Message.deleteMany({ channelId });
        } else {
          await channel.save();
        }
    
        // Emit channelDeleted to the user who deleted the chat
        io.to(socket.user.id).emit("channelDeleted", { channelId, userId: socket.user.id });
    
        if (channel.type === "group" && !bothDeleted) {
          const remainingUsers = users.filter(uid => uid !== socket.user.id);
          const user = await User.findById(socket.user.id).select("name");
          await postSystemMessage(`${user.name} left the group`);
          const populatedChannel = await Channel.findById(channelId).populate('users', 'name avatar').lean();
          remainingUsers.forEach(uid => {
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
              unreadCount: populatedChannel.unreadCounts[uid] || 0,
              lastMessageSenderId: populatedChannel.lastMessageSenderId || null,
            };
            io.to(uid).emit("channelUpdated", formattedChannel);
          });
        }
    
        callback({ success: true });
      } catch (err) {
        console.error('Socket.IO: Error deleting chat:', err.message);
        callback({ error: 'Failed to delete chat' });
        socket.emit('error', { message: 'Failed to delete chat' });
      }
    });

    socket.onAny((event, ...args) => {
      console.log(`Socket event received: ${event}`, args);
    });

    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.user.id} (${socket.id})`);
    });
  });

  return io;
};

const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket.IO not initialized');
  }
  return ioInstance;
};

module.exports = { setupSocketIO, getIO };