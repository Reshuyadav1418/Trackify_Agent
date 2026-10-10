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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="neu-modal-card max-w-xl w-full p-8 relative">
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl neu-inset flex items-center justify-center text-neu-accent">
            <ShieldAlert size={26} />
          </div>
          <div>
            <span className="text-xs font-bold text-neu-accent uppercase tracking-wider">
              Policy Update Required (v{activePolicy.version})
            </span>
            <h2 className="text-xl font-extrabold text-neu-primary m-0">
              Employee Tracking Policy
            </h2>
          </div>
        </div>

        <div className="neu-inset p-5 max-h-56 overflow-y-auto text-sm leading-relaxed mb-6 text-neu-secondary rounded-xl">
          <p className="m-0 whitespace-pre-line font-medium">{activePolicy.consentText}</p>
          <div className="mt-4 pt-3 border-t border-white/10 dark:border-white/5 text-xs text-neu-muted">
            <strong className="text-neu-primary">Policy Details:</strong>
            <ul className="mt-1.5 ml-4 p-0 space-y-1 list-disc">
              <li>Screenshot Interval: {activePolicy.screenshotIntervalMinutes} minutes</li>
              <li>Blur Screenshots: {activePolicy.isBlurEnabled ? 'Enabled' : 'Disabled'}</li>
              <li>Retention Period: {activePolicy.retentionDays} days</li>
            </ul>
          </div>
        </div>

        {error && (
          <div className="neu-inset-sm p-3 rounded-lg text-xs font-bold text-rose-500 mb-4">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <span className="text-xs font-medium text-neu-muted flex items-center gap-1.5">
            <Lock size={14} /> You must accept this policy to continue using Trackify.
          </span>

          <button
            onClick={handleAccept}
            disabled={isSubmitting}
            className="btn-primary text-sm py-2.5 px-6 font-bold flex items-center gap-2"
          >
            <CheckCircle size={18} /> {isSubmitting ? 'Accepting...' : 'I Accept Policy'}
          </button>
        </div>
      </div>
    </div>
  );
};
