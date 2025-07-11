import React, { useState, useCallback } from 'react';
import { MessageSquare, Phone, FileText, Video, Grid, Settings, LogOut } from 'lucide-react';
import { cn } from '../../utils/cn';
import Avatar from '../ui/Avatar';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface IconSidebarProps {
  activeSection: 'chats' | 'calls' | 'files' | 'meet' | 'apps';
  onSectionChange: (section: IconSidebarProps['activeSection']) => void;
  totalUnreadCount: number; // Added prop for total unread count
}

const IconSidebar: React.FC<IconSidebarProps> = ({ activeSection, onSectionChange, totalUnreadCount }) => {
  // Current authenticated user
  const { user, logout } = useAuth();
  // Navigation hook
  const navigate = useNavigate();
  // State for settings popup visibility
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [logout, navigate]);

  return (
    <div className="w-16 md:w-20 h-full bg-gradient-to-b from-[#2c2c2c] to-[#1a1a1a] flex flex-col items-center py-4 shadow-lg">
      {/* User avatar */}
      <div className="relative">
        <Avatar
          name={user?.name}
          src={user?.avatar}
          size="md"
          className="mb-6 ring-2 ring-primary-500 ring-offset-2 ring-offset-[#1a1a1a]"
        />
      </div>

      {/* Section buttons */}
      <div className="flex-1 space-y-2 md:space-y-4">
        {[
          { section: 'chats', icon: MessageSquare, badge: totalUnreadCount > 0 ? totalUnreadCount : undefined },
          { section: 'calls', icon: Phone },
          { section: 'files', icon: FileText },
          { section: 'meet', icon: Video },
          { section: 'apps', icon: Grid },
        ].map(({ section, icon: Icon, badge }) => (
          <button
            key={section}
            onClick={() => onSectionChange(section as IconSidebarProps['activeSection'])}
            className={cn(
              'w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl transition-all duration-200 ease-in-out relative',
              activeSection === section
                ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg scale-105'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            )}
            aria-label={section}
          >
            <Icon size={22} />
            {badge && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs font-medium flex items-center justify-center rounded-full">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bottom buttons (settings and logout) */}
      <div className="space-y-2 md:space-y-4">
        <button
          onClick={() => setShowSettingsPopup(true)}
          className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200 ease-in-out"
          aria-label="Settings"
        >
          <Settings size={22} />
        </button>

        <button
          onClick={handleLogout}
          className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200 ease-in-out"
          aria-label="Logout"
        >
          <LogOut size={22} />
        </button>
      </div>

      {/* Settings popup */}
      {showSettingsPopup && (
        <SettingsPopup
          user={user}
          onClose={() => setShowSettingsPopup(false)}
          onLogout={handleLogout}
          navigate={navigate}
        />
      )}
    </div>
  );
};

interface SettingsPopupProps {
  user: any;
  onClose: () => void;
  onLogout: () => void;
  navigate: (path: string) => void;
}

const SettingsPopup: React.FC<SettingsPopupProps> = ({ user, onClose, onLogout, navigate }) => {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Settings</h2>

          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Avatar
                name={user?.name}
                src={user?.avatar}
                size="lg"
                className="ring-2 ring-primary-500 ring-offset-2"
              />
              <div>
                <h3 className="font-medium">{user?.name ?? 'Unknown User'}</h3>
                <p className="text-sm text-gray-500">{user?.email ?? 'No email provided'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  onClose();
                  navigate('/profile');
                }}
                className="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                View Profile
              </button>

              <button className="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                Preferences
              </button>

              <button className="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                Notifications
              </button>

              <button className="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                Privacy & Security
              </button>

              <div className="h-px bg-gray-200 my-2" />

              <button
                onClick={onLogout}
                className="w-full text-left px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IconSidebar;