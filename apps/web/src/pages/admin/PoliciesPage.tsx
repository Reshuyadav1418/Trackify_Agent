import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getActivePolicyApi, getAllPoliciesApi, createPolicyApi } from '../../api/services';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorAlert } from '../../components/ErrorAlert';
import { EmptyState } from '../../components/EmptyState';
import { ShieldCheck, Plus, History, X } from 'lucide-react';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Policy Settings & Compliance</h1>
          <p className="page-subtitle">Configure screenshot capture intervals, privacy blurring, retention, and consent terms.</p>
        </div>

        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <Plus size={18} /> Publish New Policy Version
        </button>
      </div>

      {/* Active Policy Card */}
      <div className="card-panel" style={{ background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-card-subtle) 100%)', border: '1px solid var(--accent-primary)', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ padding: '0.6rem', backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)', borderRadius: '0.75rem' }}>
            <ShieldCheck size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Active Policy (v{activePolicy?.version || 1})
              </h2>
              <span className="badge-emerald">ENFORCED SYSTEMWIDE</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
              Published: {activePolicy?.createdAt ? new Date(activePolicy.createdAt).toLocaleDateString() : 'Active'}
            </p>
          </div>
        </div>

        {activePolicy ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ backgroundColor: 'var(--bg-card-subtle)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Screenshot Interval</p>
              <p style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.25rem 0 0 0' }}>
                {activePolicy.screenshotIntervalMinutes} mins
              </p>
            </div>

            <div style={{ backgroundColor: 'var(--bg-card-subtle)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Privacy Image Blur</p>
              <p style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.25rem 0 0 0' }}>
                {activePolicy.isBlurEnabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>

            <div style={{ backgroundColor: 'var(--bg-card-subtle)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Data Retention Period</p>
              <p style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.25rem 0 0 0' }}>
                {activePolicy.retentionDays} days
              </p>
            </div>

            <div style={{ gridColumn: '1 / -1', backgroundColor: 'var(--bg-card-subtle)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1rem', marginTop: '0.5rem' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                Consent Agreement Text
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                {activePolicy.consentText}
              </p>
            </div>
          </div>
        ) : (
          <EmptyState title="No Active Policy" description="Publish a policy version to enforce tracking rules." />
        )}
      </div>

      {/* Policy Version History Table */}
      <div className="card-panel">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
          <History size={20} style={{ color: 'var(--accent-primary)' }} /> Policy Version History
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Historical policy definitions and version audit trail.
        </p>

        {policies.length === 0 ? (
          <EmptyState title="No Policy History" description="No previous policies found." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-custom">
              <thead>
                <tr>
                  <th>VERSION</th>
                  <th>INTERVAL</th>
                  <th>BLUR STATUS</th>
                  <th>RETENTION</th>
                  <th>EFFECTIVE DATE</th>
                  <th style={{ textAlign: 'center' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((p: any) => (
                  <tr key={p._id}>
                    <td style={{ fontWeight: 800 }}>v{p.version}</td>
                    <td>{p.screenshotIntervalMinutes} mins</td>
                    <td>{p.isBlurEnabled ? 'Blurred' : 'Unblurred'}</td>
                    <td>{p.retentionDays} days</td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
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
        )}
      </div>

      {/* Create Policy Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card-panel" style={{ maxWidth: '500px', width: '100%', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Publish New Policy Version</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>Screenshot (Mins)</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    required
                    value={intervalMinutes}
                    onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                    className="input-custom"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>Idle Limit (Mins)</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    required
                    value={idleTimeoutMinutes}
                    onChange={(e) => setIdleTimeoutMinutes(Number(e.target.value))}
                    className="input-custom"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>Retention (Days)</label>
                  <input
                    type="number"
                    min={7}
                    max={365}
                    required
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(Number(e.target.value))}
                    className="input-custom"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', backgroundColor: 'var(--bg-card-subtle)', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                <input
                  type="checkbox"
                  id="blurCheck"
                  checked={isBlurEnabled}
                  onChange={(e) => setIsBlurEnabled(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="blurCheck" style={{ color: 'var(--text-primary)', fontWeight: 500, cursor: 'pointer', fontSize: '0.85rem' }}>
                  Enable privacy blur effect on screenshot uploads
                </label>
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>Policy Consent Text (Shown on login)</label>
                <textarea
                  rows={4}
                  required
                  value={consentText}
                  onChange={(e) => setConsentText(e.target.value)}
                  className="input-custom"
                  style={{ width: '100%', resize: 'none', lineHeight: 1.5 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
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
