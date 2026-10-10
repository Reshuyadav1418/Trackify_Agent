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
          <div className="neu-inset-sm p-4 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
            <CheckCircle size={18} className="shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="neu-inset-sm p-4 rounded-xl text-rose-500 text-xs font-bold flex items-center gap-2">
            <AlertTriangle size={18} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-neu-muted mb-1.5 font-bold uppercase tracking-wider text-[11px]">
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
            <label className="block text-neu-muted mb-1.5 font-bold uppercase tracking-wider text-[11px]">
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
            <label className="block text-neu-muted mb-1.5 font-bold uppercase tracking-wider text-[11px]">
              Reason for Manual Entry *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Forgot to turn on agent timer during client call"
              rows={4}
              required
              className="input-custom w-full resize-y leading-relaxed"
            />
            <span className="text-[11px] text-neu-muted mt-1.5 block font-medium">
              * Every manual time edit is permanently recorded in audit logs.
            </span>
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary w-full justify-center py-2.5 font-bold text-sm"
          >
            <FilePlus size={16} />
            <span>{mutation.isPending ? 'Submitting...' : 'Submit Manual Entry'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ManualEntryPage;
