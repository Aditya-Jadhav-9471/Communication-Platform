import React from 'react';
import { Search, X } from 'lucide-react';
import Avatar from '../ui/Avatar';

interface User {
  id: string;
  name?: string;
  email: string;
  avatar?: string;
}

export const NewChatModal: React.FC<{
  onClose: () => void;
  filteredUsers: User[];
  createDirectChat: (userId: string) => void;
  userSearchQuery: string;
  setUserSearchQuery: (query: string) => void;
  error: string | null;
  loadingUsers: boolean;
}> = ({
  onClose,
  filteredUsers,
  createDirectChat,
  userSearchQuery,
  setUserSearchQuery,
  error,
  loadingUsers,
}) => (
  <div
    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-lg shadow-xl w-full max-w-md"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">New Chat</h2>
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
            placeholder="Search users..."
            value={userSearchQuery}
            onChange={e => setUserSearchQuery(e.target.value)}
            className="w-full px-3 py-2 pl-9 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            autoFocus
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {loadingUsers && <p className="text-sm text-gray-500">Loading users...</p>}
          {!loadingUsers && filteredUsers.length === 0 && (
            <p className="text-sm text-gray-500">No users found</p>
          )}
          {!loadingUsers &&
            filteredUsers.map(user => (
              <button
                key={user.id}
                onClick={() => createDirectChat(user.id)}
                className="w-full flex items-center p-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Avatar size="md" name={user.name || 'Unknown'} src={user.avatar} />
                <div className="ml-3 text-left">
                  <p className="font-medium">{user.name || 'Unknown'}</p>
                  <p className="text-sm text-gray-500">{user.email || 'No email'}</p>
                </div>
              </button>
            ))}
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
    </div>
  </div>
);

export const NewGroupModal: React.FC<{
  onClose: () => void;
  filteredUsers: User[];
  selectedUsers: User[];
  setSelectedUsers: (users: User[]) => void;
  groupName: string;
  setGroupName: (name: string) => void;
  userSearchQuery: string;
  setUserSearchQuery: (query: string) => void;
  createGroupChat: () => void;
  error: string | null;
  loadingUsers: boolean;
}> = ({
  onClose,
  filteredUsers,
  selectedUsers,
  setSelectedUsers,
  groupName,
  setGroupName,
  userSearchQuery,
  setUserSearchQuery,
  createGroupChat,
  error,
  loadingUsers,
}) => (
  <div
    className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-lg shadow-xl w-full max-w-md"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Create Group</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Name
            </label>
            <input
              type="text"
              placeholder="Enter group name"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-600 bg-gray-50 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Add Members
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search users..."
                value={userSearchQuery}
                onChange={e => setUserSearchQuery(e.target.value)}
                className="w-full px-4 py-2 pl-9 border border-gray-600 bg-gray-50 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            </div>
            <div className="mt-2 max-h-40 overflow-y-auto">
              {loadingUsers && <p className="text-sm text-gray-500">Loading users...</p>}
              {!loadingUsers && filteredUsers.length === 0 && (
                <p className="text-sm text-gray-500">No users found</p>
              )}
              {!loadingUsers &&
                filteredUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() =>
                      setSelectedUsers(prev =>
                        prev.find(u => u.id === user.id)
                          ? prev.filter(u => u.id !== user.id)
                          : [...prev, user]
                      )
                    }
                    className="w-full flex items-center p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Avatar size="md" name={user.name || 'Unknown'} src={user.avatar} />
                    <div className="ml-3 text-left flex-1">
                      <p className="font-medium">{user.name || 'Unknown'}</p>
                      <p className="text-sm text-gray-500">{user.email || 'No email'}</p>
                    </div>
                    {selectedUsers.find(u => u.id === user.id) && (
                      <span className="text-blue-500">✓</span>
                    )}
                  </button>
                ))}
            </div>
          </div>
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Members</h3>
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map(user => (
                <div
                  key={user.id}
                  className="flex items-center bg-gray-100 rounded-full pl-2 pr-1 py-1"
                >
                  <span className="text-sm">{user.name || 'Unknown'}</span>
                  <button
                    onClick={() => setSelectedUsers(prev => prev.filter(u => u.id !== user.id))}
                    className="ml-1 p-1 hover:bg-gray-200 rounded-full"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={createGroupChat}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            disabled={!groupName.trim() || selectedUsers.length < 2}
          >
            Create Group
          </button>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      </div>
    </div>
  </div>
);