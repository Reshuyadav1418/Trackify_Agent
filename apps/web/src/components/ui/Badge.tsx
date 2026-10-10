import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'neutral';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'indigo',
  className = '',
  children,
  ...props
}) => {
  let badgeClass = 'badge-indigo';
  if (variant === 'emerald') badgeClass = 'badge-emerald';
  else if (variant === 'amber') badgeClass = 'badge-amber';
  else if (variant === 'rose') badgeClass = 'badge-rose';
  else if (variant === 'neutral') badgeClass = 'neu-inset-sm text-neu-muted px-3 py-1 text-xs font-semibold';

  return (
    <span className={`${badgeClass} ${className}`} {...props}>
      {children}
    </span>
  );
};
