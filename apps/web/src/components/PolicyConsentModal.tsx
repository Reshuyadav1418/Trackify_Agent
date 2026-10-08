import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, CheckCircle, Lock } from 'lucide-react';

export const PolicyConsentModal: React.FC = () => {
  const { user, activePolicy, hasAcceptedPolicy, acceptPolicyConsent } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || !activePolicy || hasAcceptedPolicy) return null;


  const handleAccept = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await acceptPolicyConsent();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to accept policy consent');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(2, 6, 23, 0.92)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          backgroundColor: '#1e293b',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: '20px',
          maxWidth: '560px',
          width: '100%',
          padding: '2.25rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldAlert size={24} style={{ color: '#818cf8' }} />
          </div>
          <div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#6366f1',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Policy Update Required (v{activePolicy.version})
            </span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              Employee Tracking Policy
            </h2>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '1.25rem',
            maxHeight: '220px',
            overflowY: 'auto',
            color: '#cbd5e1',
            fontSize: '0.9rem',
            lineHeight: 1.6,
            marginBottom: '1.5rem',
          }}
        >
          <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{activePolicy.consentText}</p>
          <div
            style={{
              marginTop: '1rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid #1e293b',
              fontSize: '0.8rem',
              color: '#94a3b8',
            }}
          >
            <strong>Policy Details:</strong>
            <ul style={{ margin: '0.4rem 0 0 1.2rem', padding: 0 }}>
              <li>Screenshot Interval: {activePolicy.screenshotIntervalMinutes} minutes</li>
              <li>Blur Screenshots: {activePolicy.isBlurEnabled ? 'Enabled' : 'Disabled'}</li>
              <li>Retention Period: {activePolicy.retentionDays} days</li>
            </ul>
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#fca5a5', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Lock size={14} /> You must accept this policy to continue using Trackify.
          </span>

          <button
            onClick={handleAccept}
            disabled={isSubmitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#6366f1',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '0.75rem 1.5rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
            }}
          >
            <CheckCircle size={18} /> {isSubmitting ? 'Accepting...' : 'I Accept Policy'}
          </button>
        </div>
      </div>
    </div>
  );
};
