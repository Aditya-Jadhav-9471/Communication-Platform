import React from 'react';
import { cn } from '../../utils/cn';

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  name,
  size = 'md',
  className,
}) => {
  const sizes = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
    xl: 'h-16 w-16 text-2xl', // Increased font size for initials
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="relative inline-block">
      {src ? (
        <img
          src={src}
          alt={alt || name || 'User avatar'}
          className={cn(
            'rounded-full object-cover bg-gray-700',
            sizes[size],
            className
          )}
        />
      ) : (
        <div
          className={cn(
            'rounded-full flex items-center justify-center bg-gray-200 text-gray-600 font-medium',
            sizes[size],
            className
          )}
        >
          {getInitials(name)}
        </div>
      )}
    </div>
  );
};

export default Avatar;