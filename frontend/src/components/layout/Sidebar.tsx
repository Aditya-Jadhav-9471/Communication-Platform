import React, { useState, useEffect } from 'react';
import { Search, Plus, X } from 'lucide-react';
import api from '../../api/axios';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';
import { cn } from '../../utils/cn';
import { socketManager } from '../../api/socket';
import { useAuth } from '../../contexts/AuthContext';
import { NewChatModal, NewGroupModal } from '../modals/ChatModals';
import { debounce } from 'lodash';
import { toast } from 'react-toastify';

interface Chat {
  id: string;
  name: string;
  status?: 'online' | 'offline' | 'away' | 'busy';
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  type: 'direct' | 'group';
  users: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
  lastMessageSenderId?: string | null;
}

interface User {
  id: string;
  name?: string;
  email: string;
  avatar?: string;
}

interface SidebarProps {
  isMobile: boolean;
  isOpen: boolean;
  onToggle: () => void;
  activeChat: string | null;
  onChatSelect: (id: string) => void;
  chats: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  isGroupChat: (chat: Chat) => boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  isMobile,
  isOpen,
  onToggle,
  activeChat,
  onChatSelect,
  chats,
  setChats,
  isGroupChat,
}) => {
  const { user } = useAuth();
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const getChatDisplayName = (chat: Chat) => {
    if (!user || chat.type !== 'direct') return chat.name;
    const otherUser = chat.users.find(u => u.id !== user.id);
    return otherUser?.name || 'Direct Chat';
  };

  const getChatAvatar = (chat: Chat) => {
    if (!user || chat.type !== 'direct') return chat.avatar;
    const otherUser = chat.users.find(u => u.id !== user.id);
    return otherUser?.avatar;
  };

  const sortedChats = [...chats].sort((a, b) => {
    const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
    const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
    return timeB - timeA;
  });

  const filteredChats = sortedChats
    .filter(chat => chat.id && getChatDisplayName(chat).toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(chat => chat.lastMessage || new Date(chat.lastMessageTime || 0) > new Date(chat.createdAt || 0))
    .filter((chat, index, self) => self.findIndex(c => c.id === chat.id) === index);

  const filteredUsers = users
    .filter(u => u.id !== user?.id)
    .filter(
      user =>
        (user.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(userSearchQuery.toLowerCase())) &&
        !selectedUsers.find(su => su.id === user.id)
    );

  useEffect(() => {
    const token = localStorage.getItem('accessToken') || '';
    socketManager.initializeSocket(token);

    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const response = await api.get('/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = Array.isArray(response.data) ? response.data : response.data.users || [];
        setUsers(data);
      } catch (err: any) {
        console.error('Error fetching users:', err.message);
        setError('Failed to load users');
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [user]);

  useEffect(() => {
    const socket = socketManager.getSocket();
    if (!socket) return;

    const handleChannelCreated = (channel: Chat) => {
      if (!channel.id) return;
      setChats(prev => {
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
            lastMessageSenderId: channel.lastMessageSenderId || null,
          },
          ...prev,
        ].sort((a, b) => {
          const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return timeB - timeA;
        });
      });
    };

    const handleChannelUpdated = debounce((channel: Chat) => {
      if (!channel.id) return;
      console.log('Channel updated:', channel);
      setChats((prev) => {
        const existingChat = prev.find((ch) => ch.id === channel.id);
        if (existingChat) {
          return prev
            .map((ch) =>
              ch.id === channel.id
                ? {
                    ...ch,
                    name: channel.name,
                    users: channel.users,
                    lastMessage: channel.lastMessage || '',
                    lastMessageTime: channel.lastMessageTime || new Date().toISOString(),
                    unreadCount:
                      channel.lastMessageSenderId === user?.id ? 0 : channel.unreadCount || 0,
                    lastMessageSenderId: channel.lastMessageSenderId || null,
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
    }, 300);

    const handleChannelDeleted = ({ channelId, userId }: { channelId: string; userId: string }) => {
      if (userId === user?.id) {
        setChats(prev => prev.filter(ch => ch.id !== channelId));
        if (activeChat === channelId) {
          onChatSelect('');
        }
        toast.success('Chat deleted successfully');
      }
    };

    socket.on('channelCreated', handleChannelCreated);
    socket.on('channelUpdated', handleChannelUpdated);
    socket.on('channelDeleted', handleChannelDeleted);

    return () => {
      socket.off('channelCreated', handleChannelCreated);
      socket.off('channelUpdated', handleChannelUpdated);
      socket.off('channelDeleted', handleChannelDeleted);
      handleChannelUpdated.cancel();
    };
  }, [activeChat, onChatSelect, setChats, user]);

  const createDirectChat = async (userId: string) => {
    try {
      setError(null);
      const response = await api.post(
        '/channels',
        {
          type: 'direct',
          users: [userId],
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        }
      );
      const newChat = response.data.channel;
      setChats(prev => {
        if (prev.find(c => c.id === newChat.id)) return prev;
        return [
          {
            id: newChat.id,
            name: newChat.name,
            type: newChat.type,
            users: newChat.users,
            lastMessage: newChat.lastMessage || '',
            lastMessageTime: newChat.lastMessageTime || new Date().toISOString(),
            unreadCount: newChat.unreadCount || 0,
            lastMessageSenderId: newChat.lastMessageSenderId || null,
          },
          ...prev,
        ].sort((a, b) => {
          const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return timeB - timeA;
        });
      });
      onChatSelect(newChat.id);
      setShowNewChatModal(false);
      setUserSearchQuery('');
      toast.success('Direct chat created');
    } catch (err: any) {
      console.error('Error creating direct chat:', err.message);
      setError(err.response?.data?.error || 'Failed to create chat');
      toast.error(err.response?.data?.error || 'Failed to create chat');
    }
  };

  const createGroupChat = async () => {
    try {
      setError(null);
      const response = await api.post(
        '/channels',
        {
          type: 'group',
          name: groupName,
          users: selectedUsers.map(u => u.id),
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        }
      );
      const newChat = response.data.channel;
      setChats(prev => {
        if (prev.find(c => c.id === newChat.id)) return prev;
        return [
          {
            id: newChat.id,
            name: newChat.name,
            type: newChat.type,
            users: newChat.users,
            lastMessage: newChat.lastMessage || '',
            lastMessageTime: newChat.lastMessageTime || new Date().toISOString(),
            unreadCount: newChat.unreadCount || 0,
            lastMessageSenderId: newChat.lastMessageSenderId || null,
          },
          ...prev,
        ].sort((a, b) => {
          const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return timeB - timeA;
        });
      });
      onChatSelect(newChat.id);
      setShowNewGroupModal(false);
      setGroupName('');
      setSelectedUsers([]);
      setUserSearchQuery('');
      toast.success('Group chat created');
    } catch (err: any) {
      console.error('Error creating group chat:', err.message);
      setError(err.response?.data?.error || 'Failed to create group');
      toast.error(err.response?.data?.error || 'Failed to create group');
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-white transition-transform duration-300 ease-in-out z-40',
        isMobile
          ? isOpen
            ? 'fixed inset-y-0 left-0 w-80 shadow-lg'
            : 'fixed inset-y-0 left-0 w-80 -translate-x-full'
          : 'w-80 border-r border-gray-200'
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Chats</h2>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <Plus size={20} />
            </Button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-30">
                <button
                  onClick={() => {
                    setShowNewChatModal(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  New Chat
                </button>
                <button
                  onClick={() => {
                    setShowNewGroupModal(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  New Group
                </button>
              </div>
            )}
          </div>
          {isMobile && (
            <Button variant="ghost" size="sm" onClick={onToggle}>
              <X size={20} />
            </Button>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 pl-9 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <p className="text-center text-gray-500 mt-4">No chats found</p>
        ) : (
          filteredChats.map(chat => (
            <button
              key={chat.id}
              onClick={() => {
                onChatSelect(chat.id);
                if (isMobile) onToggle();
              }}
              className={cn(
                'w-full flex items-center p-4 hover:bg-gray-50 transition-colors border-b border-gray-100',
                activeChat === chat.id ? 'bg-gray-100' : ''
              )}
            >
              <Avatar
                size="md"
                name={getChatDisplayName(chat)}
                src={getChatAvatar(chat)}
                status={chat.status}
              />
              <div className="ml-3 flex-1 text-left">
                <div className="flex justify-between items-center">
                  <p className="font-medium">{getChatDisplayName(chat)}</p>
                  {chat.lastMessageTime && chat.lastMessage && (
                    <p className="text-xs text-gray-500">
                      {new Date(chat.lastMessageTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
                {chat.lastMessage && (
                  <p className="text-sm text-gray-500 truncate">{chat.lastMessage}</p>
                )}
              </div>
              {chat.unreadCount > 0 && (
                <span className="ml-2 bg-blue-500 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center">
                  {chat.unreadCount}
                </span>
              )}
            </button>
          ))
        )}
      </div>

      {showNewChatModal && (
        <NewChatModal
          onClose={() => {
            setShowNewChatModal(false);
            setUserSearchQuery('');
            setError(null);
          }}
          filteredUsers={filteredUsers}
          createDirectChat={createDirectChat}
          userSearchQuery={userSearchQuery}
          setUserSearchQuery={setUserSearchQuery}
          error={error}
          loadingUsers={loadingUsers}
        />
      )}

      {showNewGroupModal && (
        <NewGroupModal
          onClose={() => {
            setShowNewGroupModal(false);
            setGroupName('');
            setSelectedUsers([]);
            setUserSearchQuery('');
            setError(null);
          }}
          filteredUsers={filteredUsers}
          selectedUsers={selectedUsers}
          setSelectedUsers={setSelectedUsers}
          groupName={groupName}
          setGroupName={setGroupName}
          userSearchQuery={userSearchQuery}
          setUserSearchQuery={setUserSearchQuery}
          createGroupChat={createGroupChat}
          error={error}
          loadingUsers={loadingUsers}
        />
      )}
    </div>
  );
};

export default Sidebar;