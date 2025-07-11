import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import ChatHeader from '../components/chat/ChatHeader';
import MessageList from '../components/chat/MessageList';
import MessageInput from '../components/chat/MessageInput';
import ChatInfo from '../components/chat/ChatInfo';
import Sidebar from '../components/layout/Sidebar';
import { socketManager } from '../api/socket';
import { debounce } from 'lodash';
import { useAuth } from '../contexts/AuthContext';
import { Message } from '../types/message';
import { toast } from 'react-toastify';

interface Channel {
  id: string;
  name: string;
  type: string;
  users: { id: string; name: string; avatar?: string }[];
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  lastMessageSenderId?: string;
}

interface ChatPageProps {
  isMobile: boolean;
  activeChat: string | null;
  onChatSelect: (chatId: string) => void;
  onBackToChats: () => void;
  setActiveSection: (section: 'chats' | 'calls' | 'files' | 'meet' | 'apps') => void;
  channels: Channel[];
  setChannels: React.Dispatch<React.SetStateAction<Channel[]>>;
}

const ChatPage: React.FC<ChatPageProps> = ({
  isMobile,
  activeChat,
  onChatSelect,
  onBackToChats,
  setActiveSection,
  channels,
  setChannels,
}) => {
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [hasUnseenMessages, setHasUnseenMessages] = useState(false);
  const { user } = useAuth();

  const currentChannel = channels.find(ch => ch.id === activeChat);
  const getDisplayName = () => {
    if (!currentChannel || !user) return '';
    if (currentChannel.type === 'direct') {
      const otherUser = currentChannel.users.find(u => u.id !== user.id);
      return otherUser?.name || 'Direct Chat';
    }
    return currentChannel.name;
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken') || '';
    socketManager.initializeSocket(token);

    return () => {
      // Cleanup handled by SocketManager
    };
  }, [user?.id]);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const response = await api.get('/channels', {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });
        const data = Array.isArray(response.data) ? response.data : response.data.channels || [];
        const sortedChannels = data
          .map((ch: any) => ({
            id: ch.id,
            name: ch.name,
            type: ch.type,
            users: ch.users.map((u: any) => ({
              id: u.id,
              name: u.name,
              avatar: u.avatar,
            })),
            lastMessage: ch.lastMessage,
            lastMessageTime: ch.lastMessageTime,
            unreadCount: ch.unreadCount || 0,
          }))
          .sort((a: Channel, b: Channel) => {
            const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
            const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
            return timeB - timeA;
          });
        setChannels(sortedChannels);
      } catch (error) {
        console.error('Error fetching channels:', error);
        setChannels([]);
      }
    };
    fetchChannels();
  }, [setChannels]);

  useEffect(() => {
    if (activeChat) {
      socketManager.joinChannel(activeChat);
      const fetchMessages = async () => {
        try {
          const response = await api.get(`/message/messages`, {
            params: { channelId: activeChat },
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
          });
          const data = response.data;
          const uniqueMessages = Array.from(
            new Map(data.map((msg: any) => [
              msg.id,
              {
                ...msg,
                sender: typeof msg.sender === 'object' ? msg.sender : { id: msg.sender, name: 'Unknown' },
                isCurrentUser: msg.sender.id === user?.id,
              }
            ])).values()
          ) as Message[];
          setMessages(uniqueMessages);

          const unseen = uniqueMessages.some(
            msg => !msg.isCurrentUser && !msg.seenBy?.includes(user?.id)
          );
          setHasUnseenMessages(unseen);
        } catch (error) {
          console.error('Error fetching messages:', error);
        }
      };
      fetchMessages();

      return () => {
        socketManager.leaveChannel(activeChat);
      };
    }
  }, [activeChat, user?.id]);

  useEffect(() => {
    const socket = socketManager.getSocket();
    if (!socket) return;
  
    const handleReceiveMessage = (message: Message) => {
      try {
        setMessages(prev => {
          const isDuplicate = prev.some(
            msg =>
              msg.id === message.id ||
              msg.tempId === message.id ||
              (msg.isCurrentUser &&
                msg.content === message.content &&
                msg.attachments?.length === message.attachments?.length &&
                Math.abs(new Date(msg.timestamp).getTime() - new Date(message.timestamp).getTime()) < 1000)
          );
          if (isDuplicate) {
            return prev.map(msg =>
              msg.tempId === message.id ||
                (msg.isCurrentUser &&
                  msg.content === message.content &&
                  msg.tempId &&
                  JSON.stringify(msg.attachments) === JSON.stringify(message.attachments))
                ? { ...msg, id: message.id, tempId: undefined, status: message.status }
                : msg
            );
          }
          const newMessage = {
            ...message,
            isCurrentUser: message.sender.id === user?.id,
            seenBy: message.seenBy || [],
          };
          const updatedMessages = [...prev, newMessage];
          setHasUnseenMessages(
            !newMessage.isCurrentUser && !newMessage.seenBy.includes(user?.id)
          );
          return updatedMessages;
        });
  
        if (message.channelId === activeChat && !message.isCurrentUser) {
          socket.emit('markSeen', { channelId: activeChat, messageId: message.id });
        }
      } catch (error) {
        console.error('Error in receiveMessage:', error);
        toast.error('Failed to process new message');
      }
    };
  
    const handleMessageUpdated = (updatedMessage: Message) => {
      try {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === updatedMessage.id
              ? { ...msg, content: updatedMessage.content, edited: updatedMessage.edited }
              : msg
          )
        );
      } catch (error) {
        console.error('Error in messageUpdated:', error);
        toast.error('Failed to update message');
      }
    };
  
    const handleChannelCreated = (channel: Channel) => {
      try {
        setChannels(prev => {
          if (prev.find(c => c.id === channel.id)) return prev;
          return [
            {
              id: channel.id,
              name: channel.name,
              type: channel.type,
              users: channel.users,
              lastMessage: channel.lastMessage || '',
              lastMessageTime: channel.lastMessageTime || new Date().toISOString(),
              unreadCount: channel.unreadCount || 0,
            },
            ...prev,
          ].sort((a, b) => {
            const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
            const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
            return timeB - timeA;
          });
        });
      } catch (error) {
        console.error('Error in channelCreated:', error);
        toast.error('Failed to process new channel');
      }
    };
  
    const handleChannelDeleted = ({ channelId, userId }: { channelId: string; userId: string }) => {
      try {
        if (userId === user?.id) {
          setChannels(prev => prev.filter(ch => ch.id !== channelId));
          if (activeChat === channelId) {
            onChatSelect('');
          }
        }
      } catch (error) {
        console.error('Error in channelDeleted:', error);
        toast.error('Failed to process channel deletion');
      }
    };
  
    const handleChannelUpdated = debounce((channel: Channel) => {
      try {
        setChannels(prev => {
          const existingChannel = prev.find((ch) => ch.id === channel.id);
          if (existingChannel) {
            return prev
              .map((ch) =>
                ch.id === channel.id
                  ? {
                      ...ch,
                      name: channel.name,
                      users: channel.users,
                      lastMessage: channel.lastMessage || ch.lastMessage,
                      lastMessageTime: channel.lastMessageTime || new Date().toISOString(),
                      unreadCount: channel.unreadCount || 0, // Respect server-provided unreadCount
                      lastMessageSenderId: channel.lastMessageSenderId,
                    }
                  : ch
              )
              .sort((a, b) => {
                const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
                const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
                return timeB - timeA;
              });
          }
          return prev;
        });
      } catch (error) {
        console.error('Error in channelUpdated:', error);
        toast.error('Failed to update channel');
      }
    }, 300);
  
    const handleTyping = (data: { userId: string; name: string; isTyping: boolean }) => {
      try {
        const debouncedTyping = debounce(() => {
          const { name, isTyping } = data;
          setTypingUsers(prev => {
            if (isTyping && !prev.includes(name)) return [...prev, name];
            if (!isTyping) return prev.filter(u => u !== name);
            return prev;
          });
        }, 300);
        debouncedTyping();
      } catch (error) {
        console.error('Error in typing:', error);
        toast.error('Failed to process typing event');
      }
    };
  
    const handleMessageSeen = ({ messageId, userId }: { messageId: string; userId: string }) => {
      try {
        setMessages(prev => {
          const updatedMessages = prev.map(msg =>
            msg.id === messageId
              ? { ...msg, seenBy: [...(msg.seenBy || []), userId], status: 'seen' }
              : msg
          );
          setHasUnseenMessages(
            updatedMessages.some(msg => !msg.isCurrentUser && !msg.seenBy?.includes(user?.id))
          );
          return updatedMessages;
        });
  
        setChannels(prev => {
          if (!activeChat) return prev;
          return prev.map(ch =>
            ch.id === activeChat
              ? {
                  ...ch,
                  unreadCount: ch.lastMessageSenderId === user?.id
                    ? 0
                    : Math.max(
                        (ch.unreadCount || 0) -
                          (messages.find(msg => msg.id === messageId && !msg.isCurrentUser) ? 1 : 0),
                        0
                      )
                }
              : ch
          );
        });
      } catch (error) {
        console.error('Error in messageSeen:', error);
        toast.error('Failed to process message seen event');
      }
    };
  
    const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
      try {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        if (messageId === replyingTo) {
          setReplyingTo(null);
        }
      } catch (error) {
        console.error('Error in messageDeleted:', error);
        toast.error('Failed to process message deletion');
      }
    };
  
    const handleError = (error: { message: string }) => {
      try {
        console.error('Socket error:', error.message);
        toast.error(error.message || 'Socket error occurred');
      } catch (err) {
        console.error('Error in handleError:', err);
      }
    };
  
    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('messageUpdated', handleMessageUpdated);
    socket.on('channelCreated', handleChannelCreated);
    socket.on('channelDeleted', handleChannelDeleted);
    socket.on('channelUpdated', handleChannelUpdated);
    socket.on('typing', handleTyping);
    socket.on('messageSeen', handleMessageSeen);
    socket.on('messageDeleted', handleMessageDeleted);
    socket.on('error', handleError);
  
    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('messageUpdated', handleMessageUpdated);
      socket.off('channelCreated', handleChannelCreated);
      socket.off('channelDeleted', handleChannelDeleted);
      socket.off('channelUpdated', handleChannelUpdated);
      socket.off('typing', handleTyping);
      socket.off('messageSeen', handleMessageSeen);
      socket.off('messageDeleted', handleMessageDeleted);
      socket.off('error', handleError);
      handleChannelUpdated.cancel();
    };
  }, [activeChat, user?.id, onChatSelect, setChannels, messages, replyingTo, setReplyingTo]);
  const handleSendMessage = (
    content: string,
    attachments: Array<{ id: string; type: 'file' | 'image'; name: string; url: string; size?: number }>,
    replyTo?: string
  ) => {
    if (!activeChat || !user) return;
  
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const timestamp = new Date().toISOString();
    const optimisticMessage: Message = {
      id: tempId,
      tempId,
      channelId: activeChat,
      sender: {
        id: user.id,
        name: user.name || 'Unknown',
      },
      content,
      attachments,
      timestamp,
      status: 'sent',
      isCurrentUser: true,
      replyTo: replyTo
        ? {
            id: replyTo,
            sender: messages.find(msg => msg.id === replyTo)?.sender || { id: '', name: 'Unknown' },
            content: messages.find(msg => msg.id === replyTo)?.content || '',
          }
        : undefined,
    };
  
    setMessages(prev => [...prev, optimisticMessage]);
  
    const message = {
      channelId: activeChat,
      content,
      attachments,
      timestamp,
      replyTo: replyTo || null, // Modified: Send only the replyTo ID or null
    };
  
    const socket = socketManager.getSocket();
    socket?.emit('sendMessage', message, (response: { error?: string; message?: Message }) => {
      if (response.error) {
        console.error('Error sending message:', response.error);
        setMessages(prev => prev.filter(msg => msg.tempId !== tempId));
      } else {
        setMessages(prev => {
          const filteredMessages = prev.filter(
            msg =>
              msg.id !== response.message!.id &&
              !(msg.tempId === tempId) &&
              !(msg.isCurrentUser &&
                msg.content === response.message!.content &&
                JSON.stringify(msg.attachments) === JSON.stringify(response.message!.attachments) &&
                msg.tempId)
          );
          return [
            ...filteredMessages,
            {
              ...response.message!,
              isCurrentUser: response.message!.sender.id === user?.id,
              tempId: undefined,
              replyTo: response.message!.replyTo
                ? {
                    id: response.message!.replyTo.id,
                    sender: response.message!.replyTo.sender || { id: '', name: 'Unknown' },
                    content: response.message!.replyTo.content || '',
                  }
                : undefined,
            },
          ];
        });
      }
    });
  
    setReplyingTo(null);
  };

  const handleTyping = (isTyping: boolean) => {
    const socket = socketManager.getSocket();
    if (socket && activeChat) {
      socket.emit('typing', { channelId: activeChat, isTyping });
    }
  };



  const handleDeleteMessage = (messageId: string) => {
    const socket = socketManager.getSocket();
    if (socket) {
      socket.emit('deleteMessage', { messageId, channelId: activeChat }, (response: { error?: string }) => {
        if (response.error) {
          console.error('Error deleting message:', response.error);
          toast.error('Failed to delete message');
        }
      });
    }
  };

  const handleReplyMessage = (messageId: string) => {
    setReplyingTo(messageId);
  };

  const handleForwardMessage = (messageId: string, targetChannelId: string) => {
    console.log(`Forwarding message ${messageId} to channel ${targetChannelId} by user ${user?.id}`);
    const socket = socketManager.getSocket();
    if (socket) {
      socket.emit('forwardMessage', { messageId, targetChannelId }, (response: { error?: string }) => {
        if (response.error) {
          console.error('Error forwarding message:', response.error, { messageId, targetChannelId });
          if (response.error.includes('Unauthorized') || response.error.includes('invalid')) {
            toast.error('Cannot forward to this chat. It may no longer exist or you lack access.');
          } else {
            toast.error('Failed to forward message');
          }
        } else {
          console.log('Message forwarded successfully:', { messageId, targetChannelId });
          toast.success('Message forwarded successfully');
        }
      });
    }
  };

  const toggleChatInfo = () => {
    setIsChatInfoOpen(!isChatInfoOpen);
  };

  const uniqueMessages = Array.from(
    new Map(messages.map(msg => [msg.id, msg])).values()
  );

  return (
    <>
      <div
        className={`${isMobile && activeChat ? 'hidden' : 'block'} lg:block lg:w-80 h-full bg-white border-r border-gray-200`}
      >
        <Sidebar
          isMobile={isMobile}
          isOpen={true}
          onToggle={() => { }}
          activeChat={activeChat}
          onChatSelect={onChatSelect}
          chats={channels}
          setChats={setChannels}
          isGroupChat={(ch: Channel) => ch.type === 'group'}
        />
      </div>

      <div className={`flex-1 flex flex-col h-full ${isMobile && !activeChat ? 'hidden' : 'block'}`}>
        {activeChat ? (
          <>
            <ChatHeader
              name={getDisplayName()}
              status={currentChannel?.users.find(u => u.id !== user?.id)?.name || 'Online'}
              avatar={currentChannel?.users.find(u => u.id !== user?.id)?.avatar}
              onToggleInfo={toggleChatInfo}
              onBack={isMobile ? onBackToChats : undefined}
              isMobile={isMobile}
            />
            <div className="flex-1 overflow-hidden flex">
              <div
                className={`flex-1 flex flex-col min-w-0 ${isMobile && isChatInfoOpen ? 'hidden' : 'block'
                  }`}
              >
                {typingUsers.length > 0 && (
                  <div className="text-sm text-gray-500 p-2">
                    {typingUsers.join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...
                  </div>
                )}
                <MessageList
                  messages={uniqueMessages}
                  onDeleteMessage={handleDeleteMessage}
                  onReplyMessage={handleReplyMessage}
                  onForwardMessage={handleForwardMessage}
                  activeChat={activeChat}
                  hasUnseenMessages={hasUnseenMessages}
                  setHasUnseenMessages={setHasUnseenMessages}
                  chatType={currentChannel?.type || 'direct'}
                  currentChannelUsers={currentChannel?.users || []}
                  channelUsers={channels.filter(channel => channel.users.some(u => u.id === user?.id))}
                />
                <MessageInput
                  onSendMessage={handleSendMessage}
                  onTyping={handleTyping}
                  replyingTo={replyingTo ? messages.find(msg => msg.id === replyingTo) : undefined}
                  onCancelReply={() => setReplyingTo(null)}
                  activeChat={activeChat}
                />
              </div>
              {isChatInfoOpen && currentChannel && (
                <ChatInfo
                  name={getDisplayName()}
                  status={currentChannel.users.find(u => u.id !== user?.id)?.status || 'Online'}
                  avatar={currentChannel.users.find(u => u.id !== user?.id)?.avatar}
                  members={currentChannel.type === 'group' ? currentChannel.users : undefined}
                  onClose={toggleChatInfo}
                  isMobile={isMobile}
                  channelId={activeChat}
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h2 className="text-xl font-medium text-gray-600">
                Select a conversation to start messaging
              </h2>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ChatPage;