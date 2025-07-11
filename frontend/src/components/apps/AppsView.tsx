import React, { useState } from 'react';
import { X, Search, ChevronRight } from 'lucide-react';

interface AppsViewProps {
  onClose: () => void;
}

const AppsView: React.FC<AppsViewProps> = ({ onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const apps = [
    {
      id: 'calendar',
      name: 'Calendar',
      icon: '📅',
      description: 'Schedule meetings and events'
    },
    {
      id: 'tasks',
      name: 'Tasks',
      icon: '✓',
      description: 'Track and manage tasks'
    },
    {
      id: 'notes',
      name: 'Notes',
      icon: '📝',
      description: 'Take and share notes'
    },
    {
      id: 'drive',
      name: 'Drive',
      icon: '📁',
      description: 'Store and share files'
    },
    {
      id: 'forms',
      name: 'Forms',
      icon: '📋',
      description: 'Create surveys and forms'
    },
    {
      id: 'whiteboard',
      name: 'Whiteboard',
      icon: '🎨',
      description: 'Collaborate on a digital canvas'
    }
  ];

  const filteredApps = apps.filter(app =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col bg-white rounded-lg shadow-lg overflow-hidden w-[320px]">
      <div className="p-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-base font-semibold">Apps</h2>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-2">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search apps..."
            className="w-full px-3 py-1.5 pl-8 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <Search className="absolute left-2.5 top-2 text-gray-400" size={14} />
        </div>
      </div>

      <div className="overflow-y-auto max-h-[400px]">
        <div className="p-1">
          {filteredApps.map(app => (
            <button
              key={app.id}
              className="w-full flex items-center px-3 py-2 rounded-md hover:bg-gray-50 transition-colors group"
            >
              <span className="text-xl mr-3 group-hover:scale-110 transition-transform">
                {app.icon}
              </span>
              <div className="flex-1 text-left">
                <h3 className="text-sm font-medium">{app.name}</h3>
                <p className="text-xs text-gray-500 truncate">{app.description}</p>
              </div>
              <ChevronRight size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>

      <div className="p-2 border-t border-gray-200">
        <button className="w-full text-left text-sm text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-50 transition-colors">
          View all apps
        </button>
      </div>
    </div>
  );
};

export default AppsView;