import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  message?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No records found',
  description,
  message,
  action,
}) => {
  const displayText = description || message || 'There is currently no data to display.';

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 neu-inset rounded-2xl text-center my-4">
      <div className="w-16 h-16 rounded-full neu-raised flex items-center justify-center mb-4 text-neu-accent">
        <Inbox size={28} />
      </div>
      <h3 className="text-base font-bold text-neu-primary mb-1.5">{title}</h3>
      <p className="text-sm font-medium text-neu-muted max-w-md">{displayText}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};
