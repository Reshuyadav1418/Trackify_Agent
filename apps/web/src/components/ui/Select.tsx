import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  children,
  className = '',
  id,
  ...props
}) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-bold uppercase tracking-wider text-neu-muted pl-1"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center w-full">
        <select
          id={selectId}
          className={`input-custom appearance-none w-full pl-4 pr-10 py-2.5 text-sm cursor-pointer ${
            error ? 'ring-2 ring-rose-500' : ''
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-3.5 flex items-center pointer-events-none text-neu-muted">
          <ChevronDown size={16} />
        </div>
      </div>
      {error && <span className="text-xs font-semibold text-rose-500 pl-1">{error}</span>}
    </div>
  );
};
