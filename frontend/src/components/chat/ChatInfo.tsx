import React from 'react';
import { Bell, Lock, Trash, Users, ChevronLeft } from 'lucide-react';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';
import { socketManager } from '../../api/socket';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

interface Member {
  id: string;
  name: string;
  role?: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  avatar?: string;
}

interface ChatInfoProps {
  name: string;
  status?: 'online' | 'offline' | 'away' | 'busy';
  avatar?: string;
  members?: Member[];
  onClose: () => void;
  isMobile?: boolean;
  channelId?: string; // Added prop
}

const ChatInfo: React.FC<ChatInfoProps> = ({
  name,
  status,
  avatar,
  members,
  onClose,
  isMobile,
  channelId
}) => {
  const { user } = useAuth();

  const handleDeleteChat = () => {
    if (channelId && user) {
      socketManager.deleteChat(channelId);
      toast.success('Chat deleted successfully');
      onClose();
    }
  };

  return (
    <div className={`${isMobile ? 'fixed inset-0 z-30' : 'w-80'} h-full bg-white`}>
      <div className="flex items-center h-16 px-4 border-b border-gray-200">
        {isMobile ? (
          <Button 
            variant="ghost" 
            size="sm"
            className="mr-2 text-gray-600 hover:bg-gray-100 rounded-full w-10 h-10 p-0 flex items-center justify-center"
            onClick={onClose}
            aria-label="Go back"
          >
            <ChevronLeft size={24} />
          </Button>
        ) : null}
        <h3 className="text-lg font-semibold">
          {members ? 'Group Info' : 'Contact Info'}
        </h3>
      </div>
      
      <div className="overflow-y-auto h-[calc(100%-4rem)]">
        <div className="p-4">
          <div className="text-center">
            <Avatar 
              name={name}
              src={avatar}
              status={status}
              size="xl"
              className="mx-auto"
            />
            <h4 className="mt-4 font-semibold text-lg">{name}</h4>
            {members && (
              <div className="flex items-center justify-center text-sm text-gray-500 mt-1">
                <Users size={14} className="mr-1" />
                <span>{members.length} members</span>
              </div>
            )}
          </div>
          
          {members && (
            <div className="mt-6">
              <h5 className="font-medium mb-3">Members</h5>
              <div className="space-y-3">
                {members.map(member => (
                  <div key={member.id} className="flex items-center">
                    <Avatar 
                      name={member.name}
                      src={member.avatar}
                      status={member.status}
                      size="sm"
                    />
                    <div className="ml-3">
                      <p className="text-sm font-medium">{member.name}</p>
                      {member.role && (
                        <p className="text-xs text-gray-500">{member.role}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-6 space-y-4">
            <button className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 rounded-lg">
              <Bell className="w-5 h-5 text-gray-500 mr-3" />
              <div>
                <p className="font-medium">Mute notifications</p>
                <p className="text-sm text-gray-500">Turn off notifications for this chat</p>
              </div>
            </button>
            
            <button className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 rounded-lg">
              <Lock className="w-5 h-5 text-gray-500 mr-3" />
              <div>
                <p className="font-medium">Privacy and support</p>
                <p className="text-sm text-gray-500">Block, report, privacy settings</p>
              </div>
            </button>
            
            <button 
              onClick={handleDeleteChat}
              className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 rounded-lg"
            >
              <Trash className="w-5 h-5 text-red-500 mr-3" />
              <div>
                <p className="font-medium text-red-500">
                  {members ? 'Leave group' : 'Delete chat'}
                </p>
                <p className="text-sm text-gray-500">
                  {members ? 'Leave this group' : 'Delete chat history'}
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInfo;