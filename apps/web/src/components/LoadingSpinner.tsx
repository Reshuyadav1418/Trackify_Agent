import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  label?: string;
  fullPage?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message, label, fullPage = false }) => {
  const displayText = label || message || 'Loading...';
  const content = (
    <div className="flex flex-col items-center justify-center p-8 gap-4">
      <div className="w-16 h-16 rounded-full neu-raised flex items-center justify-center text-neu-accent">
        <Loader2 size={32} className="animate-spin" />
      </div>
      <p className="text-neu-muted text-sm font-semibold m-0">{displayText}</p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen bg-neu-bg flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};
