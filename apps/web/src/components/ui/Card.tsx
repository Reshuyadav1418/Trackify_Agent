import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'raised' | 'inset' | 'flat';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'raised',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const variantClass =
    variant === 'raised'
      ? size === 'sm' ? 'neu-raised-sm' : size === 'lg' ? 'neu-raised-lg' : 'neu-raised'
      : variant === 'inset'
      ? size === 'sm' ? 'neu-inset-sm' : 'neu-inset'
      : 'neu-flat';

  const paddingClass = size === 'sm' ? 'p-4' : size === 'lg' ? 'p-8' : 'p-6';

  return (
    <div
      className={`${variantClass} ${paddingClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
