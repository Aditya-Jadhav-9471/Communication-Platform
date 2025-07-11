import React from 'react';
import { X, Search } from 'lucide-react';
import Avatar from '../ui/Avatar';

interface Channel {
  id: string;
  name: string;
  type: 'direct' | 'group';
  avatar?: string;
  users: Array<{ id: string; name: string; avatar?: string }>;
}

interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onForward: (channelId: string) => void;
  channels: Channel[];
  userId: string;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({
  isOpen,
  onClose,
  onForward,
  channels,
  userId,
  isLoading,
  searchQuery,
  setSearchQuery,
}) => {
  if (!isOpen) return null;

  const getChatDisplayName = (channel: Channel) => {
    if (channel.type !== 'direct') return channel.name;
    const otherUser = channel.users.find(u => u.id !== userId);
    return otherUser?.name || 'Direct Chat';
  };

  const getChatAvatar = (channel: Channel) => {
    if (channel.type !== 'direct') return channel.avatar;
    const otherUser = channel.users.find(u => u.id !== userId);
    return otherUser?.avatar;
  };

  const filteredChannels = channels.filter(channel =>
    channel.users.some(u => u.id === userId) &&
    getChatDisplayName(channel).toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Forward Message</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-4">
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 pl-9 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {filteredChannels.length === 0 && (
              <p className="text-sm text-gray-500">No chats found</p>
            )}
            {filteredChannels.map(channel => (
              <button
                key={channel.id}
                onClick={() => {
                  console.log(`Forwarding to channel: ${channel.id}`);
                  onForward(channel.id);
                }}
                className="w-full flex items-center p-2 hover:bg-gray-50 rounded-lg transition-colors"
                disabled={isLoading}
              >
                <Avatar
                  size="md"
                  name={getChatDisplayName(channel)}
                  src={getChatAvatar(channel)}
                />
                <div className="ml-3 text-left">
                  <p className="font-medium">{getChatDisplayName(channel)}</p>
                  <p className="text-sm text-gray-500">{channel.type === 'group' ? 'Group Chat' : 'Direct Chat'}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForwardMessageModal;
