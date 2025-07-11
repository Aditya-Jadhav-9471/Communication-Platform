import React, { useState, useRef, useEffect } from 'react';
import Avatar from '../ui/Avatar';
import { cn } from '../../utils/cn';
import { Check, CheckCheck, Edit2, Forward, Reply, Trash2, FileText, Image } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { socketManager } from '../../api/socket';
import { Message } from '../../types/message';
import { toast } from 'react-toastify';
import DeleteConfirmation from '../ui/DeleteConfirmation';
import ForwardMessageModal from '../modals/ForwardMessageModal';


interface MessageListProps {
  messages: Message[];
  pinnedMessage?: Message;
  onEditMessage: (messageId: string, newContent: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onReplyMessage: (messageId: string) => void;
  onForwardMessage: (messageId: string, targetChannelId: string) => void; // Update signature
  activeChat: string | null;
  hasUnseenMessages: boolean;
  setHasUnseenMessages: React.Dispatch<React.SetStateAction<boolean>>;
  chatType: 'direct' | 'group';
  currentChannelUsers: Array<{ id: string; name: string; type: 'direct' | 'group'; avatar?: string; users: Array<{ id: string; name: string; avatar?: string }> }>; // Update to match Channel type
}

interface ForwardedIndicatorProps {
  message: Message;
  channelUsers: Channel[]; // Prop available in MessageList
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  pinnedMessage,
  onEditMessage,
  onDeleteMessage,
  onReplyMessage,
  onForwardMessage,
  activeChat,
  hasUnseenMessages,
  setHasUnseenMessages,
  chatType,
  currentChannelUsers,
  channelUsers,
}) => {
  const { user } = useAuth();
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [forwardMessageId, setForwardMessageId] = useState<string | null>(null);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [isForwarding, setIsForwarding] = useState(false);
  const [forwardSearchQuery, setForwardSearchQuery] = useState('');

  useEffect(() => {
    const socket = socketManager.getSocket();
    if (!socket || !activeChat || !user) return;
  
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = entry.target.getAttribute('data-message-id');
            const message = messages.find((msg) => msg.id === messageId);
            if (
              messageId &&
              message &&
              !message.isCurrentUser &&
              !message.seenBy?.includes(user.id) &&
              message.status !== 'seen'
            ) {
              socket.emit('markSeen', { channelId: activeChat, messageId });
            }
          }
        });
      },
      { root: messageListRef.current, threshold: 0.1 }
    );
  
    messageRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });
  
    return () => {
      observer.disconnect();
    };
  }, [messages, activeChat, user]);

  useEffect(() => {
    if (messages.length > 0 && user) {
      const unseen = messages.some(
        (msg) => !msg.isCurrentUser && !msg.seenBy?.includes(user.id)
      );
      setHasUnseenMessages(unseen);
    }
  }, [messages, user, setHasUnseenMessages]);

  const scrollToBottom = (behavior: 'auto' | 'smooth' = 'auto') => {
    if (messagesEndRef.current && messageListRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior });
      }, 0);
    }
  };

  useEffect(() => {
    if (activeChat) {
      scrollToBottom('auto');
    }
  }, [activeChat]);

  useEffect(() => {
    if (messageListRef.current && messages.length > 0) {
      const isAtBottom =
        messageListRef.current.scrollHeight - messageListRef.current.scrollTop <=
        messageListRef.current.clientHeight + 100;
      const latestMessage = messages[messages.length - 1];
      const isCurrentUserMessage = latestMessage?.isCurrentUser;

      if (isAtBottom || hasUnseenMessages || isCurrentUserMessage) {
        scrollToBottom('auto');
      }
    }
  }, [messages, hasUnseenMessages]);

  const formatGroupDate = (dateStr: string) => {
    const messageDate = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const isToday =
      messageDate.getDate() === today.getDate() &&
      messageDate.getMonth() === today.getMonth() &&
      messageDate.getFullYear() === today.getFullYear();
    const isYesterday =
      messageDate.getDate() === yesterday.getDate() &&
      messageDate.getMonth() === yesterday.getMonth() &&
      messageDate.getFullYear() === yesterday.getFullYear();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    return messageDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const groupedMessages: { [key: string]: Message[] } = {};

  messages.forEach((message) => {
    try {
      const date = new Date(message.timestamp);
      if (isNaN(date.getTime())) {
        console.warn(`Invalid timestamp for message ID ${message.id}: ${message.timestamp}`);
        return;
      }
      const dateKey = date.toLocaleDateString('en-US');
      if (!groupedMessages[dateKey]) {
        groupedMessages[dateKey] = [];
      }
      groupedMessages[dateKey].push(message);
    } catch (error) {
      console.error(`Error processing timestamp for message ID ${message.id}:`, error);
    }
  });

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isConsecutiveMessage = (currentMsg: Message, prevMsg?: Message) => {
    if (!prevMsg) return false;
    return (
      currentMsg.sender.id === prevMsg.sender.id &&
      new Date(currentMsg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime() < 5 * 60 * 1000
    );
  };
  const ForwardedIndicator = ({ message, channelUsers }: ForwardedIndicatorProps) => {
    if (!message.forwardedFrom) {
      return null;
    }
    // Derive the display name from channelUsers or fallback to a default
  const sourceChannel = channelUsers.find(
    (channel) => channel.id === message.forwardedFrom.channelId
  );
  const displayName = sourceChannel?.name || 'Unknown Channel';

  return (
    <div className="text-xs text-gray-500 italic">
      Forwarded
       {/* {displayName} */}
    </div>
  );
};

  const MessageStatus = ({ status }: { status?: 'sent' | 'seen' }) => {
    if (!status) return null;

    return (
      <div className="ml-2 flex items-center text-xs">
        {status === 'sent' && <Check size={14} className="text-gray-400" />}
        {status === 'seen' && <CheckCheck size={14} className="text-blue-500" />}
      </div>
    );
  };

// Update handleStartEdit to check 5-minute window
const handleStartEdit = (message: Message) => {
  const messageTime = new Date(message.timestamp);
  const currentTime = new Date();
  const timeDiff = (currentTime.getTime() - messageTime.getTime()) / 1000 / 60; // Difference in minutes
  if (timeDiff > 5) {
    toast.error('Message can only be edited within 5 minutes of sending');
    return;
  }
  setEditingMessageId(message.id);
  setEditContent(message.content);
  setSelectedMessageId(null);
};

const handleSaveEdit = () => {
  if (editingMessageId && editContent.trim() && activeChat) {
    socketManager.editMessage(editingMessageId, editContent.trim(), activeChat);
    setEditingMessageId(null);
    setEditContent('');
  }
};

    const handleStartForward = (messageId: string) => {
      setForwardMessageId(messageId);
      setIsForwardModalOpen(true);
    };
  
    const MessageActions = ({ message }: { message: Message }) => {
      const isSelected = selectedMessageId === message.id;
  
      return (
        <div
          className={cn(
            'absolute right-0 top-1/2 -translate-y-1/2 transition-all duration-200',
            isSelected ? 'opacity-100 visible' : 'opacity-0 invisible'
          )}
        >
          <div className="flex items-center bg-white rounded-lg shadow-lg p-1 ml-2">
            <button
              onClick={() => {
                onReplyMessage(message.id);
                setSelectedMessageId(null);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
              aria-label="Reply"
            >
              <Reply size={18} />
            </button>
            {message.isCurrentUser && (
              <button
                onClick={() => handleStartEdit(message)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
                aria-label="Edit"
              >
                <Edit2 size={18} />
              </button>
            )}
            <button
              onClick={() => {
                handleStartForward(message.id); // Updated to open modal
                setSelectedMessageId(null);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
              aria-label="Forward"
            >
              <Forward size={18} />
            </button>
            {message.isCurrentUser && (
              <button
                onClick={() => {
                  setDeleteMessageId(message.id);
                  setIsDeleteModalOpen(true);
                  setSelectedMessageId(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-red-500 hover:text-red-600"
                aria-label="Delete"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>
      );
    };
    
    const ReplyPreview = ({ replyTo }: { replyTo: Message['replyTo'] }) => {
      if (!replyTo) return null;
    
      return (
        <div className="bg-gray-50/80 rounded-t-lg px-3 py-2 -mb-2 text-sm border-l-2 border-blue-400">
          <div className="font-medium text-gray-700">{replyTo.sender.name}</div>
          <div className="text-gray-600 truncate">{replyTo.content}</div>
        </div>
      );
    };

  return (
    <div
      ref={messageListRef}
      className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 md:px-4"
      style={{ scrollBehavior: 'auto' }}
    >
      {Object.keys(groupedMessages).length === 0 && (
        <div className="text-center text-gray-500 py-4">No messages available</div>
      )}
      {Object.keys(groupedMessages).map((date) => (
        <div key={date} className="w-full">
          <div className="flex items-center justify-center my-4">
            <span className="mx-4 text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {formatGroupDate(date)}
            </span>
          </div>
          {groupedMessages[date].map((message, index) => {
            const prevMessage = index > 0 ? groupedMessages[date][index - 1] : undefined;
            const isConsecutive = isConsecutiveMessage(message, prevMessage);
            const displayName = message.sender.id === user?.id ? 'You' : message.sender.name;
            const senderAvatar = currentChannelUsers.find(u => u.id === message.sender.id)?.avatar;
            return (
              <div
                key={message.id}
                data-message-id={message.id}
                ref={(el) => {
                  if (el) messageRefs.current.set(message.id, el);
                }}
                className={cn(
                  'flex mb-3 group w-full',
                  message.isCurrentUser ? 'justify-end' : 'justify-start',
                  isConsecutive ? 'mt-1' : 'mt-3'
                )}
                onClick={() => setSelectedMessageId(selectedMessageId === message.id ? null : message.id)}
              >
                {!message.isCurrentUser && !isConsecutive && (
                  <Avatar
                    src={senderAvatar}
                    name={message.sender.name}
                    size="sm"
                    className="mr-2 mt-1 flex-shrink-0"
                  />
                )}
                {!message.isCurrentUser && isConsecutive && (
                  <div className="w-8 mr-2 flex-shrink-0"></div>
                )}
                <div
                  className={cn(
                    'max-w-[85%] md:max-w-[75%] min-w-0 relative group',
                    message.isCurrentUser ? 'order-1' : 'order-1'
                  )}
                >
                  {(chatType === 'group' || !isConsecutive) && !message.isCurrentUser && (
                    <div
                      className={cn(
                        'flex items-center mb-1',
                        message.isCurrentUser ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <span className="text-sm font-medium">{displayName}</span>
                      <span className="text-xs text-gray-500 ml-2">{formatTime(message.timestamp)}</span>
                      {message.edited && (
                        <span className="text-xs text-gray-500 ml-2 italic">(edited)</span>
                      )}
                    </div>
                  )}
                  {message.isCurrentUser && !isConsecutive && (
                    <div
                      className={cn(
                        'flex items-center mb-1 justify-end'
                      )}
                    >
                      <span className="text-sm font-medium">{displayName}</span>
                      <span className="text-xs text-gray-500 ml-2">{formatTime(message.timestamp)}</span>
                      {message.edited && (
                        <span className="text-xs text-gray-500 ml-2 italic">(edited)</span>
                      )}
                    </div>
                  )}
                  {message.replyTo && <ReplyPreview replyTo={message.replyTo} />}
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-2.5 break-words relative shadow-sm',
                      message.isCurrentUser
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-800',
                      message.replyTo ? 'rounded-tl-lg' : ''
                    )}
                  >
                    {editingMessageId === message.id ? (
                      <div className="flex flex-col space-y-2">
                        <input
                          type="text"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full bg-white rounded-lg px-3 py-2 text-gray-800 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => setEditingMessageId(null)}
                            className="text-xs bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveEdit}
                            className="text-xs bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition-colors"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col space-y-2">
                   <ForwardedIndicator message={message} channelUsers={channelUsers} />
                        {message.content && (
                          <p className="text-base break-words">{message.content}</p>
                        )}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="space-y-2">
                            {message.attachments.map((attachment) => (
                              <a
                                key={attachment.id}
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  'flex items-center rounded-lg p-2 text-sm transition-colors',
                                  message.isCurrentUser
                                    ? 'bg-blue-600 text-white hover:bg-blue-800'
                                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                )}
                                download={attachment.type === 'file' ? attachment.name : undefined}
                                onClick={() => console.log(`Accessing attachment: ${attachment.url}`)}
                              >
                                {attachment.type === 'image' ? (
                                  <img
                                    src={attachment.url}
                                    alt={attachment.name}
                                    className="w-11 h-11 object-cover rounded mr-3"
                                    onError={(e) => console.error(`Failed to load image: ${attachment.url}`, e)}
                                  />
                                ) : (
                                  <FileText size={20} className="mr-3 flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{attachment.name}</p>
                                  {attachment.size && (
                                    <p className="text-xs opacity-80">
                                      {(attachment.size / 1024).toFixed(2)} KB
                                    </p>
                                  )}
                                </div>
                              </a>
                            ))}
                          </div>
                        )}
                        {message.isCurrentUser && (
                          <div className="flex justify-end items-center mt-1">
                            <MessageStatus status={message.status} />
                          </div>
                        )}
                      </div>
                    )}
                    <MessageActions message={message} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <div ref={messagesEndRef} />
      <DeleteConfirmation
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteMessageId(null);
        }}
        onConfirm={async () => {
          if (deleteMessageId) {
            setIsDeleting(true);
            try {
              await onDeleteMessage(deleteMessageId);
              toast.success('Message deleted successfully');
            } catch (error) {
              toast.error('Failed to delete message');
            } finally {
              setIsDeleting(false);
              setIsDeleteModalOpen(false);
              setDeleteMessageId(null);
            }
          }
        }}
        isLoading={isDeleting}
      />

<ForwardMessageModal
        isOpen={isForwardModalOpen}
        onClose={() => {
          setIsForwardModalOpen(false);
          setForwardMessageId(null);
          setForwardSearchQuery('');
        }}
        onForward={(channelId) => {
          if (forwardMessageId) {
            setIsForwarding(true);
            try {
              onForwardMessage(forwardMessageId, channelId); // Call with both messageId and channelId
              // toast.success('Message forwarded successfully');
              setIsForwardModalOpen(false);
              setForwardMessageId(null);
              setForwardSearchQuery('');
            } catch (error) {
              toast.error('Failed to forward message');
            } finally {
              setIsForwarding(false);
            }
          }
        }}
        channels={channelUsers}
        userId={user?.id || ''}
        isLoading={isForwarding}
        searchQuery={forwardSearchQuery}
        setSearchQuery={setForwardSearchQuery}
      />
    </div>
  );
};

export default MessageList;