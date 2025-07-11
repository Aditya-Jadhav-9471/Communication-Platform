import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';
import { isTokenValid } from '../utils/auth';
import { socketManager } from '../api/socket';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface SocialLinks {
  twitter: string;
  github: string;
  linkedin: string;
}

interface AvatarData {
  public_id?: string;
  url?: string;
}

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  location: string;
  occupation: string;
  joinDate: string;
  bio: string;
  socialLinks: SocialLinks;
  avatar?: AvatarData;
}

interface AuthContextType {
  user: User | null;
  profile: ProfileData | null;
  setProfile: React.Dispatch<React.SetStateAction<ProfileData | null>>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/users/profile');
      setProfile(response.data);
      setUser(prev => {
        if (!prev) return prev;
        const updatedUser = { ...prev, avatar: response.data.avatar?.url };
        localStorage.setItem('user', JSON.stringify(updatedUser)); // Update localStorage
        return updatedUser;
      });
      localStorage.setItem('profile', JSON.stringify(response.data));
    } catch (error) {
      console.error('Error fetching profile:', error);
      if (user) {
        const fallbackProfile: ProfileData = {
          name: user.name,
          email: user.email,
          phone: '',
          location: '',
          occupation: '',
          joinDate: '',
          bio: '',
          socialLinks: { twitter: '', github: '', linkedin: '' },
          avatar: user.avatar ? { public_id: '', url: user.avatar } : { public_id: '', url: '' }
        };
        setProfile(fallbackProfile);
        localStorage.setItem('profile', JSON.stringify(fallbackProfile));
      }
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        const storedProfile = localStorage.getItem('profile');
        const token = localStorage.getItem('accessToken');

        if (token && isTokenValid(token)) {
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
          if (storedProfile) {
            setProfile(JSON.parse(storedProfile));
          }
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          if (!storedProfile) {
            await fetchProfile();
          }
        } else {
          await logout();
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        await logout();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Added: Listen for user name updates to update profile in real-time
  useEffect(() => {
    const socket = socketManager.getSocket();
    if (!socket) return;

    const handleUserNameUpdated = ({ userId, newName }: { userId: string; newName: string }) => {
      if (user?.id === userId) {
        setUser(prev => prev ? { ...prev, name: newName } : prev);
        setProfile(prev => prev ? { ...prev, name: newName } : prev);
        localStorage.setItem('user', JSON.stringify({ ...user, name: newName }));
        localStorage.setItem('profile', JSON.stringify({ ...profile, name: newName }));
      }
    };

    socket.on('userNameUpdated', handleUserNameUpdated);

    return () => {
      socket.off('userNameUpdated', handleUserNameUpdated);
    };
  }, [user, profile]);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/login', { email, password });
      const { user, accessToken } = response.data;

      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('accessToken', accessToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      await fetchProfile();
    } catch (error: any) {
      console.error('Login error:', error.response?.data?.error || error.message);
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await api.post('/register', { name, email, password });
      const { user, accessToken } = response.data;

      if (user && accessToken) {
        setUser(user);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('accessToken', accessToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        await fetchProfile();
      } else {
        await login(email, password);
      }
    } catch (error: any) {
      console.error('Registration error:', error.response?.data?.error || error.message);
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      socketManager.disconnectSocket();
      setUser(null);
      setProfile(null);
      localStorage.removeItem('user');
      localStorage.removeItem('profile');
      localStorage.removeItem('accessToken');
      delete api.defaults.headers.common['Authorization'];
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    setProfile,
    setUser,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}