import React from 'react';
import { getUserInitials } from '../lib/constants';

interface AvatarProps {
  src?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  firstName,
  lastName,
  email,
  size = 'md',
  className = '',
}) => {
  const sizeClasses: Record<string, string> = {
    xs: 'w-5 h-5 text-[9px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
    xl: 'w-16 h-16 text-xl font-bold',
  };

  const initials = getUserInitials(firstName, lastName, email);
  const cls = sizeClasses[size] ?? sizeClasses.md;

  if (src) {
    return (
      <img
        src={src}
        alt={`${firstName || ''} ${lastName || ''}`.trim()}
        referrerPolicy="no-referrer"
        className={`rounded-full object-cover ring-2 ring-[#E8531A]/25 ${cls} ${className}`}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold select-none
        bg-[#E8531A] text-white
        ring-1 ring-[#E8531A]/30 shadow-sm
        ${cls} ${className}`}
      title={`${firstName || ''} ${lastName || email || ''}`.trim()}
    >
      {initials}
    </div>
  );
};
