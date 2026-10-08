import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAuditLogsApi } from '../../api/services';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorAlert } from '../../components/ErrorAlert';
import { EmptyState } from '../../components/EmptyState';
import { Search, Filter, User, Clock } from 'lucide-react';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">System Audit Log Viewer</h1>
          <p className="page-subtitle">Immutable trail of screenshot views, manual time edits, and administrative actions.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search action, actor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-custom"
              style={{ paddingLeft: '2.2rem', width: '100%' }}
            />
          </div>

          {/* Action Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '0.35rem 0.75rem' }}>
            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer' }}
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
      <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredLogs.length === 0 ? (
          <EmptyState title="No Audit Logs Found" description="No matching system audit log entries found." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
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
                    <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }}>
                      <Clock size={13} style={{ display: 'inline', marginRight: '0.35rem' }} />
                      {new Date(log.createdAt).toLocaleString(undefined, {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User size={15} style={{ color: 'var(--accent-primary)' }} />
                        <div>
                          <p style={{ margin: 0 }}>{log.actorId?.name || 'System'}</p>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.actorId?.email || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={log.action.includes('DELETE') ? 'badge-rose' : log.action.includes('VIEW') ? 'badge-indigo' : 'badge-amber'}>
                        {log.action}
                      </span>
                    </td>
                    <td>{log.targetEntity ? `${log.targetEntity} (${log.targetId || 'N/A'})` : '—'}</td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {log.ipAddress || '::1'}
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
