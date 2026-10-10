import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass =
    maxWidth === 'sm'
      ? 'max-w-sm'
      : maxWidth === 'lg'
      ? 'max-w-2xl'
      : maxWidth === 'xl'
      ? 'max-w-4xl'
      : 'max-w-md';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`neu-modal-card w-full ${maxWidthClass} p-6 relative`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10 dark:border-white/5">
          {title && <h3 className="text-lg font-bold text-neu-primary">{title}</h3>}
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="btn-icon-circle w-8 h-8 text-neu-muted hover:text-neu-primary ml-auto"
          >
            <X size={16} />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};
