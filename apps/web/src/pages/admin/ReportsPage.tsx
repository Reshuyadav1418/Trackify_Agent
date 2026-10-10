import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTimesheetReportApi, getActivityReportApi, getProjectsReportApi, exportReportCsvApi } from '../../api/services';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorAlert } from '../../components/ErrorAlert';
import { EmptyState } from '../../components/EmptyState';
import { Download, BarChart3, Clock, FolderKanban, Calendar } from 'lucide-react';

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
          className="btn-primary text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2"
        >
          <Download size={16} />
          {isExporting ? 'Exporting...' : 'Export Report (CSV)'}
        </button>
      </div>

      {/* Date Filter Toolbar */}
      <div className="card-panel flex flex-wrap items-center justify-between gap-4">
        {/* Neumorphic Segmented Report Tabs */}
        <div className="inline-flex p-1.5 neu-inset rounded-2xl gap-2">
          <button
            onClick={() => setActiveTab('timesheet')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border-none ${
              activeTab === 'timesheet'
                ? 'neu-raised text-neu-accent shadow-neu-raised-sm'
                : 'bg-transparent text-neu-muted hover:text-neu-primary'
            }`}
          >
            <Clock size={14} />
            <span>Timesheet</span>
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border-none ${
              activeTab === 'activity'
                ? 'neu-raised text-neu-accent shadow-neu-raised-sm'
                : 'bg-transparent text-neu-muted hover:text-neu-primary'
            }`}
          >
            <BarChart3 size={14} />
            <span>Activity</span>
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border-none ${
              activeTab === 'projects'
                ? 'neu-raised text-neu-accent shadow-neu-raised-sm'
                : 'bg-transparent text-neu-muted hover:text-neu-primary'
            }`}
          >
            <FolderKanban size={14} />
            <span>Projects</span>
          </button>
        </div>

        {/* Date Range Selectors */}
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-neu-muted font-bold text-[11px] uppercase tracking-wider flex items-center gap-1">
              <Calendar size={13} /> From:
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-custom py-1.5 text-xs rounded-xl"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-neu-muted font-bold text-[11px] uppercase tracking-wider">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-custom py-1.5 text-xs rounded-xl"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-neu-accent hover:underline font-bold text-xs ml-1 cursor-pointer border-none bg-transparent"
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
        <div className="table-custom-wrapper">
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
                          <td className="font-bold text-neu-primary">{r.user}</td>
                          <td className="text-neu-secondary font-medium">{r.project}</td>
                          <td className="text-neu-secondary font-medium">{r.task}</td>
                          <td className="text-neu-muted text-xs tabular-nums">{new Date(r.start).toLocaleString()}</td>
                          <td className="text-neu-muted text-xs tabular-nums">
                            {r.end === 'Running' ? <span className="badge-emerald">Running</span> : new Date(r.end).toLocaleString()}
                          </td>
                          <td className="text-right font-mono font-bold text-neu-primary tabular-nums">{r.durationMinutes}</td>
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
                          <td className="font-bold text-neu-primary">{s.user}</td>
                          <td className="text-neu-muted text-xs tabular-nums">{new Date(s.timestamp).toLocaleString()}</td>
                          <td className="text-center font-mono text-neu-accent font-bold tabular-nums">{s.keyboardCount}</td>
                          <td className="text-center font-mono text-emerald-500 font-bold tabular-nums">{s.mouseCount}</td>
                          <td className="text-center">
                            {s.isIdle ? (
                              <span className="badge-amber">Idle</span>
                            ) : (
                              <span className="badge-emerald">Active</span>
                            )}
                          </td>
                          <td className="text-neu-muted max-w-xs truncate text-xs">{s.windowTitle || 'N/A'}</td>
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
                          <td className="font-bold text-neu-primary">{p.projectName}</td>
                          <td className="text-neu-secondary font-medium">{p.clientName}</td>
                          <td className="text-center font-mono text-neu-secondary tabular-nums font-semibold">{p.entryCount}</td>
                          <td className="text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold text-sm tabular-nums">
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
