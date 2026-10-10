import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTimeEntriesApi } from '../../api/services';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorAlert } from '../../components/ErrorAlert';
import { EmptyState } from '../../components/EmptyState';

export const TimesheetPage: React.FC = () => {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['weeklyTimesheet'],
    queryFn: getTimeEntriesApi,
  });

  if (isLoading) return <LoadingSpinner label="Loading weekly timesheet..." />;
  if (isError) return <ErrorAlert message={(error as any)?.message || 'Failed to load timesheet'} onRetry={refetch} />;

  const entries = data?.timeEntries || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Weekly Timesheet</h1>
          <p className="page-subtitle">Detailed breakdown of your logged hours for this week.</p>
        </div>
      </div>

      {entries.length === 0 ? (
        <EmptyState title="No timesheet entries" message="You have not recorded any time entries for this period." />
      ) : (
        <div className="table-custom-wrapper">
          <div className="overflow-x-auto">
            <table className="table-custom">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Duration</th>
                  <th>Type</th>
                  <th>Audit Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry: any) => (
                  <tr key={entry._id}>
                    <td className="font-bold text-neu-primary tabular-nums">
                      {new Date(entry.start).toLocaleDateString()}
                    </td>
                    <td className="text-neu-secondary font-medium tabular-nums">{new Date(entry.start).toLocaleTimeString()}</td>
                    <td className="text-neu-secondary font-medium tabular-nums">
                      {entry.end ? (
                        new Date(entry.end).toLocaleTimeString()
                      ) : (
                        <span className="badge-emerald font-bold">Active</span>
                      )}
                    </td>
                    <td className="font-mono font-black text-neu-accent tabular-nums">
                      {((entry.durationSeconds || 0) / 3600).toFixed(2)} hrs
                    </td>
                    <td>
                      {entry.isManualEdit ? (
                        <span className="badge-amber">Manual Edit</span>
                      ) : (
                        <span className="badge-indigo">Timer</span>
                      )}
                    </td>
                    <td className="text-neu-muted text-xs font-medium">
                      {entry.auditLogs?.length > 0 ? `${entry.auditLogs.length} Edit Audit(s)` : 'Original'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimesheetPage;
