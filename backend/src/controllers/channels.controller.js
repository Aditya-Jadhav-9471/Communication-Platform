const mongoose = require("mongoose");
const Channel = require("../models/Channel");
const Message = require("../models/Message");
const User = require("../models/User");
const { getIO } = require("../services/socketio.service");

const createChannel = async (req, res, next) => {
  try {
    const { type, name, users } = req.body;
    const userId = req.user.id;

    if (!type || !users || !Array.isArray(users)) {
      return res.status(400).json({ error: "Type and users array are required" });
    }

    const validUsers = await User.find({ _id: { $in: users } }).select("_id name");
    if (validUsers.length !== users.length) {
      return res.status(400).json({ error: "Invalid user IDs" });
    }

    let channelData = { 
      type, 
      users: [...new Set([...users, userId])], 
      lastMessageTime: new Date(),
      unreadCounts: new Map(),
    };
    
    if (type === "direct") {
      if (channelData.users.length !== 2) {
        return res.status(400).json({ error: "Direct chat requires exactly two participants" });
      }

      channelData.users.sort();
      const otherUserId = channelData.users.find(id => id.toString() !== userId);
      const otherUser = validUsers.find(u => u._id.toString() === otherUserId.toString());
      channelData.name = name?.trim() || otherUser.name || "Direct Chat";

      const existing = await Channel.findOne({
        type: "direct",
        users: { $all: channelData.users, $size: 2 },
      });

      if (existing) {
        const deletedAtObj = existing.deletedAt || {};
        if (!deletedAtObj[userId]) {
          return res.status(200).json({ 
            message: "Direct chat exists", 
            channel: {
              id: existing._id.toString(),
              name: existing.name,
              type: existing.type,
              users: await Promise.all(existing.users.map(async u => {
                const user = await User.findById(u).select("name avatar");
                return {
                  id: u.toString(),
                  name: user.name,
                  avatar: user.avatar?.url,
                };
              })),
              lastMessage: existing.lastMessage || '',
              lastMessageTime: existing.lastMessageTime || new Date().toISOString(),
              unreadCount: existing.unreadCounts.get(userId) || 0,
            } 
          });
        } else {
          // Remove user from deletedAt and reset messages for the user
          delete deletedAtObj[userId];
          existing.deletedAt = deletedAtObj;
          existing.lastMessageTime = new Date();
          existing.lastMessage = ''; // Reset lastMessage
          existing.unreadCounts.set(userId, 0);
          await Message.updateMany(
            { channelId: existing._id, visibleTo: userId },
            { $pull: { visibleTo: userId } }
          ); // Clear existing messages for the user
          await existing.save();
          const io = getIO();
          const populatedChannel = await Channel.findById(existing._id)
            .populate("users", "name avatar")
            .lean();
          const formattedChannel = {
            id: populatedChannel._id.toString(),
            name: populatedChannel.name,
            type: populatedChannel.type,
            users: populatedChannel.users.map(u => ({
              id: u._id.toString(),
              name: u.name,
              avatar: u.avatar?.url,
            })),
            lastMessage: '',
            lastMessageTime: populatedChannel.lastMessageTime || new Date().toISOString(),
            unreadCount: populatedChannel.unreadCounts[userId] || 0,
          };
          existing.users.forEach(uid => {
            io.to(uid.toString()).emit("channelCreated", formattedChannel);
          });
          return res.status(200).json({ message: "Direct chat reactivated with new conversation", channel: formattedChannel });
        }
      }
    } else {
      if (!name?.trim()) {
        return res.status(400).json({ error: "Group name is required" });
      }
      channelData.name = name.trim();
      channelData.inviteToken = require("crypto").randomBytes(16).toString("hex");
    }

    const newChannel = new Channel(channelData);
    await newChannel.save();

    const populatedChannel = await Channel.findById(newChannel._id)
      .populate("users", "name avatar")
      .lean();

    const formattedChannel = {
      id: populatedChannel._id.toString(),
      name: populatedChannel.name,
      type: populatedChannel.type,
      users: populatedChannel.users.map(u => ({
        id: u._id.toString(),
        name: u.name,
        avatar: u.avatar?.url,
      })),
      inviteToken: populatedChannel.inviteToken,
      createdAt: populatedChannel.createdAt,
      updatedAt: populatedChannel.updatedAt,
      lastMessage: '',
      lastMessageTime: populatedChannel.lastMessageTime || new Date().toISOString(),
      unreadCount: 0,
    };

    const io = getIO();
    newChannel.users.forEach(uid => {
      io.to(uid.toString()).emit("channelCreated", formattedChannel);
    });

    return res.status(201).json({ message: "Channel created", channel: formattedChannel });
  } catch (err) {
    next(err);
  }
};

const listChannels = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const channels = await Channel.find({
      users: userId,
      $or: [
        { deletedAt: { $exists: false } },
        { [`deletedAt.${userId}`]: { $exists: false } },
      ],
    })
      .populate("users", "name avatar")
      .sort({ lastMessageTime: -1, updatedAt: -1 })
      .lean();

    const channelsWithDetails = await Promise.all(
      channels.map(async (channel) => {
        const lastMessage = await Message.findOne({ 
          channelId: channel._id,
          visibleTo: userId // Only fetch last message visible to the user
        })
          .sort({ createdAt: -1 })
          .populate("user", "name");
          
        // Skip channels with no visible messages and deleted for the user
        if (!lastMessage && channel.deletedAt?.[userId]) {
          return null;
        }

        return {
          id: channel._id.toString(),
          name: channel.type === 'direct' 
            ? channel.users.find(u => u._id.toString() !== userId)?.name || 'Direct Chat'
            : channel.name,
          type: channel.type,
          users: channel.users.map(u => ({
            id: u._id.toString(),
            name: u.name,
            avatar: u.avatar?.url,
          })),
          lastMessage: lastMessage?.text || '', // Empty if no visible message
          lastMessageTime: lastMessage?.createdAt || channel.createdAt || new Date(), // Fallback to createdAt
          unreadCount: channel.unreadCounts[userId] || 0,
          lastMessageSenderId: lastMessage?.user?._id.toString() || null,
        };
      })
    );

    // Filter out null entries (deleted channels with no visible messages)
    const filteredChannels = channelsWithDetails.filter(channel => channel !== null);

    return res.json({ channels: filteredChannels });
  } catch (err) {
    console.error('Unhandled error:', err);
    next(err);
  }
};

const updateChannel = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const { name, users } = req.body;
    const userId = req.user.id;

    const channel = await Channel.findOne({ _id: channelId, users: userId });
    if (!channel) {
      return res.status(404).json({ error: "Channel not found or unauthorized" });
    }

    const oldUsers = channel.users.map(String);
    const newUsers = users && Array.isArray(users) ? [...new Set(users)] : oldUsers;

    if (users) {
      const validUsers = await User.find({ _id: { $in: newUsers } }).select("_id");
      if (validUsers.length !== newUsers.length) {
        return res.status(400).json({ error: "Invalid user IDs" });
      }
    }

    const added = newUsers.filter(id => !oldUsers.includes(id));
    const removed = oldUsers.filter(id => !newUsers.includes(id));

    if (name?.trim()) channel.name = name.trim();
    if (users) channel.users = newUsers;
    channel.updatedAt = new Date();
    channel.lastMessageTime = new Date();

    await channel.save();

    const postSystemMessage = async (text) => {
      const message = new Message({
        channelId,
        user: null,
        text,
        status: "sent",
        createdAt: new Date(),
        visibleTo: channel.users,
      });
      await message.save();
      const io = getIO();
      io.to(channelId).emit("receiveMessage", {
        id: message._id.toString(),
        channelId,
        sender: { id: null, name: "System" },
        content: text,
        timestamp: message.createdAt.toISOString(),
        status: "sent",
        visibleTo: message.visibleTo.map(uid => uid.toString()),
      });
      channel.users.forEach(uid => {
        if (uid.toString() !== userId) {
          const currentCount = channel.unreadCounts.get(uid.toString()) || 0;
          channel.unreadCounts.set(uid.toString(), currentCount + 1);
        }
      });
      await channel.save();
    };

    for (const uid of added) {
      const user = await User.findById(uid).select("name");
      if (user) await postSystemMessage(`${user.name} joined the group`);
    }

    for (const uid of removed) {
      const user = await User.findById(uid).select("name");
      if (user) await postSystemMessage(`${user.name} left the group`);
    }

    const populatedChannel = await Channel.findById(channelId).populate("users", "name avatar").lean();
    const formattedChannel = {
      id: populatedChannel._id.toString(),
      name: populatedChannel.type === 'direct' 
        ? populatedChannel.users.find(u => u._id.toString() !== userId)?.name || 'Direct Chat'
        : populatedChannel.name,
      type: populatedChannel.type,
      users: populatedChannel.users.map(u => ({
        id: u._id.toString(),
        name: u.name,
        avatar: u.avatar?.url,
      })),
      inviteToken: populatedChannel.inviteToken,
      createdAt: populatedChannel.createdAt,
      updatedAt: populatedChannel.updatedAt,
      lastMessage: populatedChannel.lastMessage || '',
      lastMessageTime: populatedChannel.lastMessageTime || new Date().toISOString(),
      unreadCount: populatedChannel.unreadCounts[userId] || 0,
      lastMessageSenderId: populatedChannel.lastMessageSenderId,
    };

    const io = getIO();
    channel.users.forEach(uid => {
      io.to(uid.toString()).emit("channelUpdated", formattedChannel);
    });

    return res.status(200).json({ message: "Channel updated", channel: formattedChannel });
  } catch (error) {
    next(error);
  }
};

const deleteChannel = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const userId = req.user.id;

    const channel = await Channel.findOne({ _id: channelId, users: userId });
    if (!channel) {
      return res.status(404).json({ error: "Channel not found or unauthorized" });
    }

    const users = channel.users.map(String);
    const deletedAtObj = channel.deletedAt || {};

    // Remove user from visibleTo for all messages in the channel
    await Message.updateMany(
      { channelId, visibleTo: userId },
      { $pull: { visibleTo: userId } }
    );

    // Update deletedAt for the user and reset channel metadata
    deletedAtObj[userId] = new Date();
    channel.deletedAt = deletedAtObj;
    channel.lastMessage = ''; // Explicitly clear lastMessage
    channel.lastMessageTime = channel.createdAt || new Date(); // Reset to createdAt
    channel.lastMessageSenderId = null; // Clear sender ID
    channel.unreadCounts.set(userId, 0);

    const bothDeleted = users.every(uid => deletedAtObj[uid]);

    if (bothDeleted) {
      await channel.deleteOne();
      await Message.deleteMany({ channelId });
    } else {
      await channel.save();
    }

    const io = getIO();
    // Emit channelDeleted to the user who deleted the chat
    io.to(userId).emit("channelDeleted", { channelId, userId });

    if (channel.type === "group" && !bothDeleted) {
      const remainingUsers = users.filter(uid => uid !== userId);
      const user = await User.findById(userId).select("name");
      await postSystemMessage(`${user.name} left the group`);
      // Emit channelUpdated to remaining users
      const populatedChannel = await Channel.findById(channelId).populate("users", "name avatar").lean();
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

    return res.status(200).json({
      message: bothDeleted ? "Channel deleted for everyone" : channel.type === "direct" ? "Direct chat deleted for you" : "You left the group",
      channelId,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { createChannel, listChannels, updateChannel, deleteChannel };