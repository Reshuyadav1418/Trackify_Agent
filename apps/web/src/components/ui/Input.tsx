import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-bold uppercase tracking-wider text-neu-muted pl-1"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-neu-muted">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          className={`input-custom w-full ${leftIcon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 text-sm ${
            error ? 'ring-2 ring-rose-500' : ''
          } ${className}`}
          {...props}
        />
      </div>
      {error && <span className="text-xs font-semibold text-rose-500 pl-1">{error}</span>}
    </div>
  );
};
