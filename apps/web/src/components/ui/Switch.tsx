import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}) => {
  return (
    <label className={`inline-flex items-center gap-3 select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`neu-switch-track ${checked ? 'active' : ''}`}
      >
        <div className="neu-switch-thumb" />
      </button>
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-sm font-bold text-neu-primary">{label}</span>}
          {description && <span className="text-xs text-neu-muted">{description}</span>}
        </div>
      )}
    </label>
  );
};
