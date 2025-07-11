import React, { useState, useEffect } from 'react';
import { Camera, Mail, Phone, MapPin, Briefcase, Calendar, Save, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import Compressor from 'compressorjs';

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

const ProfilePage = () => {
  const { user, profile: authProfile, setProfile, setUser, isAuthenticated, isLoading: authLoading } = useAuth(); // Added setUser
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setLocalProfile] = useState<ProfileData>({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    location: '',
    occupation: '',
    joinDate: '',
    bio: '',
    socialLinks: {
      twitter: '',
      github: '',
      linkedin: ''
    },
    avatar: { public_id: '', url: '' }
  });

  useEffect(() => {
    if (isAuthenticated && authProfile) {
      setLocalProfile(authProfile);
    }
  }, [isAuthenticated, authProfile]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setIsUploading(true);
    const file = event.target.files?.[0];
    if (!file) { // Fixed logic
      setError('No file selected');
      setIsUploading(false);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit');
      setIsUploading(false);
      return;
    }

    try {
      const compressedFile = await new Promise<File>((resolve, reject) => {
        new Compressor(file, {
          quality: 0.6,
          maxWidth: 400,
          maxHeight: 400,
          mimeType: file.type,
          success(result: Blob) {
            const newFile = new File([result], file.name, { type: file.type });
            resolve(newFile);
          },
          error: reject,
        });
      });
      console.log('Compressed file:', { name: compressedFile.name, type: compressedFile.type, sizeInMB: compressedFile.size / 1024 / 1024 });
      const formData = new FormData();
      formData.append('avatar', compressedFile, file.name);
      const startTime = Date.now();
      const { data } = await api.post<{ avatar: AvatarData }>('/users/avatar', formData);
      console.log('Upload time:', (Date.now() - startTime) / 1000, 'seconds');
      const updatedProfile = {
        ...profile,
        avatar: { public_id: data.avatar.public_id, url: data.avatar.url }
      };
      setLocalProfile(updatedProfile);
      setProfile(updatedProfile);
      localStorage.setItem('profile', JSON.stringify(updatedProfile));
      // Update user.avatar
      if (user) {
        const updatedUser = { ...user, avatar: data.avatar.url };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      setError(error.response?.data?.error || 'Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      await api.post('/users/profile', profile);
      setProfile(profile);
      localStorage.setItem('profile', JSON.stringify(profile));
      // Update user.name and user.email
      if (user) {
        const updatedUser = { ...user, name: profile.name, email: profile.email, avatar: profile.avatar?.url };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to save profile changes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLocalProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSocialLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalProfile(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [name]: value
      }
    }));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center">
          <Link to="/" className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="relative h-48 bg-gradient-to-r from-primary-500 to-primary-600">
            <div className="absolute -bottom-16 left-8">
              <div className="relative">
                <Avatar
                  name={profile.name}
                  size="xl"
                  className="ring-4 ring-white w-32 h-32"
                  src={profile.avatar?.url ? `${profile.avatar.url}?v=${Date.now()}` : undefined}
                  key={profile.avatar?.url || profile.name}
                />
                <label className="absolute bottom-0 right-0 p-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors cursor-pointer">
                  {isUploading ? (
                    <div className="animate-spin h-5 w-5 border-t-2 border-white rounded-full"></div>
                  ) : (
                    <Camera size={18} />
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                </label>
                {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
              </div>
            </div>
          </div>

          <div className="pt-20 pb-8 px-8">
            <div className="flex justify-between items-start mb-8">
              <div>
                {isEditing ? (
                  <input
                    type="text"
                    name="name"
                    value={profile.name}
                    onChange={handleChange}
                    className="text-2xl font-bold text-gray-900 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
                )}
                {!isEditing && <p className="text-gray-600 mt-1">{profile.occupation || 'No occupation specified'}</p>}
              </div>
              <Button
                variant={isEditing ? 'primary' : 'outline'}
                onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
                leftIcon={isEditing ? <Save size={18} /> : null}
                disabled={isLoading}
              >
                {isEditing ? (isLoading ? 'Saving...' : 'Save Changes') : 'Edit Profile'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      {isEditing ? (
                        <input
                          type="email"
                          name="email"
                          value={profile.email}
                          onChange={handleChange}
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      ) : (
                        <span className="text-gray-600">{profile.email || 'Not specified'}</span>
                      )}
                    </div>

                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      {isEditing ? (
                        <input
                          type="tel"
                          name="phone"
                          value={profile.phone}
                          onChange={handleChange}
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      ) : (
                        <span className="text-gray-600">{profile.phone || 'Not specified'}</span>
                      )}
                    </div>

                    <div className="flex items-center space-x-3">
                      <MapPin className="h-5 w-5 text-gray-400" />
                      {isEditing ? (
                        <input
                          type="text"
                          name="location"
                          value={profile.location}
                          onChange={handleChange}
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      ) : (
                        <span className="text-gray-600">{profile.location || 'Not specified'}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Links</h3>
                  <div className="space-y-4">
                    {Object.entries(profile.socialLinks).map(([platform, username]) => (
                      <div key={platform} className="flex items-center space-x-3">
                        <span className="w-20 text-sm text-gray-500 capitalize">{platform}</span>
                        {isEditing ? (
                          <input
                            type="text"
                            name={platform}
                            value={username}
                            onChange={handleSocialLinkChange}
                            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        ) : username ? (
                          <a
                            href={`https://${platform}.com/${username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700"
                          >
                            @{username}
                          </a>
                        ) : (
                          <span className="text-gray-400">Not specified</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Professional Information</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Briefcase className="h-5 w-5 text-gray-400" />
                      {isEditing ? (
                        <input
                          type="text"
                          name="occupation"
                          value={profile.occupation}
                          onChange={handleChange}
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      ) : (
                        <span className="text-gray-600">{profile.occupation || 'Not specified'}</span>
                      )}
                    </div>

                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-600">Joined {profile.joinDate || 'Unknown'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Bio</h3>
                  {isEditing ? (
                    <textarea
                      name="bio"
                      value={profile.bio}
                      onChange={handleChange}
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Tell us about yourself..."
                    />
                  ) : (
                    <p className="text-gray-600 leading-relaxed">
                      {profile.bio || 'No bio provided'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;