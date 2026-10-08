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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3.5rem 1.5rem',
        backgroundColor: 'var(--bg-card-subtle)',
        border: '1px dashed var(--border-color)',
        borderRadius: '16px',
        textAlign: 'center',
        margin: '1rem 0',
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'var(--accent-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem',
        }}
      >
        <Inbox size={28} style={{ color: 'var(--accent-primary)' }} />
      </div>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.4rem 0' }}>{title}</h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0, maxWidth: '400px' }}>{displayText}</p>
      {action && <div style={{ marginTop: '1.25rem' }}>{action}</div>}
    </div>
  );
};

