import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTeamsApi, getTimesheetReportApi, getUsersApi } from '../../api/services';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorAlert } from '../../components/ErrorAlert';
import { EmptyState } from '../../components/EmptyState';
import { Users, Clock, Search, Shield, Filter } from 'lucide-react';


export const TeamOverviewPage: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: getTeamsApi,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: getUsersApi,
  });

  const { data: timesheetData, isLoading: timesheetLoading, error: timesheetError } = useQuery({
    queryKey: ['timesheetReport'],
    queryFn: () => getTimesheetReportApi(),
  });

  const isLoading = timesheetLoading;
  const error = timesheetError;

  if (isLoading) return <LoadingSpinner label="Loading team dashboard..." />;
  if (error) return <ErrorAlert message={(error as Error).message} />;

  const teams = teamsData?.teams || [];
  const entries = timesheetData?.reports || [];
  
  // Combine users from API and users from timesheet entries so dropdown is always complete
  const apiUsers = usersData?.users || [];
  const entryUserNames = Array.from(new Set(entries.map((e: any) => e.user).filter(Boolean)));
  const existingNames = new Set(apiUsers.map((u: any) => u.name));
  const fallbackUsers = entryUserNames
    .filter((name) => !existingNames.has(name))
    .map((name) => ({ _id: name, name, role: 'member' }));
  const users = [...apiUsers, ...fallbackUsers];

  // Filter entries based on user selection & search query
  const filteredEntries = entries.filter((entry: any) => {
    const matchesUser = selectedUser === 'all' || entry.user === selectedUser || entry.userEmail === selectedUser;
    const matchesQuery =
      (entry.user || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.project || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.task || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesUser && matchesQuery;
  });

  // Calculate per-member totals
  const memberTotals: Record<string, number> = {};
  entries.forEach((e: any) => {
    const key = e.user || 'Unknown';
    const duration = parseFloat(e.durationMinutes) || 0;
    memberTotals[key] = (memberTotals[key] || 0) + duration;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Team Overview</h1>
          <p className="page-subtitle">Monitor team activity, member timesheets, and overall productivity.</p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3">
          <div className="card-panel !p-3 flex items-center gap-3 min-w-[140px]">
            <Users className="w-5 h-5 text-indigo-500" />
            <div>
              <p className="text-xs text-[var(--text-muted)] font-medium">Team Members</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">{users.length}</p>
            </div>
          </div>
          <div className="card-panel !p-3 flex items-center gap-3 min-w-[140px]">
            <Clock className="w-5 h-5 text-emerald-500" />
            <div>
              <p className="text-xs text-[var(--text-muted)] font-medium">Total Teams</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">{teams.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.length === 0 ? (
          <div className="col-span-full">
            <EmptyState title="No Teams Found" message="No team structure found in the system." />
          </div>
        ) : (
          teams.map((team: any) => (
            <div key={team._id} className="card-panel hover:border-[var(--accent-primary)] transition-all">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[var(--text-primary)] text-base">{team.name}</h3>
                <span className="badge-indigo">
                  {team.memberIds?.length || 0} Members
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-4 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                Manager: <span className="text-[var(--text-secondary)] font-medium">{team.managerId?.name || 'Unassigned'}</span>
              </p>
              
              {/* Member avatars list */}
              <div className="flex flex-wrap gap-2">
                {team.memberIds && team.memberIds.length > 0 ? (
                  team.memberIds.map((m: any) => (
                    <div
                      key={m._id || m}
                      className="text-xs bg-[var(--bg-card-subtle)] text-[var(--text-secondary)] px-2.5 py-1 rounded-lg border border-[var(--border-color)] flex items-center gap-1.5"
                    >
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span>{m.name || m.email || m}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-[var(--text-muted)] italic">No members assigned</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Member Timesheets Section */}
      <div className="card-panel">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Member Timesheets</h2>
            <p className="text-xs text-[var(--text-muted)]">Review time entries for team members.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search filter */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search user, project, task..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-custom w-full pl-9"
              />
            </div>

            {/* User dropdown filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="input-custom text-xs cursor-pointer"
              >
                <option value="all">All Members</option>
                {users.map((u: any) => (
                  <option key={u._id} value={u.name}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Timesheet Table */}
        {filteredEntries.length === 0 ? (
          <EmptyState title="No Time Entries" message="No matching timesheet entries were found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-custom">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Project</th>
                  <th>Task</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th className="text-right">Duration</th>
                  <th className="text-center">Type</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry: any) => (
                  <tr key={entry.id}>
                    <td className="font-semibold text-[var(--text-primary)]">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
                          {entry.user.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-[var(--text-primary)]">{entry.user}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">{entry.userEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-[var(--text-secondary)]">{entry.project}</td>
                    <td className="text-[var(--text-secondary)]">{entry.task}</td>
                    <td className="text-[var(--text-muted)]">
                      {new Date(entry.start).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="text-[var(--text-muted)]">
                      {entry.end === 'Running' ? (
                        <span className="text-emerald-500 font-semibold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                          Running
                        </span>
                      ) : (
                        new Date(entry.end).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
                      )}
                    </td>
                    <td className="text-right font-mono text-[var(--text-primary)] font-bold">
                      {(parseFloat(entry.durationMinutes) / 60).toFixed(2)} hrs
                    </td>
                    <td className="text-center">
                      {entry.isManualEdit ? (
                        <span className="badge-amber">Manual</span>
                      ) : (
                        <span className="badge-indigo">Auto</span>
                      )}
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

export default TeamOverviewPage;

