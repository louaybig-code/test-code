import React from 'react';
import { Icon } from '../Icon';
import { IconProps } from '../Icon';

/** Spinning loader (web: Loader2 with animate-spin). */
export const Spinner: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#fff' }) => (
  <Icon name="Loader2" size={size} color={color} spin />
);
