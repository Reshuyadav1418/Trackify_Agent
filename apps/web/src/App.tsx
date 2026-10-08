import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PolicyConsentModal } from './components/PolicyConsentModal';
import { Layout } from './components/Layout';

import { LoginPage } from './pages/LoginPage';
import { SummaryPage } from './pages/employee/SummaryPage';
import { TimesheetPage } from './pages/employee/TimesheetPage';
import { ManualEntryPage } from './pages/employee/ManualEntryPage';
import { ScreenshotsPage } from './pages/employee/ScreenshotsPage';

import { TeamOverviewPage } from './pages/manager/TeamOverviewPage';
import { ActivityChartsPage } from './pages/manager/ActivityChartsPage';
import { ScreenshotReviewPage } from './pages/manager/ScreenshotReviewPage';

import { UsersTeamsPage } from './pages/admin/UsersTeamsPage';
import { ProjectsTasksPage } from './pages/admin/ProjectsTasksPage';
import { PoliciesPage } from './pages/admin/PoliciesPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { ReportsPage } from './pages/admin/ReportsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30, // 30 seconds
    },
  },
});

const HomeRedirect: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === 'admin') return <Navigate to="/admin/users-teams" replace />;
  if (user?.role === 'manager') return <Navigate to="/manager/team" replace />;
  return <SummaryPage />;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <PolicyConsentModal />
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected dashboard routes */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              {/* Home & Employee Routes */}
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/employee/summary" element={<SummaryPage />} />
              <Route path="/timesheet" element={<TimesheetPage />} />
              <Route path="/employee/timesheet" element={<Navigate to="/timesheet" replace />} />
              <Route path="/manual-entry" element={<ManualEntryPage />} />
              <Route path="/employee/manual-entry" element={<Navigate to="/manual-entry" replace />} />
              <Route path="/screenshots" element={<ScreenshotsPage />} />
              <Route path="/employee/screenshots" element={<Navigate to="/screenshots" replace />} />

              {/* Manager Routes */}
              <Route
                path="/manager/team"
                element={
                  <ProtectedRoute allowedRoles={['manager', 'admin']}>
                    <TeamOverviewPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/manager/overview" element={<Navigate to="/manager/team" replace />} />
              <Route
                path="/manager/activity"
                element={
                  <ProtectedRoute allowedRoles={['manager', 'admin']}>
                    <ActivityChartsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/manager/screenshots"
                element={
                  <ProtectedRoute allowedRoles={['manager', 'admin']}>
                    <ScreenshotReviewPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin/users-teams"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <UsersTeamsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/admin/users" element={<Navigate to="/admin/users-teams" replace />} />
              <Route
                path="/admin/projects-tasks"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ProjectsTasksPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/admin/projects" element={<Navigate to="/admin/projects-tasks" replace />} />
              <Route
                path="/admin/policies"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <PoliciesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/audit-logs"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AuditLogsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
