import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createManualEntryApi } from '../../api/services';
import { FilePlus, CheckCircle, AlertTriangle } from 'lucide-react';

export const ManualEntryPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: createManualEntryApi,
    onSuccess: () => {
      setSuccessMessage('Manual time entry submitted successfully and logged to audit records.');
      setErrorMessage(null);
      setStart('');
      setEnd('');
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error || 'Failed to submit manual time entry.');
      setSuccessMessage(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || reason.trim() === '') {
      setErrorMessage('A reason is mandatory for manual time entry requests.');
      return;
    }
    mutation.mutate({
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      reason: reason.trim(),
    });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Manual Time Entry Request</h1>
        <p className="page-subtitle">Request a manual time entry edit. A valid justification reason is required for audit logs.</p>
      </div>

      <div className="card-panel space-y-6">
        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-semibold flex items-center gap-2">
            <CheckCircle className="w-5 h-5 shrink-0" /> {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" /> {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
              Start Date & Time *
            </label>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              required
              className="input-custom w-full"
            />
          </div>

          <div>
            <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
              End Date & Time *
            </label>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              required
              className="input-custom w-full"
            />
          </div>

          <div>
            <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
              Reason for Manual Entry *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Forgot to turn on agent timer during client call"
              rows={4}
              required
              className="input-custom w-full resize-y"
            />
            <span className="text-[11px] text-[var(--text-muted)] mt-1 block">
              * Every manual time edit is permanently recorded in audit logs.
            </span>
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary w-full justify-center"
          >
            <FilePlus className="w-4 h-4" /> {mutation.isPending ? 'Submitting...' : 'Submit Manual Entry'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ManualEntryPage;

