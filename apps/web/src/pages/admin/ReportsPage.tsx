import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTimesheetReportApi, getActivityReportApi, getProjectsReportApi, exportReportCsvApi } from '../../api/services';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorAlert } from '../../components/ErrorAlert';
import { EmptyState } from '../../components/EmptyState';
import { Download, BarChart3, Clock, FolderKanban } from 'lucide-react';


export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'timesheet' | 'activity' | 'projects'>('timesheet');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const queryParams = {
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  };

  const { data: timesheetData, isLoading: tsLoading, error: tsError } = useQuery({
    queryKey: ['timesheetReport', queryParams],
    queryFn: () => getTimesheetReportApi(queryParams),
    enabled: activeTab === 'timesheet',
  });

  const { data: activityData, isLoading: actLoading, error: actError } = useQuery({
    queryKey: ['activityReport', queryParams],
    queryFn: () => getActivityReportApi(queryParams),
    enabled: activeTab === 'activity',
  });

  const { data: projectsData, isLoading: projLoading, error: projError } = useQuery({
    queryKey: ['projectsReport', queryParams],
    queryFn: () => getProjectsReportApi(queryParams),
    enabled: activeTab === 'projects',
  });

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const blob = await exportReportCsvApi(activeTab, queryParams);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${activeTab}-report.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading = tsLoading || actLoading || projLoading;
  const error = tsError || actError || projError;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Generate timesheet, activity, and project summary reports with CSV export.</p>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={isExporting}
          className="btn-primary !bg-emerald-600 hover:!bg-emerald-500 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {isExporting ? 'Exporting...' : 'Export Report (CSV)'}
        </button>
      </div>

      {/* Date Filter Toolbar */}
      <div className="card-panel flex flex-wrap items-center justify-between gap-4">
        <div className="flex border-b sm:border-b-0 border-[var(--border-color)] gap-2">
          <button
            onClick={() => setActiveTab('timesheet')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'timesheet'
                ? 'bg-[var(--accent-primary)] text-white'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-subtle)]'
            }`}
          >
            <Clock className="w-4 h-4" /> Timesheet Report
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'activity'
                ? 'bg-[var(--accent-primary)] text-white'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-subtle)]'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Activity Report
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'projects'
                ? 'bg-[var(--accent-primary)] text-white'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-subtle)]'
            }`}
          >
            <FolderKanban className="w-4 h-4" /> Projects Summary
          </button>
        </div>

        {/* Date Range Selectors */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)] font-medium">Start Date:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-custom"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)] font-medium">End Date:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-custom"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-[var(--accent-primary)] hover:underline font-semibold text-xs ml-2 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label={`Generating ${activeTab} report...`} />
      ) : error ? (
        <ErrorAlert message={(error as Error).message} />
      ) : (
        <div className="card-panel !p-0 overflow-hidden">
          {/* Timesheet Report View */}
          {activeTab === 'timesheet' && (
            <div>
              {(!timesheetData?.reports || timesheetData.reports.length === 0) ? (
                <EmptyState title="No Timesheet Data" message="No time entries found for the selected date range." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-custom">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Project</th>
                        <th>Task</th>
                        <th>Start Time</th>
                        <th>End Time</th>
                        <th className="text-right">Duration (Mins)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timesheetData.reports.map((r: any) => (
                        <tr key={r.id}>
                          <td className="font-semibold text-[var(--text-primary)]">{r.user}</td>
                          <td className="text-[var(--text-secondary)]">{r.project}</td>
                          <td className="text-[var(--text-secondary)]">{r.task}</td>
                          <td className="text-[var(--text-muted)]">{new Date(r.start).toLocaleString()}</td>
                          <td className="text-[var(--text-muted)]">
                            {r.end === 'Running' ? 'Running' : new Date(r.end).toLocaleString()}
                          </td>
                          <td className="text-right font-mono font-bold text-[var(--text-primary)]">{r.durationMinutes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Activity Report View */}
          {activeTab === 'activity' && (
            <div>
              {(!activityData?.reports || activityData.reports.length === 0) ? (
                <EmptyState title="No Activity Samples" message="No activity samples found for the selected date range." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-custom">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Timestamp</th>
                        <th className="text-center">Keyboard Count</th>
                        <th className="text-center">Mouse Count</th>
                        <th className="text-center">Idle State</th>
                        <th>Active Window</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activityData.reports.map((s: any) => (
                        <tr key={s.id}>
                          <td className="font-semibold text-[var(--text-primary)]">{s.user}</td>
                          <td className="text-[var(--text-muted)]">{new Date(s.timestamp).toLocaleString()}</td>
                          <td className="text-center font-mono text-indigo-500 font-semibold">{s.keyboardCount}</td>
                          <td className="text-center font-mono text-emerald-500 font-semibold">{s.mouseCount}</td>
                          <td className="text-center">
                            {s.isIdle ? (
                              <span className="badge-amber">Idle</span>
                            ) : (
                              <span className="badge-emerald">Active</span>
                            )}
                          </td>
                          <td className="text-[var(--text-muted)] max-w-xs truncate">{s.windowTitle || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Projects Summary View */}
          {activeTab === 'projects' && (
            <div>
              {(!projectsData?.reports || projectsData.reports.length === 0) ? (
                <EmptyState title="No Project Summaries" message="No project duration data recorded." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-custom">
                    <thead>
                      <tr>
                        <th>Project Name</th>
                        <th>Client Name</th>
                        <th className="text-center">Time Entries Count</th>
                        <th className="text-right">Total Hours Tracked</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectsData.reports.map((p: any, idx: number) => (
                        <tr key={idx}>
                          <td className="font-bold text-[var(--text-primary)]">{p.projectName}</td>
                          <td className="text-[var(--text-secondary)]">{p.clientName}</td>
                          <td className="text-center font-mono text-[var(--text-secondary)]">{p.entryCount}</td>
                          <td className="text-right font-mono text-emerald-600 font-bold text-sm">
                            {p.totalHours} hrs
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportsPage;

