import React, { useState } from 'react';
import { Phone, Video, Search, Plus, ArrowUpRight, ArrowDownLeft, X, ChevronLeft } from 'lucide-react';

interface CallsViewProps {
  onBack?: () => void;
  isMobile?: boolean;
}

const CallsView: React.FC<CallsViewProps> = ({ onBack, isMobile }) => {
  const [showNewCallModal, setShowNewCallModal] = useState(false);
  
  const recentCalls = [
    {
      id: 1,
      name: 'Sarah Johnson',
      type: 'video',
      status: 'missed',
      timestamp: '2025-01-15T14:30:00Z',
      avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    {
      id: 2,
      name: 'Michael Chen',
      type: 'audio',
      status: 'outgoing',
      duration: '15:23',
      timestamp: '2025-01-15T13:00:00Z',
      avatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    {
      id: 3,
      name: 'Emma Wilson',
      type: 'audio',
      status: 'incoming',
      duration: '5:12',
      timestamp: '2025-01-15T11:30:00Z',
      avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150'
    }
  ];

  const NewCallModal = () => (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={() => setShowNewCallModal(false)}
    >
      <div 
        className="bg-white rounded-xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">New Call</h2>
          <button
            onClick={() => setShowNewCallModal(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4">
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search contacts..."
              className="w-full px-4 py-2 pl-10 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>
          
          <div className="space-y-2">
            {recentCalls.map(contact => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <img
                    src={contact.avatar}
                    alt={contact.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <span className="ml-3 font-medium">{contact.name}</span>
                </div>
                <div className="flex space-x-2">
                  <button className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors">
                    <Phone size={20} />
                  </button>
                  <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
                    <Video size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="border-b border-gray-200">
        <div className="p-4">
          <div className="flex items-center gap-4 mb-4">
            {isMobile && onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
            )}
            <div className="flex items-center justify-between flex-1">
              <h1 className="text-xl font-semibold">Calls</h1>
              <button
                onClick={() => setShowNewCallModal(true)}
                className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search calls..."
              className="w-full px-4 py-2 pl-10 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-gray-100">
          {recentCalls.map(call => (
            <div
              key={call.id}
              className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center flex-1 min-w-0">
                <img
                  src={call.avatar}
                  alt={call.name}
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                />
                <div className="ml-4 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium truncate">{call.name}</h3>
                    <span className="text-sm text-gray-500 ml-2">
                      {new Date(call.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    {call.status === 'outgoing' && (
                      <ArrowUpRight size={16} className="text-green-600 mr-1" />
                    )}
                    {call.status === 'incoming' && (
                      <ArrowDownLeft size={16} className="text-blue-600 mr-1" />
                    )}
                    {call.status === 'missed' && (
                      <ArrowDownLeft size={16} className="text-red-600 mr-1" />
                    )}
                    <span className={`
                      ${call.status === 'missed' ? 'text-red-600' : 'text-gray-500'}
                    `}>
                      {call.type === 'video' ? 'Video call' : 'Voice call'}
                      {call.duration && ` · ${call.duration}`}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="ml-4 flex items-center space-x-2">
                <button className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors">
                  <Phone size={20} />
                </button>
                <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
                  <Video size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showNewCallModal && <NewCallModal />}
    </div>
  );
};

export default CallsView;