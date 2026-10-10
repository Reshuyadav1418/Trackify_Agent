import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAuditLogsApi } from '../../api/services';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorAlert } from '../../components/ErrorAlert';
import { EmptyState } from '../../components/EmptyState';
import { Search, Filter, User, Clock, ShieldAlert } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const { data: logsData, isLoading, error } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: getAuditLogsApi,
  });

  if (isLoading) return <LoadingSpinner label="Loading system audit logs..." />;
  if (error) return <ErrorAlert message={(error as Error).message} />;

  const logs = logsData?.auditLogs || [];
  const uniqueActions = Array.from(new Set(logs.map((l: any) => l.action))) as string[];

  const filteredLogs = logs.filter((log: any) => {
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const actorName = log.actorId?.name || '';
    const actorEmail = log.actorId?.email || '';
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.targetEntity?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      actorEmail.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesAction && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">System Audit Log Viewer</h1>
          <p className="page-subtitle">Immutable trail of screenshot views, manual time edits, and administrative actions.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative w-64 flex items-center">
            <Search size={14} className="absolute left-3.5 text-indigo-500 dark:text-indigo-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search action, actor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full input-with-icon-left pl-11 pr-3 py-2 text-xs neu-inset-sm rounded-xl"
            />
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-2 neu-inset-sm px-3 py-2 rounded-xl">
            <Filter size={14} className="text-indigo-500 dark:text-indigo-400" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-transparent border-none p-0 text-xs text-neu-primary font-bold cursor-pointer outline-none"
            >
              <option value="all">All Actions</option>
              {uniqueActions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="table-custom-wrapper">
        {filteredLogs.length === 0 ? (
          <EmptyState title="No Audit Logs Found" description="No matching system audit log entries found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-custom">
              <thead>
                <tr>
                  <th>TIMESTAMP</th>
                  <th>ACTOR</th>
                  <th>ACTION</th>
                  <th>TARGET ENTITY</th>
                  <th>IP ADDRESS</th>
                  <th>DETAILS</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log: any) => (
                  <tr key={log._id}>
                    <td className="text-neu-muted whitespace-nowrap font-mono text-xs tabular-nums">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-neu-muted" />
                        <span>
                          {new Date(log.createdAt).toLocaleString(undefined, {
                            dateStyle: 'short',
                            timeStyle: 'medium',
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="font-semibold text-neu-primary">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full neu-raised flex items-center justify-center text-neu-accent">
                          <User size={14} />
                        </div>
                        <div>
                          <p className="font-bold text-xs m-0 text-neu-primary">{log.actorId?.name || 'System'}</p>
                          <p className="text-[10px] m-0 text-neu-muted">{log.actorId?.email || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={log.action.includes('DELETE') ? 'badge-rose' : log.action.includes('VIEW') ? 'badge-indigo' : 'badge-amber'}>
                        <ShieldAlert size={11} />
                        {log.action}
                      </span>
                    </td>
                    <td className="text-neu-secondary text-xs font-medium">
                      {log.targetEntity ? `${log.targetEntity} (${log.targetId || 'N/A'})` : '—'}
                    </td>
                    <td className="font-mono text-xs text-neu-muted tabular-nums">
                      {log.ipAddress || '::1'}
                    </td>
                    <td className="font-mono text-[11px] text-neu-muted max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : '{}'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogsPage;
