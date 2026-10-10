import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorAlertProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  message = 'An error occurred while fetching data.',
  onRetry,
}) => {
  return (
    <div className="neu-inset-sm p-4 rounded-xl flex items-center justify-between gap-4 text-rose-500 my-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full neu-inset-sm flex items-center justify-center flex-shrink-0 text-rose-500">
          <AlertTriangle size={18} />
        </div>
        <span className="text-sm font-semibold text-neu-primary">{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          type="button"
          className="btn-danger text-xs py-1.5 px-3 flex items-center gap-1.5 flex-shrink-0"
        >
          <RefreshCw size={13} /> Retry
        </button>
      )}
    </div>
  );
};
