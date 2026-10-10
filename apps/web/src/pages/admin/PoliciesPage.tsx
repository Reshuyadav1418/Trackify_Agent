import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getActivePolicyApi, getAllPoliciesApi, createPolicyApi } from '../../api/services';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorAlert } from '../../components/ErrorAlert';
import { EmptyState } from '../../components/EmptyState';
import { ShieldCheck, Plus, History, X, Clock, EyeOff, Calendar, FileText } from 'lucide-react';

export const PoliciesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [intervalMinutes, setIntervalMinutes] = useState(10);
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState(5);
  const [isBlurEnabled, setIsBlurEnabled] = useState(false);
  const [retentionDays, setRetentionDays] = useState(90);
  const [consentText, setConsentText] = useState(
    'By logging in, you agree that your working time, active application windows, and periodic screenshot captures will be monitored for accountability purposes.'
  );

  const { data: activePolicyData, isLoading: activeLoading, error: activeError } = useQuery({
    queryKey: ['activePolicy'],
    queryFn: getActivePolicyApi,
  });

  const { data: allPoliciesData, isLoading: allLoading, error: allError } = useQuery({
    queryKey: ['allPolicies'],
    queryFn: getAllPoliciesApi,
  });

  const createPolicyMutation = useMutation({
    mutationFn: createPolicyApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activePolicy'] });
      queryClient.invalidateQueries({ queryKey: ['allPolicies'] });
      setShowCreateModal(false);
    },
  });

  const activePolicy = activePolicyData?.policy;
  const policies = allPoliciesData?.policies || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextVersion = activePolicy ? activePolicy.version + 1 : 1;
    createPolicyMutation.mutate({
      version: nextVersion,
      screenshotIntervalMinutes: intervalMinutes,
      idleTimeoutMinutes,
      isBlurEnabled,
      retentionDays,
      consentText,
      isActive: true,
    });
  };

  const isLoading = activeLoading || allLoading;
  const error = activeError || allError;

  if (isLoading) return <LoadingSpinner label="Loading policy settings..." />;
  if (error) return <ErrorAlert message={(error as Error).message} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Policy Settings & Compliance</h1>
          <p className="page-subtitle">Configure screenshot capture intervals, privacy blurring, retention, and consent terms.</p>
        </div>

        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <Plus size={18} /> Publish New Policy Version
        </button>
      </div>

      {/* Active Policy Card */}
      <div className="card-panel relative">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl neu-inset flex items-center justify-center text-neu-accent">
              <ShieldCheck size={26} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-extrabold text-neu-primary m-0">
                  Active Policy (v{activePolicy?.version || 1})
                </h2>
                <span className="badge-emerald">ENFORCED SYSTEMWIDE</span>
              </div>
              <p className="text-xs text-neu-muted m-0 mt-1 font-medium">
                Published: {activePolicy?.createdAt ? new Date(activePolicy.createdAt).toLocaleDateString() : 'Active'}
              </p>
            </div>
          </div>
        </div>

        {activePolicy ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="neu-inset p-4 rounded-xl">
                <div className="flex items-center gap-2 text-neu-muted text-xs font-bold uppercase tracking-wider mb-1">
                  <Clock size={14} className="text-neu-accent" />
                  <span>Screenshot Interval</span>
                </div>
                <p className="text-2xl font-black text-neu-primary m-0 tabular-nums">
                  {activePolicy.screenshotIntervalMinutes} <span className="text-xs font-semibold text-neu-muted">mins</span>
                </p>
              </div>

              <div className="neu-inset p-4 rounded-xl">
                <div className="flex items-center gap-2 text-neu-muted text-xs font-bold uppercase tracking-wider mb-1">
                  <EyeOff size={14} className="text-neu-accent" />
                  <span>Privacy Blur</span>
                </div>
                <p className="text-2xl font-black text-neu-primary m-0">
                  {activePolicy.isBlurEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>

              <div className="neu-inset p-4 rounded-xl">
                <div className="flex items-center gap-2 text-neu-muted text-xs font-bold uppercase tracking-wider mb-1">
                  <Calendar size={14} className="text-neu-accent" />
                  <span>Retention Period</span>
                </div>
                <p className="text-2xl font-black text-neu-primary m-0 tabular-nums">
                  {activePolicy.retentionDays} <span className="text-xs font-semibold text-neu-muted">days</span>
                </p>
              </div>
            </div>

            <div className="neu-inset p-4 rounded-xl">
              <div className="flex items-center gap-2 text-neu-primary text-xs font-bold mb-2">
                <FileText size={14} className="text-neu-accent" />
                <span>Consent Agreement Text</span>
              </div>
              <p className="text-xs font-medium text-neu-secondary leading-relaxed m-0">
                {activePolicy.consentText}
              </p>
            </div>
          </div>
        ) : (
          <EmptyState title="No Active Policy" description="Publish a policy version to enforce tracking rules." />
        )}
      </div>

      {/* Policy Version History Table */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <History size={18} className="text-neu-accent" />
          <h3 className="text-base font-extrabold text-neu-primary m-0">Policy Version History</h3>
        </div>

        {policies.length === 0 ? (
          <EmptyState title="No Policy History" description="No previous policies found." />
        ) : (
          <div className="table-custom-wrapper">
            <div className="overflow-x-auto">
              <table className="table-custom">
                <thead>
                  <tr>
                    <th>VERSION</th>
                    <th>INTERVAL</th>
                    <th>BLUR STATUS</th>
                    <th>RETENTION</th>
                    <th>EFFECTIVE DATE</th>
                    <th className="text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {policies.map((p: any) => (
                    <tr key={p._id}>
                      <td className="font-extrabold text-neu-primary">v{p.version}</td>
                      <td className="tabular-nums font-semibold text-neu-secondary">{p.screenshotIntervalMinutes} mins</td>
                      <td className="font-semibold text-neu-secondary">{p.isBlurEnabled ? 'Blurred' : 'Unblurred'}</td>
                      <td className="tabular-nums font-semibold text-neu-secondary">{p.retentionDays} days</td>
                      <td className="text-neu-muted font-medium">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="text-center">
                        {p.isActive ? (
                          <span className="badge-emerald">Active</span>
                        ) : (
                          <span className="badge-amber">Archived</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Policy Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="neu-modal-card max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 dark:border-white/5 pb-3">
              <h3 className="text-base font-extrabold text-neu-primary m-0">Publish New Policy Version</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-icon-circle w-8 h-8 text-neu-muted hover:text-neu-primary"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-neu-muted mb-1.5 font-bold uppercase tracking-wider text-[11px]">Interval (Mins)</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    required
                    value={intervalMinutes}
                    onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                    className="input-custom w-full"
                  />
                </div>
                <div>
                  <label className="block text-neu-muted mb-1.5 font-bold uppercase tracking-wider text-[11px]">Idle Limit (Mins)</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    required
                    value={idleTimeoutMinutes}
                    onChange={(e) => setIdleTimeoutMinutes(Number(e.target.value))}
                    className="input-custom w-full"
                  />
                </div>
                <div>
                  <label className="block text-neu-muted mb-1.5 font-bold uppercase tracking-wider text-[11px]">Retention (Days)</label>
                  <input
                    type="number"
                    min={7}
                    max={365}
                    required
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(Number(e.target.value))}
                    className="input-custom w-full"
                  />
                </div>
              </div>

              <div className="neu-inset-sm p-3 rounded-xl flex items-center gap-3">
                <input
                  type="checkbox"
                  id="blurCheck"
                  checked={isBlurEnabled}
                  onChange={(e) => setIsBlurEnabled(e.target.checked)}
                  className="w-4 h-4 cursor-pointer accent-[#5B6CFF]"
                />
                <label htmlFor="blurCheck" className="text-neu-primary font-bold cursor-pointer text-xs">
                  Enable privacy blur effect on screenshot uploads
                </label>
              </div>

              <div>
                <label className="block text-neu-muted mb-1.5 font-bold uppercase tracking-wider text-[11px]">Policy Consent Text (Shown on login)</label>
                <textarea
                  rows={4}
                  required
                  value={consentText}
                  onChange={(e) => setConsentText(e.target.value)}
                  className="input-custom w-full resize-none leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10 dark:border-white/5">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={createPolicyMutation.isPending} className="btn-primary">
                  {createPolicyMutation.isPending ? 'Publishing...' : 'Publish Version'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PoliciesPage;
