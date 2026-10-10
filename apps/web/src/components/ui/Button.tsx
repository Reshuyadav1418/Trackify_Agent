import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'inset' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  className = '',
  disabled,
  children,
  ...props
}) => {
  let variantClass = 'btn-secondary';
  if (variant === 'primary') variantClass = 'btn-primary';
  else if (variant === 'danger') variantClass = 'btn-danger';
  else if (variant === 'inset') variantClass = 'neu-inset text-neu-primary';
  else if (variant === 'icon') variantClass = 'btn-icon-circle';

  let sizeClass = 'text-sm py-2 px-4';
  if (variant === 'icon') {
    sizeClass = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10';
  } else if (size === 'sm') {
    sizeClass = 'text-xs py-1.5 px-3';
  } else if (size === 'lg') {
    sizeClass = 'text-base py-3 px-6';
  }

  return (
    <button
      className={`${variantClass} ${sizeClass} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
