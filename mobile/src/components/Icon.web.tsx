// @ts-nocheck — web-only implementation: raw SVG DOM, zero react-native-svg dependency.
import React from 'react';
import { ICONS, IconNode } from './icons';

export interface IconProps {
  name: keyof typeof ICONS & string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  spin?: boolean;
  style?: any;
}

let injected = false;
function ensureKeyframes() {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const s = document.createElement('style');
  s.textContent = '@keyframes sp-icon-spin{to{transform:rotate(360deg)}}';
  document.head.appendChild(s);
}

export const Icon: React.FC<IconProps> = ({ name, size = 24, color = '#000', strokeWidth = 2, spin = false, style }) => {
  if (spin) ensureKeyframes();
  const nodes: IconNode[] = (ICONS as any)[name] ?? [];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'inline-block', verticalAlign: 'middle', animation: spin ? 'sp-icon-spin 1s linear infinite' : undefined, ...(typeof style === 'object' ? style : undefined) }}
    >
      {nodes.map(([tag, attrs], i) => React.createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
};
